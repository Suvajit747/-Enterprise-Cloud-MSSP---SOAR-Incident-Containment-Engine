import { apiClient } from "./client";
import type { HealthResponse, VersionResponse } from "@/types";

export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await apiClient.get<HealthResponse>("/health");
  return data;
}

export async function fetchVersion(): Promise<VersionResponse> {
  const { data } = await apiClient.get<VersionResponse>("/version");
  return data;
}
