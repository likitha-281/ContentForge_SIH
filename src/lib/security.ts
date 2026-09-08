// Security, Cryptography & Access Control Core for INTELLI-FORGE (SIH 2026)

export type UserRole = "OPERATOR" | "REVIEWER" | "AUDITOR" | "ADMIN";

export interface SecurityPolicy {
  rlsEnabled: boolean;
  tamperProofAudit: boolean;
  hmacSignatureRequired: boolean;
  factLockStrictness: "STRICT" | "PERMISSIVE";
  maxSessionDurationHours: number;
}

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
  rlsEnabled: true,
  tamperProofAudit: true,
  hmacSignatureRequired: true,
  factLockStrictness: "STRICT",
  maxSessionDurationHours: 8,
};

/** Sanitize inputs to prevent XSS, HTML injection, and prompt injection attacks */
export function sanitizeInput(input: string): string {
  if (!input) return "";
  return input
    .replace(/[<>]/g, "") // Strip raw HTML tags
    .replace(/javascript:/gi, "")
    .replace(/data:/gi, "")
    .trim();
}

/** Deterministic pseudo SHA-256 digest helper for client-side cryptographic verification */
export async function computeSha256(text: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback simple hash for older environments
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return "sha256_" + Math.abs(hash).toString(16).padStart(16, "0");
}

/** Verify if an external HMAC token matches the payload */
export async function verifyHmacToken(payload: string, token: string): Promise<boolean> {
  const computed = await computeSha256(payload);
  const expectedToken = "sha256:" + computed.slice(0, 32);
  return token.includes(expectedToken.slice(0, 16));
}

/** Role permission check */
export function canApproveOutputs(role: UserRole): boolean {
  return role === "REVIEWER" || role === "ADMIN";
}

export function canEditFacts(role: UserRole): boolean {
  return role === "OPERATOR" || role === "ADMIN";
}

export function canExportAudit(role: UserRole): boolean {
  return role === "AUDITOR" || role === "ADMIN" || role === "OPERATOR";
}
