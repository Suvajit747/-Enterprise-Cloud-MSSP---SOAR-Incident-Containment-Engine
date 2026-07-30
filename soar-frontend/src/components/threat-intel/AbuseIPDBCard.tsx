import { Globe2 } from "lucide-react";
import type { AbuseIPDBResult } from "@/types";

export function AbuseIPDBCard({ data }: { data: AbuseIPDBResult }) {
  const highConfidence = data.score > 80;
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
          AbuseIPDB
        </p>
        <Globe2 size={16} className="text-[var(--color-text-faint)]" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--color-text-muted)]">Abuse confidence</span>
        <span
          className={`text-sm font-medium tabular ${highConfidence ? "text-[var(--color-critical)]" : "text-[var(--color-text)]"}`}
        >
          {data.score}%
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm text-[var(--color-text-muted)]">Country</span>
        <span className="text-sm font-medium text-[var(--color-text)]">{data.country}</span>
      </div>
    </div>
  );
}
