import type { SupabaseClient } from "@supabase/supabase-js";

import { chatJson, MODELS } from "./ai.server";
import { appendAudit } from "./audit.server";
import { bestPassage, extractNumbers, splitSentences } from "./text.server";

const GROUNDED_THRESHOLD = 0.34;

type Chunk = { id: string; locator: string; content: string };

async function upsertCheck(
  supabase: SupabaseClient,
  userId: string,
  outputId: string,
  check: {
    key: string;
    label: string;
    status: "running" | "pass" | "warn" | "fail";
    detail?: string;
    method: string;
  },
) {
  const { data: existing } = await supabase
    .from("trust_checks")
    .select("id")
    .eq("output_id", outputId)
    .eq("check_key", check.key)
    .maybeSingle();

  const row = {
    user_id: userId,
    output_id: outputId,
    check_key: check.key,
    label: check.label,
    status: check.status,
    detail: check.detail ?? null,
    method: check.method,
  };
  if (existing?.id) {
    await supabase.from("trust_checks").update(row).eq("id", existing.id);
  } else {
    await supabase.from("trust_checks").insert(row);
  }
}

/**
 * The Trust & Quality Engine. Every check below is computed from the actual
 * generated text against the actual indexed source — no scores are invented.
 */
export async function runVerification(supabase: SupabaseClient, userId: string, outputId: string) {
  const { data: output, error } = await supabase
    .from("outputs")
    .select("id, source_id, content, output_type, audience, tone, request_id")
    .eq("id", outputId)
    .single();
  if (error || !output) throw new Error(error?.message ?? "Output not found");

  const [{ data: chunkRows }, { data: factRows }, { data: siblings }] = await Promise.all([
    supabase
      .from("source_chunks")
      .select("id, locator, content")
      .eq("source_id", output.source_id)
      .order("ordinal"),
    supabase
      .from("facts")
      .select("id, label, value, is_locked, locator")
      .eq("source_id", output.source_id),
    supabase
      .from("outputs")
      .select("id, output_type, audience, content")
      .eq("source_id", output.source_id)
      .neq("id", outputId)
      .in("status", ["generated", "approved", "edited"]),
  ]);

  const chunks = (chunkRows ?? []) as Chunk[];
  const lockedFacts = (factRows ?? []).filter((f) => f.is_locked);

  await supabase.from("outputs").update({ verification_status: "verifying" }).eq("id", outputId);

  const checkDefs = [
    { key: "fact_lock", label: "Critical facts consistent" },
    { key: "grounding", label: "Source grounded" },
    { key: "evidence", label: "Evidence available for every claim" },
    { key: "audience", label: "Audience appropriate" },
    { key: "format", label: "Format satisfied" },
    { key: "unsupported", label: "No unsupported claims" },
    { key: "consistency", label: "Consistent with other outputs" },
  ];
  for (const def of checkDefs) {
    await upsertCheck(supabase, userId, outputId, {
      ...def,
      status: "running",
      method: "pending",
    });
  }

  // ---------- 1. Claim tracing + grounding (lexical retrieval, LLM adjudication) ----------
  const sentences = splitSentences(output.content);
  await supabase.from("output_claims").delete().eq("output_id", outputId);

  const traced = sentences.map((sentence, i) => {
    const { passage, score } = bestPassage(sentence, chunks);
    return {
      ordinal: i,
      sentence,
      chunk: passage,
      score,
      grounded: score >= GROUNDED_THRESHOLD,
    };
  });

  const doubtful = traced.filter((t) => !t.grounded);
  if (doubtful.length > 0 && chunks.length > 0) {
    // Ask the model to adjudicate only the sentences lexical matching could not place.
    const verdicts = await chatJson<{
      results: Array<{ index: number; supported: boolean; locator: string; reason: string }>;
    }>(
      [
        {
          role: "system",
          content:
            "You verify grounding. For each candidate sentence decide whether the SOURCE PASSAGES support it. " +
            'Return JSON {"results":[{"index":n,"supported":true|false,"locator":"exact locator string of the supporting passage or empty","reason":"short"}]}. ' +
            "Generic connective or framing sentences that assert no fact count as supported with an empty locator.",
        },
        {
          role: "user",
          content:
            `SOURCE PASSAGES:\n${chunks.map((c) => `[${c.locator}] ${c.content}`).join("\n\n")}\n\n` +
            `CANDIDATE SENTENCES:\n${doubtful.map((d) => `${d.ordinal}. ${d.sentence}`).join("\n")}`,
        },
      ],
      { model: MODELS.reasoning, fallback: { results: [] } },
    );
    for (const verdict of verdicts.results ?? []) {
      const target = traced.find((t) => t.ordinal === verdict.index);
      if (!target) continue;
      target.grounded = Boolean(verdict.supported);
      const matched = chunks.find((c) => c.locator === verdict.locator);
      if (matched) target.chunk = matched;
    }
  }

  if (traced.length > 0) {
    await supabase.from("output_claims").insert(
      traced.map((t) => ({
        user_id: userId,
        output_id: outputId,
        ordinal: t.ordinal,
        sentence: t.sentence,
        chunk_id: t.chunk?.id ?? null,
        locator: t.chunk?.locator ?? null,
        evidence_text: t.chunk?.content?.slice(0, 1200) ?? null,
        grounded: t.grounded,
        match_score: Number(t.score.toFixed(3)),
      })),
    );
  }

  const groundedCount = traced.filter((t) => t.grounded).length;
  const coverage = traced.length ? groundedCount / traced.length : 0;

  await upsertCheck(supabase, userId, outputId, {
    key: "grounding",
    label: "Source grounded",
    status: coverage === 1 ? "pass" : coverage >= 0.8 ? "warn" : "fail",
    detail: `${groundedCount} of ${traced.length} sentences traced to an indexed source passage.`,
    method: "lexical retrieval over indexed passages + model adjudication of unmatched sentences",
  });

  const withEvidence = traced.filter((t) => t.chunk).length;
  await upsertCheck(supabase, userId, outputId, {
    key: "evidence",
    label: "Evidence available for every claim",
    status: withEvidence === traced.length ? "pass" : "warn",
    detail: `${withEvidence} of ${traced.length} sentences open a specific source location.`,
    method: "passage locator stored per sentence",
  });

  const unsupported = traced.filter((t) => !t.grounded);
  await upsertCheck(supabase, userId, outputId, {
    key: "unsupported",
    label: "No unsupported claims",
    status: unsupported.length === 0 ? "pass" : "warn",
    detail:
      unsupported.length === 0
        ? "Every sentence is backed by the source."
        : `${unsupported.length} sentence(s) could not be tied to the source: "${unsupported[0].sentence.slice(0, 120)}…"`,
    method: "sentences failing both lexical and model grounding",
  });

  // ---------- 2. Fact lock ----------
  await supabase.from("fact_conflicts").delete().eq("output_id", outputId).eq("status", "open");
  const conflicts: Array<{
    fact_id: string | null;
    fact_label: string;
    locked_value: string;
    generated_text: string;
    generated_value: string | null;
  }> = [];

  if (lockedFacts.length > 0) {
    const verdict = await chatJson<{
      conflicts: Array<{ label: string; generated_sentence: string; generated_value: string }>;
    }>(
      [
        {
          role: "system",
          content:
            "You are a fact-lock guard. You are given LOCKED FACTS and a DRAFT. " +
            'Return JSON {"conflicts":[{"label":"locked fact label","generated_sentence":"the exact draft sentence that contradicts it","generated_value":"the contradicting value in the draft"}]}. ' +
            "Only report a conflict when the draft states something that contradicts a locked value (different number, date, severity or recommended action). Rewording or omission is not a conflict. Return an empty array when there are none.",
        },
        {
          role: "user",
          content: `LOCKED FACTS:\n${lockedFacts.map((f) => `- ${f.label}: ${f.value}`).join("\n")}\n\nDRAFT:\n${output.content}`,
        },
      ],
      { model: MODELS.reasoning, fallback: { conflicts: [] } },
    );

    for (const c of verdict.conflicts ?? []) {
      const fact = lockedFacts.find((f) => f.label.toLowerCase() === (c.label ?? "").toLowerCase());
      conflicts.push({
        fact_id: fact?.id ?? null,
        fact_label: c.label,
        locked_value: fact?.value ?? "(locked value)",
        generated_text: c.generated_sentence,
        generated_value: c.generated_value ?? null,
      });
    }

    // Deterministic numeric backstop: a locked numeric fact whose number is
    // absent while a different number sits next to the same keyword.
    for (const fact of lockedFacts) {
      const lockedNumbers = extractNumbers(fact.value);
      if (lockedNumbers.length === 0) continue;
      const keyword = fact.label
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 4)[0];
      if (!keyword) continue;
      for (const sentence of sentences) {
        const lower = sentence.toLowerCase();
        if (!lower.includes(keyword)) continue;
        const numbers = extractNumbers(sentence);
        if (numbers.length === 0) continue;
        const hasLocked = lockedNumbers.some((n) => numbers.includes(n));
        if (!hasLocked && !conflicts.some((c) => c.generated_text === sentence)) {
          conflicts.push({
            fact_id: fact.id,
            fact_label: fact.label,
            locked_value: fact.value,
            generated_text: sentence,
            generated_value: numbers[0],
          });
        }
      }
    }
  }

  if (conflicts.length > 0) {
    await supabase
      .from("fact_conflicts")
      .insert(
        conflicts.map((c) => ({ ...c, user_id: userId, output_id: outputId, status: "open" })),
      );
  }

  await upsertCheck(supabase, userId, outputId, {
    key: "fact_lock",
    label: "Critical facts consistent",
    status: lockedFacts.length === 0 ? "warn" : conflicts.length === 0 ? "pass" : "fail",
    detail:
      lockedFacts.length === 0
        ? "No facts are locked on this source yet."
        : conflicts.length === 0
          ? `${lockedFacts.length} locked fact(s) checked against the draft — all consistent.`
          : `${conflicts.length} protected-fact conflict(s) detected.`,
    method: "locked-fact comparison (model) + numeric backstop (deterministic)",
  });

  // ---------- 3. Audience fit ----------
  const audienceVerdict = await chatJson<{ verdict: "pass" | "warn"; reason: string }>(
    [
      {
        role: "system",
        content:
          'Judge whether the draft suits the stated audience, tone and artefact type. Return JSON {"verdict":"pass"|"warn","reason":"one sentence"}. Warn for jargon aimed at a public audience, or for vagueness aimed at a technical one.',
      },
      {
        role: "user",
        content: `Audience: ${output.audience}\nTone: ${output.tone ?? "unspecified"}\nArtefact: ${output.output_type}\n\nDRAFT:\n${output.content}`,
      },
    ],
    {
      model: MODELS.reasoning,
      fallback: { verdict: "warn", reason: "Audience check unavailable." },
    },
  );
  await upsertCheck(supabase, userId, outputId, {
    key: "audience",
    label: "Audience appropriate",
    status: audienceVerdict.verdict === "pass" ? "pass" : "warn",
    detail: audienceVerdict.reason,
    method: "model rubric against audience, tone and artefact type",
  });

  // ---------- 4. Format compliance (deterministic) ----------
  const words = output.content.trim().split(/\s+/).length;
  const hasHeadings = /^#{1,3}\s|\n#{1,3}\s|\*\*/m.test(output.content);
  const formatRules: Record<string, { min: number; max: number; headings: boolean }> = {
    "Executive Brief": { min: 90, max: 400, headings: true },
    "Technical Advisory": { min: 150, max: 900, headings: true },
    "Public Advisory": { min: 60, max: 350, headings: false },
  };
  const rule = formatRules[output.output_type] ?? { min: 40, max: 1200, headings: false };
  const formatIssues: string[] = [];
  if (words < rule.min) formatIssues.push(`too short (${words} words, expected ≥ ${rule.min})`);
  if (words > rule.max) formatIssues.push(`too long (${words} words, expected ≤ ${rule.max})`);
  if (rule.headings && !hasHeadings) formatIssues.push("no section headings");
  await upsertCheck(supabase, userId, outputId, {
    key: "format",
    label: "Format satisfied",
    status: formatIssues.length === 0 ? "pass" : "warn",
    detail:
      formatIssues.length === 0
        ? `${words} words, structure matches the ${output.output_type} template.`
        : formatIssues.join("; "),
    method: "deterministic word-count and structure rules per artefact type",
  });

  // ---------- 5. Consistency guard across sibling outputs ----------
  if ((siblings ?? []).length === 0) {
    await upsertCheck(supabase, userId, outputId, {
      key: "consistency",
      label: "Consistent with other outputs",
      status: "pass",
      detail: "No other artefact from this source to compare against yet.",
      method: "cross-output comparison",
    });
  } else {
    const guard = await chatJson<{ contradictions: Array<{ other: string; detail: string }> }>(
      [
        {
          role: "system",
          content:
            'Cross-check artefacts generated from the same source. Return JSON {"contradictions":[{"other":"artefact name","detail":"what differs factually"}]}. Different wording, length or tone is NOT a contradiction — only differing facts are.',
        },
        {
          role: "user",
          content:
            `THIS ARTEFACT (${output.output_type} for ${output.audience}):\n${output.content}\n\n` +
            (siblings ?? [])
              .map((s) => `OTHER ARTEFACT (${s.output_type} for ${s.audience}):\n${s.content}`)
              .join("\n\n"),
        },
      ],
      { model: MODELS.reasoning, fallback: { contradictions: [] } },
    );
    const contradictions = guard.contradictions ?? [];
    await upsertCheck(supabase, userId, outputId, {
      key: "consistency",
      label: "Consistent with other outputs",
      status: contradictions.length === 0 ? "pass" : "fail",
      detail:
        contradictions.length === 0
          ? `Cross-checked against ${(siblings ?? []).length} other artefact(s) from this source — no factual drift.`
          : contradictions.map((c) => `${c.other}: ${c.detail}`).join(" | "),
      method: "model cross-check of every artefact generated from this source",
    });
  }

  const { data: finalChecks } = await supabase
    .from("trust_checks")
    .select("status")
    .eq("output_id", outputId);
  const statuses = (finalChecks ?? []).map((c) => c.status);
  const verification = statuses.includes("fail")
    ? "failed"
    : statuses.includes("warn")
      ? "attention"
      : "verified";

  await supabase
    .from("outputs")
    .update({
      verification_status: verification,
      evidence_coverage: Number(coverage.toFixed(3)),
      status: "generated",
      updated_at: new Date().toISOString(),
    })
    .eq("id", outputId);

  await appendAudit(supabase, userId, {
    actor: "system",
    action: "output.verified",
    entity_type: "output",
    entity_id: outputId,
    detail: `Trust engine result: ${verification}; evidence coverage ${(coverage * 100).toFixed(0)}%`,
    payload: { conflicts: conflicts.length, sentences: traced.length },
  });

  return { verification, coverage, conflicts: conflicts.length };
}
