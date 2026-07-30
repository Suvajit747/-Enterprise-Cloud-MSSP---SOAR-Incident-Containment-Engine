import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export function ChartCard({
  title,
  description,
  children,
  className,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-[var(--color-text-faint)]">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: "#161b26",
    border: "1px solid #212836",
    borderRadius: "8px",
    fontSize: "12px",
    color: "#e7ebf3",
    padding: "8px 12px",
  },
  labelStyle: { color: "#8891a3", marginBottom: 4 },
  itemStyle: { padding: 0 },
};
