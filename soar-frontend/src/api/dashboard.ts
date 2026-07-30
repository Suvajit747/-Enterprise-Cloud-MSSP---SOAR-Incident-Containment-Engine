import { apiClient } from "./client";
import type { DashboardMetrics, StatsResponse } from "@/types";

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const { data } = await apiClient.get<DashboardMetrics>("/dashboard");
  return data;
}

export async function fetchStats(): Promise<StatsResponse> {
  const { data } = await apiClient.get<StatsResponse>("/stats");
  return data;
}
