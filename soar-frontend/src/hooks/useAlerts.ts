import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAlert,
  deleteAlert,
  fetchAlert,
  fetchAlerts,
  fetchRecentAlerts,
  updateAlertStatus,
} from "@/api/alerts";
import type { AlertCreate, AlertListParams, AlertStatus } from "@/types";
import { queryKeys } from "./queryKeys";

export function useAlerts(params: AlertListParams) {
  return useQuery({
    queryKey: queryKeys.alerts(params),
    queryFn: () => fetchAlerts(params),
    placeholderData: (previousData) => previousData,
  });
}

export function useAlert(id: number) {
  return useQuery({
    queryKey: queryKeys.alert(id),
    queryFn: () => fetchAlert(id),
    enabled: Number.isFinite(id),
  });
}

export function useRecentAlerts() {
  return useQuery({
    queryKey: queryKeys.recentAlerts(),
    queryFn: fetchRecentAlerts,
  });
}

function useInvalidateAlertQueries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["alerts"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard() });
    queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
  };
}

export function useCreateAlert() {
  const invalidate = useInvalidateAlertQueries();
  return useMutation({
    mutationFn: (payload: AlertCreate) => createAlert(payload),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateAlertStatus(id: number) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateAlertQueries();
  return useMutation({
    mutationFn: (status: AlertStatus) => updateAlertStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.alert(id), updated);
      invalidate();
    },
  });
}

export function useDeleteAlert() {
  const invalidate = useInvalidateAlertQueries();
  return useMutation({
    mutationFn: (id: number) => deleteAlert(id),
    onSuccess: () => invalidate(),
  });
}
