import { Inbox, Radar, Gauge, Workflow, Circle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TimelineEvent } from "@/types";
import { formatDateTime } from "@/utils/format";
import { EmptyState } from "@/components/common/EmptyState";

const EVENT_ICON: Record<string, LucideIcon> = {
  "Alert Created": Inbox,
  "Threat Intelligence Completed": Radar,
  "Risk Score Calculated": Gauge,
  "Playbook Executed": Workflow,
};

export function InvestigationTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <EmptyState icon={Circle} title="No timeline events yet" />;
  }

  return (
    <ol className="flex flex-col gap-0">
      {events.map((event, index) => {
        const Icon = EVENT_ICON[event.event] ?? Circle;
        const isLast = index === events.length - 1;
        return (
          <li key={`${event.event}-${index}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)]">
                <Icon size={14} className="text-[var(--color-accent)]" />
              </span>
              {!isLast && <span className="w-px flex-1 bg-[var(--color-line)]" />}
            </div>
            <div className={isLast ? "pb-0" : "pb-5"}>
              <p className="text-sm font-medium text-[var(--color-text)]">{event.event}</p>
              <p className="text-xs text-[var(--color-text-faint)]">
                {event.timestamp ? formatDateTime(event.timestamp) : "Timestamp not provided by backend"}
              </p>
              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <pre className="mt-1.5 max-w-md overflow-x-auto rounded-md bg-[var(--color-surface-2)] p-2 text-[11px] text-[var(--color-text-muted)]">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
