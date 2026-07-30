import { useState } from "react";
import { FlaskConical, Radar } from "lucide-react";
import { RiskScore } from "./RiskScore";
import { VirusTotalCard } from "./VirusTotalCard";
import { AbuseIPDBCard } from "./AbuseIPDBCard";
import { Button } from "@/components/common/Button";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";
import type { ApiError } from "@/api/client";
import { useAlertEnrichment } from "@/hooks/useThreatIntel";
import { isLikelyMockEnrichment } from "@/utils/domain";

export function ThreatIntelPanel({ alertId }: { alertId: number }) {
  const [requested, setRequested] = useState(false);
  const { data, isLoading, isError, error, refetch, isFetching } = useAlertEnrichment(alertId, requested);

  if (!requested) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--color-line)] px-6 py-10 text-center">
        <div className="rounded-full bg-[var(--color-violet-soft)] p-3">
          <Radar size={20} className="text-[var(--color-violet)]" />
        </div>
        <div>
          <p className="font-medium text-[var(--color-text)]">Threat intelligence not yet run</p>
          <p className="mt-1 max-w-sm text-sm text-[var(--color-text-muted)]">
            Enrichment queries VirusTotal and AbuseIPDB and is only run when requested, to avoid
            unnecessary lookups.
          </p>
        </div>
        <Button variant="primary" onClick={() => setRequested(true)}>
          Run Enrichment
        </Button>
      </div>
    );
  }

  if (isLoading) return <LoadingState label="Querying threat intelligence providers…" />;

  if (isError) {
    return (
      <ErrorState
        title="Enrichment failed"
        message={(error as ApiError)?.message}
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) return null;

  const likelyMock = isLikelyMockEnrichment(data.virus_total, data.abuse_ipdb);

  return (
    <div className="flex flex-col gap-4">
      {likelyMock && (
        <div className="flex items-start gap-2.5 rounded-lg border border-[var(--color-medium)]/30 bg-[var(--color-medium-soft)] px-3.5 py-2.5">
          <FlaskConical size={15} className="mt-0.5 shrink-0 text-[var(--color-medium)]" />
          <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
            <span className="font-semibold text-[var(--color-medium)]">Development / Mock Intelligence.</span>{" "}
            These values match the backend's fallback response, used when live VirusTotal/AbuseIPDB API
            keys aren't configured. This is a best-effort inference from the response shape, since the API
            doesn't return an explicit "mock" flag.
          </p>
        </div>
      )}

      <RiskScore score={data.risk_score} level={data.risk_level} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <VirusTotalCard data={data.virus_total} />
        <AbuseIPDBCard data={data.abuse_ipdb} />
      </div>

      <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching} className="self-start">
        {isFetching ? "Refreshing…" : "Re-run Enrichment"}
      </Button>
    </div>
  );
}
