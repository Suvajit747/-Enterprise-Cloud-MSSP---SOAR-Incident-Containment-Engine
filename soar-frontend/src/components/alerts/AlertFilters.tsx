import { Search, X } from "lucide-react";
import type { AlertListParams } from "@/types";
import { SEVERITY_LABEL, SEVERITY_OPTIONS, STATUS_LABEL, STATUS_OPTIONS } from "@/utils/domain";
import { Button } from "@/components/common/Button";

interface AlertFiltersProps {
  filters: AlertListParams;
  onChange: (next: Partial<AlertListParams>) => void;
  onClear: () => void;
}

const selectClasses =
  "rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-[var(--color-accent)] focus:outline-none";

export function AlertFilters({ filters, onChange, onClear }: AlertFiltersProps) {
  const hasActiveFilters = Boolean(filters.search || filters.severity || filters.status || filters.source);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-4 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative min-w-[220px] flex-1">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]" />
        <input
          value={filters.search ?? ""}
          onChange={(e) => onChange({ search: e.target.value || undefined, page: 1 })}
          type="search"
          placeholder="Search title or description…"
          aria-label="Search alerts"
          className="w-full rounded-md border border-[var(--color-line)] bg-[var(--color-base)] py-2 pl-9 pr-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
        />
      </div>

      <select
        aria-label="Filter by severity"
        value={filters.severity ?? ""}
        onChange={(e) => onChange({ severity: (e.target.value || undefined) as AlertListParams["severity"], page: 1 })}
        className={selectClasses}
      >
        <option value="">All severities</option>
        {SEVERITY_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {SEVERITY_LABEL[s]}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by status"
        value={filters.status ?? ""}
        onChange={(e) => onChange({ status: (e.target.value || undefined) as AlertListParams["status"], page: 1 })}
        className={selectClasses}
      >
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      <input
        value={filters.source ?? ""}
        onChange={(e) => onChange({ source: e.target.value || undefined, page: 1 })}
        type="text"
        placeholder="Source (e.g. Splunk)"
        aria-label="Filter by source"
        className="w-40 rounded-md border border-[var(--color-line)] bg-[var(--color-base)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none"
      />

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" icon={<X size={13} />} onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
