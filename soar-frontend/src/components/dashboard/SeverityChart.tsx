import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { StatsResponse } from "@/types";
import { ChartCard, chartTooltipStyle } from "./ChartCard";
import { SEVERITY_LABEL } from "@/utils/domain";
import { EmptyState } from "@/components/common/EmptyState";
import { ShieldAlert } from "lucide-react";

const COLORS: Record<string, string> = {
  critical: "#ef4a5f",
  high: "#f0883e",
  medium: "#eab83f",
  low: "#4fa8e0",
};

export function SeverityChart({ data }: { data: StatsResponse["alerts_by_severity"] }) {
  const chartData = (Object.keys(data) as (keyof typeof data)[])
    .map((key) => ({ key, name: SEVERITY_LABEL[key], value: data[key] }))
    .filter((d) => d.value > 0);

  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartCard title="Alerts by Severity" description="Current distribution across the queue">
      {total === 0 ? (
        <EmptyState icon={ShieldAlert} title="No alerts to score" />
      ) : (
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={2}
                strokeWidth={0}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.key} fill={COLORS[entry.key]} />
                ))}
              </Pie>
              <Tooltip {...chartTooltipStyle} formatter={(value, name) => [String(value), String(name)]} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="flex shrink-0 flex-col gap-2 text-xs">
            {chartData.map((entry) => (
              <li key={entry.key} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: COLORS[entry.key] }}
                />
                <span className="text-[var(--color-text-muted)]">{entry.name}</span>
                <span className="ml-auto font-medium tabular text-[var(--color-text)]">{entry.value}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}
