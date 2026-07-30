import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatNumber } from "@/utils/format";

interface MetricCardProps {
  label: string;
  value: number | undefined;
  icon: LucideIcon;
  accent?: "accent" | "critical" | "high" | "medium" | "healthy" | "violet" | "neutral";
  hint?: string;
}

const ACCENT_CLASSES: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  accent: "text-[var(--color-accent)] bg-[var(--color-accent-soft)]",
  critical: "text-[var(--color-critical)] bg-[var(--color-critical-soft)]",
  high: "text-[var(--color-high)] bg-[var(--color-high-soft)]",
  medium: "text-[var(--color-medium)] bg-[var(--color-medium-soft)]",
  healthy: "text-[var(--color-healthy)] bg-[var(--color-healthy-soft)]",
  violet: "text-[var(--color-violet)] bg-[var(--color-violet-soft)]",
  neutral: "text-[var(--color-neutral)] bg-[var(--color-neutral-soft)]",
};

export function MetricCard({ label, value, icon: Icon, accent = "accent", hint }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-line)]/80">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">{label}</p>
        <div className={cn("rounded-md p-1.5", ACCENT_CLASSES[accent])}>
          <Icon size={15} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular text-[var(--color-text)]">{formatNumber(value)}</p>
      {hint && <p className="mt-1 text-xs text-[var(--color-text-faint)]">{hint}</p>}
    </div>
  );
}
