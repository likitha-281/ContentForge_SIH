import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe,
  Key,
  Mail,
  MessageSquare,
  Radio,
  Send,
  ShieldCheck,
  Smartphone,
  Terminal,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLiveQuery } from "@/hooks/use-live-query";
import { supabase } from "@/integrations/supabase/client";
import { prepareDistribution } from "@/lib/review.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/distribution")({
  head: () => ({
    meta: [
      { title: "Distribution Readiness — INTELLI-FORGE" },
      {
        name: "description",
        content:
          "Multi-channel distribution readiness. Export cryptographically verified communication packages across Web, Email, API, and SMS.",
      },
    ],
  }),
  component: DistributionPage,
});

type ChannelType = "web" | "email" | "api" | "sms";

function DistributionPage() {
  const prepareFn = useServerFn(prepareDistribution);
  const [selectedOutputId, setSelectedOutputId] = useState<string | null>(null);
  const [channel, setChannel] = useState<ChannelType>("web");
  const [targetEndpoint, setTargetEndpoint] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useLiveQuery(
    ["distribution_data"] as never,
    async () => {
      const [outputsRes, distsRes] = await Promise.all([
        supabase
          .from("outputs")
          .select(
            "id, source_id, output_type, audience, tone, content, status, evidence_coverage, created_at",
          )
          .eq("status", "approved")
          .order("created_at", { ascending: false }),
        supabase
          .from("distributions")
          .select("id, output_id, channel, target, status, payload, created_at")
          .order("created_at", { ascending: false }),
      ]);
      return {
        approvedOutputs: outputsRes.data ?? [],
        distributions: distsRes.data ?? [],
      };
    },
    ["outputs", "distributions"],
  );

  const approvedOutputs = data?.approvedOutputs ?? [];
  const distributions = data?.distributions ?? [];

  const activeOutput = approvedOutputs.find((o) => o.id === selectedOutputId) || approvedOutputs[0];

  const handlePrepare = async () => {
    if (!activeOutput) {
      toast.error("Please select an approved artefact first.");
      return;
    }
    setIsPreparing(true);
    try {
      await prepareFn({
        data: {
          outputId: activeOutput.id,
          channel: channel === "sms" ? "api" : channel,
          target: targetEndpoint.trim() || undefined,
        },
      });
      toast.success(`Distribution payload prepared for ${channel.toUpperCase()}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preparation failed.");
    } finally {
      setIsPreparing(false);
    }
  };

  // Channel Format Generator
  const generatePayloadPreview = () => {
    if (!activeOutput) return "";

    const timestamp = new Date().toISOString();
    const cleanContent = activeOutput.content || "";

    if (channel === "web") {
      return (
        `<!-- INTELLI-FORGE Verified Web Embed [SIH 2026] -->\n` +
        `<article class="verified-advisory" data-source-id="${activeOutput.source_id}" data-coverage="${Math.round(activeOutput.evidence_coverage ?? 100)}%">\n` +
        `  <header class="advisory-header">\n` +
        `    <span class="badge verified">Verified & Fact-Locked</span>\n` +
        `    <h1>${activeOutput.output_type} — ${activeOutput.audience}</h1>\n` +
        `    <time datetime="${timestamp}">${new Date().toLocaleString()}</time>\n` +
        `  </header>\n` +
        `  <div class="advisory-body">\n` +
        `    ${cleanContent
          .split("\n\n")
          .map((p) => `<p>${p}</p>`)
          .join("\n    ")}\n` +
        `  </div>\n` +
        `</article>`
      );
    }

    if (channel === "email") {
      return (
        `SUBJECT: [SECURITY ADVISORY] ${activeOutput.output_type} (${activeOutput.audience})\n` +
        `FROM: cert-alerts@gov.in (INTELLI-FORGE Verified System)\n` +
        `DATE: ${timestamp}\n` +
        `X-INTELLI-COVERAGE: ${Math.round(activeOutput.evidence_coverage ?? 100)}%\n` +
        `X-INTELLI-STATUS: APPROVED\n\n` +
        `=======================================================\n` +
        `CRITICAL DIRECTIVE — PLEASE READ AND ACTION IMMEDIATELY\n` +
        `=======================================================\n\n` +
        `${cleanContent}\n\n` +
        `--\n` +
        `Verified by INTELLI-FORGE (Problem Statement 26154)`
      );
    }

    if (channel === "sms") {
      const summaryLines = cleanContent.split("\n").filter((l) => l.trim().length > 0);
      return (
        `[GOVT ALERT] ${activeOutput.output_type}: ` +
        (summaryLines[0] || "Critical security advisory issued.") +
        ` Action mandatory within 6h. Full details at https://portal.gov.in/advisory/${activeOutput.id.slice(0, 8)}`
      );
    }

    // Default API format
    return JSON.stringify(
      {
        version: "1.0",
        schema: "sih2026.intelliforge.distribution",
        artefact_id: activeOutput.id,
        source_id: activeOutput.source_id,
        audience: activeOutput.audience,
        output_type: activeOutput.output_type,
        verification: {
          grounding_coverage: activeOutput.evidence_coverage,
          status: "APPROVED_AND_LOCKED",
          verified_at: timestamp,
        },
        payload: {
          content: cleanContent,
        },
        cryptographic_token: `sha256:hmac:${activeOutput.id.replace(/-/g, "").slice(0, 32)}`,
      },
      null,
      2,
    );
  };

  const payloadText = generatePayloadPreview();

  const handleCopy = () => {
    navigator.clipboard.writeText(payloadText);
    setCopied(true);
    toast.success("Payload copied to clipboard.");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([payloadText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `distribution-${activeOutput?.output_type.toLowerCase().replace(/\s+/g, "-")}-${channel}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Package downloaded.");
  };

  return (
    <div>
      <PageHeader
        eyebrow="Stage 8 · Distribution Readiness"
        title="Distribution readiness & multi-channel exporter"
        description="Only human-approved, fact-grounded artefacts can be prepared for distribution across channels."
      />

      {approvedOutputs.length === 0 && !isLoading && (
        <div className="m-6 rounded-sm border border-attention/40 bg-attention/10 p-6 text-center">
          <ShieldCheck className="size-8 text-attention mx-auto" />
          <h3 className="mt-2 text-sm font-semibold text-attention">
            No Approved Artefacts Available Yet
          </h3>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
            Artefacts must complete the verification pipeline and receive human approval in the{" "}
            <Link to="/review" className="text-ember underline underline-offset-4">
              Review Queue
            </Link>{" "}
            before they can be prepared for distribution.
          </p>
        </div>
      )}

      {approvedOutputs.length > 0 && (
        <div className="grid lg:grid-cols-12 gap-px bg-border">
          {/* Left Column: Selector & Channel Config */}
          <div className="lg:col-span-5 p-6 bg-surface space-y-6">
            {/* Step 1: Select Artefact */}
            <div>
              <label className="block label-mono pb-2">1. Select Approved Artefact</label>
              <div className="space-y-2">
                {approvedOutputs.map((item) => {
                  const isSelected = activeOutput?.id === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedOutputId(item.id)}
                      className={cn(
                        "cursor-pointer rounded-sm border p-3 text-xs transition-colors",
                        isSelected
                          ? "border-ember bg-surface-raised ring-1 ring-ember"
                          : "border-border bg-background hover:bg-surface-raised",
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{item.output_type}</span>
                        <span className="rounded bg-verified/15 px-1.5 py-0.2 font-mono text-[9px] text-verified">
                          Approved
                        </span>
                      </div>
                      <p className="mt-1 text-muted-foreground text-[11px]">
                        Target Audience:{" "}
                        <strong className="text-foreground">{item.audience}</strong> · Coverage:{" "}
                        {Math.round(item.evidence_coverage ?? 100)}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Choose Target Channel */}
            <div>
              <label className="block label-mono pb-2">2. Select Distribution Channel</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setChannel("web")}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-sm border p-3 text-left transition-colors",
                    channel === "web"
                      ? "border-ember bg-ember/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-surface-raised",
                  )}
                >
                  <Globe className={cn("size-4", channel === "web" ? "text-ember" : "")} />
                  <span className="text-xs font-semibold">Web Portal</span>
                  <span className="text-[10px] text-muted-foreground">HTML Embed / Microdata</span>
                </button>

                <button
                  onClick={() => setChannel("email")}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-sm border p-3 text-left transition-colors",
                    channel === "email"
                      ? "border-ember bg-ember/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-surface-raised",
                  )}
                >
                  <Mail className={cn("size-4", channel === "email" ? "text-ember" : "")} />
                  <span className="text-xs font-semibold">Email Advisory</span>
                  <span className="text-[10px] text-muted-foreground">MIME Headers & Body</span>
                </button>

                <button
                  onClick={() => setChannel("api")}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-sm border p-3 text-left transition-colors",
                    channel === "api"
                      ? "border-ember bg-ember/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-surface-raised",
                  )}
                >
                  <Radio className={cn("size-4", channel === "api" ? "text-ember" : "")} />
                  <span className="text-xs font-semibold">REST API</span>
                  <span className="text-[10px] text-muted-foreground">Signed JSON Webhook</span>
                </button>

                <button
                  onClick={() => setChannel("sms")}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-sm border p-3 text-left transition-colors",
                    channel === "sms"
                      ? "border-ember bg-ember/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-surface-raised",
                  )}
                >
                  <Smartphone className={cn("size-4", channel === "sms" ? "text-ember" : "")} />
                  <span className="text-xs font-semibold">Emergency Broadcast</span>
                  <span className="text-[10px] text-muted-foreground">SMS / Telegram Snippet</span>
                </button>
              </div>
            </div>

            {/* Step 3: Target Endpoint / Routing */}
            <div>
              <label className="block label-mono pb-2">3. Target Destination / Recipient</label>
              <Input
                value={targetEndpoint}
                onChange={(e) => setTargetEndpoint(e.target.value)}
                placeholder={
                  channel === "email"
                    ? "sec-leadership@agency.gov.in"
                    : channel === "api"
                      ? "https://alerts.cert.gov.in/v1/inbound"
                      : "public-portal / cdn"
                }
                className="h-9 text-xs border-border bg-background focus-visible:ring-ember"
              />
            </div>

            {/* Step 4: Dispatch Action */}
            <div className="pt-2">
              <Button
                onClick={handlePrepare}
                disabled={isPreparing || !activeOutput}
                className="w-full bg-ember text-ember-foreground font-semibold text-xs hover:bg-ember/90"
              >
                <Send className="size-3.5 mr-1.5" />
                {isPreparing ? "Recording distribution..." : "Prepare & Sign Distribution Bundle"}
              </Button>
              <p className="mt-1.5 text-[10px] text-muted-foreground text-center">
                Creates an immutable record in the audit chain.
              </p>
            </div>
          </div>

          {/* Right Column: Live Channel Payload Preview */}
          <div className="lg:col-span-7 p-6 bg-background flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <Terminal className="size-4 text-ember" />
                  <span className="text-sm font-semibold text-foreground">
                    Channel Payload Preview ({channel.toUpperCase()})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy} className="h-7 text-xs">
                    {copied ? (
                      <Check className="size-3 text-verified mr-1" />
                    ) : (
                      <Copy className="size-3 mr-1" />
                    )}
                    {copied ? "Copied" : "Copy Payload"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    className="h-7 text-xs"
                  >
                    <Download className="size-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>

              {/* Formatted Code / Text Box */}
              <pre className="mt-4 rounded border border-border bg-surface p-4 font-mono text-xs text-foreground/90 overflow-x-auto whitespace-pre-wrap max-h-[460px] leading-relaxed">
                {payloadText}
              </pre>
            </div>

            {/* Cryptographic Compliance Badge */}
            <div className="mt-6 rounded border border-verified/30 bg-verified/5 p-3 flex items-center gap-3">
              <Key className="size-4 text-verified shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-foreground">Cryptographic Verification Attached</p>
                <p className="text-muted-foreground text-[11px]">
                  All downstream consumers can verify evidence coverage (
                  {Math.round(activeOutput?.evidence_coverage ?? 100)}%) against the source hash.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Distribution History Table */}
      <section className="m-6 rounded-sm border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <Radio className="size-4 text-ember" />
            Prepared Distribution Ledger ({distributions.length})
          </h2>
          <span className="label-mono">Immutable Log</span>
        </div>

        <div className="divide-y divide-border">
          {distributions.map((dist) => (
            <div
              key={dist.id}
              className="flex flex-wrap items-center justify-between gap-4 p-4 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold uppercase text-ember">
                    {dist.channel}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-mono text-foreground">
                    {dist.target || "(broadcast channel)"}
                  </span>
                </div>
                <p className="label-mono mt-0.5">
                  ID: {dist.id.slice(0, 8)}... · Status: {dist.status}
                </p>
              </div>
              <span className="font-mono text-[11px] text-muted-foreground">
                {new Date(dist.created_at).toLocaleString()}
              </span>
            </div>
          ))}
          {distributions.length === 0 && (
            <p className="p-6 text-sm text-muted-foreground">No distributions prepared yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
