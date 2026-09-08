import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Database,
  FileCheck,
  FileText,
  History,
  Layers,
  Sparkles,
  TriangleAlert,
  Upload,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { TrustBadge } from "@/components/trust";
import { useLiveQuery } from "@/hooks/use-live-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/context/language-context";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Operator Dashboard — INTELLI-FORGE" },
      {
        name: "description",
        content:
          "Live counts of sources, artefacts awaiting review, verified and flagged claims across your workspace.",
      },
      { property: "og:title", content: "Operator Dashboard — INTELLI-FORGE" },
      {
        property: "og:description",
        content: "Live status of your content transformation pipeline.",
      },
    ],
  }),
  component: Dashboard,
});

async function loadDashboard() {
  const [sources, outputs, claims, conflicts, audit] = await Promise.all([
    supabase
      .from("sources")
      .select("id, title, status, created_at, is_demo")
      .order("created_at", { ascending: false }),
    supabase
      .from("outputs")
      .select(
        "id, output_type, audience, status, verification_status, evidence_coverage, created_at, source_id",
      )
      .order("created_at", { ascending: false }),
    supabase.from("output_claims").select("id, grounded"),
    supabase.from("fact_conflicts").select("id, status"),
    supabase
      .from("audit_events")
      .select("id, action, actor, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return {
    sources: sources.data ?? [],
    outputs: outputs.data ?? [],
    claims: claims.data ?? [],
    conflicts: conflicts.data ?? [],
    audit: audit.data ?? [],
  };
}

export function Dashboard() {
  const { t } = useI18n();
  const { data, isLoading } = useLiveQuery("dashboard" as never, loadDashboard, [
    "sources",
    "outputs",
    "output_claims",
    "fact_conflicts",
    "audit_events",
  ]);

  const outputs = data?.outputs ?? [];
  const awaitingReviewCount = outputs.filter((o) =>
    ["generated", "edited"].includes(o.status),
  ).length;
  const verifiedClaimsCount = (data?.claims ?? []).filter((c) => c.grounded).length;
  const flaggedClaimsCount = (data?.claims ?? []).filter((c) => !c.grounded).length;
  const conflictsCount = (data?.conflicts ?? []).filter((c) =>
    ["open", "suggested"].includes(c.status),
  ).length;
  const approvedCount = outputs.filter((o) => o.status === "approved").length;

  const stats = [
    {
      label: t("dash.statSources", "Total Sources"),
      value: data?.sources.length ?? 0,
      icon: Database,
      accent: "text-foreground",
      border: "border-border/80",
    },
    {
      label: t("dash.statAwaitingReview", "Awaiting Review"),
      value: awaitingReviewCount,
      icon: Clock,
      accent: "text-ember",
      border: awaitingReviewCount > 0 ? "border-ember/40 bg-ember/5" : "border-border/80",
    },
    {
      label: t("dash.statVerifiedClaims", "Verified Claims"),
      value: verifiedClaimsCount,
      icon: FileCheck,
      accent: "text-emerald-400",
      border: "border-emerald-500/20",
    },
    {
      label: t("dash.statFlaggedClaims", "Flagged Claims"),
      value: flaggedClaimsCount,
      icon: TriangleAlert,
      accent: flaggedClaimsCount > 0 ? "text-amber-400" : "text-muted-foreground",
      border: flaggedClaimsCount > 0 ? "border-amber-500/30" : "border-border/80",
    },
    {
      label: t("dash.statOpenConflicts", "Open Fact Conflicts"),
      value: conflictsCount,
      icon: TriangleAlert,
      accent: conflictsCount > 0 ? "text-rose-400" : "text-muted-foreground",
      border: conflictsCount > 0 ? "border-rose-500/30" : "border-border/80",
    },
    {
      label: t("dash.statApproved", "Approved Artefacts"),
      value: approvedCount,
      icon: CheckCircle2,
      accent: "text-emerald-400",
      border: "border-border/80",
    },
  ];

  return (
    <div className="min-h-full pb-12">
      <PageHeader
        eyebrow={t("dash.eyebrow", "Central Pipeline Overview")}
        title={t("dash.title", "Operator Dashboard")}
        description={t(
          "dash.desc",
          "Real-time synchronized pipeline metrics, active transformations, and claim verification status.",
        )}
        actions={
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-md bg-ember px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-ember-foreground shadow-sm transition-all hover:bg-ember/90"
          >
            <Upload className="size-3.5" /> {t("dash.newSource", "New Source Intake")}
          </Link>
        }
      />

      {/* Metrics Row */}
      <div className="p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl border bg-surface/80 p-4 shadow-xs backdrop-blur transition-all hover:bg-surface hover:shadow-md ${stat.border}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
                <stat.icon className={`size-4 ${stat.accent}`} />
              </div>
              <p className={`mt-3 font-mono text-3xl font-bold ${stat.accent}`}>
                {isLoading ? "—" : stat.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Grid Content Sections */}
      <div className="grid gap-6 px-6 lg:grid-cols-2">
        {/* Recent Sources Card */}
        <section className="rounded-xl border border-border/80 bg-surface/80 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Database className="size-4 text-ember" />
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                {t("dash.recentSources", "Recent Ingested Sources")}
              </h2>
            </div>
            <Link
              to="/upload"
              className="text-[11px] font-mono text-ember hover:underline flex items-center gap-1"
            >
              {t("dash.intake", "Intake")} <ArrowUpRight className="size-3" />
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {(data?.sources ?? []).slice(0, 5).map((source) => (
              <Link
                key={source.id}
                to="/workspace/$sourceId"
                params={{ sourceId: source.id }}
                className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-raised/80 group"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground group-hover:text-ember transition-colors">
                    {source.title}
                  </p>
                  <p className="label-mono mt-0.5">
                    {source.status} ·{" "}
                    {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}
                  </p>
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground group-hover:text-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            ))}

            {!isLoading && (data?.sources ?? []).length === 0 && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("dash.noSources", "No source documents ingested yet.")}
                </p>
                <Link
                  to="/upload"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-surface-raised px-3 py-1.5 text-xs font-mono text-ember border border-ember/30 hover:bg-ember/15 transition-colors"
                >
                  <Upload className="size-3" /> {t("dash.ingestFirst", "Ingest your first source")}
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Recent Artefact Transformations Card */}
        <section className="rounded-xl border border-border/80 bg-surface/80 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-ember" />
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                {t("dash.recentOutputs", "Recent Transformations")}
              </h2>
            </div>
            <Link
              to="/outputs"
              className="text-[11px] font-mono text-ember hover:underline flex items-center gap-1"
            >
              {t("dash.allArtefacts", "All Artefacts")} <ArrowUpRight className="size-3" />
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {outputs.slice(0, 5).map((output) => (
              <Link
                key={output.id}
                to="/outputs/$outputId"
                params={{ outputId: output.id }}
                className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-surface-raised/80 group"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground group-hover:text-ember transition-colors">
                    {output.output_type}
                  </p>
                  <p className="label-mono mt-0.5">
                    {output.audience} · Status: {output.status}
                  </p>
                </div>
                <TrustBadge state={output.verification_status} />
              </Link>
            ))}

            {!isLoading && outputs.length === 0 && (
              <div className="px-5 py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {t("dash.noOutputs", "No artefacts generated yet.")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(
                    "dash.ingestHelp",
                    "Ingest a source document and generate fact-locked outputs.",
                  )}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Audit & Compliance Log Card */}
        <section className="rounded-xl border border-border/80 bg-surface/80 shadow-sm backdrop-blur lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border/80 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <History className="size-4 text-ember" />
              <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">
                {t("dash.recentAudit", "Cryptographic Audit Log")}
              </h2>
            </div>
            <Link
              to="/audit"
              className="text-[11px] font-mono text-ember hover:underline flex items-center gap-1"
            >
              {t("dash.fullLedger", "Full Ledger")} <ArrowUpRight className="size-3" />
            </Link>
          </div>

          <div className="divide-y divide-border/60">
            {(data?.audit ?? []).map((event) => (
              <div
                key={event.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="rounded-md border border-ember/30 bg-ember/10 px-2 py-0.5 font-mono text-[10px] font-bold text-ember">
                    {event.action}
                  </span>
                  <span className="text-muted-foreground truncate">{event.detail}</span>
                </div>
                <span className="label-mono text-muted-foreground shrink-0">
                  {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}

            {!isLoading && (data?.audit ?? []).length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                {t("dash.noAudit", "No activity recorded yet in cryptographic audit ledger.")}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
