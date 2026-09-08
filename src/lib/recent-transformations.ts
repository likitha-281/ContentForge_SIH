export interface RecentTransformation {
  id: string;
  sourceId?: string;
  outputId?: string;
  sourceTitle: string;
  inputTextSnippet: string;
  outputType: string;
  outputTextSnippet: string;
  timestamp: string;
  language?: string;
}

const STORAGE_KEY = "intelliforge_recent_transformations";
const MAX_RECENT = 25;

export function getRecentTransformations(): RecentTransformation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveRecentTransformation(item: Omit<RecentTransformation, "id" | "timestamp"> & { id?: string }) {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentTransformations();
    const newItem: RecentTransformation = {
      id: item.id || `trans-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sourceId: item.sourceId,
      outputId: item.outputId,
      sourceTitle: item.sourceTitle,
      inputTextSnippet: item.inputTextSnippet.slice(0, 300),
      outputType: item.outputType,
      outputTextSnippet: item.outputTextSnippet.slice(0, 400),
      timestamp: new Date().toISOString(),
      language: item.language || "English",
    };

    // Filter out duplicate if same outputId
    const filtered = existing.filter((e) => !item.outputId || e.outputId !== item.outputId);
    const updated = [newItem, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Dispatch custom event for live react updates
    window.dispatchEvent(new CustomEvent("recent_transformations_updated", { detail: updated }));
  } catch {
    /* ignore */
  }
}

export function clearRecentTransformations() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("recent_transformations_updated", { detail: [] }));
  } catch {
    /* ignore */
  }
}
