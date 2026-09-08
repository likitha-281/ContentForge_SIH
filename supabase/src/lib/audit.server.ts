import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Append-only, hash-chained audit log.
 * Each event hashes its own content plus the previous event's hash, so any
 * later tampering breaks the chain. The table also rejects UPDATE and DELETE.
 */
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function appendAudit(
  supabase: SupabaseClient,
  userId: string,
  event: {
    actor: string;
    action: string;
    entity_type: string;
    entity_id?: string | null;
    detail?: string;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  const { data: previous } = await supabase
    .from("audit_events")
    .select("hash")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const prevHash = (previous as { hash?: string } | null)?.hash ?? "GENESIS";
  const body = JSON.stringify({
    actor: event.actor,
    action: event.action,
    entity_type: event.entity_type,
    entity_id: event.entity_id ?? null,
    detail: event.detail ?? null,
    payload: event.payload ?? null,
    at: new Date().toISOString(),
  });
  const hash = await sha256(`${prevHash}|${body}`);

  await supabase.from("audit_events").insert({
    user_id: userId,
    actor: event.actor,
    action: event.action,
    entity_type: event.entity_type,
    entity_id: event.entity_id ?? null,
    detail: event.detail ?? null,
    payload: event.payload ?? null,
    prev_hash: prevHash,
    hash,
  });
}

export async function recomputeHash(prevHash: string, body: string): Promise<string> {
  return sha256(`${prevHash}|${body}`);
}
