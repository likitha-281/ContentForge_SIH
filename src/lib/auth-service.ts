import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const OPERATOR_STORAGE_KEY = "intelliforge_operator_session";

export interface OperatorProfile {
  id: string;
  email: string;
  name: string;
  role?: string;
  avatarUrl?: string;
  provider?: "google" | "email" | "demo";
}

export function ensureValidUuid(input?: string): string {
  if (!input) return "10000000-0000-4000-8000-000000000001";
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(input)) return input.toLowerCase();

  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash1 = ((hash1 << 5) + hash1) ^ char;
    hash2 = ((hash2 << 5) + hash2) ^ char;
  }
  const hex1 = Math.abs(hash1).toString(16).padStart(8, "0");
  const hex2 = Math.abs(hash2).toString(16).padStart(8, "0");
  const hexFull = (hex1 + hex2 + hex1 + hex2).slice(0, 32);
  return `${hexFull.slice(0, 8)}-${hexFull.slice(8, 12)}-4${hexFull.slice(13, 16)}-a${hexFull.slice(17, 20)}-${hexFull.slice(20, 32)}`;
}

export function getStoredOperatorSession(): Session | null {
  return null;
}

export function saveOperatorSession(profile: OperatorProfile): Session | null {
  return null;
}

export function clearOperatorSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(OPERATOR_STORAGE_KEY);
    document.cookie = "operator_token=; path=/; max-age=0; SameSite=Lax";
  }
}

export async function signOutAll(): Promise<void> {
  clearOperatorSession();
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("Supabase signOut notice:", err);
  }
}
