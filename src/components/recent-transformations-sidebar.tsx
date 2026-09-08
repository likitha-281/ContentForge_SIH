import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import {
  History,
  X,
  ChevronRight,
  ArrowUpRight,
  Trash2,
  FileText,
  Sparkles,
  Copy,
  Check,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { toast } from "sonner";
import {
  getRecentTransformations,
  clearRecentTransformations,
  type RecentTransformation,
} from "@/lib/recent-transformations";
import { useI18n } from "@/context/language-context";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function RecentTransformationsSidebar() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<RecentTransformation[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadItems = () => {
    setItems(getRecentTransformations());
  };

  useEffect(() => {
    loadItems();
    const handleUpdate = () => loadItems();
    window.addEventListener("recent_transformations_updated", handleUpdate);
    return () => window.removeEventListener("recent_transformations_updated", handleUpdate);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success(t("recent.copied", "Copied to clipboard"));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    clearRecentTransformations();
    setItems([]);
    toast.info(t("recent.cleared", "Cleared recent transformations history"));
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-border/80 bg-surface/95 px-3.5 py-2 shadow-lg backdrop-blur-md transition-all hover:bg-surface-raised hover:border-ember/50 hover:scale-105 active:scale-95",
          isOpen && "right-[340px]",
        )}
        title={t("recent.title", "Recent Transformations")}
      >
        <History className="size-4 text-ember" />
        <span className="font-mono text-xs font-semibold text-foreground">
          {t("recent.btnLabel", "Recents")}
        </span>
        {items.length > 0 && (
          <span className="flex size-4 items-center justify-center rounded-full bg-ember text-[10px] font-bold text-ember-foreground">
            {items.length}
          </span>
        )}
      </button>

      {/* Slide-out Panel */}
      {isOpen && (
        <aside
          className="fixed right-0 top-0 z-50 flex h-full w-[330px] flex-col border-l border-border/80 bg-background/95 shadow-2xl backdrop-blur-md transition-all animate-in slide-in-from-right duration-200"
          aria-label={t("recent.title", "Recent Transformations")}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/80 p-4">
            <div className="flex items-center gap-2">
              <History className="size-4 text-ember" />
              <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
                {t("recent.title", "Recent Transformations")}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                  title={t("recent.clearAll", "Clear all")}
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-surface-raised hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Subtitle / Description */}
          <div className="bg-surface/50 px-4 py-2 text-[11px] text-muted-foreground border-b border-border/50">
            {t("recent.subdesc", "Saved input and output pairs in this browser")}
          </div>

          {/* List of items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                <Sparkles className="size-8 text-muted-foreground/40 mb-2" />
                <p className="text-xs font-medium text-foreground">
                  {t("recent.emptyTitle", "No recent transformations yet")}
                </p>
                <p className="mt-1 text-[11px] max-w-[200px] leading-relaxed">
                  {t(
                    "recent.emptyDesc",
                    "When you upload or generate outputs, they will automatically appear here.",
                  )}
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-lg border border-border/80 bg-surface/80 p-3 shadow-xs transition-all hover:border-ember/50 hover:bg-surface"
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="line-clamp-1 font-semibold text-xs text-foreground">
                      {item.sourceTitle || t("recent.unnamed", "Transformation")}
                    </span>
                    <span className="shrink-0 rounded bg-ember/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-ember">
                      {item.outputType}
                    </span>
                  </div>

                  {/* Input Snippet */}
                  <div className="mb-2 rounded bg-background/80 p-2 text-[11px] text-muted-foreground border border-border/50">
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/80 mb-1">
                      <span>{t("recent.inputLabel", "Input Source")}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.inputTextSnippet, `${item.id}-in`)}
                        className="hover:text-foreground"
                        title={t("recent.copyInput", "Copy input")}
                      >
                        {copiedId === `${item.id}-in` ? (
                          <Check className="size-3 text-verified" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                    <p className="line-clamp-2 italic font-sans">{item.inputTextSnippet}</p>
                  </div>

                  {/* Output Snippet */}
                  <div className="rounded bg-background/80 p-2 text-[11px] text-foreground border border-border/50">
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground/80 mb-1">
                      <span>{t("recent.outputLabel", "Generated Output")}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.outputTextSnippet, `${item.id}-out`)}
                        className="hover:text-foreground"
                        title={t("recent.copyOutput", "Copy output")}
                      >
                        {copiedId === `${item.id}-out` ? (
                          <Check className="size-3 text-verified" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                    <p className="line-clamp-2 leading-relaxed font-sans">{item.outputTextSnippet}</p>
                  </div>

                  {/* Footer actions */}
                  <div className="mt-2 flex items-center justify-between pt-1 text-[10px] font-mono text-muted-foreground">
                    <span>
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </span>
                    {item.outputId && (
                      <Link
                        to="/outputs/$outputId"
                        params={{ outputId: item.outputId }}
                        className="inline-flex items-center gap-1 font-semibold text-ember hover:underline"
                      >
                        <span>{t("recent.viewDetails", "View")}</span>
                        <ArrowUpRight className="size-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      )}
    </>
  );
}
