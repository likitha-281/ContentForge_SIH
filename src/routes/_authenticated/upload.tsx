import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  BookOpen,
  FileCheck,
  FileText,
  Globe,
  Radio,
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

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Upload a Source — INTELLI-FORGE" },
      {
        name: "description",
        content: "Bring in any report, advisory or note and start the verified understanding and fact-locking pipeline.",
      },
    ],
  }),
  component: UploadPage,
});

const KINDS = ["report", "advisory", "incident report", "transcript", "policy directive", "briefing note"];

const PRESET_SCENARIOS = [
  {
    id: "ntro",
    title: "NTRO Incident Advisory: Zero-Day Telecom Gateway Exploitation",
    kind: "incident report",
    text:
      "NATIONAL TECHNICAL RESEARCH ORGANISATION (NTRO) / CYBER DEFENCE DIRECTIVE\n" +
      "ADVISORY REF: NTRO-2026-CRIT-0492\n" +
      "CLASSIFICATION: URGENT / OPERATIONAL\n" +
      "DATE: 07 SEPTEMBER 2026\n\n" +
      "1. EXECUTIVE OVERVIEW\n" +
      "A sophisticated state-sponsored threat group has actively exploited a remote code execution vulnerability (CVE-2026-8812) in core telecommunication routing infrastructure. The vulnerability allows unauthenticated attackers to execute arbitrary commands at the kernel level.\n\n" +
      "2. AFFECTED INFRASTRUCTURE AND IMPACT\n" +
      "Forensic telemetry confirms that exactly 17 critical gateway switching systems across 3 major telecommunications hubs were compromised between 02:00 UTC and 04:30 UTC on 06 September 2026. Data exfiltration of packet telemetry occurred; however, encrypted subscriber identity databases remain intact.\n\n" +
      "3. MANDATORY ACTION DIRECTIVES\n" +
      "- All designated telecom operators and tier-1 ISPs must apply Security Patch Release v2.4 immediately.\n" +
      "- Affected nodes must be isolated into quarantined VLANs within 6 hours of receipt of this notice.\n" +
      "- Outbound port 8443 traffic to unverified IP ranges must be blocked unconditionally.\n" +
      "- Incident containment verification reports must be submitted to the National Cyber Coordination Centre (NCCC) by 18:00 IST.",
  },
  {
    id: "disaster",
    title: "NDMA Cyclone Alert: Severe Storm Warning for Coastal Sectors",
    kind: "advisory",
    text:
      "NATIONAL DISASTER MANAGEMENT AUTHORITY (NDMA)\n" +
      "SPECIAL METEOROLOGICAL BULLETIN NO: NDMA-CYC-2026-08\n" +
      "ISSUED: 07 SEPTEMBER 2026, 09:00 IST\n\n" +
      "1. WEATHER WARNING AND TRACK\n" +
      "Severe Cyclonic Storm 'VAAYU-II' over the Bay of Bengal has intensified and is moving west-northwestwards at 18 km/h. Landfall is expected near District Paradip on 09 September 2026 between 14:00 and 17:00 IST, with sustained wind speeds of 135-145 km/h gusting to 160 km/h.\n\n" +
      "2. EVACUATION AND RESOURCE MOBILISATION\n" +
      "Evacuation of 45,000 residents living in low-lying coastal zones within 5 km of the shoreline is mandatory. 24 National Disaster Response Force (NDRF) battalions have been pre-deployed with satellite communication kits and emergency inflatable boats.\n\n" +
      "3. PUBLIC DIRECTIVES\n" +
      "- Fishermen are strictly advised not to venture into deep sea waters until 11 September 2026.\n" +
      "- Emergency relief shelters have stocked 14 days of food grains and water purification tablets.\n" +
      "- Citizen helpline 1070 is operational 24x7 with multilingual support.",
  },
  {
    id: "rbi",
    title: "CERT-In & RBI Financial Cyber Defense Directive on API Tokens",
    kind: "policy directive",
    text:
      "RESERVE BANK OF INDIA & CERT-IN JOINT CIRCULAR\n" +
      "CIRCULAR NO: RBI/2026-27/114 | DPSS.CO.OD.No.742\n" +
      "DATE: 07 SEPTEMBER 2026\n\n" +
      "1. THREAT CONTEXT\n" +
      "Recent automated API credential stuffing attacks targeted open banking endpoint interfaces. To prevent fraudulent unauthorized fund transfers, enhanced security guidelines are enforced with immediate effect.\n\n" +
      "2. ENFORCEMENT MEASURES\n" +
      "- All scheduled commercial banks and payment system operators must enforce short-lived OAuth 2.1 access tokens with a maximum lifespan of 15 minutes.\n" +
      "- Multi-factor authentication (MFA) with biometric or FIDO2 hardware tokens is mandatory for transactions exceeding ₹50,000.\n" +
      "- Zero-trust network segmentation must be fully implemented across all core banking server clusters by 30 September 2026.",
  },
];

