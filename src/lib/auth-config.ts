export function isGoogleAuthEnabled(): boolean {
  const enabled =
    (typeof process !== "undefined" && process.env?.VITE_ENABLE_GOOGLE_AUTH) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_ENABLE_GOOGLE_AUTH);

  return enabled === "true" || enabled === true;
}

export function formatSupabaseAuthIssue(rawMessage: string): string {
  const msg = rawMessage.toLowerCase();

  if (
    msg.includes("missing oauth secret") ||
    msg.includes("unsupported provider") ||
    msg.includes("validation_failed") ||
    msg.includes("oauth")
  ) {
    return "Google sign-in is not configured in Supabase yet. Please add the Google OAuth Client ID and Secret before enabling Google login.";
  }

  if (
    msg.includes("rate limit") ||
    msg.includes("invoice") ||
    msg.includes("billing") ||
    msg.includes("quota") ||
    msg.includes("email delivery") ||
    msg.includes("smtp")
  ) {
    return "Email delivery is currently rate-limited or not configured correctly in Supabase. Check your SMTP/email provider and billing status.";
  }

  return rawMessage || "Authentication is unavailable right now. Please try again or check your Supabase configuration.";
}
