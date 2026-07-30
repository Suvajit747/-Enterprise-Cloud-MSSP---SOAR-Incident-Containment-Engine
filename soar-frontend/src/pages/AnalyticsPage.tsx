import { Bot, Inbox, ShieldAlert, Siren } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { CardSkeleton } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import { AlertTrendChart } from "@/components/dashboard/AlertTrendChart";
import { SeverityChart } from "@/components/dashboard/SeverityChart";
import { StatusChart } from "@/components/dashboard/StatusChart";
import { SocOverview } from "@/components/dashboard/SocOverview";
import { useDashboardMetrics, useStats } from "@/hooks/useDashboard";
import type { ApiError } from "@/api/client";

export function AnalyticsPage() {
  const dashboard = useDashboardMetrics();
  const stats = useStats();

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Aggregate security metrics derived from the live alert dataset."
      />

      {dashboard.isError ? (
        <ErrorState message={(dashboard.error as ApiError)?.message} onRetry={() => dashboard.refetch()} />
      ) : dashboard.isLoading || !dashboard.data ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <MetricCard label="Total Alerts" value={dashboard.data.total_alerts} icon={Inbox} accent="accent" />
          <MetricCard label="High Risk Alerts" value={dashboard.data.high_risk_alerts} icon={Siren} accent="high" />
          <MetricCard label="Critical" value={dashboard.data.critical} icon={ShieldAlert} accent="critical" />
          <MetricCard
            label="Automation Completion"
            value={dashboard.data.automation_completed}
            icon={Bot}
            accent="healthy"
          />
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
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
    </div>
  );
}
