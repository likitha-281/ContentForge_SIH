// Deterministic, high-performance text utilities for arbitrarily large documents.
// Capable of processing 100,000+ word inputs with sliding window chunking and zero hallucination.

export type Chunk = { ordinal: number; locator: string; content: string; byteOffset?: number };

const STOP = new Set([
  "the","a","an","of","and","or","to","in","on","for","with","is","are","was","were","be","been",
  "by","at","as","that","this","it","its","from","has","have","had","not","no","which","their",
  "there","were","will","would","can","could","should","may","also","than","then","these","those",
]);

const MAX_CHUNK_CHARS = 1200;
const OVERLAP_CHARS = 150;

/** Split a document of any arbitrary size into locatable, indexed passages. */
export function chunkDocument(text: string): Chunk[] {
  const normalised = text.replace(/\r\n/g, "\n").trim();
  if (!normalised) return [{ ordinal: 0, locator: "¶1", content: "" }];

  const blocks = normalised.split(/\n{2,}/).filter((b) => b.trim().length > 0);
  const chunks: Chunk[] = [];
  let currentSection = "";
  let sectionIndex = 1;
  let paragraphInSection = 0;

  for (const block of blocks) {
    const trimmed = block.trim();
    // Detect headings or structured markers (e.g. "Section 1", "1. Overview", "CHAPTER 2", etc.)
    const heading = trimmed.match(/^(?:section\s+\d+|[0-9]+\.\s+[A-Z\s]+|chapter\s+\d+|article\s+\d+)[.:)]?\s*[^\n]*/i);
    if (heading) {
      currentSection = heading[0].replace(/\s+/g, " ").trim().slice(0, 40);
      paragraphInSection = 0;
      sectionIndex += 1;
    }
    paragraphInSection += 1;

    // If a paragraph is exceptionally large (> 1200 chars), split with sliding window
    if (trimmed.length > MAX_CHUNK_CHARS) {
      let offset = 0;
      let subChunkIndex = 1;
      while (offset < trimmed.length) {
        const slice = trimmed.slice(offset, offset + MAX_CHUNK_CHARS);
        const locator = currentSection
          ? `[S${sectionIndex}-P${paragraphInSection}.${subChunkIndex}]`
          : `[P${chunks.length + 1}]`;

        chunks.push({
          ordinal: chunks.length,
          locator,
          content: slice.trim(),
          byteOffset: offset,
        });

        offset += MAX_CHUNK_CHARS - OVERLAP_CHARS;
        subChunkIndex += 1;
      }
    } else {
      const locator = currentSection
        ? `[S${sectionIndex}-P${paragraphInSection}]`
        : `[P${chunks.length + 1}]`;

      chunks.push({
        ordinal: chunks.length,
        locator,
        content: trimmed,
      });
    }
  }

  return chunks.length > 0 ? chunks : [{ ordinal: 0, locator: "[P1]", content: normalised.slice(0, MAX_CHUNK_CHARS) }];
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .flatMap((line) => {
      const stripped = line.replace(/^[#>\-*\s\d.]+/, "").trim();
      if (!stripped) return [];
      // Split on standard sentence delimiters
      return stripped.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/);
    })
    .map((s) => s.trim())
    .filter((s) => s.length >= 15);
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) ?? []).filter(
    (t) => t.length > 2 && !STOP.has(t),
  );
}

/** Overlap score between a sentence and a passage — 0..1, purely lexical & deterministic. */
export function overlapScore(sentence: string, passage: string): number {
  const a = new Set(tokenize(sentence));
  const b = new Set(tokenize(passage));
  if (a.size === 0) return 0;
  let hits = 0;
  a.forEach((token) => {
    if (b.has(token)) hits += 1;
  });
  const numbers = sentence.match(/\d[\d,.]*/g) ?? [];
  const numberHits = numbers.filter((n) => passage.includes(n)).length;
  const base = hits / a.size;
  const bonus = numbers.length > 0 ? (numberHits / numbers.length) * 0.2 : 0;
  return Math.min(1, base + bonus);
}

export function bestPassage<T extends { content: string; locator?: string }>(
  sentence: string,
  passages: T[],
): { passage: T | null; score: number } {
  let best: T | null = null;
  let score = 0;
  for (const p of passages) {
    const s = overlapScore(sentence, p.content);
    if (s > score) {
      score = s;
      best = p;
    }
  }
  return { passage: best, score };
}

export function extractNumbers(text: string): string[] {
  return (text.match(/\b\d[\d,]*(?:\.\d+)?\b/g) ?? []).map((n) => n.replace(/,/g, ""));
}
