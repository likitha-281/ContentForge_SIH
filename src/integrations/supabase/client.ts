import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

export const SUPABASE_URL =
  (typeof process !== "undefined" && process.env?.VITE_SUPABASE_URL) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  "https://toqcdcapidfcgxfdqcvy.supabase.co";

export const SUPABASE_ANON_KEY =
  (typeof process !== "undefined" &&
    (process.env?.VITE_SUPABASE_PUBLISHABLE_KEY || process.env?.VITE_SUPABASE_ANON_KEY)) ||
  (typeof import.meta !== "undefined" &&
    (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY)) ||
  "sb_publishable_tRxdda-sMwyS2zBtRw6-zA_qIVzKll3";

/**
 * The official Supabase client instance connected to the user's Supabase project.
 * Handles user authentication, PostgreSQL database queries with RLS, and Storage.
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "intelliforge_supabase_auth_token",
  },
});

export const realSupabase = supabase;
