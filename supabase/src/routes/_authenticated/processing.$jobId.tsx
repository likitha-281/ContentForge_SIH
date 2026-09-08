import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, CircleDashed, Lock, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DemoNotice } from "@/components/trust";
import { useLiveQuery } from "@/hooks/use-live-query";
import { supabase } from "@/integrations/supabase/client";
import { analyzeSource } from "@/lib/pipeline.functions";

export const Route = createFileRoute("/_authenticated/processing/$jobId")({
  head: () => ({
    meta: [
      { title: "Processing & understanding — INTELLI-FORGE" },
      {
        name: "description",
        content: "Watch each pipeline stage complete live: parsing, understanding, fact lock, indexing.",
      },
      { property: "og:title", content: "Processing & understanding — INTELLI-FORGE" },
      { property: "og:description", content: "Live view of the INTELLI-FORGE understanding pipeline." },
    ],
  }),
  component: ProcessingPage,
});

type Stage = { key: string; label: string; status: string; note?: string };

function ProcessingPage() {
  const { jobId } = useParams({ from: "/_authenticated/processing/$jobId" });
  const analyze = useServerFn(analyzeSource);
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  const { data } = useLiveQuery(
    ["job", jobId] as never,
    async () => {
      const { data: job } = await supabase
        .from("jobs")
        .select("id, source_id, status, stages, error")
        .eq("id", jobId)
        .single();
      if (!job) return null;
      const [source, facts, claims, entities] = await Promise.all([
        supabase.from("sources").select("id, title, summary, status, is_demo").eq("id", job.source_id).single(),
        supabase.from("facts").select("id, label, value, is_locked, locator").eq("source_id", job.source_id),
        supabase.from("claims").select("id, text, locator").eq("source_id", job.source_id),
        supabase.from("entities").select("id, name, entity_type").eq("source_id", job.source_id),
      ]);
      return {
        job,
        source: source.data,
        facts: facts.data ?? [],
        claims: claims.data ?? [],
        entities: entities.data ?? [],
      };
    },
    ["jobs", "facts", "claims", "entities", "sources"],
  );

  useEffect(() => {
    if (started.current || !data?.job) return;
    if (data.job.status === "queued") {
      started.current = true;
      analyze({ data: { jobId } }).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "Pipeline failed.";
        setError(message);
        toast.error(message);
      });
    }
  }, [data?.job, analyze, jobId]);

  const stages = (data?.job?.stages as Stage[] | undefined) ?? [];
  const ready = data?.job?.status === "ready";

  return (
    <div>
      <PageHeader
        eyebrow="Stage 2 · Understanding"
        title={data?.source?.title ?? "Processing source"}
        description="What does it contain? Each stage below is written to the database as it finishes and streamed to this screen."
        actions={
          ready && data?.source ? (
            <Link
              to="/workspace/$sourceId"
              params={{ sourceId: data.source.id }}
              className="rounded-sm bg-ember px-4 py-2 font-mono text-xs uppercase tracking-widest text-ember-foreground"
            >
              Open transformation workspace
            </Link>
          ) : null
        }
      />

      <div className="space-y-6 p-6">
        {data?.source?.is_demo && <DemoNotice />}
        {(error || data?.job?.error) && (
          <div className="rounded-sm border border-conflict/50 bg-conflict/10 px-4 py-3 text-sm text-conflict">
            {error ?? data?.job?.error}
          </div>
        )}

        <section className="rounded-sm border border-border bg-surface">
          <h2 className="border-b border-border px-5 py-3 text-sm font-semibold">Pipeline</h2>
          <ol className="divide-y divide-border">
            {stages.map((stage) => (
              <li key={stage.key} className="flex items-start gap-3 px-5 py-3">
                {stage.status === "done" ? (
                  <Check className="mt-0.5 size-4 text-verified" />
                ) : stage.status === "failed" ? (
                  <X className="mt-0.5 size-4 text-conflict" />
                ) : (
                  <CircleDashed
                    className={`mt-0.5 size-4 text-muted-foreground ${stage.status === "running" ? "animate-spin" : ""}`}
                  />
                )}
                <div>
                  <p className="text-sm text-foreground">{stage.label}</p>
                  {stage.note && <p className="label-mono mt-0.5">{stage.note}</p>}
                </div>
              </li>
            ))}
            {stages.length === 0 && (
              <li className="px-5 py-6 text-sm text-muted-foreground">Queued…</li>
            )}
          </ol>
        </section>

        {data?.source?.summary && (
          <section className="rounded-sm border border-border bg-surface p-5">
            <p className="label-mono">Understanding summary</p>
            <p className="mt-2 text-sm text-foreground">{data.source.summary}</p>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="rounded-sm border border-border bg-surface">
            <h2 className="border-b border-border px-5 py-3 text-sm font-semibold">
              Extracted facts
            </h2>
            <ul className="divide-y divide-border">
              {(data?.facts ?? []).map((fact) => (
                <li key={fact.id} className="px-5 py-3">
                  <p className="flex items-center gap-2 text-sm text-foreground">
                    {fact.is_locked && <Lock className="size-3 text-ember" />}
                    <span className="font-medium">{fact.label}:</span> {fact.value}
                  </p>
                  {fact.locator && <p className="label-mono mt-0.5">{fact.locator}</p>}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-sm border border-border bg-surface">
            <h2 className="border-b border-border px-5 py-3 text-sm font-semibold">
              Extracted claims
            </h2>
            <ul className="divide-y divide-border">
              {(data?.claims ?? []).map((claim) => (
                <li key={claim.id} className="px-5 py-3">
                  <p className="text-sm text-foreground">{claim.text}</p>
                  {claim.locator && <p className="label-mono mt-0.5">{claim.locator}</p>}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-sm border border-border bg-surface">
            <h2 className="border-b border-border px-5 py-3 text-sm font-semibold">Entities</h2>
            <div className="flex flex-wrap gap-2 p-5">
              {(data?.entities ?? []).map((entity) => (
                <span
                  key={entity.id}
                  className="rounded-sm border border-border px-2 py-1 font-mono text-[11px] text-muted-foreground"
                >
                  {entity.name}
                  <span className="ml-1 text-ember">{entity.entity_type}</span>
                </span>
              ))}
            </div>
          </section>
        </div>

        {!ready && (
          <Button
            variant="outline"
            onClick={() => {
              started.current = true;
              analyze({ data: { jobId } }).catch((err: unknown) =>
                toast.error(err instanceof Error ? err.message : "Pipeline failed."),
              );
            }}
          >
            Re-run pipeline
          </Button>
        )}
      </div>
    </div>
  );
}
