import {
  Siren,
  ShieldAlert,
  TrendingUp,
  Inbox,
  Search,
  ShieldCheck,
  Bot,
  Workflow,
} from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { CardSkeleton, TableSkeleton } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { AlertTrendChart } from "@/components/dashboard/AlertTrendChart";
import { SeverityChart } from "@/components/dashboard/SeverityChart";
import { StatusChart } from "@/components/dashboard/StatusChart";
import { SocOverview } from "@/components/dashboard/SocOverview";
import { SeverityBadge } from "@/components/alerts/SeverityBadge";
import { StatusBadge } from "@/components/alerts/StatusBadge";
import { useDashboardMetrics, useStats } from "@/hooks/useDashboard";
import { useRecentAlerts } from "@/hooks/useAlerts";
import { formatRelativeTime } from "@/utils/format";
import { useNavigate } from "react-router-dom";
import type { ApiError } from "@/api/client";

export function DashboardPage() {
  const navigate = useNavigate();
  const dashboard = useDashboardMetrics();
  const stats = useStats();
  const recentAlerts = useRecentAlerts();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Real-time overview of alert intake, triage, and automated response."
      />

      {dashboard.isError ? (
        <ErrorState
          message={(dashboard.error as ApiError)?.message}
          onRetry={() => dashboard.refetch()}
        />
      ) : dashboard.isLoading || !dashboard.data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          <MetricCard label="Total Alerts" value={dashboard.data.total_alerts} icon={Inbox} accent="accent" />
          <MetricCard label="Critical" value={dashboard.data.critical} icon={ShieldAlert} accent="critical" />
          <MetricCard label="High Risk" value={dashboard.data.high_risk_alerts} icon={Siren} accent="high" />
          <MetricCard label="New" value={dashboard.data.new_alerts} icon={Inbox} accent="neutral" />
          <MetricCard label="Investigating" value={dashboard.data.investigating} icon={Search} accent="medium" />
          <MetricCard label="Contained" value={dashboard.data.contained} icon={ShieldCheck} accent="violet" />
          <MetricCard
            label="Automation Done"
            value={dashboard.data.automation_completed}
            icon={Bot}
            accent="healthy"
          />
          <MetricCard
            label="Playbooks Run"
            value={dashboard.data.playbooks_executed}
            icon={Workflow}
            accent="accent"
          />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {stats.isError ? (
            <ErrorState message={(stats.error as ApiError)?.message} onRetry={() => stats.refetch()} />
          ) : stats.isLoading || !stats.data ? (
            <CardSkeleton className="h-[300px]" />
          ) : (
            <AlertTrendChart data={stats.data.daily_alerts} />
          )}
        </div>
        <div>
          {dashboard.isLoading || !dashboard.data ? (
            <CardSkeleton className="h-[300px]" />
          ) : (
            <SocOverview metrics={dashboard.data} />
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {stats.isLoading || !stats.data ? (
          <>
            <CardSkeleton className="h-[280px]" />
            <CardSkeleton className="h-[280px]" />
          </>
        ) : (
          <>
            <SeverityChart data={stats.data.alerts_by_severity} />
            <StatusChart data={stats.data.alerts_by_status} />
          </>
        )}
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--color-text)]">Recent Alerts</h2>
          <button
            onClick={() => navigate("/alerts")}
            className="text-xs font-medium text-[var(--color-accent)] hover:underline"
          >
            View all alerts
          </button>
        </div>

        {recentAlerts.isError ? (
          <ErrorState message={(recentAlerts.error as ApiError)?.message} onRetry={() => recentAlerts.refetch()} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
            {recentAlerts.isLoading ? (
              <TableSkeleton rows={5} columns={6} />
            ) : !recentAlerts.data || recentAlerts.data.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="No alerts detected"
                message="Create an alert or connect an alert source to begin."
              />
            ) : (
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-line)] text-left text-xs uppercase tracking-wide text-[var(--color-text-faint)]">
                    <th className="px-4 py-3 font-medium">ID</th>
                    <th className="px-4 py-3 font-medium">Severity</th>
                    <th className="px-4 py-3 font-medium">Title</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAlerts.data.map((alert) => (
                    <tr
                      key={alert.id}
                      onClick={() => navigate(`/alerts/${alert.id}`)}
                      className="cursor-pointer border-b border-[var(--color-line-soft)] last:border-b-0 hover:bg-[var(--color-surface-hover)]"
                    >
                      <td className="px-4 py-3 tabular text-[var(--color-text-muted)]">#{alert.id}</td>
                      <td className="px-4 py-3">
                        <SeverityBadge severity={alert.severity} />
                      </td>
                      <td className="max-w-[260px] truncate px-4 py-3 font-medium text-[var(--color-text)]">
                        {alert.title}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">{alert.source}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={alert.status} />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--color-text-muted)]">
                        {formatRelativeTime(alert.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
