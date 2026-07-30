import { useEffect } from "react";
import { AlertTriangle, FlaskConical, PlayCircle, X } from "lucide-react";
import type { PlaybookExecutionResult } from "@/types";
import { PLAYBOOK_ACTION_LABEL, riskScoreColor } from "@/utils/domain";
import { Button } from "@/components/common/Button";

interface PlaybookExecutionModalProps {
  open: boolean;
  alertId: number;
  isExecuting: boolean;
  result: PlaybookExecutionResult | null;
  onExecute: () => void;
  onClose: () => void;
}

export function PlaybookExecutionModal({
  open,
  alertId,
  isExecuting,
  result,
  onExecute,
  onClose,
}: PlaybookExecutionModalProps) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="playbook-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-2xl shadow-black/50 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="rounded-full bg-[var(--color-violet-soft)] p-2">
              <PlayCircle size={18} className="text-[var(--color-violet)]" />
            </div>
            <h2 id="playbook-modal-title" className="font-semibold text-[var(--color-text)]">
              Execute Playbook
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--color-text-faint)] hover:text-[var(--color-text)]"
          >
            <X size={18} />
          </button>
        </div>

        {!result ? (
          <>
            <p className="text-sm text-[var(--color-text-muted)]">
              Execute automated response for <span className="font-medium text-[var(--color-text)]">Alert #{alertId}</span>?
              The engine will calculate a risk score and select a containment action automatically.
            </p>
            <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-[var(--color-medium)]/30 bg-[var(--color-medium-soft)] px-3.5 py-2.5">
              <FlaskConical size={15} className="mt-0.5 shrink-0 text-[var(--color-medium)]" />
              <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
                Containment actions are currently <span className="font-semibold text-[var(--color-medium)]">simulated</span>.
                No real firewall, EDR, or network changes are made.
              </p>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={onExecute} disabled={isExecuting}>
                {isExecuting ? "Executing…" : "Execute Playbook"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Risk score</span>
                <span
                  className="font-semibold tabular"
                  style={{ color: riskScoreColor(result.risk_score) }}
                >
                  {result.risk_score} / 100
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Selected action</span>
                <span className="font-medium text-[var(--color-text)]">
                  {PLAYBOOK_ACTION_LABEL[result.action]}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-[var(--color-text-muted)]">Execution status</span>
                <span className="font-medium capitalize text-[var(--color-healthy)]">{result.status}</span>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-[var(--color-high)]/30 bg-[var(--color-high-soft)] px-3.5 py-2.5">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--color-high)]" />
              <p className="text-xs font-semibold leading-relaxed text-[var(--color-high)]">
                SIMULATED — no real containment action was performed against a firewall, EDR, or network
                device.
              </p>
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
