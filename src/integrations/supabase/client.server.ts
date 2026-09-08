import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { createLocalSupabaseClient } from "@/lib/db.server";

export const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://toqcdcapidfcgxfdqcvy.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_tRxdda-sMwyS2zBtRw6-zA_qIVzKll3";

type CallItem = { name: string; args: any[] };

function wrapServerQuery(
  table: string,
  remoteBuilder: any,
  userId: string,
  history: CallItem[] = [],
): any {
  return new Proxy(remoteBuilder, {
    get(target, prop, receiver) {
      if (prop === "then") {
        return (onfulfilled?: (res: any) => any, onrejected?: (err: any) => any) => {
          return target.then(async (result: any) => {
            const isFallbackNeeded =
              result?.error?.code === "PGRST205" ||
              result?.error?.code === "PGRST301" ||
              result?.error?.message?.includes("schema cache") ||
              result?.error?.message?.includes("JWT") ||
              result?.error?.message?.includes("key");

            if (isFallbackNeeded) {
              try {
                const localClient = createLocalSupabaseClient(userId);
                let b: any = (localClient as any).from(table);
                for (const item of history) {
                  if (typeof b[item.name] === "function") {
                    b = b[item.name](...item.args);
                  }
                }
                const localRes = await b;
                return onfulfilled ? onfulfilled(localRes) : localRes;
              } catch (fallbackErr) {
                console.warn("[Supabase fallback warning]", fallbackErr);
                return onfulfilled ? onfulfilled(result) : result;
              }
            }
            return onfulfilled ? onfulfilled(result) : result;
          }, onrejected);
        };
      }

      const orig = Reflect.get(target, prop, receiver);
      if (typeof orig === "function") {
        return (...args: any[]) => {
          const nextTarget = orig.apply(target, args);
          const nextHistory = [...history, { name: String(prop), args }];
          if (
            nextTarget &&
            typeof nextTarget === "object" &&
            typeof nextTarget.then === "function"
          ) {
            return wrapServerQuery(table, nextTarget, userId, nextHistory);
          }
          return nextTarget;
        };
      }
      return orig;
    },
  });
}

/**
 * Creates a server-side Supabase client with the user's authentic JWT bearer token.
 * Queries remote Supabase with RLS, and falls back seamlessly if remote tables
 * have not been run in the Supabase SQL editor yet.
 */
export function createSupabaseServerClient(userId: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token && token.split(".").length === 3) {
    headers.Authorization = `Bearer ${token}`;
  }

  const remote = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers },
    auth: { persistSession: false },
  });

  return {
    ...remote,
    from(table: string) {
      const remoteBuilder = remote.from(table as any);
      return wrapServerQuery(table, remoteBuilder, userId, []);
    },
  };
}

export function createSupabaseAdminClient() {
  return createSupabaseServerClient("10000000-0000-4000-8000-000000000001");
}

let _supabaseAdmin: any | undefined;
export const supabaseAdmin = new Proxy({} as any, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
