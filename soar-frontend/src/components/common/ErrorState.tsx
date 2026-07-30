import { AlertOctagon, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this data from the backend.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--color-critical)]/20 bg-[var(--color-critical-soft)] px-6 py-14 text-center">
      <AlertOctagon size={28} className="text-[var(--color-critical)]" />
      <div>
        <p className="font-medium text-[var(--color-text)]">{title}</p>
        <p className="mt-1 max-w-md text-sm text-[var(--color-text-muted)]">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-2 rounded-md border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}
