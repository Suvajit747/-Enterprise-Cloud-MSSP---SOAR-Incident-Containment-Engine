import { useState } from "react";
import { X } from "lucide-react";
import type { AlertCreate, Severity } from "@/types";
import { SEVERITY_LABEL, SEVERITY_OPTIONS } from "@/utils/domain";
import { Button } from "@/components/common/Button";
import { useCreateAlert } from "@/hooks/useAlerts";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/api/client";

interface CreateAlertModalProps {
  open: boolean;
  onClose: () => void;
}

const initialForm: AlertCreate = { source: "", severity: "medium", title: "", description: "" };

export function CreateAlertModal({ open, onClose }: CreateAlertModalProps) {
  const [form, setForm] = useState<AlertCreate>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createAlert = useCreateAlert();
  const { showToast } = useToast();

  if (!open) return null;

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.source.trim()) next.source = "Source is required.";
    else if (form.source.length > 100) next.source = "Source must be 100 characters or fewer.";
    if (!form.title.trim()) next.title = "Title is required.";
    else if (form.title.length > 200) next.title = "Title must be 200 characters or fewer.";
    if (!form.description.trim()) next.description = "Description is required.";
    else if (form.description.length > 2000) next.description = "Description must be 2000 characters or fewer.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleClose() {
    setForm(initialForm);
    setErrors({});
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    createAlert.mutate(
      { ...form, source: form.source.trim(), title: form.title.trim(), description: form.description.trim() },
      {
        onSuccess: (alert) => {
          showToast(`Alert #${alert.id} created successfully.`, "success");
          handleClose();
        },
        onError: (err) => {
          const apiError = err as ApiError;
          if (apiError.fieldErrors) {
            const fieldMap: Record<string, string> = {};
            apiError.fieldErrors.forEach((fe) => (fieldMap[fe.field] = fe.message));
            setErrors(fieldMap);
          }
          showToast(apiError.message ?? "Failed to create alert.", "error");
        },
      },
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-alert-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-6 shadow-2xl shadow-black/50 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 id="create-alert-title" className="text-base font-semibold text-[var(--color-text)]">
            Create Alert
          </h2>
          <button onClick={handleClose} aria-label="Close" className="text-[var(--color-text-faint)] hover:text-[var(--color-text)]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Field label="Source" error={errors.source} htmlFor="alert-source">
            <input
              id="alert-source"
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              placeholder="e.g. Splunk, CrowdStrike, Suricata"
              className={inputClasses(Boolean(errors.source))}
            />
          </Field>

          <Field label="Severity" error={errors.severity} htmlFor="alert-severity">
            <select
              id="alert-severity"
              value={form.severity}
              onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as Severity }))}
              className={inputClasses(Boolean(errors.severity))}
            >
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Title" error={errors.title} htmlFor="alert-title">
            <input
              id="alert-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Brute Force Attack"
              className={inputClasses(Boolean(errors.title))}
            />
          </Field>

          <Field label="Description" error={errors.description} htmlFor="alert-description">
            <textarea
              id="alert-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What was observed, including relevant IPs, hosts, or indicators…"
              rows={4}
              className={inputClasses(Boolean(errors.description))}
            />
          </Field>

          <div className="mt-1 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={createAlert.isPending}>
              {createAlert.isPending ? "Creating…" : "Create Alert"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function inputClasses(hasError: boolean): string {
  return `w-full rounded-md border bg-[var(--color-base)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none ${
    hasError ? "border-[var(--color-critical)]" : "border-[var(--color-line)] focus:border-[var(--color-accent)]"
  }`;
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-[var(--color-text-muted)]">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-[var(--color-critical)]">{error}</p>}
    </div>
  );
}
