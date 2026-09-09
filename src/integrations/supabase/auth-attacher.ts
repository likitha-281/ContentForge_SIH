import { createMiddleware } from "@tanstack/react-start";
import { supabase } from "./client";

// Global client middleware that attaches the authentic Supabase Bearer token
// to all outgoing server RPCs and function calls.
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;

    try {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
    } catch (err) {
      console.warn("Could not obtain Supabase session:", err);
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return next({
      headers,
    });
  },
);
