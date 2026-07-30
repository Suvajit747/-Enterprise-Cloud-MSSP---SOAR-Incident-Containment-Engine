import type { AlertStatus } from "@/types";
import { STATUS_LABEL, STATUS_STYLE } from "@/utils/domain";
import { cn } from "@/utils/cn";

export function StatusBadge({ status, className }: { status: AlertStatus; className?: string }) {
  const style = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
        style.bg,
        style.text,
        style.border,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {STATUS_LABEL[status]}
    </span>
  );
}
