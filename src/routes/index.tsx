import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  FileStack,
  GitBranch,
  Layers,
  Lock,
  ScanSearch,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "INTELLI-FORGE — Transform Faster. Verify Before You Trust." },
      {
        name: "description",
        content:
          "One source, many audiences, every claim traceable. INTELLI-FORGE turns reports and advisories into audience-ready artefacts with fact locking, evidence tracing and a human approval gate.",
      },
      { property: "og:title", content: "INTELLI-FORGE — Transform Faster. Verify Before You Trust." },
      {
        property: "og:description",
        content:
          "Automated content transformation with fact locking, claim-level evidence and a mandatory human approval gate.",
      },
    ],
  }),
  component: Landing,
});

const PILLARS = [
  {
    icon: Layers,
    title: "Multimodal intake",
    body: "Reports, advisories, pasted text, images and free-form requests enter one pipeline with a single understanding stage.",
  },
  {
    icon: FileStack,
    title: "Transformation",
    body: "One source becomes an executive brief, a technical advisory and a public advisory — same facts, different voice.",
  },
  {
    icon: ShieldCheck,
    title: "Trust layer",
    body: "Fact lock, grounding, evidence coverage, audience fit and a consistency guard across every artefact from the source.",
  },
  {
    icon: UserCheck,
    title: "Human control",
    body: "Nothing is distributed without an explicit approval, and every action lands in a hash-chained audit trail.",
  },
];

const FLOW = [
  "Source",
  "Understand",
  "Lock facts",
  "Retrieve evidence",
  "Intent",
  "Generate",
  "Verify",
  "Trace",
  "Review",
  "Approve",
  "Distribute",
  "Audit",
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-mono text-sm font-semibold tracking-[0.22em] text-foreground">
            INTELLI<span className="text-ember">-</span>FORGE
          </span>
          <div className="flex items-center gap-5">
            <Link
              to="/architecture"
              className="font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              Architecture
            </Link>
            <Link
              to="/auth"
              className="rounded-sm border border-ember/50 bg-ember/10 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-ember transition-colors hover:bg-ember/20"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <section className="grid-backdrop border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="label-mono">Smart India Hackathon 2026 · PS 26154 · Gen AI content transformation</p>
          <h1 className="mt-6 max-w-3xl text-5xl leading-[1.05] font-semibold text-foreground md:text-6xl">
            Transform faster.
            <br />
            <span className="text-ember">Verify before you trust.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            INTELLI-FORGE turns one piece of received information into audience-ready,
            fact-grounded, human-approved communication — with the evidence for every sentence one
            click away.
          </p>
          <p className="mt-4 max-w-2xl font-mono text-sm text-muted-foreground">
            AI should automate the work, not automate responsibility.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-sm bg-ember px-5 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-ember-foreground transition-opacity hover:opacity-90"
            >
              Try the demo <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/architecture"
              className="inline-flex items-center gap-2 rounded-sm border border-border px-5 py-3 font-mono text-xs uppercase tracking-widest text-foreground transition-colors hover:bg-surface-raised"
            >
              Explore the workflow
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="label-mono">One source → many audiences → verified outputs</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-3">
            {FLOW.map((step, i) => (
              <span key={step} className="flex items-center gap-2">
                <span className="rounded-sm border border-border bg-background px-2.5 py-1 font-mono text-[11px] tracking-wide text-foreground">
                  {step}
                </span>
                {i < FLOW.length - 1 && <span className="text-border">→</span>}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-px overflow-hidden rounded-sm border border-border bg-border md:grid-cols-2">
          {PILLARS.map((pillar) => (
            <div key={pillar.title} className="bg-surface p-8">
              <pillar.icon className="size-5 text-ember" />
              <h2 className="mt-4 text-lg font-semibold text-foreground">{pillar.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
          {[
            {
              icon: Lock,
              title: "Facts are locked before generation",
              body: "Critical values — dates, severity, counts, recommended actions — are extracted and protected first. Every draft is checked against that lock, and a conflict stops the approval.",
            },
            {
              icon: ScanSearch,
              title: "Every sentence opens its source",
              body: "Each generated sentence is matched to an indexed passage of the original document and shows exactly where it came from.",
            },
            {
              icon: GitBranch,
              title: "A guard against drift",
              body: "When one source produces three artefacts, they are cross-checked against each other for contradicting facts before anything ships.",
            },
          ].map((item) => (
            <div key={item.title}>
              <item.icon className="size-5 text-ember" />
              <h3 className="mt-3 text-base font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8">
          <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            INTELLI-FORGE · prototype for SIH 2026 PS 26154
          </p>
          <p className="text-xs text-muted-foreground">
            Sample scenarios in this prototype are fictional and clearly labelled.
          </p>
        </div>
      </footer>
    </div>
  );
}
