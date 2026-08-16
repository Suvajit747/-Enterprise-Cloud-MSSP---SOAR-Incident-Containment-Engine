/**
 * Types mirror the actual FastAPI backend contract documented in
 * API_USAGE.md / app/schemas.py / app/main.py. Do not add fields the
 * backend does not return.
 */

export type Severity = "low" | "medium" | "high" | "critical";

export type AlertStatus = "new" | "investigating" | "contained" | "resolved" | "closed";

export interface Alert {
  id: number;
  source: string;
  severity: Severity;
  title: string;
  description: string;
  status: AlertStatus;
  created_at: string;
  updated_at?: string | null;
  incident_id?: number | null;
  duplicate_of_alert_id?: number | null;
}

export interface AlertCreate {
  source: string;
  severity: Severity;
  title: string;
  description: string;
}

export interface AlertListParams {
  status?: AlertStatus;
  severity?: Severity;
  source?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface DashboardMetrics {
  total_alerts: number;
  new_alerts: number;
  investigating: number;
  contained: number;
  resolved: number;
  closed: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  automation_completed: number;
  high_risk_alerts: number;
  playbooks_executed: number;
  open_incidents?: number;
  total_incidents?: number;
  critical_alerts?: number;
  successful_playbooks?: number;
  failed_playbooks?: number;
  automation_success_rate?: number | null;
  average_time_to_contain?: number | null;
  average_time_to_resolve?: number | null;
  average_time_to_contain_seconds?: number | null;
  average_time_to_resolve_seconds?: number | null;
}

export interface DailyAlertCount {
  date: string;
  count: number;
}

export interface StatsResponse {
  daily_alerts: DailyAlertCount[];
  alerts_by_severity: Record<"critical" | "high" | "medium" | "low", number>;
  alerts_by_status: Record<"new" | "investigating" | "contained" | "resolved" | "closed", number>;
}

export interface VirusTotalResult {
  provider?: string;
  status?: "live" | "mock" | "unavailable";
  malicious: boolean;
  score: number;
  timestamp?: string;
  error?: string | null;
}

export interface AbuseIPDBResult {
  provider?: string;
  status?: "live" | "mock" | "unavailable";
  malicious?: boolean;
  score: number;
  country: string;
  timestamp?: string;
  error?: string | null;
}

export type RiskLevel = "Low" | "Medium" | "High" | "Critical";

export interface RiskBreakdown {
  base_score: number;
  virustotal_modifier: number;
  abuseipdb_modifier: number;
  raw_score: number;
  final_score: number;
  risk_level: RiskLevel;
}

export interface ThreatEnrichment {
  alert_id: number;
  virus_total: VirusTotalResult;
  abuse_ipdb: AbuseIPDBResult;
  risk_level: RiskLevel;
  risk_score: number;
  risk_breakdown?: RiskBreakdown;
}

export type PlaybookAction =
  | "block_ip"
  | "isolate_endpoint"
  | "notify_admin"
  | "create_incident"
  | "no_action";

export interface Playbook {
  id: number;
  name: string;
  action: PlaybookAction;
}

export type PlaybookExecutionStatus = "queued" | "running" | "completed" | "failed" | "skipped";

export interface PlaybookExecutionResult {
  alert_id: number;
  risk_score: number;
  risk_level?: RiskLevel;
  action: PlaybookAction;
  status: PlaybookExecutionStatus;
  execution_id?: number;
  playbook_name?: string;
  incident_id?: number | null;
  simulated?: boolean;
  message?: string | null;
  details?: Record<string, unknown>;
}

export interface TimelineEvent {
  event: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface HealthResponse {
  status: string;
  database: string;
  service: string;
  version: string;
}

export interface VersionResponse {
  application: string;
  version: string;
  api: string;
}

export interface DeleteResponse {
  message: string;
}

/** Standard FastAPI error envelope */
export interface ApiErrorDetail {
  detail:
    | string
    | {
        loc?: (string | number)[];
        msg: string;
        type: string;
      }[];
}
