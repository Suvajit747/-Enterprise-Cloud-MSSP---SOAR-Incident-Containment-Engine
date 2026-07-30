import { useQuery } from "@tanstack/react-query";
import { fetchDashboardMetrics, fetchStats } from "@/api/dashboard";
import { queryKeys } from "./queryKeys";

const REFRESH_INTERVAL_MS = 30_000;

export function useDashboardMetrics() {
  return useQuery({
    queryKey: queryKeys.dashboard(),
    queryFn: fetchDashboardMetrics,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats(),
    queryFn: fetchStats,
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}
