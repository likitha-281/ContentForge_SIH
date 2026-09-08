import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { createClientQueryBuilder } from "./client-store";
import { getStoredOperatorSession, clearOperatorSession } from "@/lib/auth-service";

export const SUPABASE_URL =
  (typeof process !== "undefined" && process.env?.VITE_SUPABASE_URL) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_SUPABASE_URL) ||
  "https://toqcdcapidfcgxfdqcvy.supabase.co";

export const SUPABASE_ANON_KEY =
  (typeof process !== "undefined" &&
    (process.env?.VITE_SUPABASE_PUBLISHABLE_KEY || process.env?.VITE_SUPABASE_ANON_KEY)) ||
  (typeof import.meta !== "undefined" &&
    (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY)) ||
  "sb_publishable_tRxdda-sMwyS2zBtRw6-zA_qIVzKll3";

/**
 * The official Supabase client instance connected to the user's Supabase project.
 */
export const realSupabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

type CallItem = { name: string; args: any[] };

function wrapQueryBuilder(table: string, remoteBuilder: any, history: CallItem[] = []): any {
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
              if (result?.error?.code === "PGRST205" && typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("supabase_table_missing", { detail: { table } }),
                );
              }
              try {
                let b: any = createClientQueryBuilder(table);
                for (const item of history) {
                  if (typeof b[item.name] === "function") {
                    b = b[item.name](...item.args);
                  }
                }
                const localRes = await b.execute();
                return onfulfilled ? onfulfilled(localRes) : localRes;
              } catch {
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
            return wrapQueryBuilder(table, nextTarget, nextHistory);
          }
          return nextTarget;
        };
      }
      return orig;
    },
  });
}

/**
 * Unified INTELLI-FORGE Supabase client:
 * Connects directly to the user's Supabase project for Auth, Database, Realtime,
 * and seamlessly provides query resilience if tables have not been migrated yet.
 */
export const supabase = {
  ...realSupabase,

  from(table: string) {
    const remote = realSupabase.from(table as any);
    return wrapQueryBuilder(table, remote, []);
  },

  channel(name: string, opts?: any) {
    return realSupabase.channel(name, opts);
  },

  removeChannel(channel: any) {
    return realSupabase.removeChannel(channel);
  },

  auth: {
    ...realSupabase.auth,

    async signUp(credentials: Parameters<typeof realSupabase.auth.signUp>[0]) {
      return realSupabase.auth.signUp(credentials);
    },

    async signInWithPassword(
      credentials: Parameters<typeof realSupabase.auth.signInWithPassword>[0],
    ) {
      return realSupabase.auth.signInWithPassword(credentials);
    },

    async signOut(options?: any) {
      clearOperatorSession();
      try {
        return await realSupabase.auth.signOut(options);
      } catch {
        return { error: null };
      }
    },

    async getSession() {
      try {
        const remote = await realSupabase.auth.getSession();
        if (remote.data?.session) {
          return remote;
        }
      } catch {
        // fall through to stored operator
      }
      const local = getStoredOperatorSession();
      return { data: { session: local }, error: null };
    },

    async getUser(jwt?: string) {
      try {
        const remote = await realSupabase.auth.getUser(jwt);
        if (remote.data?.user) {
          return remote;
        }
      } catch {
        // fall through to stored operator
      }
      const local = getStoredOperatorSession();
      return { data: { user: local?.user ?? null }, error: null };
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      const { data: sub } = realSupabase.auth.onAuthStateChange((event, session) => {
        if (session) {
          callback(event, session);
        } else {
          const local = getStoredOperatorSession();
          callback(event, local);
        }
      });

      const handleOperatorChange = () => {
        const local = getStoredOperatorSession();
        callback("SIGNED_IN", local);
      };

      if (typeof window !== "undefined") {
        window.addEventListener("operator_auth_change", handleOperatorChange);
      }

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              sub?.subscription?.unsubscribe();
              if (typeof window !== "undefined") {
                window.removeEventListener("operator_auth_change", handleOperatorChange);
              }
            },
          },
        },
      };
    },
  },
} as any;
