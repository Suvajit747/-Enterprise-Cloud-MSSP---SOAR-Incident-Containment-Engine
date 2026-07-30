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
  malicious: boolean;
  score: number;
}

export interface AbuseIPDBResult {
  score: number;
  country: string;
}

export type RiskLevel = "Low" | "Medium" | "High";

export interface ThreatEnrichment {
  alert_id: number;
  virus_total: VirusTotalResult;
  abuse_ipdb: AbuseIPDBResult;
  risk_level: RiskLevel;
  risk_score: number;
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

export type PlaybookExecutionStatus = "completed" | "skipped";

export interface PlaybookExecutionResult {
  alert_id: number;
  risk_score: number;
  action: PlaybookAction;
  status: PlaybookExecutionStatus;
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
