import { useNavigate } from "react-router-dom";
import { Info, Radar, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { SeverityBadge } from "@/components/alerts/SeverityBadge";
import { StatusBadge } from "@/components/alerts/StatusBadge";
import { useAlerts } from "@/hooks/useAlerts";
import { formatRelativeTime } from "@/utils/format";
import type { ApiError } from "@/api/client";

export function ThreatIntelPage() {
  const navigate = useNavigate();
  const newAlerts = useAlerts({ status: "new", page: 1, limit: 10 });
  const investigatingAlerts = useAlerts({ status: "investigating", page: 1, limit: 10 });

  const isLoading = newAlerts.isLoading || investigatingAlerts.isLoading;
  const isError = newAlerts.isError || investigatingAlerts.isError;
  const combined = [...(newAlerts.data ?? []), ...(investigatingAlerts.data ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <div>
      <PageHeader
        title="Threat Intelligence"
        description="VirusTotal and AbuseIPDB enrichment, scoped per alert."
      />

      <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] px-4 py-3">
        <Info size={16} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
        <p className="text-sm text-[var(--color-text-muted)]">
          There is no global threat feed in this backend — enrichment is performed per alert, on demand,
          from the alert's detail page. This view lists alerts that haven't yet been through investigation
          so you can jump straight to running enrichment on them.
        </p>
      </div>

      {isError ? (
        <ErrorState
          message={(newAlerts.error as ApiError)?.message ?? (investigatingAlerts.error as ApiError)?.message}
          onRetry={() => {
            newAlerts.refetch();
            investigatingAlerts.refetch();
          }}
        />
      ) : isLoading ? (
        <LoadingState label="Loading alerts pending review…" />
      ) : combined.length === 0 ? (
        <EmptyState
          icon={Radar}
          title="Nothing pending enrichment"
          message="All alerts are past new/investigating status, or the queue is empty."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
          <ul>
            {combined.map((alert) => (
              <li
                key={alert.id}
                onClick={() => navigate(`/alerts/${alert.id}`)}
                className="flex cursor-pointer items-center gap-4 border-b border-[var(--color-line-soft)] px-4 py-3.5 last:border-b-0 hover:bg-[var(--color-surface-hover)]"
              >
                <span className="w-12 shrink-0 tabular text-xs text-[var(--color-text-faint)]">#{alert.id}</span>
                <SeverityBadge severity={alert.severity} className="shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-text)]">
                  {alert.title}
                </span>
                <StatusBadge status={alert.status} className="hidden shrink-0 sm:inline-flex" />
                <span className="hidden shrink-0 text-xs text-[var(--color-text-faint)] md:inline">
                  {formatRelativeTime(alert.created_at)}
                </span>
                <ArrowRight size={15} className="shrink-0 text-[var(--color-text-faint)]" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
