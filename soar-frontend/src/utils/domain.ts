import type { AlertStatus, PlaybookAction, Severity } from "@/types";

export const SEVERITY_OPTIONS: Severity[] = ["critical", "high", "medium", "low"];
export const STATUS_OPTIONS: AlertStatus[] = [
  "new",
  "investigating",
  "contained",
  "resolved",
  "closed",
];

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const STATUS_LABEL: Record<AlertStatus, string> = {
  new: "New",
  investigating: "Investigating",
  contained: "Contained",
  resolved: "Resolved",
  closed: "Closed",
};

/** Tailwind color-token classnames per severity, using the design system tokens. */
export const SEVERITY_STYLE: Record<Severity, { text: string; bg: string; border: string; dot: string }> = {
  critical: {
    text: "text-[var(--color-critical)]",
    bg: "bg-[var(--color-critical-soft)]",
    border: "border-[var(--color-critical)]/30",
    dot: "bg-[var(--color-critical)]",
  },
  high: {
    text: "text-[var(--color-high)]",
    bg: "bg-[var(--color-high-soft)]",
    border: "border-[var(--color-high)]/30",
    dot: "bg-[var(--color-high)]",
  },
  medium: {
    text: "text-[var(--color-medium)]",
    bg: "bg-[var(--color-medium-soft)]",
    border: "border-[var(--color-medium)]/30",
    dot: "bg-[var(--color-medium)]",
  },
  low: {
    text: "text-[var(--color-low)]",
    bg: "bg-[var(--color-low-soft)]",
    border: "border-[var(--color-low)]/30",
    dot: "bg-[var(--color-low)]",
  },
};

export const STATUS_STYLE: Record<AlertStatus, { text: string; bg: string; border: string; dot: string }> = {
  new: {
    text: "text-[var(--color-low)]",
    bg: "bg-[var(--color-low-soft)]",
    border: "border-[var(--color-low)]/30",
    dot: "bg-[var(--color-low)]",
  },
  investigating: {
    text: "text-[var(--color-medium)]",
    bg: "bg-[var(--color-medium-soft)]",
    border: "border-[var(--color-medium)]/30",
    dot: "bg-[var(--color-medium)]",
  },
  contained: {
    text: "text-[var(--color-violet)]",
    bg: "bg-[var(--color-violet-soft)]",
    border: "border-[var(--color-violet)]/30",
    dot: "bg-[var(--color-violet)]",
  },
  resolved: {
    text: "text-[var(--color-healthy)]",
    bg: "bg-[var(--color-healthy-soft)]",
    border: "border-[var(--color-healthy)]/30",
    dot: "bg-[var(--color-healthy)]",
  },
  closed: {
    text: "text-[var(--color-neutral)]",
    bg: "bg-[var(--color-neutral-soft)]",
    border: "border-[var(--color-neutral)]/30",
    dot: "bg-[var(--color-neutral)]",
  },
};

export const PLAYBOOK_ACTION_LABEL: Record<PlaybookAction, string> = {
  block_ip: "Block IP",
  isolate_endpoint: "Isolate Endpoint",
  notify_admin: "Notify Administrator",
  create_incident: "Create Incident",
  no_action: "No Action",
};

export function riskLevelStyle(level: "Low" | "Medium" | "High") {
  if (level === "High") return SEVERITY_STYLE.critical;
  if (level === "Medium") return SEVERITY_STYLE.medium;
  return SEVERITY_STYLE.low;
}

/**
 * The backend's GET /alerts/{id}/enrichment response does not include a flag
 * indicating whether the values came from a live provider or the backend's
 * hardcoded mock fallback (used when VIRUSTOTAL_API_KEY / ABUSEIPDB_API_KEY
 * are unset — see API_USAGE.md and app/threat_intelligence.py). The frontend
 * has no access to backend environment variables, so this is a heuristic:
 * it flags an exact match against the documented mock constants. It cannot
 * be 100% certain — a live provider could theoretically return the same
 * numbers — but it is the only signal available from the API response.
 */
const MOCK_VIRUSTOTAL = { malicious: true, score: 92 };
const MOCK_ABUSEIPDB = { score: 84, country: "US" };

export function isLikelyMockEnrichment(virusTotal: { malicious: boolean; score: number }, abuseIpdb: { score: number; country: string }): boolean {
  const vtMatches = virusTotal.malicious === MOCK_VIRUSTOTAL.malicious && virusTotal.score === MOCK_VIRUSTOTAL.score;
  const abuseMatches = abuseIpdb.score === MOCK_ABUSEIPDB.score && abuseIpdb.country === MOCK_ABUSEIPDB.country;
  return vtMatches && abuseMatches;
}

export function riskScoreColor(score: number): string {
  if (score >= 90) return "var(--color-critical)";
  if (score >= 75) return "var(--color-high)";
  if (score >= 50) return "var(--color-medium)";
  return "var(--color-healthy)";
}
