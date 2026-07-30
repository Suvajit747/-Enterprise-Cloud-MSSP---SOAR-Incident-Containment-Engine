import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--color-line)] px-6 py-14 text-center">
      <div className="rounded-full bg-[var(--color-surface-2)] p-3">
        <Icon size={22} className="text-[var(--color-text-faint)]" />
      </div>
      <div>
        <p className="font-medium text-[var(--color-text)]">{title}</p>
        {message && <p className="mt-1 max-w-sm text-sm text-[var(--color-text-muted)]">{message}</p>}
      </div>
      {action}
    </div>
  );
}
