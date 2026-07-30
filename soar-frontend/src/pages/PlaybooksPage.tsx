import { FlaskConical, ShieldBan, MonitorX, Bell, FileText, CircleSlash } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { usePlaybooks } from "@/hooks/usePlaybooks";
import { PLAYBOOK_ACTION_LABEL } from "@/utils/domain";
import type { ApiError } from "@/api/client";
import type { PlaybookAction } from "@/types";

const ACTION_ICON: Record<PlaybookAction, LucideIcon> = {
  block_ip: ShieldBan,
  isolate_endpoint: MonitorX,
  notify_admin: Bell,
  create_incident: FileText,
  no_action: CircleSlash,
};

export function PlaybooksPage() {
  const { data: playbooks, isLoading, isError, error, refetch } = usePlaybooks();

  return (
    <div>
      <PageHeader
        title="Playbooks"
        description="Automated response playbooks the SOAR engine can select based on calculated risk."
      />

      <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-[var(--color-medium)]/30 bg-[var(--color-medium-soft)] px-4 py-3">
        <FlaskConical size={16} className="mt-0.5 shrink-0 text-[var(--color-medium)]" />
        <p className="text-sm text-[var(--color-medium)]">
          Containment actions are currently simulated. No playbook here performs a real firewall, EDR, or
          network change.
        </p>
      </div>

      {isError ? (
        <ErrorState message={(error as ApiError)?.message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-[var(--color-surface-2)]" />
          ))}
        </div>
      ) : !playbooks || playbooks.length === 0 ? (
        <EmptyState title="No playbooks available" message="The backend playbook catalog is currently empty." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playbooks.map((playbook) => {
            const Icon = ACTION_ICON[playbook.action];
            return (
              <div
                key={playbook.id}
                className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-[var(--color-violet-soft)] p-2">
                    <Icon size={17} className="text-[var(--color-violet)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--color-text)]">{playbook.name}</p>
                    <p className="text-xs text-[var(--color-text-faint)] tabular">Playbook #{playbook.id}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-md bg-[var(--color-surface-2)] px-3 py-2">
                  <span className="text-xs text-[var(--color-text-muted)]">Action</span>
                  <span className="text-xs font-medium text-[var(--color-text)]">
                    {PLAYBOOK_ACTION_LABEL[playbook.action]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
