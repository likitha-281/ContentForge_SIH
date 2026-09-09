import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial check from official Supabase client
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession }, error }) => {
        if (error) {
          console.warn("Supabase getSession notice:", error.message);
        }
        setSession(initialSession);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Supabase auth error:", err);
        setSession(null);
        setLoading(false);
      });

    // 2. Supabase onAuthStateChange listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const user: User | null = session?.user ?? null;
  return { session, user, loading, signOut };
}
