import { useNavigate } from "react-router-dom";
import { Eye, Trash2 } from "lucide-react";
import type { Alert } from "@/types";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";
import { formatRelativeTime } from "@/utils/format";

interface AlertTableProps {
  alerts: Alert[];
  onDelete: (alert: Alert) => void;
}

export function AlertTable({ alerts, onDelete }: AlertTableProps) {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
      <table className="w-full min-w-[760px] text-sm">
        <thead>
          <tr className="border-b border-[var(--color-line)] text-left text-xs uppercase tracking-wide text-[var(--color-text-faint)]">
            <th className="px-4 py-3 font-medium">ID</th>
            <th className="px-4 py-3 font-medium">Severity</th>
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Source</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => (
            <tr
              key={alert.id}
              onClick={() => navigate(`/alerts/${alert.id}`)}
              className="cursor-pointer border-b border-[var(--color-line-soft)] transition-colors last:border-b-0 hover:bg-[var(--color-surface-hover)]"
            >
              <td className="px-4 py-3 tabular text-[var(--color-text-muted)]">#{alert.id}</td>
              <td className="px-4 py-3">
                <SeverityBadge severity={alert.severity} />
              </td>
              <td className="max-w-[280px] px-4 py-3">
                <p className="truncate font-medium text-[var(--color-text)]">{alert.title}</p>
              </td>
              <td className="px-4 py-3 text-[var(--color-text-muted)]">{alert.source}</td>
              <td className="px-4 py-3">
                <StatusBadge status={alert.status} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-[var(--color-text-muted)]" title={alert.created_at}>
                {formatRelativeTime(alert.created_at)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate(`/alerts/${alert.id}`)}
                    aria-label={`View alert ${alert.id}`}
                    className="rounded-md p-1.5 text-[var(--color-text-faint)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-accent)]"
                  >
                    <Eye size={15} />
                  </button>
                  <button
                    onClick={() => onDelete(alert)}
                    aria-label={`Delete alert ${alert.id}`}
                    className="rounded-md p-1.5 text-[var(--color-text-faint)] hover:bg-[var(--color-critical-soft)] hover:text-[var(--color-critical)]"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
