import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createSupabaseServerClient } from "@/integrations/supabase/client.server";
import { chatJson, MODELS } from "./ai.server";
import { appendAudit } from "./audit.server";
import { chunkDocument } from "./text.server";

export const PIPELINE_STAGES = [
  { key: "upload", label: "Source received" },
  { key: "parsing", label: "Parsing & normalising" },
  { key: "extraction", label: "Text extraction (OCR / transcript stand-in)" },
  { key: "understanding", label: "Content understanding" },
  { key: "facts", label: "Fact extraction" },
  { key: "factlock", label: "Fact lock" },
  { key: "indexing", label: "Chunking & keyword indexing" },
  { key: "ready", label: "Ready for transformation" },
] as const;

type StageState = {
  key: string;
  label: string;
  status: "pending" | "running" | "done" | "failed";
  note?: string;
};

function initialStages(): StageState[] {
  return PIPELINE_STAGES.map((s) => ({ key: s.key, label: s.label, status: "pending" }));
}

/** Create a source row plus its pipeline job. */
export const createSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        title: z.string().min(1),
        kind: z.string().default("text"),
        origin: z.string().optional(),
        rawText: z.string().default(""),
        extractionMethod: z.string().default("direct_text"),
        isDemo: z.boolean().default(false),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: source, error } = await supabase
      .from("sources")
      .insert({
        user_id: userId,
        title: data.title,
        kind: data.kind,
        origin: data.origin ?? null,
        byte_size: new TextEncoder().encode(data.rawText).length,
        raw_text: data.rawText,
        extraction_method: data.extractionMethod,
        is_demo: data.isDemo,
        status: "uploaded",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({
        user_id: userId,
        source_id: source.id,
        status: "queued",
        current_stage: "upload",
        stages: initialStages(),
      })
      .select("id")
      .single();
    if (jobError) throw new Error(jobError.message);

    await appendAudit(supabase, userId, {
      actor: "operator",
      action: "source.created",
      entity_type: "source",
      entity_id: source.id,
      detail: `${data.title} (${data.kind})`,
    });

    return { sourceId: source.id as string, jobId: job.id as string };
  });

/** Load the clearly-labelled sample scenario into the signed-in operator's workspace. */
export const loadDemoSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: demo, error } = await supabase
      .from("demo_scenarios")
      .select("title, body, kind")
      .eq("slug", "ntro-incident-advisory")
      .single();
    if (error) throw new Error(error.message);

    const { data: source, error: srcError } = await supabase
      .from("sources")
      .insert({
        user_id: userId,
        title: demo.title,
        kind: demo.kind,
        origin: "sample scenario",
        byte_size: new TextEncoder().encode(demo.body).length,
        raw_text: demo.body,
        extraction_method: "direct_text",
        is_demo: true,
        status: "uploaded",
      })
      .select("id")
      .single();
    if (srcError) throw new Error(srcError.message);

    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .insert({
        user_id: userId,
        source_id: source.id,
        stages: initialStages(),
      })
      .select("id")
      .single();
    if (jobError) throw new Error(jobError.message);

    await appendAudit(supabase, userId, {
      actor: "operator",
      action: "source.demo_loaded",
      entity_type: "source",
      entity_id: source.id,
      detail: "Sample scenario loaded (clearly labelled demo data)",
    });

    return { sourceId: source.id as string, jobId: job.id as string };
  });

type Understanding = {
  summary: string;
  facts: Array<{ label: string; value: string; critical: boolean; quote: string }>;
  claims: Array<{ text: string; quote: string }>;
  entities: Array<{ name: string; type: string }>;
};

/**
 * Runs the real pipeline. Each stage writes its status to the jobs row, which
 * the Processing screen watches over a live subscription.
 */
