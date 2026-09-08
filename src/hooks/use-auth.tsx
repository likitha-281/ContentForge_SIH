import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { getStoredOperatorSession } from "@/lib/auth-service";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(() => getStoredOperatorSession());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Supabase state listener
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      if (next) {
        setSession(next);
        setLoading(false);
      } else {
        const local = getStoredOperatorSession();
        setSession(local);
        setLoading(false);
      }
    });

    // 2. Initial check
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data?.session) {
          setSession(data.session);
        } else {
          setSession(getStoredOperatorSession());
        }
        setLoading(false);
      })
      .catch(() => {
        setSession(getStoredOperatorSession());
        setLoading(false);
      });

    // 3. Local operator event listener
    const handleOperatorAuthChange = () => {
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) {
          setSession(data.session);
        } else {
          setSession(getStoredOperatorSession());
        }
        setLoading(false);
      });
    };

    window.addEventListener("operator_auth_change", handleOperatorAuthChange);

    return () => {
      subscription.subscription.unsubscribe();
      window.removeEventListener("operator_auth_change", handleOperatorAuthChange);
    };
  }, []);

  const user: User | null = session?.user ?? null;
  return { session, user, loading };
}
