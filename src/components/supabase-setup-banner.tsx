import { useState, useEffect } from "react";
import { Check, Copy, Database, ExternalLink, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { realSupabase, SUPABASE_URL } from "@/integrations/supabase/client";

export function SupabaseSetupBanner() {
  const [missingTables, setMissingTables] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sqlContent, setSqlContent] = useState<string>("");

  useEffect(() => {
    // Check if sources table exists in remote Supabase
    async function checkSchema() {
      try {
        const { error } = await realSupabase
          .from("sources" as any)
          .select("id")
          .limit(1);
        if (error && (error as any).code === "PGRST205") {
          setMissingTables(true);
        } else {
          setMissingTables(false);
        }
      } catch {
        setMissingTables(true);
      }
    }

    checkSchema();

    const handleMissing = () => {
      setMissingTables(true);
    };

    window.addEventListener("supabase_table_missing", handleMissing);
    return () => window.removeEventListener("supabase_table_missing", handleMissing);
  }, []);

  const handleCopySql = async () => {
    try {
      if (!sqlContent) {
        // Fetch or read sql
        const res = await fetch("/supabase-schema.sql");
        if (res.ok) {
          const text = await res.text();
          await navigator.clipboard.writeText(text);
        } else {
          await navigator.clipboard.writeText(`-- INTELLI-FORGE Database Schema
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/toqcdcapidfcgxfdqcvy/sql/new
-- See /supabase/schema.sql in the project repository for the full SQL definition.`);
        }
      } else {
        await navigator.clipboard.writeText(sqlContent);
      }
      setCopied(true);
      toast.success("Consolidated Supabase SQL copied to clipboard!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.info("Please open /supabase/schema.sql to copy the SQL.");
    }
  };

  if (dismissed || missingTables === false) {
    return null;
  }

  // Extract project ref from SUPABASE_URL
  const projectRef = SUPABASE_URL.replace("https://", "").split(".")[0] || "toqcdcapidfcgxfdqcvy";
  const sqlEditorUrl = `https://supabase.com/dashboard/project/${projectRef}/sql/new`;

  return (
    <div className="relative mb-6 overflow-hidden rounded-lg border border-ember/30 bg-surface-raised/95 p-4 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-ember/15 text-ember">
            <Database className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground">
                Supabase Integration Connected
              </h4>
              <span className="rounded bg-ember/20 px-1.5 py-0.5 font-mono text-[10px] font-medium text-ember">
                Database Migration Pending
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed max-w-2xl">
              Connected to Supabase project{" "}
              <span className="font-mono text-foreground font-medium">{projectRef}</span>. To enable
              live cloud storage directly in your Supabase instance, run the consolidated schema
              script in your Supabase SQL Editor.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopySql}
            className="h-8 gap-1.5 text-xs border-ember/40 text-foreground hover:bg-ember/10"
          >
            {copied ? (
              <Check className="size-3.5 text-emerald-400" />
            ) : (
              <Copy className="size-3.5" />
            )}
            <span>{copied ? "SQL Copied" : "Copy SQL Script"}</span>
          </Button>

          <a
            href={sqlEditorUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-ember px-3 text-xs font-semibold text-white transition-opacity hover:opacity-90 shadow-sm"
          >
            <span>Open SQL Editor</span>
            <ExternalLink className="size-3.5" />
          </a>

          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            title="Dismiss notice"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
