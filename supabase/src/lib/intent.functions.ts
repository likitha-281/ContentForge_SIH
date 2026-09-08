import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { chatJson, MODELS } from "./ai.server";
import { overlapScore } from "./text.server";

export type UnderstoodIntent = {
  audiences: Array<{
    audience: string;
    tone: string;
    detail: string;
    objective: string;
    outputType: string;
  }>;
  language: string;
  notes: string;
};

/** Turn a free-text operator request into a structured, editable config. */
export const parseIntent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ prompt: z.string().min(3), sourceTitle: z.string().optional() }).parse(data),
  )
  .handler(async ({ data }) => {
    const result = await chatJson<UnderstoodIntent>(
      [
        {
          role: "system",
          content:
            "You convert an operator's free-text request into a structured content-transformation config. " +
            'Return JSON: { "audiences": [{ "audience": "Executive|Technical|Public|Custom label", "tone": "Formal|Neutral|Urgent|Informative", "detail": "Brief|Moderate|Detailed", "objective": "Inform|Alert|Brief|Recommend|Explain", "outputType": "Executive Brief|Technical Advisory|Public Advisory|Email|Press Note|Summary" }], "language": "English", "notes": "one sentence on what you inferred and what you were unsure about" }. ' +
            "Infer one entry per distinct audience mentioned. Never invent audiences that were not implied.",
        },
        {
          role: "user",
          content: `Source: ${data.sourceTitle ?? "untitled"}\nRequest: ${data.prompt}`,
        },
      ],
      {
        model: MODELS.reasoning,
        fallback: { audiences: [], language: "English", notes: "Could not parse the request." },
      },
    );
    return result;
  });

/** Meaning-aware search over the indexed passages, facts and claims of one source. */
export const searchSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ sourceId: z.string().uuid(), query: z.string().min(2) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Expand the query with related terms so the search is not a literal string match.
    const expansion = await chatJson<{ terms: string[] }>(
      [
        {
          role: "system",
          content:
            'Expand the search query into related terms and synonyms for retrieval over an incident/report corpus. Return JSON {"terms": ["..."]} with at most 8 terms including the originals.',
        },
        { role: "user", content: data.query },
      ],
      { model: MODELS.fast, fallback: { terms: [data.query] } },
    );
    const terms = Array.from(new Set([data.query, ...(expansion.terms ?? [])])).slice(0, 8);

    const tsQuery = terms
      .map((t) => t.trim().split(/\s+/).join(" & "))
      .filter(Boolean)
      .join(" | ");

    const { data: matches } = await supabase
      .from("source_chunks")
      .select("id, locator, content")
      .eq("source_id", data.sourceId)
      .textSearch("tsv", tsQuery, { config: "english" })
      .limit(20);

    const { data: allChunks } = await supabase
      .from("source_chunks")
      .select("id, locator, content")
      .eq("source_id", data.sourceId)
      .order("ordinal");

    const pool = (matches?.length ? matches : (allChunks ?? [])) as Array<{
      id: string;
      locator: string;
      content: string;
    }>;

    const ranked = pool
      .map((c) => ({
        ...c,
        score: Math.max(...terms.map((t) => overlapScore(t, c.content)), 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return { terms, results: ranked };
  });
