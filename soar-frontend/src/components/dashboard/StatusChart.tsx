import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { StatsResponse } from "@/types";
import { ChartCard, chartTooltipStyle } from "./ChartCard";
import { STATUS_LABEL } from "@/utils/domain";
import { EmptyState } from "@/components/common/EmptyState";
import { ListChecks } from "lucide-react";

const COLORS: Record<string, string> = {
  new: "#4fa8e0",
  investigating: "#eab83f",
  contained: "#8b7cf0",
  resolved: "#3bc282",
  closed: "#7c8699",
};

export function StatusChart({ data }: { data: StatsResponse["alerts_by_status"] }) {
  const chartData = (Object.keys(data) as (keyof typeof data)[]).map((key) => ({
    key,
    name: STATUS_LABEL[key],
    value: data[key],
  }));
  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartCard title="Alerts by Status" description="Where alerts currently sit in the workflow">
      {total === 0 ? (
        <EmptyState icon={ListChecks} title="No alerts in the queue" />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#1a2029" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#5c6577", fontSize: 11 }}
              axisLine={{ stroke: "#212836" }}
              tickLine={false}
              interval={0}
              angle={-10}
              textAnchor="end"
              height={40}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#5c6577", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip {...chartTooltipStyle} formatter={(value) => [String(value), "Alerts"]} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={44}>
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={COLORS[entry.key]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}
