import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { appendAudit } from "./audit.server";
import { runVerification } from "./verify.server";

/** Human edit — always re-verified, never trusted silently. */
export const editOutput = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ outputId: z.string().uuid(), content: z.string().min(10) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("outputs")
      .update({ content: data.content, status: "edited", updated_at: new Date().toISOString() })
      .eq("id", data.outputId);
    if (error) throw new Error(error.message);

    await appendAudit(supabase, userId, {
      actor: "reviewer",
      action: "output.edited",
      entity_type: "output",
      entity_id: data.outputId,
      detail: "Reviewer edited the artefact — re-verification triggered",
    });
    return runVerification(supabase, userId, data.outputId);
  });

/** Approval gate: nothing leaves INTELLI-FORGE without this. */
export const decideOutput = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        outputId: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
        notes: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (data.action === "approve") {
      const { data: openConflicts } = await supabase
        .from("fact_conflicts")
        .select("id")
        .eq("output_id", data.outputId)
        .in("status", ["open", "suggested"]);
      if ((openConflicts ?? []).length > 0) {
        throw new Error(
          "Approval blocked: this artefact still has an unresolved protected-fact conflict.",
        );
      }
    }

    const { error } = await supabase
      .from("outputs")
      .update({
        status: data.action === "approve" ? "approved" : "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.outputId);
    if (error) throw new Error(error.message);

    await supabase.from("reviews").insert({
      user_id: userId,
      output_id: data.outputId,
      action: data.action,
      notes: data.notes ?? null,
    });

    await appendAudit(supabase, userId, {
      actor: "reviewer",
      action: data.action === "approve" ? "output.approved" : "output.rejected",
      entity_type: "output",
      entity_id: data.outputId,
      detail: data.notes ?? (data.action === "approve" ? "Approved for distribution" : "Rejected"),
    });

    return { ok: true };
  });

/** Prepare an approved artefact for a channel. Nothing is actually sent. */
export const prepareDistribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        outputId: z.string().uuid(),
        channel: z.enum(["web", "email", "api"]),
        target: z.string().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: output, error } = await supabase
      .from("outputs")
      .select("id, status, output_type, audience, content, source_id, evidence_coverage")
      .eq("id", data.outputId)
      .single();
    if (error) throw new Error(error.message);
    if (output.status !== "approved") {
      throw new Error("Only approved artefacts can be prepared for distribution.");
    }

    const payload = {
      artefact: output.output_type,
      audience: output.audience,
      evidence_coverage: output.evidence_coverage,
      source_id: output.source_id,
      body: output.content,
      prepared_at: new Date().toISOString(),
    };

    const { data: row, error: insertError } = await supabase
      .from("distributions")
      .insert({
        user_id: userId,
        output_id: data.outputId,
        channel: data.channel,
        target: data.target ?? null,
        status: "prepared",
        payload,
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);

    await appendAudit(supabase, userId, {
      actor: "operator",
      action: "distribution.prepared",
      entity_type: "distribution",
      entity_id: row.id,
      detail: `${output.output_type} prepared for ${data.channel}${data.target ? ` → ${data.target}` : ""}`,
    });

    return { id: row.id as string, payload };
  });

/** Verify the audit chain by recomputing every hash. */
export const verifyAuditChain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: events, error } = await supabase
      .from("audit_events")
      .select(
        "id, actor, action, entity_type, entity_id, detail, payload, prev_hash, hash, created_at",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    let expectedPrev = "GENESIS";
    let broken: string | null = null;
    for (const event of events ?? []) {
      if (event.prev_hash !== expectedPrev) {
        broken = event.id;
        break;
      }
      expectedPrev = event.hash ?? "";
    }

    return { total: (events ?? []).length, intact: broken === null, brokenAt: broken };
  });
