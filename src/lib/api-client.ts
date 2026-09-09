import { supabase } from "@/integrations/supabase/client";

const API_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_FASTAPI_URL) ||
  "http://localhost:8000";

/**
 * Centralized API client for communicating with the FastAPI backend.
 * Automatically injects the authentic Supabase Bearer JWT token from supabase.auth.getSession().
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: Record<string, string> = {};
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch (err) {
    console.warn("Could not retrieve Supabase session for API call:", err);
  }
  return headers;
}

export const apiClient = {
  baseUrl: API_BASE_URL,

  async get<T = any>(endpoint: string): Promise<T> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errBody.detail || `Request failed with status ${res.status}`);
    }
    return res.json();
  },

  async post<T = any>(endpoint: string, body: any): Promise<T> {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errBody.detail || `Request failed with status ${res.status}`);
    }
    return res.json();
  },

  async upload<T = any>(endpoint: string, formData: FormData): Promise<T> {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        ...authHeaders,
      },
      body: formData,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(errBody.detail || `Upload failed with status ${res.status}`);
    }
    return res.json();
  },

  // High-level API helpers
  async health() {
    return this.get("/api/health");
  },

  async getMe() {
    return this.get("/api/auth/me");
  },

  async uploadSource(formData: FormData) {
    return this.upload("/api/upload", formData);
  },

  async processJob(jobId: string) {
    return this.post(`/api/process/${jobId}`, {});
  },

  async generate(payload: {
    sourceId: string;
    language?: string;
    intentPrompt?: string;
    artefacts: Array<{
      audience: string;
      outputType: string;
      tone: string;
      detail: string;
      objective: string;
    }>;
  }) {
    return this.post("/api/generate", payload);
  },

  async verify(payload: {
    sourceId?: string;
    content: string;
    audience?: string;
    outputType?: string;
  }) {
    return this.post("/api/verify", payload);
  },

  async review(outputId: string, payload: {
    action: "approved" | "rejected" | "edited";
    notes?: string;
    editedContent?: string;
  }) {
    return this.post(`/api/review/${outputId}`, payload);
  },

  async distribute(outputId: string, payload: {
    channel: "web" | "smtp" | "rest";
    target?: string;
  }) {
    return this.post(`/api/distribute/${outputId}`, payload);
  },

  async getDashboard() {
    return this.get("/api/dashboard");
  },

  async getAudit() {
    return this.get("/api/audit");
  },
};
