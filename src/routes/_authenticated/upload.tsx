import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  CheckCircle2,
  FileCheck2,
  FileText,
  HelpCircle,
  Loader2,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSource, loadDemoSource } from "@/lib/pipeline.functions";
import { cn } from "@/lib/utils";
import { useI18n } from "@/context/language-context";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Upload Source Document — INTELLI-FORGE" },
      {
        name: "description",
        content:
          "Provide any text from small memos to large documents for raw understanding and verified fact-locking.",
      },
    ],
  }),
  component: UploadPage,
});

const KINDS = [
  "incident report",
  "advisory",
  "policy directive",
  "briefing note",
  "memo",
  "report",
];

const PRESET_SCENARIOS = [
  {
    id: "short-memo",
    title: "Urgent Incident Alert (Small Input)",
    kind: "memo",
    badge: "Quick Test",
    text: "URGENT ADVISORY: Power anomaly detected at Substation 4 at 09:15 IST on 08 September 2026. Auxiliary cooling operational. All field personnel must switch to backup frequency 142.8 MHz.",
  },
  {
    id: "ntro",
    title: "NTRO Telecom Gateway Advisory",
    kind: "incident report",
    badge: "Standard",
    text:
      "NATIONAL TECHNICAL RESEARCH ORGANISATION (NTRO) / CYBER DEFENCE DIRECTIVE\n" +
      "ADVISORY REF: NTRO-2026-CRIT-0492 | CLASSIFICATION: URGENT / OPERATIONAL | DATE: 07 SEPTEMBER 2026\n\n" +
      "1. EXECUTIVE OVERVIEW\n" +
      "A remote code execution vulnerability (CVE-2026-8812) has been detected in core telecommunication routing switches. Unauthenticated threat actors executed kernel-level probes.\n\n" +
      "2. IMPACTED INFRASTRUCTURE\n" +
      "Forensic telemetry confirms exactly 17 critical gateway switches across 3 primary hubs were affected between 02:00 UTC and 04:30 UTC on 06 September 2026.\n\n" +
      "3. MANDATORY ACTIONS\n" +
      "- Apply Security Release v2.4 immediately.\n" +
      "- Quarantine affected VLAN interfaces within 6 hours of receipt.\n" +
      "- Submit incident verification reports to the National Cyber Coordination Centre by 18:00 IST.",
  },
  {
    id: "disaster",
    title: "NDMA Cyclone Storm Warning",
    kind: "advisory",
    badge: "High Severity",
    text:
      "NATIONAL DISASTER MANAGEMENT AUTHORITY (NDMA)\n" +
      "SPECIAL METEOROLOGICAL BULLETIN NO: NDMA-CYC-2026-08\n\n" +
      "Severe Cyclonic Storm 'VAAYU-II' has intensified over the Bay of Bengal and is advancing west-northwest at 18 km/h. Landfall is projected near Paradip on 09 September 2026 with sustained wind speeds of 135-145 km/h.\n\n" +
      "Evacuation of 45,000 residents in low-lying sectors within 5 km of the coast is underway. 24 NDRF battalions are deployed on standby with emergency satellite communication.",
  },
];

function UploadPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const create = useServerFn(createSource);
  const loadDemo = useServerFn(loadDemoSource);

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("incident report");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  // Calculate live text stats
  const trimmedText = text.trim();
  const charCount = text.length;
  const wordCount = trimmedText ? trimmedText.split(/\s+/).filter(Boolean).length : 0;
  const lineCount = trimmedText ? trimmedText.split("\n").length : 0;

  async function handleFile(file: File) {
    if (!/\.(txt|md|csv|json|log)$/i.test(file.name)) {
      toast.error(
        "Supported files: .txt, .md, .csv, .json, .log. You can also paste text directly.",
      );
      return;
    }
    try {
      const content = await file.text();
      setText(content);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
      toast.success(`Loaded file: ${file.name} (${content.length} characters)`);
    } catch {
      toast.error("Failed to read file contents.");
    }
  }

  async function runRawUnderstanding() {
    if (!trimmedText) {
      toast.error("Please enter or paste your content to analyze.");
      return;
    }

    setBusy(true);
    try {
      const computedTitle = title.trim() || `Source Intake - ${new Date().toLocaleDateString()}`;
      const result = await create({
        data: {
          title: computedTitle,
          kind,
          rawText: text,
          extractionMethod: "direct_text",
          isDemo: false,
        },
      });

      toast.success("Source registered. Starting Raw Understanding & Fact-Lock...");
      navigate({ to: "/processing/$jobId", params: { jobId: result.jobId } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create the source.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function startDemo() {
    setBusy(true);
    try {
      const result = await loadDemo({ data: undefined });
      toast.success("Loaded demo dataset. Launching pipeline...");
      navigate({ to: "/processing/$jobId", params: { jobId: result.jobId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load sample scenario.");
    } finally {
      setBusy(false);
    }
  }

  const loadPreset = (preset: (typeof PRESET_SCENARIOS)[0]) => {
    setTitle(preset.title);
    setKind(preset.kind);
    setText(preset.text);
    toast.success(`Loaded "${preset.title}"`);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <PageHeader
        eyebrow="Stage 1 · Source Intake & Analysis"
        title="Upload Source Document"
        description="Provide raw reports, advisories, notes, or short memos. Accepts any content size from small updates to extensive documents."
        actions={
          <Button
            variant="outline"
            onClick={startDemo}
            disabled={busy}
            className="text-xs border-border/80 bg-background hover:bg-surface-raised"
          >
            <Sparkles className="size-3.5 mr-1 text-ember" />
            Load Sample Scenario
          </Button>
        }
      />

      {/* Quick Test Scenarios Bar */}
      <div className="rounded-lg border border-border/70 bg-surface/80 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-foreground">
            <BookOpen className="size-3.5 text-ember" />
            Quick Scenarios (One-Click Test)
          </span>
          <span className="text-[11px] text-muted-foreground">
            Click to auto-populate title, category, and source content
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {PRESET_SCENARIOS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => loadPreset(p)}
              className="group flex flex-col justify-between rounded-md border border-border/80 bg-background/80 p-3 text-left transition-all hover:border-ember/60 hover:bg-surface-raised"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="line-clamp-1 text-xs font-semibold text-foreground group-hover:text-ember transition-colors">
                    {p.title}
                  </span>
                  <span className="shrink-0 rounded bg-ember/10 px-1.5 py-0.5 font-mono text-[9px] font-medium text-ember">
                    {p.badge}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                  {p.text.slice(0, 100)}...
                </p>
              </div>
              <span className="mt-2 block font-mono text-[10px] uppercase text-muted-foreground">
                Classification: {p.kind}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Upload Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Input Form Column */}
        <div className="space-y-5 rounded-lg border border-border/80 bg-surface/90 p-6 lg:col-span-8 shadow-xs">
          {/* Document Title */}
          <div className="space-y-1.5">
            <Label htmlFor="source-title" className="text-xs font-medium text-foreground">
              Document Title <span className="text-muted-foreground">(Optional)</span>
            </Label>
            <Input
              id="source-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Incident Report INC-2026-0492 or Daily Security Briefing"
              className="h-10 text-xs border-border/80 bg-background/90 focus-visible:ring-ember font-sans"
            />
          </div>

          {/* Document Classification Chips */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-foreground">Document Classification</Label>
            <div className="flex flex-wrap gap-1.5">
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider transition-all",
                    kind === k
                      ? "border-ember bg-ember/15 text-ember font-semibold shadow-xs"
                      : "border-border/80 text-muted-foreground hover:text-foreground bg-background/60",
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          {/* File Drag & Drop Target */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
            className="rounded-md border border-dashed border-border/90 bg-background/40 px-4 py-5 text-center transition-all hover:border-ember/60 hover:bg-background/80"
          >
            <Upload className="mx-auto mb-1.5 size-5 text-muted-foreground/80" />
            <p className="text-xs text-muted-foreground">
              Drag & drop a text document (.txt, .md, .csv, .json), or{" "}
              <label className="cursor-pointer text-ember font-semibold hover:underline">
                browse files
                <input
                  type="file"
                  className="hidden"
                  accept=".txt,.md,.csv,.json,.log"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                  }}
                />
              </label>
            </p>
          </div>

          {/* Raw Text Content */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="raw-source-text"
                className="text-xs font-medium text-foreground flex items-center gap-1.5"
              >
                <FileText className="size-3.5 text-ember" />
                Raw Source Text
              </Label>

              <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                <span>{charCount.toLocaleString()} chars</span>
                <span>•</span>
                <span>{wordCount.toLocaleString()} words</span>
                {lineCount > 1 && (
                  <>
                    <span>•</span>
                    <span>{lineCount} lines</span>
                  </>
                )}
              </div>
            </div>

            <Textarea
              id="raw-source-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={11}
              placeholder="Paste or type any content here... From a 1-sentence quick alert to an extensive 100-page policy manual. All languages and lengths are accepted."
              className="font-mono text-xs border-border/80 bg-background/90 focus-visible:ring-ember leading-relaxed resize-y"
            />
          </div>

          {/* Primary Action Button */}
          <Button
            id="run-raw-understanding-btn"
            onClick={runRawUnderstanding}
            disabled={busy || !trimmedText}
            className="w-full h-11 bg-ember text-ember-foreground font-semibold text-xs uppercase tracking-widest hover:bg-ember/90 shadow-md transition-all flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Running Raw Understanding & Fact-Lock Pipeline...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                <span>Run Raw Understanding & Fact-Lock</span>
              </>
            )}
          </Button>
        </div>

        {/* Verification & Guarantees Column */}
        <aside className="space-y-5 lg:col-span-4">
          <div className="rounded-lg border border-border/80 bg-surface/90 p-5 text-xs space-y-3">
            <p className="font-mono text-xs font-semibold text-ember flex items-center gap-1.5">
              <ShieldCheck className="size-4" />
              Verified Processing Guarantees
            </p>
            <ul className="space-y-2.5 text-muted-foreground leading-relaxed">
              <li className="flex items-start gap-2">
                <FileCheck2 className="size-3.5 text-ember shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Any Size Accepted:</strong> Accepts
                  single-line alerts, memos, or multi-chapter reports without arbitrary cutoffs.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <FileCheck2 className="size-3.5 text-ember shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Deterministic Passage Chunks:</strong> Every
                  statement is indexed to verifiable passage coordinates <code>[P1]</code>.
                </div>
              </li>
              <li className="flex items-start gap-2">
                <FileCheck2 className="size-3.5 text-ember shrink-0 mt-0.5" />
                <div>
                  <strong className="text-foreground">Strict Fact-Locking:</strong> Numbers, dates,
                  names, and critical directives are locked to eliminate hallucinations.
                </div>
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-border/80 bg-surface/90 p-5 text-xs space-y-2">
            <p className="font-mono text-[11px] font-semibold text-foreground flex items-center gap-1.5">
              <HelpCircle className="size-3.5 text-ember" />
              System Status
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Database and verification engine connected. Once raw understanding completes, you can
              generate audited briefs, public advisories, social summaries, and translations.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
