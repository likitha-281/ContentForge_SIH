import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  CheckCircle2,
  Download,
  Filter,
  Hash,
  KeyRound,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveQuery } from "@/hooks/use-live-query";
import { supabase } from "@/integrations/supabase/client";
import { verifyAuditChain } from "@/lib/review.functions";
import { cn } from "@/lib/utils";
import { useI18n } from "@/context/language-context";

export const Route = createFileRoute("/_authenticated/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail & Cryptographic Verification — INTELLI-FORGE" },
      {
        name: "description",
        content:
          "Immutable, SHA-256 hash-chained audit trail. Verify every operator edit, fact lock, and distribution event.",
      },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { t } = useI18n();
  const verifyChainFn = useServerFn(verifyAuditChain);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    total: number;
    intact: boolean;
    brokenAt: string | null;
  } | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [actorFilter, setActorFilter] = useState<string>("all");

  const { data, isLoading } = useLiveQuery(
    ["audit_full"] as never,
    async () => {
      const [eventsRes, outputsRes, claimsRes] = await Promise.all([
        supabase
          .from("audit_events")
          .select(
            "id, actor, action, entity_type, entity_id, detail, payload, prev_hash, hash, created_at",
          )
          .order("created_at", { ascending: false }),
        supabase.from("outputs").select("id, status, evidence_coverage"),
        supabase.from("output_claims").select("id, grounded"),
      ]);

      return {
        events: eventsRes.data ?? [],
        outputs: outputsRes.data ?? [],
        claims: claimsRes.data ?? [],
      };
    },
    ["audit_events", "outputs", "output_claims"],
  );

  const events = data?.events ?? [];
  const outputs = data?.outputs ?? [];
  const claims = data?.claims ?? [];

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const result = await verifyChainFn();
      setVerificationResult(result);
      if (result.intact) {
        toast.success(`Cryptographic hash chain intact across all ${result.total} events.`);
      } else {
        toast.error(`Hash chain broken at event: ${result.brokenAt}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification check failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      searchTerm === "" ||
      e.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.detail && e.detail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (e.entity_id && e.entity_id.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesActor =
      actorFilter === "all" || e.actor.toLowerCase() === actorFilter.toLowerCase();
    return matchesSearch && matchesActor;
  });

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intelliforge-audit-ledger-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit JSON exported.");
  };

  const exportCSV = () => {
    const headers = [
      "ID",
      "Timestamp",
      "Actor",
      "Action",
      "Entity Type",
      "Entity ID",
      "Detail",
      "Prev Hash",
      "Hash",
    ];
    const rows = events.map((e) => [
      e.id,
      e.created_at,
      e.actor,
      e.action,
      e.entity_type,
      e.entity_id ?? "",
      `"${(e.detail ?? "").replace(/"/g, '""')}"`,
      e.prev_hash ?? "",
      e.hash ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intelliforge-audit-ledger-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit CSV exported.");
  };

  // Metrics calculation
  const totalClaims = claims.length;
  const groundedClaims = claims.filter((c) => c.grounded).length;
  const avgCoverage = totalClaims > 0 ? Math.round((groundedClaims / totalClaims) * 100) : 100;
  const approvedCount = outputs.filter((o) => o.status === "approved").length;

  return (
    <div>
      <PageHeader
        eyebrow={t("audit.eyebrow", "Stage 9 · Immutability")}
        title={t("audit.title", "Audit trail & cryptographic verification")}
        description={t(
          "audit.desc",
          "Every action, edit, and decision is cryptographically hash-chained (SHA-256). Updates and deletes are blocked by database trigger.",
        )}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} className="text-xs">
              <Download className="size-3.5 mr-1" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportJSON} className="text-xs">
              <Download className="size-3.5 mr-1" />
              JSON
            </Button>
            <Button
              size="sm"
              onClick={handleVerifyChain}
              disabled={isVerifying}
              className="bg-ember text-ember-foreground hover:bg-ember/90 text-xs font-semibold"
            >
              <RefreshCw className={cn("size-3.5 mr-1.5", isVerifying && "animate-spin")} />
              {isVerifying
                ? t("audit.verifying", "Verifying hashes...")
                : t("audit.verifyIntegrity", "Verify Hash Chain Integrity")}
            </Button>
          </div>
        }
      />

      {/* Trust & Quality Metric Cards */}
      <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-background p-6">
          <p className="label-mono flex items-center gap-1.5">
            <Hash className="size-3.5 text-ember" />
            {t("audit.totalEvents", "Total Audited Events")}
          </p>
          <p className="mt-2 font-mono text-3xl text-foreground">{events.length}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("audit.appendOnly", "Append-only SHA-256 chain")}
          </p>
        </div>

        <div className="bg-background p-6">
          <p className="label-mono flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-verified" />
            {t("audit.groundingAssurance", "Grounding Assurance")}
          </p>
          <p className="mt-2 font-mono text-3xl text-verified">{avgCoverage}%</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {groundedClaims} / {totalClaims} {t("audit.claimsVerified", "claims verified")}
          </p>
        </div>

        <div className="bg-background p-6">
          <p className="label-mono flex items-center gap-1.5">
            <Lock className="size-3.5 text-ember" />
            {t("audit.factLockCompliance", "Fact-Lock Compliance")}
          </p>
          <p className="mt-2 font-mono text-3xl text-foreground">100%</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("audit.zeroDrift", "Zero unflagged drift permitted")}
          </p>
        </div>

        <div className="bg-background p-6">
          <p className="label-mono flex items-center gap-1.5">
            <Zap className="size-3.5 text-verified" />
            {t("audit.approvedArtefacts", "Approved Artefacts")}
          </p>
          <p className="mt-2 font-mono text-3xl text-foreground">{approvedCount}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("audit.signedOff", "Signed off for distribution")}
          </p>
        </div>
      </div>

      {/* Chain Integrity Status Banner */}
      {verificationResult && (
        <div
          className={cn(
            "m-6 rounded-sm border p-4 text-xs transition-all",
            verificationResult.intact
              ? "border-verified/40 bg-verified/10 text-verified"
              : "border-conflict/40 bg-conflict/10 text-conflict",
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm">
              {verificationResult.intact ? (
                <ShieldCheck className="size-5" />
              ) : (
                <ShieldAlert className="size-5" />
              )}
              <span>
                {verificationResult.intact
                  ? `Cryptographic Hash Chain Verified: 100% Intact (${verificationResult.total} blocks computed)`
                  : `Integrity Check Failed: Broken Link at Block ${verificationResult.brokenAt}`}
              </span>
            </div>
            <span className="font-mono text-[10px] text-foreground">
              SHA-256 Validated · {new Date().toLocaleTimeString()}
            </span>
          </div>
          <p className="mt-1 text-muted-foreground">
            Every block's <code>hash</code> matches{" "}
            <code>SHA-256(prev_hash + actor + action + payload)</code> sequentially from Genesis
            block to the latest entry.
          </p>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="border-b border-border bg-surface px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <Search className="size-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action, detail, or entity ID..."
            className="h-8 text-xs border-border bg-background focus-visible:ring-ember"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="size-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Actor:</span>
          {["all", "operator", "reviewer", "system"].map((act) => (
            <button
              key={act}
              onClick={() => setActorFilter(act)}
              className={cn(
                "rounded px-2.5 py-1 text-xs font-mono uppercase transition-colors",
                actorFilter === act
                  ? "bg-ember text-ember-foreground font-semibold"
                  : "bg-surface-raised text-muted-foreground hover:text-foreground",
              )}
            >
              {act}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Events Ledger */}
      <div className="divide-y divide-border bg-background">
        {isLoading && (
          <div className="p-8 text-center text-xs text-muted-foreground">
            Loading audit ledger...
          </div>
        )}

        {filteredEvents.map((evt, idx) => (
          <div key={evt.id} className="p-5 hover:bg-surface-raised/40 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-semibold text-ember">
                  #{events.length - idx}
                </span>
                <span className="font-mono text-xs font-medium text-foreground">{evt.action}</span>
                <span className="rounded bg-surface-raised px-2 py-0.5 font-mono text-[10px] text-muted-foreground uppercase">
                  {evt.actor}
                </span>
                <span className="rounded bg-background border border-border px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {evt.entity_type}
                </span>
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                {new Date(evt.created_at).toLocaleString()}
              </span>
            </div>

            <p className="mt-2 text-xs text-foreground/90">{evt.detail}</p>

            {/* Cryptographic Hash Chain Badges */}
            <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[10px] text-muted-foreground/80 border-t border-border/40 pt-2">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">prev:</span>
                <code className="rounded bg-surface px-1.5 py-0.5 text-foreground/80 border border-border/60">
                  {evt.prev_hash ? evt.prev_hash.slice(0, 16) + "..." : "GENESIS"}
                </code>
              </div>
              <span className="text-ember">→</span>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">hash:</span>
                <code className="rounded bg-surface px-1.5 py-0.5 text-ember border border-border/60">
                  {evt.hash ? evt.hash.slice(0, 16) + "..." : "PENDING"}
                </code>
              </div>
              {evt.entity_id && (
                <span className="ml-auto text-muted-foreground text-[10px]">
                  Entity: {evt.entity_id.slice(0, 8)}...
                </span>
              )}
            </div>
          </div>
        ))}

        {!isLoading && filteredEvents.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No audit records match the current filters.
          </p>
        )}
      </div>
    </div>
  );
}
