import { useNavigate } from "react-router-dom";
import { Activity as ActivityIcon, Info, Inbox } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { SeverityBadge } from "@/components/alerts/SeverityBadge";
import { useRecentAlerts } from "@/hooks/useAlerts";
import { formatDateTime, formatRelativeTime } from "@/utils/format";
import type { ApiError } from "@/api/client";

/**
 * The backend has no dedicated global activity/audit endpoint. This page
 * builds a real activity stream from GET /recent-alerts (actual alert
 * creation events with real timestamps) rather than fabricating a feed.
 * Per-alert timelines (enrichment, risk scoring, playbook execution) live
 * on each alert's detail page via GET /alerts/{id}/timeline.
 */
export function ActivityPage() {
  const navigate = useNavigate();
  const { data: alerts, isLoading, isError, error, refetch } = useRecentAlerts();

  return (
    <div>
      <PageHeader title="Activity" description="Recent alert intake across the SOAR engine." />

      <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] px-4 py-3">
        <Info size={16} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
        <p className="text-sm text-[var(--color-text-muted)]">
          This backend doesn't expose a global audit log, so this feed reflects real alert creation events
          (the 10 most recent). Open an alert to see its full investigation timeline — enrichment, risk
          scoring, and playbook execution.
        </p>
      </div>

      {isError ? (
        <ErrorState message={(error as ApiError)?.message} onRetry={() => refetch()} />
      ) : isLoading ? (
        <LoadingState label="Loading recent activity…" />
      ) : !alerts || alerts.length === 0 ? (
        <EmptyState icon={Inbox} title="No activity yet" message="New alerts will appear here as they're created." />
      ) : (
        <ol className="flex flex-col gap-0 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
          {alerts.map((alert, index) => (
            <li key={alert.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)]">
                  <ActivityIcon size={13} className="text-[var(--color-accent)]" />
                </span>
                {index < alerts.length - 1 && <span className="w-px flex-1 bg-[var(--color-line)]" />}
              </div>
              <div
                className={`min-w-0 flex-1 cursor-pointer ${index === alerts.length - 1 ? "pb-0" : "pb-5"}`}
                onClick={() => navigate(`/alerts/${alert.id}`)}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-[var(--color-text)]">
                    Alert #{alert.id} created — {alert.title}
                  </p>
                  <SeverityBadge severity={alert.severity} />
                </div>
                <p className="mt-0.5 text-xs text-[var(--color-text-faint)]" title={formatDateTime(alert.created_at)}>
                  {alert.source} · {formatRelativeTime(alert.created_at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
