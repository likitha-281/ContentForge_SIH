import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/page-header";
import { TrustBadge } from "@/components/trust";
import { useLiveQuery } from "@/hooks/use-live-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/outputs/")({
  head: () => ({
    meta: [
      { title: "Generated outputs — INTELLI-FORGE" },
      {
        name: "description",
        content: "Every audience artefact with its verification state and evidence coverage.",
      },
      { property: "og:title", content: "Generated outputs — INTELLI-FORGE" },
      { property: "og:description", content: "All generated artefacts and their trust state." },
    ],
  }),
  component: OutputsPage,
});

function OutputsPage() {
  const { data } = useLiveQuery(
    ["outputs"] as never,
    async () => {
      const { data } = await supabase
        .from("outputs")
        .select(
          "id, output_type, audience, status, verification_status, evidence_coverage, created_at",
        )
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    ["outputs"],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Stage 7 · Artefacts"
        title="Generated outputs"
        description="Coverage is the share of sentences actually traced back to a source passage — it is measured, not assigned."
      />
      <div className="divide-y divide-border">
        {(data ?? []).map((output) => (
          <Link
            key={output.id}
            to="/outputs/$outputId"
            params={{ outputId: output.id }}
            className="flex flex-wrap items-center gap-4 px-6 py-4 hover:bg-surface-raised"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">{output.output_type}</p>
              <p className="label-mono mt-0.5">
                {output.audience} · {output.status}
              </p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {output.evidence_coverage == null
                ? "—"
                : `${Math.round(output.evidence_coverage)}% traced`}
            </span>
            <TrustBadge state={output.verification_status} />
          </Link>
        ))}
        {(data ?? []).length === 0 && (
          <p className="px-6 py-8 text-sm text-muted-foreground">Nothing generated yet.</p>
        )}
      </div>
    </div>
  );
}
