import type { DashboardMetrics } from "@/types";
import { ChartCard } from "./ChartCard";

interface Row {
  label: string;
  value: number;
  total: number;
  color: string;
}

function ProgressRow({ label, value, total, color }: Row) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-[var(--color-text-muted)]">{label}</span>
        <span className="font-medium tabular text-[var(--color-text)]">
          {value} <span className="text-[var(--color-text-faint)]">/ {total}</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function SocOverview({ metrics }: { metrics: DashboardMetrics }) {
  const openAlerts = metrics.new_alerts + metrics.investigating;

  return (
    <ChartCard title="SOC Overview" description="Current workload at a glance">
      <div className="flex flex-col gap-4">
        <ProgressRow
          label="Containment coverage"
          value={metrics.contained + metrics.resolved + metrics.closed}
          total={metrics.total_alerts}
          color="var(--color-healthy)"
        />
        <ProgressRow
          label="Automation completed"
          value={metrics.automation_completed}
          total={metrics.total_alerts}
          color="var(--color-violet)"
        />
        <ProgressRow
          label="High risk share"
          value={metrics.high_risk_alerts}
          total={metrics.total_alerts}
          color="var(--color-critical)"
        />
        <div className="mt-1 flex items-center justify-between rounded-lg bg-[var(--color-surface-2)] px-3 py-2.5">
          <span className="text-xs text-[var(--color-text-muted)]">Open in queue right now</span>
          <span className="text-sm font-semibold tabular text-[var(--color-text)]">{openAlerts}</span>
        </div>
      </div>
    </ChartCard>
  );
}