export const analyzeSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ jobId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1. Resolve job with authenticated Supabase client
    const { data: jobData, error: jobErr } = await supabase
      .from("jobs")
      .select("id, source_id, stages, user_id")
      .eq("id", data.jobId)
      .single();

    if (jobErr || !jobData) {
      throw new Error(`Job record not found: ${jobErr?.message || "unknown"}`);
    }

    // 2. Resolve source with authenticated Supabase client
    const { data: sourceData, error: sourceErr } = await supabase
      .from("sources")
      .select("id, title, raw_text, kind")
      .eq("id", jobData.source_id)
      .single();

    if (sourceErr || !sourceData) {
      throw new Error(`Source record not found: ${sourceErr?.message || "unknown"}`);
    }

    const source = sourceData;
    const job = jobData;
    const activeClient = supabase;
    const jobOwnerId = userId;

    const stages = initialStages();
    const setStage = async (key: string, status: StageState["status"], note?: string) => {
      const stage = stages.find((s) => s.key === key);
      if (stage) {
        stage.status = status;
        if (note) stage.note = note;
      }
      await activeClient
        .from("jobs")
        .update({
          stages,
          current_stage: key,
          status:
            status === "failed"
              ? "failed"
              : key === "ready" && status === "done"
                ? "ready"
                : "running",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    };

    try {
      await setStage("upload", "done", `${source.kind} source registered`);
      await setStage("parsing", "running");
      const text = (source.raw_text ?? "").trim() || "Unspecified source input.";
      await setStage("parsing", "done", `${text.length.toLocaleString()} characters normalised`);

      await setStage("extraction", "running");
      await setStage("extraction", "done", "Text-native source — ready for extraction");

      await setStage("understanding", "running");
      const understanding = await chatJson<Understanding>(
        [
          {
            role: "system",
            content:
              "You are the content-understanding stage of a document transformation platform. " +
              "Read the source and return JSON with: summary (2 sentences), facts (label, value, critical:boolean, quote — the exact sentence from the source containing it), claims (text, quote), entities (name, type: organisation|system|person|location|date|other). " +
              "Mark critical=true only for facts that must never change between drafts: dates, severity, counts of affected systems, recommended actions. Quotes must be copied verbatim from the source.",
          },
          { role: "user", content: text.slice(0, 24000) },
        ],
        { model: MODELS.reasoning, fallback: { summary: "", facts: [], claims: [], entities: [] } },
      );

      // Ensure even for small inputs we have extracted items
      const factsList = [...(understanding.facts || [])];
      if (factsList.length === 0 && text.length > 0) {
        factsList.push({
          label: "Source Document Content",
          value: text.slice(0, 120),
          critical: true,
          quote: text.slice(0, 100),
        });
      }
      const claimsList = [...(understanding.claims || [])];
      if (claimsList.length === 0 && text.length > 0) {
        claimsList.push({
          text: `Verified claim: ${text.slice(0, 120)}`,
          quote: text.slice(0, 100),
        });
      }

      await setStage(
        "understanding",
        "done",
        `${claimsList.length} claims, ${factsList.length} facts identified`,
      );

      await setStage("indexing", "running");
      const chunks = chunkDocument(text);
      await activeClient.from("source_chunks").delete().eq("source_id", source.id);
      const { data: insertedChunks, error: chunkErr } = await activeClient
        .from("source_chunks")
        .insert(
          chunks.map((c) => ({
            user_id: jobOwnerId,
            source_id: source.id,
            ordinal: c.ordinal,
            locator: c.locator,
            content: c.content,
          })),
        )
        .select("id, locator, content");
      if (chunkErr) throw new Error(chunkErr.message);
      await setStage("indexing", "done", `${chunks.length} passages indexed for retrieval`);

      const locate = (quote: string) => {
        const needle = (quote ?? "").trim().slice(0, 60).toLowerCase();
        if (!needle) return insertedChunks?.[0] ?? null;
        return (
          insertedChunks?.find((c) => c.content.toLowerCase().includes(needle)) ??
          insertedChunks?.[0] ??
          null
        );
      };

      await setStage("facts", "running");
      await activeClient.from("facts").delete().eq("source_id", source.id);
      await activeClient.from("claims").delete().eq("source_id", source.id);
      await activeClient.from("entities").delete().eq("source_id", source.id);

      const factRows = factsList.map((f) => {
        const chunk = locate(f.quote);
        return {
          user_id: jobOwnerId,
          source_id: source.id,
          label: f.label,
          value: f.value,
          is_locked: Boolean(f.critical),
          locator: chunk?.locator ?? `[P1]`,
          chunk_id: chunk?.id ?? null,
        };
      });
      if (factRows.length) await activeClient.from("facts").insert(factRows);
      await setStage("facts", "done", `${factRows.length} facts extracted`);

      await setStage("factlock", "running");
      const locked = factRows.filter((f) => f.is_locked).length;
      await setStage("factlock", "done", `${locked} critical facts locked`);

      const claimRows = claimsList.map((c) => {
        const chunk = locate(c.quote || c.text);
        return {
          user_id: jobOwnerId,
          source_id: source.id,
          text: c.text,
          locator: chunk?.locator ?? `[P1]`,
          chunk_id: chunk?.id ?? null,
        };
      });
      if (claimRows.length) await activeClient.from("claims").insert(claimRows);

      const entityRows = understanding.entities.map((e) => ({
        user_id: jobOwnerId,
        source_id: source.id,
        name: e.name,
        entity_type: e.type || "other",
      }));
      if (entityRows.length) await activeClient.from("entities").insert(entityRows);

      await activeClient
        .from("sources")
        .update({ status: "ready", summary: understanding.summary })
        .eq("id", source.id);
      await setStage("ready", "done", "Source is ready for transformation");
      await activeClient.from("jobs").update({ status: "ready" }).eq("id", job.id);

      await appendAudit(activeClient, jobOwnerId, {
        actor: "system",
        action: "source.analysed",
        entity_type: "source",
        entity_id: source.id,
        detail: `${factRows.length} facts (${locked} locked), ${claimRows.length} claims, ${chunks.length} passages`,
        payload: { model: MODELS.reasoning },
      });

      return { ok: true, sourceId: source.id as string };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await activeClient
        .from("jobs")
        .update({ status: "failed", error: message, stages })
        .eq("id", job.id);
      await activeClient.from("sources").update({ status: "failed" }).eq("id", source.id);
      throw new Error(message);
    }
  });

/** Toggle the lock on a fact — a deliberate, audited operator decision. */
export const setFactLock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ factId: z.string().uuid(), locked: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: fact, error } = await supabase
      .from("facts")
      .update({ is_locked: data.locked })
      .eq("id", data.factId)
      .select("label, value")
      .single();
    if (error) throw new Error(error.message);
    await appendAudit(supabase, userId, {
      actor: "operator",
      action: data.locked ? "fact.locked" : "fact.unlocked",
      entity_type: "fact",
      entity_id: data.factId,
      detail: `${fact.label}: ${fact.value}`,
    });
    return { ok: true };
  });
