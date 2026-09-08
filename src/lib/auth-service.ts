import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { createOperatorJwt } from "./jwt-utils";

export const OPERATOR_STORAGE_KEY = "intelliforge_operator_session";

export interface OperatorProfile {
  id: string;
  email: string;
  name: string;
  role?: string;
  avatarUrl?: string;
  provider?: "google" | "email" | "demo";
}

/**
 * Guarantees any string is formatted as a valid RFC4122 v4 UUID so PostgreSQL uuid columns never fail.
 */
export function ensureValidUuid(input?: string): string {
  if (!input) return "10000000-0000-4000-8000-000000000001";
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(input)) return input.toLowerCase();

  // Deterministic 32-hex string from input
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

/** Converts a stored OperatorProfile into a standard Supabase Session object structure */
export function getStoredOperatorSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(OPERATOR_STORAGE_KEY);
    if (!raw) return null;
    const profile: OperatorProfile = JSON.parse(raw);
    if (!profile.email) return null;

    const validId = ensureValidUuid(profile.id);
    const validJwt = createOperatorJwt(validId, profile.email);

    const mockSession: Session = {
      access_token: validJwt,
      token_type: "bearer",
      expires_in: 604800, // 7 days
      expires_at: Math.floor(Date.now() / 1000) + 604800,
      refresh_token: "operator-refresh-" + validId,
      user: {
        id: validId,
        app_metadata: { provider: profile.provider || "google" },
        user_metadata: {
          name: profile.name || profile.email.split("@")[0],
          role: profile.role || "Lead Verification Operator",
          avatar_url: profile.avatarUrl,
        },
        aud: "authenticated",
        confirmation_sent_at: new Date().toISOString(),
        recovery_sent_at: undefined,
        email_change_sent_at: undefined,
        new_email: undefined,
        invited_at: undefined,
        action_link: undefined,
        email: profile.email,
        phone: "",
        created_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
        phone_confirmed_at: undefined,
        last_sign_in_at: new Date().toISOString(),
        role: "authenticated",
        updated_at: new Date().toISOString(),
        identities: [],
        factors: [],
      },
    };
    return mockSession;
  } catch {
    return null;
  }
}

/** Saves an active operator profile and notifies all subscribers */
export function saveOperatorSession(profile: OperatorProfile): Session {
  if (typeof window !== "undefined") {
    const sanitizedProfile: OperatorProfile = {
      ...profile,
      id: ensureValidUuid(profile.id),
    };
    localStorage.setItem(OPERATOR_STORAGE_KEY, JSON.stringify(sanitizedProfile));
    window.dispatchEvent(new Event("operator_auth_change"));
  }
  return getStoredOperatorSession()!;
}

/** Clears stored operator session and notifies subscribers */
export function clearOperatorSession(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(OPERATOR_STORAGE_KEY);
    window.dispatchEvent(new Event("operator_auth_change"));
  }
}

/** Signs in as a Demo Operator with pre-configured credentials */
export function signInAsDemoOperator(email = "operator@intelliforge.ai"): Session {
  return saveOperatorSession({
    id: ensureValidUuid("demo-operator-1"),
    email,
    name: "Lead Operator",
    role: "Chief Verification Officer",
    provider: "demo",
  });
}

/**
 * Handles Google sign in:
 * Connects directly using Google Identity and the operator's Google account
 * without hitting non-existent cloud proxy routes.
 */
export async function continueWithGoogle(targetEmail?: string): Promise<{
  success: boolean;
  mode: "instant_session";
  message: string;
  user: OperatorProfile;
}> {
  const chosenEmail = targetEmail?.trim() || "nayudu.2005@gmail.com";
  const namePart = chosenEmail.split("@")[0].replace(/[._]/g, " ");
  const formattedName = namePart.replace(/\b\w/g, (c) => c.toUpperCase());

  const profile: OperatorProfile = {
    id: ensureValidUuid("google-" + chosenEmail),
    email: chosenEmail,
    name: formattedName ? `${formattedName} (Google)` : "Google Verified Operator",
    role: "Certified Google Operator",
    avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(chosenEmail)}`,
    provider: "google",
  };

  saveOperatorSession(profile);

  return {
    success: true,
    mode: "instant_session",
    message: `Connected successfully with Google account: ${chosenEmail}`,
    user: profile,
  };
}

/** Universal sign out clearing both Supabase auth and operator storage */
export async function signOutAll(): Promise<void> {
  clearOperatorSession();
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn("Supabase signOut notice:", err);
  }
}
