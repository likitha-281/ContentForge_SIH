import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://toqcdcapidfcgxfdqcvy.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_tRxdda-sMwyS2zBtRw6-zA_qIVzKll3";

/**
 * Creates a server-side Supabase client with the user's authentic JWT bearer token.
 * Queries Supabase PostgreSQL enforcing Row Level Security (RLS).
 */
export function createSupabaseServerClient(userId: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token && token.split(".").length === 3) {
    headers.Authorization = `Bearer ${token}`;
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers },
    auth: { persistSession: false },
  });
}

export function createSupabaseAdminClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

export const supabaseAdmin = createSupabaseAdminClient();
