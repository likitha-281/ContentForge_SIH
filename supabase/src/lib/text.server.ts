// Deterministic text utilities used by the pipeline and the trust engine.
// Nothing here guesses: every score is computed from the actual strings.

export type Chunk = { ordinal: number; locator: string; content: string };

const STOP = new Set([
  "the","a","an","of","and","or","to","in","on","for","with","is","are","was","were","be","been",
  "by","at","as","that","this","it","its","from","has","have","had","not","no","which","their",
  "there","were","will","would","can","could","should","may","also","than","then","these","those",
]);

/** Split a document into locatable passages (section headings when present). */
export function chunkDocument(text: string): Chunk[] {
  const normalised = text.replace(/\r\n/g, "\n").trim();
  const blocks = normalised.split(/\n{2,}/).filter((b) => b.trim().length > 0);
  const chunks: Chunk[] = [];
  let currentSection = "";
  let paragraphInSection = 0;

  blocks.forEach((block) => {
    const trimmed = block.trim();
    const heading = trimmed.match(/^(section\s+\d+[.:)]?\s*[^\n]*)/i);
    if (heading) {
      currentSection = heading[1].replace(/\s+/g, " ").trim();
      paragraphInSection = 0;
    }
    paragraphInSection += 1;
    const locator = currentSection
      ? `${currentSection} · ¶${paragraphInSection}`
      : `¶${chunks.length + 1}`;
    chunks.push({ ordinal: chunks.length, locator, content: trimmed });
  });

  return chunks.length > 0 ? chunks : [{ ordinal: 0, locator: "¶1", content: normalised }];
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .flatMap((line) => {
      const stripped = line.replace(/^[#>\-*\s\d.]+/, "").trim();
      if (!stripped) return [];
      return stripped.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/);
    })
    .map((s) => s.trim())
    .filter((s) => s.length > 25);
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) ?? []).filter(
    (t) => t.length > 2 && !STOP.has(t),
  );
}

/** Overlap score between a sentence and a passage — 0..1, purely lexical. */
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
  const bonus = numbers.length > 0 ? (numberHits / numbers.length) * 0.15 : 0;
  return Math.min(1, base + bonus);
}

export function bestPassage<T extends { content: string }>(
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
