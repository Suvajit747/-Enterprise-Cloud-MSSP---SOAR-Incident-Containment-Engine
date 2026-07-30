import { useQuery } from "@tanstack/react-query";
import { fetchHealth, fetchVersion } from "@/api/system";
import { queryKeys } from "./queryKeys";

const HEALTH_POLL_INTERVAL_MS = 20_000;

export function useHealth() {
  return useQuery({
    queryKey: queryKeys.health(),
    queryFn: fetchHealth,
    refetchInterval: HEALTH_POLL_INTERVAL_MS,
    retry: 1,
  });
}

export function useVersion() {
  return useQuery({
    queryKey: queryKeys.version(),
    queryFn: fetchVersion,
    staleTime: Infinity,
    retry: 1,
  });
}
