import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Code2,
  Database,
  FileCheck,
  Globe,
  Layers,
  Lock,
  Network,
  Radio,
  Send,
  ShieldCheck,
  Terminal,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/architecture")({
  head: () => ({
    meta: [
      { title: "Architecture & System Design — INTELLI-FORGE" },
      {
        name: "description",
        content:
          "System architecture, mathematical verification mechanics, and backend extensibility guide for Smart India Hackathon 2026 Problem Statement 26154.",
      },
    ],
  }),
  component: ArchitecturePage,
});

const PIPELINE_STAGES = [
  {
    num: "01",
    name: "Source Intake & Ingestion",
    role: "Intake",
    icon: Layers,
    description:
      "Ingests raw documents, circulars, and advisories in any language and arbitrary size. Normalizes text, computes document byte hashes, and registers a stateful tracking job in PostgreSQL.",
  },
  {
    num: "02",
    name: "Content Understanding & Passage Indexing",
    role: "Understanding",
    icon: Database,
    description:
      "Segments the document into deterministic passage chunks [S1-P1, S1-P2, ...], builds full-text search indexes, and extracts candidate facts, claims, and typed entities (systems, organizations, dates).",
  },
  {
    num: "03",
    name: "Mathematical Fact Locking",
    role: "Fact Lock",
    icon: Lock,
    description:
      "Critical values (casualty counts, CVE IDs, affected systems, mandatory deadlines) are locked. These values are mathematically enforced and injected verbatim into all downstream prompts.",
  },
  {
    num: "04",
    name: "Audience Intent Structuring",
    role: "Intent Parsing",
    icon: Zap,
    description:
      "Translates natural language operator instructions into structured audience specifications (Executive Brief, Technical SOC Advisory, Public Citizen Alert) with defined tone, detail level, and target language.",
  },
  {
    num: "05",
    name: "Multi-Audience Streaming Generation",
    role: "Generation",
    icon: Code2,
    description:
      "Generates audience-tailored drafts in parallel streams, constrained exclusively to indexed source passages and locked facts. Partial tokens are saved to the database in real time.",
  },
  {
    num: "06",
    name: "Trust & Quality Verification Engine",
    role: "Verification",
    icon: ShieldCheck,
    description:
      "Every generated sentence is segmented and mapped back to source passages with lexical overlap scoring and model adjudication. Runs 7 automated trust checks and detects fact conflicts.",
  },
  {
    num: "07",
    name: "Human Review & Approval Gate",
    role: "Human Control",
    icon: FileCheck,
    description:
      "Enforces a strict approval barrier. Approval is blocked if open fact conflicts exist. Reviewers can inspect sentence evidence, request AI corrections, or record audited overrides.",
  },
  {
    num: "08",
    name: "Multi-Channel Distribution Readiness",
    role: "Distribution",
    icon: Radio,
    description:
      "Formats approved communications into channel-specific payloads (Web Portal HTML embed, Email Advisory with MIME headers, Signed JSON REST Webhook with HMAC token, SMS/Broadcast).",
  },
  {
    num: "09",
    name: "Cryptographic SHA-256 Audit Trail",
    role: "Immutability",
    icon: Activity,
    description:
      "Every intake, fact lock, edit, approval, and distribution is recorded in an append-only, tamper-evident SHA-256 blockchain-style hash chain. Integrity can be verified sequentially from Genesis.",
  },
];

const EXTENSION_HOOKS = [
  {
    title: "1. Vector Database & Semantic Embeddings",
    location: "src/lib/intent.functions.ts & src/lib/verify.server.ts",
    comment: "Replace PostgreSQL full-text search (tsv) with pgvector (vector(1536)) or Pinecone/Qdrant embeddings for semantic retrieval.",
  },
  {
    title: "2. Self-Hosted Local LLM Gateway (Ollama / vLLM)",
    location: "src/lib/ai.server.ts",
    comment: "Switch GATEWAY endpoint to http://localhost:11434/v1/chat/completions (Ollama) or custom vLLM instances for air-gapped sovereign deployment.",
  },
  {
    title: "3. Live Webhook Dispatch & Notification Microservices",
    location: "src/lib/review.functions.ts (prepareDistribution)",
    comment: "Hook real HTTP dispatch to national emergency broadcast APIs, Gov SMS Gateways, or CERT-In Slack/Teams webhooks.",
  },
  {
    title: "4. Multilingual OCR & Multi-Modal Document Extraction",
    location: "src/lib/pipeline.functions.ts (analyzeSource)",
    comment: "Integrate Tesseract OCR or Vision LLMs to ingest scanned government PDFs, press release photos, and audio broadcasts.",
  },
];

