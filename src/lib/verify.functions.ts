import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { chat, MODELS } from "./ai.server";
import { appendAudit } from "./audit.server";
import { runVerification } from "./verify.server";

/** Re-run the Trust & Quality Engine for one artefact. */
export const verifyOutput = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ outputId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) =>
    runVerification(context.supabase, context.userId, data.outputId),
  );

/** AI-assisted correction for a protected-fact conflict. */
export const suggestCorrection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ conflictId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: conflict, error } = await supabase
      .from("fact_conflicts")
      .select("id, fact_label, locked_value, generated_text, output_id")
      .eq("id", data.conflictId)
      .single();
    if (error) throw new Error(error.message);

    const suggestion = (
      await chat(
        [
          {
            role: "system",
            content:
              "Rewrite the single sentence so it agrees with the locked fact. Preserve tone and style. Reply with the corrected sentence only — no quotes, no commentary.",
          },
          {
            role: "user",
            content: `Locked fact — ${conflict.fact_label}: ${conflict.locked_value}\nSentence: ${conflict.generated_text}`,
          },
        ],
        { model: MODELS.reasoning, temperature: 0.2 },
      )
    ).trim();

    await supabase
      .from("fact_conflicts")
      .update({ suggestion, status: "suggested" })
      .eq("id", conflict.id);

    await appendAudit(supabase, userId, {
      actor: "system",
      action: "conflict.correction_suggested",
      entity_type: "fact_conflict",
      entity_id: conflict.id,
      detail: `${conflict.fact_label} — suggestion generated`,
    });

    return { suggestion };
  });

/** Apply, or deliberately override, a protected-fact conflict. */
export const resolveConflict = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        conflictId: z.string().uuid(),
        action: z.enum(["accept_suggestion", "keep_edit"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: conflict, error } = await supabase
      .from("fact_conflicts")
      .select("id, output_id, generated_text, suggestion, fact_label, locked_value")
      .eq("id", data.conflictId)
      .single();
    if (error) throw new Error(error.message);

    if (data.action === "accept_suggestion") {
      if (!conflict.suggestion) throw new Error("No suggestion has been generated yet.");
      const { data: output } = await supabase
        .from("outputs")
        .select("content")
        .eq("id", conflict.output_id)
        .single();
      const updated = (output?.content ?? "").replace(conflict.generated_text, conflict.suggestion);
      await supabase
        .from("outputs")
        .update({ content: updated, status: "edited", updated_at: new Date().toISOString() })
        .eq("id", conflict.output_id);
      await supabase.from("fact_conflicts").update({ status: "corrected" }).eq("id", conflict.id);
      await appendAudit(supabase, userId, {
        actor: "operator",
        action: "conflict.correction_accepted",
        entity_type: "output",
        entity_id: conflict.output_id,
        detail: `${conflict.fact_label} restored to locked value "${conflict.locked_value}"`,
      });
      await runVerification(supabase, userId, conflict.output_id);
      return { ok: true, reverified: true };
    }

    await supabase.from("fact_conflicts").update({ status: "overridden" }).eq("id", conflict.id);
    await appendAudit(supabase, userId, {
      actor: "operator",
      action: "conflict.overridden",
      entity_type: "output",
      entity_id: conflict.output_id,
      detail: `Operator kept text conflicting with locked fact "${conflict.fact_label}" (${conflict.locked_value})`,
    });
    return { ok: true, reverified: false };
  });
