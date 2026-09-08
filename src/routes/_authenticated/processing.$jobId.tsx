import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Check, CheckCircle2, CircleDashed, Lock, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { DemoNotice } from "@/components/trust";
import { useLiveQuery } from "@/hooks/use-live-query";
import { supabase } from "@/integrations/supabase/client";
import { analyzeSource } from "@/lib/pipeline.functions";
import { useI18n } from "@/context/language-context";

export const Route = createFileRoute("/_authenticated/processing/$jobId")({
  head: () => ({
    meta: [
      { title: "Processing & understanding — INTELLI-FORGE" },
      {
        name: "description",
        content:
          "Watch each pipeline stage complete live: parsing, understanding, fact lock, indexing.",
      },
      { property: "og:title", content: "Processing & understanding — INTELLI-FORGE" },
      {
        property: "og:description",
        content: "Live view of the INTELLI-FORGE understanding pipeline.",
      },
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

  const { data, refetch } = useLiveQuery(
    ["job", jobId] as never,
    async () => {
      const { data: job } = await supabase
        .from("jobs")
        .select("id, source_id, status, stages, error")
        .eq("id", jobId)
        .single();
      if (!job) return null;
      const [source, facts, claims, entities] = await Promise.all([
        supabase
          .from("sources")
          .select("id, title, summary, status, is_demo")
          .eq("id", job.source_id)
          .single(),
        supabase
          .from("facts")
          .select("id, label, value, is_locked, locator")
          .eq("source_id", job.source_id),
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
    true,
    {
      refetchInterval: (query: any) => {
        const status = query.state.data?.job?.status;
        return status === "ready" || status === "failed" ? false : 1200;
      },
    },
  );

  useEffect(() => {
    if (started.current) return;
    if (data?.job?.status === "queued") {
      started.current = true;
      analyze({ data: { jobId } })
        .then(() => refetch())
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : "Pipeline failed.";
          setError(message);
          toast.error(message);
        });
    }
  }, [data?.job?.status, analyze, jobId, refetch]);

  const defaultStages: Stage[] = [
    { key: "upload", label: "Source received", status: "running" },
    { key: "parsing", label: "Parsing & normalising", status: "pending" },
    { key: "extraction", label: "Text extraction (OCR / transcript stand-in)", status: "pending" },
    { key: "understanding", label: "Content understanding", status: "pending" },
    { key: "facts", label: "Fact extraction", status: "pending" },
    { key: "factlock", label: "Fact lock", status: "pending" },
    { key: "indexing", label: "Chunking & keyword indexing", status: "pending" },
    { key: "ready", label: "Ready for transformation", status: "pending" },
  ];

  const stages = (data?.job?.stages as Stage[] | undefined)?.length
    ? (data?.job?.stages as Stage[])
    : defaultStages;
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

        {/* Big Unmissable Next Step Action Banner When Ready */}
        {ready && data?.source && (
          <div className="rounded-xl border-2 border-verified/60 bg-verified/10 p-6 flex flex-col md:flex-row items-center justify-between gap-5 shadow-lg animate-in fade-in slide-in-from-top-3">
            <div className="space-y-1.5 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <CheckCircle2 className="size-5 text-verified" />
                <h3 className="text-base font-bold text-foreground">
                  Raw Understanding & Fact-Lock Complete!
                </h3>
              </div>
              <p className="text-xs text-muted-foreground max-w-xl">
                Source has been extracted, indexed into verifiable passages, and critical facts are
                locked. Click below to enter the transformation workspace and generate your outputs.
              </p>
            </div>
            <Link
              to="/workspace/$sourceId"
              params={{ sourceId: data.source.id }}
              className="inline-flex items-center gap-2 rounded-lg bg-ember px-6 py-3.5 font-mono text-xs uppercase tracking-widest text-ember-foreground font-bold shadow-md hover:bg-ember/90 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              <Sparkles className="size-4" />
              Generate Outputs Now <ArrowRight className="size-4" />
            </Link>
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
              setError(null);
              started.current = true;
              toast.info("Triggering pipeline execution...");
              analyze({ data: { jobId } })
                .then(() => {
                  toast.success("Pipeline analysis started.");
                  refetch();
                })
                .catch((err: unknown) => {
                  const message = err instanceof Error ? err.message : "Pipeline failed.";
                  setError(message);
                  toast.error(message);
                });
            }}
          >
            Re-run pipeline
          </Button>
        )}
      </div>
    </div>
  );
}
