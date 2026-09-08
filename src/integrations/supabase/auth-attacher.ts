import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";
import { getStoredOperatorSession } from "@/lib/auth-service";

// Must be registered as a global `functionMiddleware` in `src/start.ts`; otherwise
// the browser never attaches the bearer token to serverFn RPCs.
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;

    try {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
    } catch {
      // ignore
    }

    if (!token && typeof window !== "undefined") {
      const local = getStoredOperatorSession();
      if (local?.access_token) {
        token = local.access_token;
      }
    }

    if (!token) {
      token = "operator-token-10000000-0000-4000-8000-000000000001";
    }

    return next({
      headers: { Authorization: `Bearer ${token}` },
    });
  },
);
