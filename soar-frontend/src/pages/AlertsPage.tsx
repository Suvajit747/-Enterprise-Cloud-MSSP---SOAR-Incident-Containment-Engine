import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Inbox, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/common/Button";
import { AlertFilters } from "@/components/alerts/AlertFilters";
import { AlertTable } from "@/components/alerts/AlertTable";
import { CreateAlertModal } from "@/components/alerts/CreateAlertModal";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { TableSkeleton } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { useAlerts, useDeleteAlert } from "@/hooks/useAlerts";
import { useToast } from "@/context/ToastContext";
import type { Alert, AlertListParams, AlertStatus, Severity } from "@/types";
import type { ApiError } from "@/api/client";

const PAGE_SIZE = 10;

export function AlertsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Alert | null>(null);
  const { showToast } = useToast();
  const deleteAlert = useDeleteAlert();

  const filters: AlertListParams = {
    search: searchParams.get("search") ?? undefined,
    severity: (searchParams.get("severity") as Severity) || undefined,
    status: (searchParams.get("status") as AlertStatus) || undefined,
    source: searchParams.get("source") ?? undefined,
    page: Number(searchParams.get("page")) || 1,
    limit: PAGE_SIZE,
  };

  const { data: alerts, isLoading, isError, error, refetch, isFetching } = useAlerts(filters);

  function updateFilters(next: Partial<AlertListParams>) {
    const merged = { ...filters, ...next };
    const params = new URLSearchParams();
    if (merged.search) params.set("search", merged.search);
    if (merged.severity) params.set("severity", merged.severity);
    if (merged.status) params.set("status", merged.status);
    if (merged.source) params.set("source", merged.source);
    if (merged.page && merged.page > 1) params.set("page", String(merged.page));
    setSearchParams(params);
  }

  function handleClearFilters() {
    setSearchParams(new URLSearchParams());
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    deleteAlert.mutate(pendingDelete.id, {
      onSuccess: () => {
        showToast(`Alert #${pendingDelete.id} deleted.`, "success");
        setPendingDelete(null);
      },
      onError: (err) => {
        showToast((err as ApiError).message ?? "Failed to delete alert.", "error");
        setPendingDelete(null);
      },
    });
  }

  const page = filters.page ?? 1;
  const hasFullPage = (alerts?.length ?? 0) === PAGE_SIZE;

  return (
    <div>
      <PageHeader
        title="Alert Queue"
        description="Every alert ingested by the SOAR engine, searchable and filterable."
        actions={
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setCreateOpen(true)}>
            Create Alert
          </Button>
        }
      />

      <div className="mb-4">
        <AlertFilters filters={filters} onChange={updateFilters} onClear={handleClearFilters} />
      </div>

      {isError ? (
        <ErrorState message={(error as ApiError)?.message} onRetry={() => refetch()} />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
            {isLoading ? (
              <TableSkeleton rows={PAGE_SIZE} columns={7} />
            ) : !alerts || alerts.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No alerts detected"
                message={
                  filters.search || filters.severity || filters.status || filters.source
                    ? "No alerts match the current filters. Try clearing them."
                    : "Create an alert or connect an alert source to begin."
                }
                action={
                  <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
                    Create Alert
                  </Button>
                }
              />
            ) : (
              <AlertTable alerts={alerts} onDelete={setPendingDelete} />
            )}
          </div>

          {alerts && alerts.length > 0 && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-xs text-[var(--color-text-faint)]">
                Page {page}
                {isFetching && <RefreshCw size={11} className="animate-spin" />}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<ChevronLeft size={14} />}
                  disabled={page <= 1}
                  onClick={() => updateFilters({ page: page - 1 })}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!hasFullPage}
                  onClick={() => updateFilters({ page: page + 1 })}
                >
                  Next
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <CreateAlertModal open={createOpen} onClose={() => setCreateOpen(false)} />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete alert #${pendingDelete?.id}?`}
        description="This permanently removes the alert and its record from the queue. This cannot be undone."
        confirmLabel="Delete Alert"
        destructive
        loading={deleteAlert.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
