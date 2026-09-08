import { createFileRoute, Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpRight, Upload } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { TrustBadge } from "@/components/trust";
import { useLiveQuery } from "@/hooks/use-live-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Operator dashboard — INTELLI-FORGE" },
      {
        name: "description",
        content:
          "Live counts of sources, artefacts awaiting review, verified and flagged claims across your workspace.",
      },
      { property: "og:title", content: "Operator dashboard — INTELLI-FORGE" },
      { property: "og:description", content: "Live status of your content transformation pipeline." },
    ],
  }),
  component: Dashboard,
});

async function loadDashboard() {
  const [sources, outputs, claims, conflicts, audit] = await Promise.all([
    supabase.from("sources").select("id, title, status, created_at, is_demo").order("created_at", { ascending: false }),
    supabase
      .from("outputs")
      .select("id, output_type, audience, status, verification_status, evidence_coverage, created_at, source_id")
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

function Dashboard() {
  const { data, isLoading } = useLiveQuery("dashboard" as never, loadDashboard, [
    "sources",
    "outputs",
    "output_claims",
    "fact_conflicts",
    "audit_events",
  ]);

  const outputs = data?.outputs ?? [];
  const stats = [
    { label: "Sources", value: data?.sources.length ?? 0 },
    {
      label: "Awaiting review",
      value: outputs.filter((o) => ["generated", "edited"].includes(o.status)).length,
    },
    { label: "Verified claims", value: (data?.claims ?? []).filter((c) => c.grounded).length },
    {
      label: "Flagged claims",
      value: (data?.claims ?? []).filter((c) => !c.grounded).length,
    },
    {
      label: "Open fact conflicts",
      value: (data?.conflicts ?? []).filter((c) => ["open", "suggested"].includes(c.status)).length,
    },
    { label: "Approved", value: outputs.filter((o) => o.status === "approved").length },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Operator console"
        title="Dashboard"
        description="Counts read straight from the database and update live as the pipeline runs."
        actions={
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-sm bg-ember px-4 py-2 font-mono text-xs uppercase tracking-widest text-ember-foreground"
          >
            <Upload className="size-3.5" /> New source
          </Link>
        }
      />

      <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-background p-6">
            <p className="label-mono">{stat.label}</p>
            <p className="mt-2 font-mono text-3xl text-foreground">
              {isLoading ? "—" : stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-2">
        <section className="rounded-sm border border-border bg-surface">
          <h2 className="border-b border-border px-5 py-3 text-sm font-semibold">
            Recent sources
          </h2>
          <div className="divide-y divide-border">
            {(data?.sources ?? []).slice(0, 6).map((source) => (
              <Link
                key={source.id}
                to="/workspace/$sourceId"
                params={{ sourceId: source.id }}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-raised"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{source.title}</p>
                  <p className="label-mono mt-0.5">
                    {source.status} ·{" "}
                    {formatDistanceToNow(new Date(source.created_at), { addSuffix: true })}
                  </p>
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
            {!isLoading && (data?.sources ?? []).length === 0 && (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                No sources yet.{" "}
                <Link to="/upload" className="text-ember underline-offset-4 hover:underline">
                  Add one or load the sample scenario.
                </Link>
              </p>
            )}
          </div>
        </section>

        <section className="rounded-sm border border-border bg-surface">
          <h2 className="border-b border-border px-5 py-3 text-sm font-semibold">
            Recent transformations
          </h2>
          <div className="divide-y divide-border">
            {outputs.slice(0, 6).map((output) => (
              <Link
                key={output.id}
                to="/outputs/$outputId"
                params={{ outputId: output.id }}
                className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-raised"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{output.output_type}</p>
                  <p className="label-mono mt-0.5">{output.audience} · {output.status}</p>
                </div>
                <TrustBadge state={output.verification_status} />
              </Link>
            ))}
            {!isLoading && outputs.length === 0 && (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                No artefacts generated yet.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-sm border border-border bg-surface lg:col-span-2">
          <h2 className="border-b border-border px-5 py-3 text-sm font-semibold">
            Recent audit events
          </h2>
          <div className="divide-y divide-border">
            {(data?.audit ?? []).map((event) => (
              <div key={event.id} className="flex flex-wrap items-baseline gap-3 px-5 py-2.5">
                <span className="font-mono text-xs text-ember">{event.action}</span>
                <span className="text-sm text-muted-foreground">{event.detail}</span>
                <span className="label-mono ml-auto">
                  {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
            {!isLoading && (data?.audit ?? []).length === 0 && (
              <p className="px-5 py-6 text-sm text-muted-foreground">No activity recorded yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
