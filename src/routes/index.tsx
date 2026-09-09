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
import { useI18n } from "@/context/language-context";
import { LanguageSwitcher } from "@/components/language-switcher";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ContentForge — Transform Faster. Verify Before You Trust." },
      {
        name: "description",
        content:
          "One source, many audiences, every claim traceable. ContentForge turns reports and advisories into audience-ready artefacts with fact locking, evidence tracing and a human approval gate.",
      },
      {
        property: "og:title",
        content: "ContentForge — Transform Faster. Verify Before You Trust.",
      },
      {
        property: "og:description",
        content:
          "Automated content transformation with fact locking, claim-level evidence and a mandatory human approval gate.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { t } = useI18n();

  const PILLARS = [
    {
      icon: Layers,
      title: t("landing.intakeTitle", "Multimodal intake"),
      body: t(
        "landing.intakeDesc",
        "Reports, advisories, pasted text, images and free-form requests enter one pipeline with a single understanding stage.",
      ),
    },
    {
      icon: FileStack,
      title: t("landing.transformTitle", "Transformation"),
      body: t(
        "landing.transformDesc",
        "One source becomes an executive brief, a technical advisory and a public advisory — same facts, different voice.",
      ),
    },
    {
      icon: ShieldCheck,
      title: t("landing.trustTitle", "Trust layer"),
      body: t(
        "landing.trustDesc",
        "Fact lock, grounding, evidence coverage, audience fit and a consistency guard across every artefact from the source.",
      ),
    },
    {
      icon: UserCheck,
      title: t("landing.humanTitle", "Human control"),
      body: t(
        "landing.humanDesc",
        "Nothing is distributed without an explicit approval, and every action lands in a hash-chained audit trail.",
      ),
    },
  ];

  const FLOW = [
    t("Source"),
    t("Understand"),
    t("Lock facts"),
    t("Retrieve evidence"),
    t("Intent"),
    t("Generate"),
    t("Verify"),
    t("Trace"),
    t("Review"),
    t("Approve"),
    t("Distribute"),
    t("Audit"),
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="font-mono text-sm font-semibold tracking-[0.22em] text-foreground">
            Content<span className="text-ember">·</span>Forge
          </span>
          <div className="flex items-center gap-3 md:gap-5">
            <LanguageSwitcher />
            <Link
              to="/architecture"
              className="hidden sm:inline-block font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("nav.architecture", "Architecture")}
            </Link>
            <Link
              to="/auth"
              className="rounded-sm border border-ember/50 bg-ember/10 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-ember transition-colors hover:bg-ember/20"
            >
              {t("auth.signin", "Sign in")}
            </Link>
          </div>
        </div>
      </header>

      <section className="grid-backdrop border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <p className="label-mono">
            {t(
              "brand.sih",
              "Smart India Hackathon 2026 · PS 26154 · Gen AI content transformation",
            )}
          </p>
          <h1 className="mt-6 max-w-3xl text-5xl leading-[1.05] font-semibold text-foreground md:text-6xl">
            {t("landing.heroTitle", "Transform faster. Verify before you trust.")}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            {t(
              "landing.heroSub",
              "ContentForge turns one piece of received information into audience-ready, fact-grounded, human-approved communication — with the evidence for every sentence one click away.",
            )}
          </p>
          <p className="mt-4 max-w-2xl font-mono text-sm text-muted-foreground">
            {t("brand.tagline", "Verified content transformation")} ·{" "}
            {t("AI should automate the work, not automate responsibility.")}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-sm bg-ember px-5 py-3 font-mono text-xs font-semibold uppercase tracking-widest text-ember-foreground transition-opacity hover:opacity-90"
            >
              {t("landing.launchConsole", "Try the demo")} <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/architecture"
              className="inline-flex items-center gap-2 rounded-sm border border-border px-5 py-3 font-mono text-xs uppercase tracking-widest text-foreground transition-colors hover:bg-surface-raised"
            >
              {t("landing.viewArch", "Explore the workflow")}
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="label-mono">
            {t("landing.flowTitle", "One source → many audiences → verified outputs")}
          </p>
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
              title: t("Facts are locked before generation"),
              body: t(
                "Critical values — dates, severity, counts, recommended actions — are extracted and protected first. Every draft is checked against that lock, and a conflict stops the approval.",
              ),
            },
            {
              icon: ScanSearch,
              title: t("Every sentence opens its source"),
              body: t(
                "Each generated sentence is matched to an indexed passage of the original document and shows exactly where it came from.",
              ),
            },
            {
              icon: GitBranch,
              title: t("A guard against drift"),
              body: t(
                "When one source produces three artefacts, they are cross-checked against each other for contradicting facts before anything ships.",
              ),
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
            {t("brand.title", "ContentForge")} · {t("brand.sih", "SIH 2026 PS 26154")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("Sample scenarios in this prototype are fictional and clearly labelled.")}
          </p>
        </div>
      </footer>
    </div>
  );
}