const DELIBERATE_HONESTY_NOTES = [
  "Plain-text extraction in this prototype: Text is extracted directly from files/pasted input without simulated OCR.",
  "Deterministic full-text + lexical retrieval: Retrieval uses PostgreSQL tsvector plus overlap ranking, clearly labeled rather than pretending to use non-existent vector embeddings.",
  "Real database persistence: Every status transition, chunk locator, and audit block is written to PostgreSQL in real time.",
  "Air-gap capable: Fallback heuristics ensure zero runtime failure even in offline environments without external internet connectivity.",
];

function ArchitecturePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      {/* Top Header */}
      <div className="border-b border-border pb-8">
        <span className="label-mono text-ember">System Architecture &amp; Technical Report</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          INTELLI-FORGE System Design
        </h1>
        <p className="mt-1 font-mono text-xs text-muted-foreground">
          Smart India Hackathon 2026 · Problem Statement 26154
        </p>
        <p className="mt-4 text-sm text-muted-foreground max-w-3xl leading-relaxed">
          INTELLI-FORGE solves the critical problem of transforming raw, high-stakes incident intelligence
          into multi-audience communications without hallucinations, fact drift, or unauthorized distribution.
        </p>
      </div>

      {/* 9-Stage Pipeline Architecture */}
      <section className="mt-12">
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Network className="size-5 text-ember" />
            The 9-Stage Verified Transformation Pipeline
          </h2>
          <span className="label-mono">End-to-End Workflow</span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
          {PIPELINE_STAGES.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.num}
                className="rounded-sm border border-border bg-surface p-5 flex flex-col justify-between hover:border-ember/60 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-border">
                    <span className="font-mono text-xs font-bold text-ember">STAGE {stage.num}</span>
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold text-foreground">{stage.name}</h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    {stage.description}
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-border/40">
                  <span className="label-mono text-[9px] text-foreground/70">{stage.role}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Backend Extensibility & Code Integration Guide */}
      <section className="mt-14 rounded-sm border border-border bg-surface p-6">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Terminal className="size-5 text-ember" />
          Backend Extensibility &amp; Enterprise Hooks
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Clear integration points in the codebase for production microservices and self-hosted models:
        </p>

        <div className="mt-5 space-y-4">
          {EXTENSION_HOOKS.map((hook) => (
            <div key={hook.title} className="rounded border border-border/80 bg-background p-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-foreground">{hook.title}</span>
                <code className="rounded bg-surface px-2 py-0.5 font-mono text-[10px] text-ember">
                  {hook.location}
                </code>
              </div>
              <p className="mt-2 font-mono text-[11px] text-muted-foreground/90">{hook.comment}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Honest Technical Disclosures */}
      <section className="mt-10 rounded-sm border border-attention/40 bg-attention/5 p-6">
        <h2 className="text-base font-semibold text-attention flex items-center gap-2">
          <ShieldCheck className="size-4" />
          Hackathon Integrity &amp; Transparency Disclosures
        </h2>
        <ul className="mt-3 space-y-2 text-xs text-muted-foreground leading-relaxed">
          {DELIBERATE_HONESTY_NOTES.map((note, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-attention font-mono">✓</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Bottom Navigation */}
      <div className="mt-12 flex items-center justify-between border-t border-border pt-6">
        <Link to="/" className="label-mono hover:text-foreground">
          ← Back to Homepage
        </Link>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-sm bg-ember px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-ember-foreground hover:bg-ember/90"
        >
          Open Operator Dashboard
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
