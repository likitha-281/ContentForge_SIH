import { ensureValidUuid } from "./auth-service";
import { createLocalSupabaseClient } from "./db.server";
import { parseJwt } from "./jwt-utils";

/** Build a user-scoped Supabase client from a request's bearer token. */
export async function clientFromRequest(
  request: Request,
): Promise<{ supabase: any; userId: string } | null> {
  const header = request.headers.get("authorization");
  let token = header?.replace("Bearer ", "").trim() || "";

  let userId = "10000000-0000-4000-8000-000000000001";

  if (token) {
    if (token.split(".").length === 3) {
      const parsed = parseJwt(token);
      if (parsed?.sub) {
        userId = ensureValidUuid(parsed.sub);
      }
    } else if (token.startsWith("operator-token-") || token.startsWith("operator-")) {
      const rawId = token.replace("operator-token-", "").replace("operator-", "");
      userId = ensureValidUuid(rawId);
    } else {
      userId = ensureValidUuid(token);
    }
  }

  const supabase = createLocalSupabaseClient(userId);
  return { supabase, userId };
}
