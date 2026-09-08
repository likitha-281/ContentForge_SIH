import { useEffect } from "react";
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/** A query that refetches whenever one of the given tables changes for this user. */
export function useLiveQuery<T>(
  key: QueryKey | string | unknown,
  fetcher: () => Promise<T>,
  tables: string[],
  enabled = true,
  options?: {
    refetchInterval?: number | false | ((query: any) => number | false | undefined);
  },
) {
  const normalizedKey: QueryKey = Array.isArray(key) ? key : [key as unknown];
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: normalizedKey,
    queryFn: fetcher,
    enabled,
    refetchInterval: options?.refetchInterval,
  });

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase.channel(`live:${JSON.stringify(normalizedKey)}`);
    tables.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        queryClient.invalidateQueries({ queryKey: normalizedKey });
      });
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(normalizedKey), tables.join(","), enabled]);

  return query;
}
