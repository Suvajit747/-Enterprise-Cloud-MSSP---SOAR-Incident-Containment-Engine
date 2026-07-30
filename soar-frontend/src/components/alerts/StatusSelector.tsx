import { useState } from "react";
import type { AlertStatus } from "@/types";
import { STATUS_LABEL, STATUS_OPTIONS } from "@/utils/domain";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useUpdateAlertStatus } from "@/hooks/useAlerts";
import { useToast } from "@/context/ToastContext";
import type { ApiError } from "@/api/client";

export function StatusSelector({ alertId, currentStatus }: { alertId: number; currentStatus: AlertStatus }) {
  const [pendingStatus, setPendingStatus] = useState<AlertStatus | null>(null);
  const updateStatus = useUpdateAlertStatus(alertId);
  const { showToast } = useToast();

  function handleConfirm() {
    if (!pendingStatus) return;
    updateStatus.mutate(pendingStatus, {
      onSuccess: () => {
        showToast(`Alert #${alertId} status updated to ${STATUS_LABEL[pendingStatus]}.`, "success");
        setPendingStatus(null);
      },
      onError: (err) => {
        showToast((err as ApiError).message ?? "Failed to update status.", "error");
        setPendingStatus(null);
      },
    });
  }

  return (
    <>
      <label className="flex items-center gap-2 text-sm">
        <span className="text-[var(--color-text-muted)]">Status</span>
        <select
          value={currentStatus}
          onChange={(e) => setPendingStatus(e.target.value as AlertStatus)}
          className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none"
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABEL[status]}
            </option>
          ))}
        </select>
      </label>

      <ConfirmDialog
        open={Boolean(pendingStatus)}
        title="Update alert status?"
        description={
          pendingStatus
            ? `Change Alert #${alertId} status to "${STATUS_LABEL[pendingStatus]}"?`
            : ""
        }
        confirmLabel="Update Status"
        loading={updateStatus.isPending}
        onConfirm={handleConfirm}
        onCancel={() => setPendingStatus(null)}
      />
    </>
  );
}
