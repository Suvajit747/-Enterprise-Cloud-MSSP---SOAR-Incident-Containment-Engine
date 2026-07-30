import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { executeAlertPlaybook, fetchAlertEnrichment, fetchAlertTimeline } from "@/api/alerts";
import { queryKeys } from "./queryKeys";

/**
 * Enrichment is only fetched when `enabled` is true — the analyst must
 * explicitly request it from the alert detail page. It is never fetched
 * automatically for every row in the alert list.
 */
export function useAlertEnrichment(id: number, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.enrichment(id),
    queryFn: () => fetchAlertEnrichment(id),
    enabled,
    staleTime: Infinity, // backend caches enrichment in memory per alert
  });
}

export function useAlertTimeline(id: number, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.timeline(id),
    queryFn: () => fetchAlertTimeline(id),
    enabled,
  });
}

export function useExecutePlaybook(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => executeAlertPlaybook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeline(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
    },
  });
}