function UploadPage() {
  const navigate = useNavigate();
  const create = useServerFn(createSource);
  const loadDemo = useServerFn(loadDemoSource);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("incident report");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!/\.(txt|md|csv|json)$/i.test(file.name)) {
      toast.error(
        "This prototype accepts plain-text sources (.txt, .md, .csv, .json). You can also paste text in any language below.",
      );
      return;
    }
    const content = await file.text();
    setText(content);
    if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ""));
    toast.success("File content loaded.");
  }

  async function submit() {
    if (text.trim().length < 5) {
      toast.error("Please enter or paste your source text.");
      return;
    }
    setBusy(true);
    try {
      const result = await create({
        data: {
          title: title.trim() || "Untitled Source Document",
          kind,
          rawText: text,
          extractionMethod: "direct_text",
          isDemo: false,
        },
      });
      navigate({ to: "/processing/$jobId", params: { jobId: result.jobId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the source.");
    } finally {
      setBusy(false);
    }
  }

  async function startDemo() {
    setBusy(true);
    try {
      const result = await loadDemo({ data: undefined });
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
    <div>
      <PageHeader
        eyebrow="Stage 1 · Source Intake"
        title="Upload source document"
        description="Provide raw reports, advisories, or circulars in any language. INTELLI-FORGE parses, understands, and locks facts."
        actions={
          <Button variant="outline" onClick={startDemo} disabled={busy} className="text-xs">
            <Sparkles className="size-3.5 mr-1 text-ember" />
            Quick Demo Scenario
          </Button>
        }
      />

      <div className="grid gap-6 p-6 lg:grid-cols-12">
        {/* Main Upload Form */}
        <div className="space-y-5 rounded-sm border border-border bg-surface p-6 lg:col-span-8">
          {/* Preset Scenario Selectors */}
          <div>
            <span className="label-mono flex items-center gap-1.5 pb-2">
              <BookOpen className="size-3 text-ember" />
              Pre-configured SIH 2026 Test Scenarios
            </span>
            <div className="grid gap-2 sm:grid-cols-3">
              {PRESET_SCENARIOS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => loadPreset(p)}
                  className="rounded border border-border bg-background p-2.5 text-left text-xs transition-colors hover:border-ember/60 hover:bg-surface-raised"
                >
                  <span className="font-semibold text-foreground line-clamp-1">{p.title}</span>
                  <span className="mt-1 block font-mono text-[10px] text-ember uppercase">{p.kind}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <Label htmlFor="title" className="text-xs font-semibold">
              Source Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Incident Report INC-2026-0492"
              className="h-9 text-xs border-border bg-background focus-visible:ring-ember"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Document Classification</Label>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={cn(
                    "rounded-sm border px-3 py-1 font-mono text-[11px] uppercase tracking-wider transition-colors",
                    kind === k
                      ? "border-ember bg-ember/15 text-ember font-semibold"
                      : "border-border text-muted-foreground hover:text-foreground bg-background",
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          {/* File Drag & Drop */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
            className="rounded-sm border border-dashed border-border bg-background/50 px-4 py-6 text-center transition-colors hover:border-ember/50"
          >
            <Upload className="size-6 text-muted-foreground mx-auto mb-2 opacity-70" />
            <p className="text-xs text-muted-foreground">
              Drop a plain-text file (.txt, .md, .csv, .json) here, or{" "}
              <label className="cursor-pointer text-ember font-medium hover:underline">
                browse files
                <input
                  type="file"
                  className="hidden"
                  accept=".txt,.md,.csv,.json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                  }}
                />
              </label>
            </p>
          </div>

          {/* Source Text Area (Arbitrary Language & Size) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="text" className="text-xs font-semibold flex items-center gap-1.5">
                <FileText className="size-3.5 text-ember" />
                Raw Source Text (Supports Any Language & Size)
              </Label>
              <span className="label-mono">
                {text.length.toLocaleString()} chars · {new TextEncoder().encode(text).length.toLocaleString()} bytes
              </span>
            </div>
            <Textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              placeholder="Paste raw advisory, press release, or report in Hindi, English, Tamil, Telugu, or any language..."
              className="font-mono text-xs border-border bg-background focus-visible:ring-ember leading-relaxed"
            />
          </div>

          <Button
            onClick={submit}
            disabled={busy || text.trim().length < 5}
            className="w-full bg-ember text-ember-foreground font-semibold text-xs uppercase tracking-widest hover:bg-ember/90 h-10"
          >
            {busy ? "Starting Understanding Pipeline..." : "Run Understanding & Fact-Lock Pipeline"}
          </Button>
        </div>

        {/* Sidebar Information */}
        <aside className="space-y-5 lg:col-span-4">
          <div className="rounded-sm border border-border bg-surface p-5 text-xs space-y-3">
            <p className="label-mono flex items-center gap-1.5 text-ember">
              <ShieldCheck className="size-3.5" />
              Verified Processing Guarantees
            </p>
            <ul className="space-y-2 text-muted-foreground leading-relaxed">
              <li>
                <strong className="text-foreground">Deterministic Extraction:</strong> Quotes are located into numbered passage chunks <code>[S1-P1]</code>.
              </li>
              <li>
                <strong className="text-foreground">Strict Fact-Locking:</strong> Dates, casualties, CVE numbers, and directives are locked to prevent hallucination.
              </li>
              <li>
                <strong className="text-foreground">Multilingual Capability:</strong> Input documents in Hindi, Tamil, Telugu, English, or any global language are parsed with native entity recognition.
              </li>
            </ul>
          </div>

          <div className="rounded-sm border border-border bg-surface p-5 text-xs space-y-2">
            <p className="label-mono flex items-center gap-1.5">
              <Globe className="size-3.5 text-ember" />
              SIH 2026 Problem Statement 26154
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Designed to transform high-stakes government and enterprise material into audience-ready outputs with 100% mathematical auditability.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
