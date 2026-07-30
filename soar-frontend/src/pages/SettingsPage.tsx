import { CheckCircle2, XCircle, Moon, ShieldHalf, Server } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { useHealth, useVersion } from "@/hooks/useHealth";
import { API_BASE_URL } from "@/api/client";
import { formatDateTime } from "@/utils/format";

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] p-5">
      <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
      {description && <p className="mt-1 text-xs text-[var(--color-text-faint)]">{description}</p>}
      <div className="mt-4 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-line-soft)] py-2.5 text-sm last:border-b-0">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="font-medium text-[var(--color-text)]">{value}</span>
    </div>
  );
}

export function SettingsPage() {
  const { data: health, isError, dataUpdatedAt } = useHealth();
  const { data: version } = useVersion();
  const isOnline = !isError && health?.status === "healthy";

  return (
    <div>
      <PageHeader title="Settings" description="Backend connection, appearance, and application details." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SettingsSection title="Application" description="Details from the currently connected backend.">
          <Row label="Application name" value={health?.service ?? "—"} />
          <Row label="API version" value={version ? `v${version.version}` : health?.version ?? "—"} />
          <Row label="API schema" value={version?.api ?? "—"} />
        </SettingsSection>

        <SettingsSection title="API Connection" description="Configured via VITE_API_BASE_URL at build time.">
          <Row
            label="Backend base URL"
            value={<code className="tabular text-xs">{API_BASE_URL}</code>}
          />
          <Row
            label="Backend health"
            value={
              <span
                className={`inline-flex items-center gap-1.5 ${
                  isOnline ? "text-[var(--color-healthy)]" : "text-[var(--color-critical)]"
                }`}
              >
                {isOnline ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {isOnline ? "Online" : "Offline"}
              </span>
            }
          />
          <Row label="Database" value={health?.database ?? "—"} />
          <Row
            label="Last checked"
            value={dataUpdatedAt ? formatDateTime(new Date(dataUpdatedAt).toISOString()) : "—"}
          />
        </SettingsSection>

        <SettingsSection title="Appearance" description="This build ships a fixed dark SOC theme.">
          <Row
            label="Theme"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Moon size={14} />
                Dark (default)
              </span>
            }
          />
        </SettingsSection>

        <SettingsSection title="About">
          <Row
            label="Frontend"
            value={
              <span className="inline-flex items-center gap-1.5">
                <ShieldHalf size={14} className="text-[var(--color-accent)]" />
                SOAR Command Center
              </span>
            }
          />
          <Row
            label="Backend"
            value={
              <span className="inline-flex items-center gap-1.5">
                <Server size={14} />
                FastAPI · SQLAlchemy · SQLite
              </span>
            }
          />
          <p className="pt-1 text-xs leading-relaxed text-[var(--color-text-faint)]">
            Threat intelligence and containment actions are simulated or mock-backed until VirusTotal,
            AbuseIPDB, and real firewall/EDR integrations are configured on the backend. No API keys or
            credentials are ever stored in this frontend.
          </p>
        </SettingsSection>
      </div>
    </div>
  );
}
