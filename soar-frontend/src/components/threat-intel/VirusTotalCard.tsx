import { ShieldCheck, ShieldX } from "lucide-react";
import type { VirusTotalResult } from "@/types";

export function VirusTotalCard({ data }: { data: VirusTotalResult }) {
  const malicious = data.malicious;
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">
          VirusTotal
        </p>
        {malicious ? (
          <ShieldX size={16} className="text-[var(--color-critical)]" />
        ) : (
          <ShieldCheck size={16} className="text-[var(--color-healthy)]" />
        )}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--color-text-muted)]">Malicious</span>
        <span
          className={`text-sm font-medium ${malicious ? "text-[var(--color-critical)]" : "text-[var(--color-healthy)]"}`}
        >
          {malicious ? "Yes" : "No"}
        </span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm text-[var(--color-text-muted)]">Detection score</span>
        <span className="text-sm font-medium tabular text-[var(--color-text)]">{data.score}/100</span>
      </div>
    </div>
  );
}
