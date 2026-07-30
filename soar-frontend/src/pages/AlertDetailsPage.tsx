import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Copy, PlayCircle, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/common/Button";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { SeverityBadge } from "@/components/alerts/SeverityBadge";
import { StatusBadge } from "@/components/alerts/StatusBadge";
import { StatusSelector } from "@/components/alerts/StatusSelector";
import { InvestigationTimeline } from "@/components/alerts/InvestigationTimeline";
import { ThreatIntelPanel } from "@/components/threat-intel/ThreatIntelPanel";
import { PlaybookExecutionModal } from "@/components/playbooks/PlaybookExecutionModal";
import { useAlert, useDeleteAlert } from "@/hooks/useAlerts";
import { useAlertTimeline, useExecutePlaybook } from "@/hooks/useThreatIntel";
import { useToast } from "@/context/ToastContext";
import { formatDateTime } from "@/utils/format";
import type { ApiError } from "@/api/client";
import type { PlaybookExecutionResult } from "@/types";

export function AlertDetailsPage() {
  const params = useParams<{ id: string }>();
  const alertId = Number(params.id);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const { data: alert, isLoading, isError, error, refetch } = useAlert(alertId);
  const timeline = useAlertTimeline(alertId, Number.isFinite(alertId));
  const executePlaybook = useExecutePlaybook(alertId);
  const deleteAlert = useDeleteAlert();

  const [playbookModalOpen, setPlaybookModalOpen] = useState(false);
  const [playbookResult, setPlaybookResult] = useState<PlaybookExecutionResult | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!Number.isFinite(alertId)) {
    return <ErrorState title="Invalid alert" message="This alert ID isn't valid." />;
  }

  if (isLoading) return <LoadingState label="Loading alert…" />;

  if (isError || !alert) {
    return (
      <ErrorState
        title="Alert not found"
        message={(error as ApiError)?.message ?? "This alert could not be loaded."}
        onRetry={() => refetch()}
      />
    );
  }

  function handleExecutePlaybook() {
    executePlaybook.mutate(undefined, {
      onSuccess: (result) => {
        setPlaybookResult(result);
        showToast("Playbook execution completed (simulated).", "success");
      },
      onError: (err) => {
        showToast((err as ApiError).message ?? "Playbook execution failed.", "error");
      },
    });
  }

  function handleDelete() {
    deleteAlert.mutate(alertId, {
      onSuccess: () => {
        showToast(`Alert #${alertId} deleted.`, "success");
        navigate("/alerts");
      },
      onError: (err) => {
        showToast((err as ApiError).message ?? "Failed to delete alert.", "error");
        setDeleteOpen(false);
      },
    });
  }

  function copyId() {
    navigator.clipboard.writeText(String(alertId));
    showToast("Alert ID copied to clipboard.", "info");
  }

  return (
    <div>
      <PageHeader
        title={alert.title}
        breadcrumbs={[
          { label: "Alerts", to: "/alerts" },
          { label: `Alert #${alert.id}` },
        ]}
        actions={
          <>
            <Button variant="secondary" icon={<Copy size={14} />} onClick={copyId}>
              Copy ID
            </Button>
            <Button
              variant="primary"
              icon={<PlayCircle size={15} />}
              onClick={() => {
                setPlaybookResult(null);
                setPlaybookModalOpen(true);
              }}
            >
              Execute Playbook
            </Button>
            <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SeverityBadge severity={alert.severity} />
        <StatusBadge status={alert.status} />
        <span className="text-xs text-[var(--color-text-faint)]">
          Created {formatDateTime(alert.created_at)}
        </span>
        <div className="ml-auto">
          <StatusSelector alertId={alert.id} currentStatus={alert.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <InfoCard label="Source" value={alert.source} />
        <InfoCard label="Severity" value={alert.severity} capitalize />
        <InfoCard label="Status" value={alert.status} capitalize />
        <InfoCard label="Created At" value={formatDateTime(alert.created_at)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Description</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-muted)]">
              {alert.description}
            </p>
          </section>

          <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
            <h2 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Threat Intelligence</h2>
            <ThreatIntelPanel alertId={alert.id} />
          </section>
        </div>

        <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-text)]">Investigation Timeline</h2>
          {timeline.isLoading ? (
            <LoadingState label="Loading timeline…" />
          ) : timeline.isError ? (
            <ErrorState message={(timeline.error as ApiError)?.message} onRetry={() => timeline.refetch()} />
          ) : (
            <InvestigationTimeline events={timeline.data ?? []} />
          )}
        </section>
      </div>

      <PlaybookExecutionModal
        open={playbookModalOpen}
        alertId={alert.id}
        isExecuting={executePlaybook.isPending}
        result={playbookResult}
        onExecute={handleExecutePlaybook}
        onClose={() => setPlaybookModalOpen(false)}
      />

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete alert #${alert.id}?`}
        description="This permanently removes the alert and its record from the queue. This cannot be undone."
        confirmLabel="Delete Alert"
        destructive
        loading={deleteAlert.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}

function InfoCard({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-faint)]">{label}</p>
      <p className={`mt-1.5 text-sm font-medium text-[var(--color-text)] ${capitalize ? "capitalize" : ""}`}>
        {value}
      </p>
    </div>
  );
}
