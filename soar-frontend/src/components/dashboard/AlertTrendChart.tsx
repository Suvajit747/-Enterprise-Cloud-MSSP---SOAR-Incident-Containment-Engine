import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyAlertCount } from "@/types";
import { ChartCard, chartTooltipStyle } from "./ChartCard";
import { EmptyState } from "@/components/common/EmptyState";
import { TrendingUp } from "lucide-react";

function formatAxisDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AlertTrendChart({ data }: { data: DailyAlertCount[] }) {
  const hasData = data.length > 0 && data.some((d) => d.count > 0);

  return (
    <ChartCard title="Alert Trend" description="Alerts ingested per day">
      {!hasData ? (
        <EmptyState
          icon={TrendingUp}
          title="No alert history yet"
          message="Trend data will appear once alerts start flowing in."
        />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="alertTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#29b6d8" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#29b6d8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#1a2029" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatAxisDate}
              tick={{ fill: "#5c6577", fontSize: 11 }}
              axisLine={{ stroke: "#212836" }}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#5c6577", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              {...chartTooltipStyle}
              labelFormatter={(value) => formatAxisDate(String(value))}
              formatter={(value) => [String(value), "Alerts"]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#29b6d8"
              strokeWidth={2}
              fill="url(#alertTrendFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
