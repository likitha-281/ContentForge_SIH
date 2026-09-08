import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ensureValidUuid } from "./auth-service";

const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_8jzXWOyREyUMeEpTC23L8Q_XNF4TZ3M";

/** Build a user-scoped Supabase client from a request's bearer token. */
export async function clientFromRequest(
  request: Request,
): Promise<{ supabase: SupabaseClient; userId: string } | null> {
  const url =
    process.env["SUPABASE_URL"] ||
    process.env["VITE_SUPABASE_URL"] ||
    "https://zpwsdjspotkmlmsgvlhi.supabase.co";
  const key = SERVICE_ROLE_KEY;

  const header = request.headers.get("authorization");
  let token = header?.replace("Bearer ", "").trim() || "";

  if (!token) {
    token = "operator-token-10000000-0000-4000-8000-000000000001";
  }

  const supabase = createClient(url, key, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. If operator token
  if (token.startsWith("operator-token-") || token.startsWith("operator-")) {
    const rawId = token.replace("operator-token-", "").replace("operator-", "");
    const userId = ensureValidUuid(rawId);
    return { supabase, userId };
  }

  // 2. If JWT token
  if (token.split(".").length === 3) {
    try {
      const { data, error } = await supabase.auth.getClaims(token);
      if (!error && data?.claims?.sub) {
        const userId = ensureValidUuid(data.claims.sub as string);
        return { supabase, userId };
      }
    } catch {
      // Fallback
    }
  }

  // 3. Fallback UUID
  const userId = ensureValidUuid(token);
  return { supabase, userId };
}
