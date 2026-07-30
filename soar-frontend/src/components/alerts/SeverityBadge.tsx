import { AlertOctagon, AlertTriangle, Info, ArrowDownCircle } from "lucide-react";
import type { Severity } from "@/types";
import { SEVERITY_LABEL, SEVERITY_STYLE } from "@/utils/domain";
import { cn } from "@/utils/cn";

const SEVERITY_ICON: Record<Severity, typeof AlertOctagon> = {
  critical: AlertOctagon,
  high: AlertTriangle,
  medium: Info,
  low: ArrowDownCircle,
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  const style = SEVERITY_STYLE[severity];
  const Icon = SEVERITY_ICON[severity];
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
      <Icon size={12} />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
