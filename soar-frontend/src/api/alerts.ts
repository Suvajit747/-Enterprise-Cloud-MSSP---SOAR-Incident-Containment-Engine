import { apiClient } from "./client";
import type {
  Alert,
  AlertCreate,
  AlertListParams,
  AlertStatus,
  DeleteResponse,
  PlaybookExecutionResult,
  ThreatEnrichment,
  TimelineEvent,
} from "@/types";

export async function fetchAlerts(params: AlertListParams): Promise<Alert[]> {
  const { data } = await apiClient.get<Alert[]>("/alerts", { params });
  return data;
}

export async function fetchAlert(id: number): Promise<Alert> {
  const { data } = await apiClient.get<Alert>(`/alerts/${id}`);
  return data;
}

export async function fetchRecentAlerts(): Promise<Alert[]> {
  const { data } = await apiClient.get<Alert[]>("/recent-alerts");
  return data;
}

export async function createAlert(payload: AlertCreate): Promise<Alert> {
  const { data } = await apiClient.post<Alert>("/alerts", payload);
  return data;
}

export async function updateAlertStatus(id: number, status: AlertStatus): Promise<Alert> {
  const { data } = await apiClient.patch<Alert>(`/alerts/${id}/status`, { status });
  return data;
}

export async function deleteAlert(id: number): Promise<DeleteResponse> {
  const { data } = await apiClient.delete<DeleteResponse>(`/alerts/${id}`);
  return data;
}

export async function fetchAlertEnrichment(id: number): Promise<ThreatEnrichment> {
  const { data } = await apiClient.get<ThreatEnrichment>(`/alerts/${id}/enrichment`);
  return data;
}

export async function executeAlertPlaybook(id: number): Promise<PlaybookExecutionResult> {
  const { data } = await apiClient.post<PlaybookExecutionResult>(`/alerts/${id}/execute`);
  return data;
}

export async function fetchAlertTimeline(id: number): Promise<TimelineEvent[]> {
  const { data } = await apiClient.get<TimelineEvent[]>(`/alerts/${id}/timeline`);
  return data;
}
