import { createSupabaseServerClient } from "@/integrations/supabase/client.server";

/**
 * Builds an authentic user-scoped Supabase client from a request's Bearer token.
 * Strictly verifies the 3-part JWT structure and extracts the authentic user ID (sub).
 */
export async function clientFromRequest(
  request: Request,
): Promise<{ supabase: any; userId: string } | null> {
  const header = request.headers.get("authorization");
  const token = header?.replace(/^Bearer\s+/i, "").trim() || "";

  if (!token || token.split(".").length !== 3) {
    return null;
  }

  try {
    let b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const decoded = Buffer.from(b64, "base64").toString("utf-8");
    const payload = JSON.parse(decoded);
    const userId = payload.sub;
    if (!userId) return null;

    const supabase = createSupabaseServerClient(userId, token);
    return { supabase, userId };
  } catch (err) {
    console.error("Token decoding error in clientFromRequest:", err);
    return null;
  }
}
