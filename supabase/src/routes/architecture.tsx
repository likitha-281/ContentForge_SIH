import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture & honesty notes — INTELLI-FORGE" },
      {
        name: "description",
        content:
          "How INTELLI-FORGE works end to end: intake, understanding, fact lock, retrieval, generation, verification, review, audit — and what is not implemented.",
      },
      { property: "og:title", content: "Architecture & honesty notes — INTELLI-FORGE" },
      {
        property: "og:description",
        content: "The full INTELLI-FORGE pipeline, with an explicit list of what is and isn't implemented.",
      },
    ],
  }),
  component: ArchitecturePage,
});

const LAYERS = [
  {
    name: "Intake",
    detail:
      "Pasted text and plain-text files are stored as sources with a job record. Every stage transition is persisted, so the processing screen reflects real database state, not a timer.",
  },
  {
    name: "Understanding",
    detail:
      "A server-side model call produces the summary, candidate facts, claims and entities. Every extracted quote is located back into the chunked document, so each item carries a section/paragraph locator.",
  },
  {
    name: "Fact lock",
    detail:
      "Critical values (counts, dates, severities, names) are locked before any generation happens. Locked facts are injected into generation prompts verbatim and re-checked after generation.",
  },
  {
    name: "Evidence retrieval",
    detail:
      "Postgres full-text search over indexed chunks, re-ranked with a deterministic lexical-overlap score that rewards numeric matches. Honest note: this is lexical retrieval, not vector embeddings — the gateway available to this prototype exposes no embedding endpoint, so nothing pretends to be semantic search.",
  },
  {
    name: "Generation",
    detail:
      "One streaming server route creates an artefact per requested audience, grounded only in retrieved passages and locked facts. Partial content is persisted while streaming.",
  },
  {
    name: "Trust & quality engine",
    detail:
      "Every generated sentence is traced to its best source passage; weak matches are adjudicated by a model call. Coverage is computed from actual traced sentences, never assigned. Locked facts are re-checked with a deterministic numeric backstop, plus audience-fit, format and cross-artefact consistency checks.",
  },
  {
    name: "Human control",
    detail:
      "Nothing can be approved while a fact conflict is open. Edits force re-verification. Approval, rejection and operator overrides are all recorded.",
  },
  {
    name: "Audit",
    detail:
      "Append-only, per-user hash-chained events. Updates and deletes are blocked by a database trigger, and the chain can be re-verified from the Audit page.",
  },
];

const NOT_IMPLEMENTED = [
  "PDF, DOCX, image, audio and video extraction — plain text only.",
  "Vector/embedding search — retrieval is full-text plus lexical re-ranking.",
  "Real external distribution — distribution prepares and stores a payload; nothing is sent to a live channel.",
  "External or third-party fact-checking services — all verification is against the uploaded source and its locked facts.",
];

function ArchitecturePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-14">
      <p className="label-mono">System design</p>
      <h1 className="mt-2 text-3xl font-semibold">Architecture &amp; honesty notes</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        INTELLI-FORGE runs on React with TanStack Start server functions, Postgres with row-level
        security, realtime subscriptions, and a server-side model gateway. No model key ever
        reaches the browser.
      </p>

      <div className="mt-10 space-y-px overflow-hidden rounded-sm border border-border bg-border">
        {LAYERS.map((layer, i) => (
          <div key={layer.name} className="bg-surface p-5">
            <p className="label-mono">
              {String(i + 1).padStart(2, "0")} · {layer.name}
            </p>
            <p className="mt-2 text-sm text-foreground">{layer.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-sm border border-attention/40 bg-attention/5 p-5">
        <p className="label-mono text-attention">Deliberately not implemented</p>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          {NOT_IMPLEMENTED.map((item) => (
            <li key={item}>· {item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-10">
        <Link to="/" className="label-mono hover:text-foreground">
          ← Back to overview
        </Link>
      </div>
    </div>
  );
}
