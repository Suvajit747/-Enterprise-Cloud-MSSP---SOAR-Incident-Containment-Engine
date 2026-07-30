import type { AlertListParams } from "@/types";

export const queryKeys = {
  alerts: (params: AlertListParams) => ["alerts", params] as const,
  alert: (id: number) => ["alerts", "detail", id] as const,
  recentAlerts: () => ["alerts", "recent"] as const,
  dashboard: () => ["dashboard"] as const,
  stats: () => ["stats"] as const,
  enrichment: (id: number) => ["alerts", id, "enrichment"] as const,
  timeline: (id: number) => ["alerts", id, "timeline"] as const,
  playbooks: () => ["playbooks"] as const,
  health: () => ["system", "health"] as const,
  version: () => ["system", "version"] as const,
};
