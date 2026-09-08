import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Edit3,
  ExternalLink,
  FileText,
  Lock,
  RefreshCw,
  Send,
  ShieldCheck,
  ShieldX,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TrustBadge, CheckStatusDot } from "@/components/trust";
import { useLiveQuery } from "@/hooks/use-live-query";
import { supabase } from "@/integrations/supabase/client";
import { editOutput } from "@/lib/review.functions";
import { resolveConflict, suggestCorrection, verifyOutput } from "@/lib/verify.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/outputs/$outputId")({
  head: () => ({
    meta: [
      { title: "Evidence & Claim Trace — INTELLI-FORGE" },
      {
        name: "description",
        content: "Inspect mathematical claim traceability, source passage grounding, and fact-lock compliance.",
      },
    ],
  }),
  component: OutputTraceView,
});

function OutputTraceView() {
  const { outputId } = useParams({ from: "/_authenticated/outputs/$outputId" });
  const verifyFn = useServerFn(verifyOutput);
  const editFn = useServerFn(editOutput);
  const suggestFn = useServerFn(suggestCorrection);
  const resolveFn = useServerFn(resolveConflict);

  const [selectedClaimOrdinal, setSelectedClaimOrdinal] = useState<number | null>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const { data, isLoading } = useLiveQuery(
    ["output_detail", outputId] as never,
    async () => {
      const { data: output, error } = await supabase
        .from("outputs")
        .select("id, source_id, output_type, audience, tone, content, status, verification_status, evidence_coverage, created_at, updated_at")
        .eq("id", outputId)
        .single();
      if (error || !output) return null;

      const [source, claims, chunks, conflicts, checks] = await Promise.all([
        supabase.from("sources").select("id, title, summary").eq("id", output.source_id).single(),
        supabase.from("output_claims").select("id, ordinal, sentence, chunk_id, locator, evidence_text, grounded, match_score").eq("output_id", outputId).order("ordinal"),
        supabase.from("source_chunks").select("id, locator, content, ordinal").eq("source_id", output.source_id).order("ordinal"),
        supabase.from("fact_conflicts").select("id, fact_label, locked_value, generated_text, generated_value, suggestion, status").eq("output_id", outputId),
        supabase.from("trust_checks").select("id, check_key, label, status, detail, method").eq("output_id", outputId),
      ]);

      return {
        output,
        source: source.data,
        claims: claims.data ?? [],
        chunks: chunks.data ?? [],
        conflicts: conflicts.data ?? [],
        checks: checks.data ?? [],
      };
    },
    ["outputs", "output_claims", "fact_conflicts", "trust_checks", "sources"],
  );

  const output = data?.output;
  const claims = data?.claims ?? [];
  const chunks = data?.chunks ?? [];
  const conflicts = data?.conflicts ?? [];
  const checks = data?.checks ?? [];

  const selectedClaim = claims.find((c) => c.ordinal === selectedClaimOrdinal);
  const activeChunk = chunks.find((ch) => ch.locator === selectedClaim?.locator);

  const handleReverify = async () => {
    setIsVerifying(true);
    try {
      await verifyFn({ data: { outputId } });
      toast.success("Verification engine completed successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleStartEdit = () => {
    setEditedContent(output?.content ?? "");
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (editedContent.trim().length < 10) {
      toast.error("Content is too short.");
      return;
    }
    setIsSaving(true);
    try {
      await editFn({ data: { outputId, content: editedContent } });
      toast.success("Artefact updated and re-verified.");
      setIsEditing(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save edit.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestSuggestion = async (conflictId: string) => {
    try {
      toast.loading("Generating AI correction suggestion...", { id: "sug-" + conflictId });
      await suggestFn({ data: { conflictId } });
      toast.success("Correction suggested.", { id: "sug-" + conflictId });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to suggest.", { id: "sug-" + conflictId });
    }
  };

  const handleResolveConflict = async (conflictId: string, action: "accept_suggestion" | "keep_edit") => {
    try {
      await resolveFn({ data: { conflictId, action } });
      toast.success(action === "accept_suggestion" ? "Correction applied and re-verified." : "Operator override recorded in audit trail.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resolve conflict.");
    }
  };

  if (isLoading || !output) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="label-mono">Loading evidence trace...</p>
      </div>
    );
  }

  const openConflicts = conflicts.filter((c) => ["open", "suggested"].includes(c.status));

  return (
    <div>
      <PageHeader
        eyebrow={`Stage 6 · Claim Traceability · ${output.audience}`}
        title={output.output_type}
        description={`Derived from "${data?.source?.title ?? "Source"}". Every sentence is mapped to verified evidence.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReverify} disabled={isVerifying}>
              <RefreshCw className={cn("size-3.5 mr-1.5", isVerifying && "animate-spin")} />
              Re-verify
            </Button>
            <Button variant="outline" size="sm" onClick={handleStartEdit} disabled={isEditing}>
              <Edit3 className="size-3.5 mr-1.5" />
              Edit text
            </Button>
            <Link
              to="/review"
              className="inline-flex items-center gap-1.5 rounded-sm bg-surface-raised px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface border border-border"
            >
              Review queue
              <ChevronRight className="size-3.5" />
            </Link>
            {output.status === "approved" && (
              <Link
                to="/distribution"
                className="inline-flex items-center gap-1.5 rounded-sm bg-ember px-3.5 py-1.5 text-xs font-semibold text-ember-foreground hover:bg-ember/90"
              >
                <Send className="size-3.5" />
                Distribution
              </Link>
            )}
          </div>
        }
      />

      {/* Trust & Coverage Summary Bar */}
      <div className="border-b border-border bg-surface px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TrustBadge state={output.verification_status} />
          <span className="text-xs text-muted-foreground">Status: <strong className="text-foreground capitalize">{output.status}</strong></span>
          <span className="text-xs text-muted-foreground">Tone: <strong className="text-foreground">{output.tone ?? "Standard"}</strong></span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-muted-foreground">Grounding Coverage: </span>
            <span className="font-mono font-semibold text-verified">
              {output.evidence_coverage != null ? `${Math.round(output.evidence_coverage)}%` : "N/A"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Traced Claims: </span>
            <span className="font-mono font-semibold text-foreground">
              {claims.filter((c) => c.grounded).length} / {claims.length}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Fact Conflicts: </span>
            <span className={cn("font-mono font-semibold", openConflicts.length > 0 ? "text-conflict" : "text-verified")}>
              {openConflicts.length}
            </span>
          </div>
        </div>
      </div>

      {/* Fact Conflict Warning Center */}
      {openConflicts.length > 0 && (
        <div className="m-6 rounded-sm border border-conflict/50 bg-conflict/10 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-conflict shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-conflict">
                Approval Blocked: {openConflicts.length} Protected-Fact Conflict(s) Detected
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                In accordance with SIH Problem Statement 26154, critical facts must never hallucinate or contradict the source.
              </p>

              <div className="mt-4 space-y-3">
                {openConflicts.map((conf) => (
                  <div key={conf.id} className="rounded border border-conflict/30 bg-surface p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-semibold text-ember">
                        {conf.fact_label}
                      </span>
                      <span className="rounded bg-conflict/20 px-1.5 py-0.5 font-mono text-[10px] text-conflict">
                        Locked: "{conf.locked_value}"
                      </span>
                    </div>

                    <div className="mt-2 text-foreground">
                      <span className="text-muted-foreground">Contradicting sentence: </span>
                      <span className="underline decoration-conflict decoration-2">{conf.generated_text}</span>
                    </div>

                    {conf.suggestion && (
                      <div className="mt-2.5 rounded bg-surface-raised p-2 border border-border">
                        <div className="flex items-center gap-1.5 text-verified font-medium">
                          <Sparkles className="size-3" />
                          <span>AI Grounded Suggestion:</span>
                        </div>
                        <p className="mt-1 text-foreground italic">{conf.suggestion}</p>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {!conf.suggestion ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRequestSuggestion(conf.id)}
                          className="h-7 text-xs border-ember/40 text-ember hover:bg-ember/10"
                        >
                          <Sparkles className="size-3 mr-1" />
                          Generate Correction
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleResolveConflict(conf.id, "accept_suggestion")}
                          className="h-7 bg-verified text-verified-foreground hover:bg-verified/90 text-xs font-semibold"
                        >
                          <CheckCircle2 className="size-3 mr-1" />
                          Accept & Auto-Correct
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleResolveConflict(conf.id, "keep_edit")}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Keep Draft (Record Operator Override)
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-place editor if opened */}
      {isEditing && (
        <div className="m-6 rounded-sm border border-border bg-surface p-5 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Edit3 className="size-4 text-ember" />
              Edit Artefact Content (Forces Re-Verification)
            </h3>
            <span className="label-mono">Human-in-the-Loop</span>
          </div>
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            rows={12}
            className="mt-4 font-sans text-sm leading-relaxed border-border bg-background focus-visible:ring-ember"
          />
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={isSaving} className="bg-ember text-ember-foreground hover:bg-ember/90">
              {isSaving ? "Saving & re-verifying..." : "Save & Re-verify"}
            </Button>
          </div>
        </div>
      )}

      {/* Main Split Layout: Sentence Claims vs Evidence Passages */}
      <div className="grid gap-px bg-border lg:grid-cols-2">
        {/* Left: Generated Artefact Sentences */}
        <section className="bg-background p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="size-4 text-ember" />
              Generated Sentences ({claims.length})
            </h2>
            <span className="text-[11px] text-muted-foreground">Click sentence to inspect evidence</span>
          </div>

          <div className="space-y-2.5">
            {claims.map((claim) => {
              const isSelected = selectedClaimOrdinal === claim.ordinal;
              return (
                <div
                  key={claim.id}
                  onClick={() => setSelectedClaimOrdinal(claim.ordinal)}
                  className={cn(
                    "cursor-pointer rounded-sm border p-3 text-xs transition-all",
                    isSelected
                      ? "border-ember bg-surface-raised shadow-sm ring-1 ring-ember"
                      : "border-border bg-surface hover:border-border/80 hover:bg-surface-raised/70",
                  )}
                >
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pb-1">
                    <span className="font-mono">Sentence #{claim.ordinal + 1}</span>
                    <div className="flex items-center gap-2">
                      {claim.locator && (
                        <span className="font-mono text-ember font-medium">[{claim.locator}]</span>
                      )}
                      <span
                        className={cn(
                          "font-mono px-1.5 py-0.2 rounded text-[10px]",
                          claim.grounded
                            ? "bg-verified/15 text-verified"
                            : "bg-conflict/15 text-conflict",
                        )}
                      >
                        {claim.grounded ? "Grounded" : "Unverified"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 text-foreground leading-relaxed">{claim.sentence}</p>
                </div>
              );
            })}
            {claims.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No claims indexed.</p>
            )}
          </div>
        </section>

        {/* Right: Evidence Passages Inspector */}
        <section className="bg-background p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-border">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="size-4 text-verified" />
              Source Passage Evidence
            </h2>
            {selectedClaim?.locator && (
              <span className="font-mono text-xs text-ember font-semibold">
                Active Locator: [{selectedClaim.locator}]
              </span>
            )}
          </div>

          {selectedClaim ? (
            <div className="space-y-4">
              <div className="rounded-sm border border-ember/40 bg-ember/5 p-4">
                <p className="label-mono text-ember">Selected Claim Attribution</p>
                <p className="mt-1 text-xs text-foreground font-medium italic">
                  "{selectedClaim.sentence}"
                </p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40 pt-2">
                  <span>
                    Match Score:{" "}
                    <strong className="text-foreground">
                      {selectedClaim.match_score != null ? `${Math.round(selectedClaim.match_score * 100)}%` : "N/A"}
                    </strong>
                  </span>
                  <span>
                    Target Passage:{" "}
                    <strong className="text-ember">{selectedClaim.locator || "Connecting Sentence"}</strong>
                  </span>
                </div>
              </div>

              {/* Matching Source Passage Display */}
              <div className="rounded-sm border border-border bg-surface p-4">
                <div className="flex items-center justify-between pb-2 border-b border-border text-xs">
                  <span className="font-semibold text-foreground">
                    Supporting Passage: {activeChunk?.locator ?? selectedClaim.locator ?? "General Context"}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">Indexed Document Chunk</span>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-foreground whitespace-pre-wrap">
                  {activeChunk?.content || selectedClaim.evidence_text || "This sentence serves as structured connective framing and introduces no new ungrounded assertions."}
                </p>
              </div>

              {/* All Source Chunks Reference */}
              <div className="mt-6">
                <p className="label-mono pb-2">All Indexed Source Passages</p>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {chunks.map((ch) => {
                    const isTarget = ch.locator === selectedClaim.locator;
                    return (
                      <div
                        key={ch.id}
                        className={cn(
                          "rounded border p-2.5 text-xs transition-colors",
                          isTarget
                            ? "border-ember/70 bg-ember/10"
                            : "border-border/60 bg-surface text-muted-foreground",
                        )}
                      >
                        <span className="font-mono text-[10px] font-semibold text-ember">
                          [{ch.locator}]
                        </span>
                        <p className="mt-1 line-clamp-3 text-foreground/90">{ch.content}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Select a sentence on the left to view exact passage evidence.
            </p>
          )}
        </section>
      </div>

      {/* Trust & Quality Engine 7-Check Grid */}
      <section className="m-6 rounded-sm border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="size-4 text-ember" />
            Trust & Quality Engine (7-Point Audit)
          </h2>
          <span className="label-mono">Mathematical & Model Adjudication</span>
        </div>

        <div className="divide-y divide-border">
          {checks.map((check) => (
            <div key={check.id} className="flex items-start gap-4 p-4 text-xs">
              <CheckStatusDot status={check.status} />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">{check.label}</span>
                  <span
                    className={cn(
                      "font-mono text-[10px] uppercase font-semibold",
                      check.status === "pass"
                        ? "text-verified"
                        : check.status === "warn"
                          ? "text-attention"
                          : "text-conflict",
                    )}
                  >
                    {check.status}
                  </span>
                </div>
                {check.detail && <p className="mt-1 text-muted-foreground">{check.detail}</p>}
                {check.method && (
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground/80">
                    Method: {check.method}
                  </p>
                )}
              </div>
            </div>
          ))}
          {checks.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">No checks recorded.</p>
          )}
        </div>
      </section>
    </div>
  );
}
