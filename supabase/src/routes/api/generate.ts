import { createFileRoute } from "@tanstack/react-router";

import { chatStream, MODELS } from "@/lib/ai.server";
import { appendAudit } from "@/lib/audit.server";
import { clientFromRequest } from "@/lib/request-auth.server";
import { runVerification } from "@/lib/verify.server";

type ArtefactRequest = {
  outputType: string;
  audience: string;
  tone: string;
  detail: string;
  objective: string;
};

type Body = {
  sourceId: string;
  language?: string;
  instructions?: string;
  intentPrompt?: string;
  understoodIntent?: unknown;
  artefacts: ArtefactRequest[];
};

export const Route = createFileRoute("/api/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await clientFromRequest(request);
        if (!auth) return new Response("Unauthorized", { status: 401 });
        const { supabase, userId } = auth;
        const body = (await request.json()) as Body;

        if (!body?.sourceId || !Array.isArray(body.artefacts) || body.artefacts.length === 0) {
          return new Response("Bad request", { status: 400 });
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          async start(controller) {
            const send = (event: Record<string, unknown>) =>
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));

            try {
              const [{ data: source }, { data: chunks }, { data: facts }] = await Promise.all([
                supabase
                  .from("sources")
                  .select("id, title, raw_text, summary")
                  .eq("id", body.sourceId)
                  .single(),
                supabase
                  .from("source_chunks")
                  .select("locator, content")
                  .eq("source_id", body.sourceId)
                  .order("ordinal"),
                supabase
                  .from("facts")
                  .select("label, value, is_locked, locator")
                  .eq("source_id", body.sourceId),
              ]);

              if (!source) throw new Error("Source not found.");

              const first = body.artefacts[0];
              const { data: reqRow } = await supabase
                .from("generation_requests")
                .insert({
                  user_id: userId,
                  source_id: body.sourceId,
                  audience: first.audience,
                  tone: first.tone,
                  language: body.language ?? "English",
                  detail: first.detail,
                  objective: first.objective,
                  output_types: body.artefacts.map((a) => a.outputType),
                  instructions: body.instructions ?? null,
                  intent_prompt: body.intentPrompt ?? null,
                  understood_intent: (body.understoodIntent as never) ?? null,
                })
                .select("id")
                .single();

              await appendAudit(supabase, userId, {
                actor: "operator",
                action: "generation.requested",
                entity_type: "source",
                entity_id: body.sourceId,
                detail: `Requested: ${body.artefacts.map((a) => `${a.outputType} (${a.audience})`).join(", ")}`,
              });

              const lockedFacts = (facts ?? []).filter((f) => f.is_locked);
              const evidence = (chunks ?? [])
                .map((c) => `[${c.locator}]\n${c.content}`)
                .join("\n\n");

              for (const artefact of body.artefacts) {
                const { data: output, error } = await supabase
                  .from("outputs")
                  .insert({
                    user_id: userId,
                    source_id: body.sourceId,
                    request_id: reqRow?.id ?? null,
                    output_type: artefact.outputType,
                    audience: artefact.audience,
                    tone: artefact.tone,
                    status: "generating",
                    model: MODELS.reasoning,
                  })
                  .select("id")
                  .single();
                if (error || !output) throw new Error(error?.message ?? "Could not create artefact");

                send({
                  type: "output_started",
                  outputId: output.id,
                  outputType: artefact.outputType,
                  audience: artefact.audience,
                });

                const system =
                  "You are the generation stage of INTELLI-FORGE, an audited content transformation platform. " +
                  "Write the requested artefact using ONLY the supplied source passages. " +
                  "Never introduce a number, date, name or recommendation that is not in the source. " +
                  "The LOCKED FACTS must appear exactly as given wherever they are relevant — never restate them with a different value. " +
                  "Use short section headings and plain sentences. Do not add a preamble about being an AI, and do not cite passage locators inline.";

                const user =
                  `SOURCE TITLE: ${source.title}\n\n` +
                  `LOCKED FACTS (must not change):\n${
                    lockedFacts.length
                      ? lockedFacts.map((f) => `- ${f.label}: ${f.value}`).join("\n")
                      : "- (none locked)"
                  }\n\n` +
                  `SOURCE PASSAGES:\n${evidence}\n\n` +
                  `TASK: Produce a ${artefact.outputType} for a ${artefact.audience} audience.\n` +
                  `Tone: ${artefact.tone}. Detail level: ${artefact.detail}. Objective: ${artefact.objective}. Language: ${body.language ?? "English"}.\n` +
                  (body.instructions ? `Additional operator instructions: ${body.instructions}\n` : "");

                let content = "";
                let sinceFlush = 0;
                for await (const delta of chatStream(
                  [
                    { role: "system", content: system },
                    { role: "user", content: user },
                  ],
                  { model: MODELS.reasoning },
                )) {
                  content += delta;
                  sinceFlush += delta.length;
                  send({ type: "delta", outputId: output.id, text: delta });
                  if (sinceFlush > 600) {
                    sinceFlush = 0;
                    await supabase.from("outputs").update({ content }).eq("id", output.id);
                  }
                }

                await supabase
                  .from("outputs")
                  .update({ content, status: "generated", updated_at: new Date().toISOString() })
                  .eq("id", output.id);
                send({ type: "output_complete", outputId: output.id });

                send({ type: "verifying", outputId: output.id });
                const result = await runVerification(supabase, userId, output.id);
                send({ type: "verified", outputId: output.id, ...result });
              }

              send({ type: "done" });
            } catch (err) {
              const message = err instanceof Error ? err.message : String(err);
              console.error("[generate]", message);
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: "error", message })}\n\n`),
              );
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
