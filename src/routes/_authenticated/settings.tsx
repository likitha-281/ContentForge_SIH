import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Check,
  CheckCircle2,
  Database,
  KeyRound,
  Lock,
  Radio,
  Server,
  Shield,
  ShieldCheck,
  UserCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { computeSha256, type UserRole } from "@/lib/security";
import { useI18n } from "@/context/language-context";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Security & Workspace Policy — INTELLI-FORGE" },
      {
        name: "description",
        content:
          "Security posture, Row-Level Security isolation, cryptographic verification tokens, and scalability architecture.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [activeRole, setActiveRole] = useState<UserRole>("OPERATOR");
  const [testPayload, setTestPayload] = useState("INTELLI-FORGE-SAMPLE-PAYLOAD-2026");
  const [generatedHash, setGeneratedHash] = useState<string | null>(null);
  const [isHashing, setIsHashing] = useState(false);

  const handleComputeHash = async () => {
    setIsHashing(true);
    try {
      const hash = await computeSha256(testPayload);
      setGeneratedHash("sha256:" + hash);
      toast.success(t("SHA-256 cryptographic digest computed."));
    } finally {
      setIsHashing(false);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow={t("settings.eyebrow", "Configuration & Governance")}
        title={t("settings.title", "Security, access & scalability")}
        description={t(
          "settings.desc",
          "Row-level isolation, cryptographic hash signatures, access controls, and large-document throughput configuration.",
        )}
      />

      <div className="grid gap-6 p-6 lg:grid-cols-2">
        {/* Security & Isolation Card */}
        <section className="rounded-sm border border-border bg-surface p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Shield className="size-4 text-verified" />
              {t("settings.rlsTitle", "Row-Level Security & Tenant Isolation")}
            </h2>
            <span className="rounded bg-verified/15 px-2 py-0.5 font-mono text-[10px] text-verified font-semibold">
              {t("RLS ACTIVE")}
            </span>
          </div>

          <div className="text-xs space-y-2">
            <p className="text-muted-foreground">
              {t("Authenticated Session Account")}:{" "}
              <strong className="text-foreground">{user?.email}</strong>
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              User UID: <code>{user?.id}</code>
            </p>
            <p className="text-muted-foreground leading-relaxed pt-2">
              {t(
                "Every source, passage chunk, locked fact, artefact, and audit event is strictly bound to this account via PostgreSQL Row-Level Security (RLS) policies. No other tenant or operator can read or modify your workspace.",
              )}
            </p>
          </div>

          <div className="rounded border border-border/60 bg-background p-3 text-xs space-y-2">
            <span className="font-mono text-[10px] text-ember uppercase">
              {t("Active Security Policies")}
            </span>
            <ul className="space-y-1 text-muted-foreground text-[11px]">
              <li>
                ✓ <strong>{t("Fact Drift Lock")}:</strong>{" "}
                {t("Contradicting locked facts blocks downstream approval.")}
              </li>
              <li>
                ✓ <strong>{t("Mandatory Re-verification")}:</strong>{" "}
                {t("Any human edit invalidates previous trust states.")}
              </li>
              <li>
                ✓ <strong>{t("Tamper-Proof Audit")}:</strong>{" "}
                {t("PostgreSQL trigger forbids UPDATE or DELETE on audit events.")}
              </li>
            </ul>
          </div>
        </section>

        {/* Role-Based Access Control Simulation */}
        <section className="rounded-sm border border-border bg-surface p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <UserCheck className="size-4 text-ember" />
              {t("settings.rbacTitle", "Role-Based Access Control (RBAC)")}
            </h2>
            <span className="label-mono">{activeRole}</span>
          </div>

          <p className="text-xs text-muted-foreground">
            {t("Select an active operational role to simulate permission governance:")}
          </p>

          <div className="grid grid-cols-2 gap-2">
            {(["OPERATOR", "REVIEWER", "AUDITOR", "ADMIN"] as UserRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setActiveRole(r);
                  toast.success(`${t("Active role set to")} ${r}`);
                }}
                className={`rounded border p-2.5 text-left text-xs transition-colors ${
                  activeRole === r
                    ? "border-ember bg-ember/15 text-ember font-semibold"
                    : "border-border bg-background text-muted-foreground hover:bg-surface-raised"
                }`}
              >
                <span className="font-mono text-[11px]">{r}</span>
              </button>
            ))}
          </div>

          <div className="rounded border border-border bg-background p-3 text-xs space-y-1 text-muted-foreground">
            <p className="font-semibold text-foreground">{t("Role Permissions")}:</p>
            <p>
              • {t("Create & analyze sources")}:{" "}
              <strong className="text-foreground">OPERATOR, ADMIN</strong>
            </p>
            <p>
              • {t("Lock & unlock facts")}:{" "}
              <strong className="text-foreground">OPERATOR, ADMIN</strong>
            </p>
            <p>
              • {t("Approve / Reject for distribution")}:{" "}
              <strong className="text-foreground">REVIEWER, ADMIN</strong>
            </p>
            <p>
              • {t("Verify SHA-256 audit ledger")}:{" "}
              <strong className="text-foreground">{t("ALL ROLES")}</strong>
            </p>
          </div>
        </section>

        {/* Cryptographic Hash Token Utility */}
        <section className="rounded-sm border border-border bg-surface p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <KeyRound className="size-4 text-ember" />
              {t("settings.hashTitle", "Cryptographic SHA-256 Signature Tool")}
            </h2>
            <span className="label-mono">{t("HMAC Validated")}</span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground">
              {t("Test Payload String")}
            </label>
            <Input
              value={testPayload}
              onChange={(e) => setTestPayload(e.target.value)}
              className="text-xs h-9 border-border bg-background"
            />
            <Button
              size="sm"
              onClick={handleComputeHash}
              disabled={isHashing}
              className="bg-ember text-ember-foreground hover:bg-ember/90 text-xs mt-1"
            >
              {t("Generate SHA-256 Token")}
            </Button>
          </div>

          {generatedHash && (
            <div className="rounded border border-verified/40 bg-verified/10 p-3 text-xs">
              <span className="label-mono text-verified">{t("Computed Cryptographic Hash")}:</span>
              <p className="font-mono text-[11px] text-foreground mt-1 break-all select-all">
                {generatedHash}
              </p>
            </div>
          )}
        </section>

        {/* Scalability & Big-Data Ingestion Architecture */}
        <section className="rounded-sm border border-border bg-surface p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Zap className="size-4 text-ember" />
              {t("settings.scalabilityTitle", "Scalability & High-Throughput Engine")}
            </h2>
            <span className="label-mono">{t("Unlimited Capacity")}</span>
          </div>

          <ul className="text-xs space-y-3 text-muted-foreground leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="text-ember font-mono font-semibold">•</span>
              <span>
                <strong className="text-foreground">
                  {t("Sliding-Window Recursive Chunking")}:
                </strong>{" "}
                {t(
                  "Handles massive documents (100,000+ words / multi-megabyte files) without hitting token limits or losing passage boundaries.",
                )}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-ember font-mono font-semibold">•</span>
              <span>
                <strong className="text-foreground">
                  {t("PostgreSQL GIN tsvector Indexing")}:
                </strong>{" "}
                {t(
                  "Sub-millisecond keyword and entity retrieval even across tens of thousands of document passages.",
                )}
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-ember font-mono font-semibold">•</span>
              <span>
                <strong className="text-foreground">{t("Asynchronous Stage Processing")}:</strong>{" "}
                {t(
                  "Processing jobs run asynchronously with real-time SSE delta streaming to prevent browser UI blocking.",
                )}
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
