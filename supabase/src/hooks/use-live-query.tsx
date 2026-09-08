import { useEffect } from "react";
import { useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/** A query that refetches whenever one of the given tables changes for this user. */
export function useLiveQuery<T>(
  key: QueryKey,
  fetcher: () => Promise<T>,
  tables: string[],
  enabled = true,
) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: key, queryFn: fetcher, enabled });

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase.channel(`live:${JSON.stringify(key)}`);
    tables.forEach((table) => {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(key), tables.join(","), enabled]);

  return query;
}
