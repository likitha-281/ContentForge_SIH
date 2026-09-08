import { createClientQueryBuilder } from "./client-store";
import { getStoredOperatorSession, clearOperatorSession } from "@/lib/auth-service";

export const supabase = {
  from(table: string) {
    return createClientQueryBuilder(table);
  },

  auth: {
    async getSession() {
      const session = getStoredOperatorSession();
      return { data: { session }, error: null };
    },

    async getUser() {
      const session = getStoredOperatorSession();
      return { data: { user: session?.user ?? null }, error: null };
    },

    async getClaims(token?: string) {
      const session = getStoredOperatorSession();
      return {
        data: {
          claims: {
            sub: session?.user?.id || "10000000-0000-4000-8000-000000000001",
            role: "operator",
          },
        },
        error: null,
      };
    },

    async signOut() {
      clearOperatorSession();
      return { error: null };
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      if (typeof window === "undefined") {
        return { data: { subscription: { unsubscribe: () => {} } } };
      }

      const handler = () => {
        const session = getStoredOperatorSession();
        callback("SIGNED_IN", session);
      };

      window.addEventListener("operator_auth_change", handler);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              window.removeEventListener("operator_auth_change", handler);
            },
          },
        },
      };
    },
  },
} as any;
