import assert from "node:assert/strict";
import test from "node:test";

import { formatSupabaseAuthIssue, isGoogleAuthEnabled } from "./auth-config.ts";

test("formats missing Google OAuth configuration cleanly", () => {
  assert.equal(
    formatSupabaseAuthIssue("Unsupported provider: missing OAuth secret"),
    "Google sign-in is not configured in Supabase yet. Please add the Google OAuth Client ID and Secret before enabling Google login.",
  );
});

test("formats rate-limit and billing messages cleanly", () => {
  assert.equal(
    formatSupabaseAuthIssue("rate limit exceeded for email delivery"),
    "Email delivery is currently rate-limited or not configured correctly in Supabase. Check your SMTP/email provider and billing status.",
  );
});

test("reads the Google auth toggle from env", () => {
  const prev = process.env.VITE_ENABLE_GOOGLE_AUTH;
  process.env.VITE_ENABLE_GOOGLE_AUTH = "true";
  try {
    assert.equal(isGoogleAuthEnabled(), true);
  } finally {
    if (prev === undefined) delete process.env.VITE_ENABLE_GOOGLE_AUTH;
    else process.env.VITE_ENABLE_GOOGLE_AUTH = prev;
  }
});
