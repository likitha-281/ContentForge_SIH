import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSource, loadDemoSource } from "@/lib/pipeline.functions";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Upload a source — INTELLI-FORGE" },
      {
        name: "description",
        content: "Bring in a report, advisory or note and start the real understanding pipeline.",
      },
      { property: "og:title", content: "Upload a source — INTELLI-FORGE" },
      { property: "og:description", content: "Start the INTELLI-FORGE understanding pipeline." },
    ],
  }),
  component: UploadPage,
});

const KINDS = ["text", "report", "advisory", "incident report", "transcript", "note"];

function UploadPage() {
  const navigate = useNavigate();
  const create = useServerFn(createSource);
  const loadDemo = useServerFn(loadDemoSource);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("report");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!/\.(txt|md|csv|json)$/i.test(file.name)) {
      toast.error(
        "This prototype reads plain-text sources (.txt, .md, .csv, .json). Paste the text of other formats below.",
      );
      return;
    }
    const content = await file.text();
    setText(content);
    if (!title) setTitle(file.name);
    toast.success("File text loaded.");
  }

  async function submit() {
    if (text.trim().length < 40) {
      toast.error("Add at least a paragraph of source text.");
      return;
    }
    setBusy(true);
    try {
      const result = await create({
        data: {
          title: title.trim() || "Untitled source",
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
      toast.error(err instanceof Error ? err.message : "Could not load the sample scenario.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Stage 1 · Intake"
        title="Upload source"
        description="What did I receive? Bring in the material, then INTELLI-FORGE parses, understands and locks its facts."
        actions={
          <Button variant="outline" onClick={startDemo} disabled={busy}>
            Load sample scenario
          </Button>
        }
      />

      <div className="grid gap-6 p-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4 rounded-sm border border-border bg-surface p-6">
          <div className="space-y-1.5">
            <Label htmlFor="title">Source title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Incident report INC-2026-0447"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Source type</Label>
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`rounded-sm border px-3 py-1 font-mono text-[11px] uppercase tracking-widest transition-colors ${
                    kind === k
                      ? "border-ember bg-ember/15 text-ember"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void handleFile(file);
            }}
            className="rounded-sm border border-dashed border-border px-4 py-6 text-center"
          >
            <p className="text-sm text-muted-foreground">
              Drop a plain-text file here, or{" "}
              <label className="cursor-pointer text-ember underline-offset-4 hover:underline">
                browse
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

          <div className="space-y-1.5">
            <Label htmlFor="text">Source text</Label>
            <Textarea
              id="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={14}
              placeholder="Paste the report, advisory or transcript here…"
              className="font-mono text-xs"
            />
            <p className="label-mono">
              {new TextEncoder().encode(text).length.toLocaleString()} bytes
            </p>
          </div>

          <Button onClick={submit} disabled={busy} className="font-mono text-xs uppercase tracking-widest">
            {busy ? "Starting…" : "Analyse source"}
          </Button>
        </div>

        <aside className="space-y-4">
          <div className="rounded-sm border border-border bg-surface p-5">
            <p className="label-mono">What this prototype handles honestly</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="text-foreground">Supported now:</span> pasted text and plain-text
                files — parsed, understood, indexed and verified for real.
              </li>
              <li>
                <span className="text-foreground">Not implemented:</span> PDF, DOCX, image, audio
                and video extraction. Rather than fake a transcript, paste the text and the rest of
                the pipeline runs identically.
              </li>
            </ul>
          </div>
          <div className="rounded-sm border border-border bg-surface p-5">
            <p className="label-mono">Sample scenario</p>
            <p className="mt-3 text-sm text-muted-foreground">
              A clearly labelled fictional incident report. It contains the locked fact
              &ldquo;17 systems affected&rdquo; used to demonstrate conflict detection.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
