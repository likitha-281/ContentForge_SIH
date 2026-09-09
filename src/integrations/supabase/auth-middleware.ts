import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createSupabaseServerClient } from "./client.server";

export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    let token = authHeader?.replace(/^Bearer\s+/i, "").trim();

    if (!token || token.split(".").length !== 3) {
      throw new Error("Unauthorized: Authentic Supabase access token is required.");
    }

    // Parse standard JWT payload
    let payload: Record<string, any> = {};
    try {
      let b64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const decoded = Buffer.from(b64, "base64").toString("utf-8");
      payload = JSON.parse(decoded);
    } catch {
      throw new Error("Unauthorized: Malformed JWT structure.");
    }

    const userId = payload.sub;
    if (!userId) {
      throw new Error("Unauthorized: Missing subject identity in token.");
    }

    const supabase = createSupabaseServerClient(userId, token);

    return next({
      context: {
        supabase: supabase as any,
        userId,
        claims: payload,
      },
    });
  },
);
