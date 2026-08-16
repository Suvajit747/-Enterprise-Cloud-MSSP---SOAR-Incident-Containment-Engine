# SOAR Incident Containment Engine API Usage

Base URL:

```text
http://127.0.0.1:8000
```

Swagger UI:

```text
http://127.0.0.1:8000/docs
```

Run locally:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

## Shared Values

Alert statuses:

```text
new
investigating
contained
resolved
closed
```

Incident statuses:

```text
open
investigating
contained
resolved
closed
```

Severities:

```text
low
medium
high
critical
```

Common missing-resource responses:

```json
{ "detail": "Alert not found" }
```

```json
{ "detail": "Incident not found" }
```

## System

```text
GET /health
GET /version
```

`GET /health` returns database connectivity, service name, and version. All HTTP
responses include `X-Request-ID`.

## POST /alerts

Creates an alert. Duplicate alerts are kept, marked with `duplicate_of_alert_id`,
and linked to the same incident when the original alert already has one.

Request:

```json
{
  "source": "Splunk",
  "severity": "high",
  "title": "Brute Force Attack",
  "description": "Multiple failed login attempts detected from 203.0.113.10"
}
```

Success response: `201 Created`

```json
{
  "source": "Splunk",
  "severity": "high",
  "title": "Brute Force Attack",
  "description": "Multiple failed login attempts detected from 203.0.113.10",
  "id": 1,
  "status": "new",
  "created_at": "2026-08-16T10:30:00",
  "updated_at": "2026-08-16T10:30:00",
  "incident_id": null,
  "duplicate_of_alert_id": null
}
```

## GET /alerts

Returns alerts sorted newest first.

Query parameters:

```text
status=new
severity=high
source=Splunk
search=Brute
page=1
limit=10
```

## GET /alerts/{alert_id}

Returns one alert by ID. Missing alerts return `404`.

## PATCH /alerts/{id}/status

Updates alert status and records a persisted `STATUS_CHANGED` audit event.

Request:

```json
{ "status": "investigating" }
```

## DELETE /alerts/{id}

Deletes one alert.

Response:

```json
{ "message": "Alert deleted successfully" }
```

## GET /alerts/{id}/enrichment

Runs threat intelligence enrichment for one alert, records enrichment/risk events,
and returns provider status plus risk breakdown.

Success response:

```json
{
  "alert_id": 1,
  "virus_total": {
    "provider": "VirusTotal",
    "status": "mock",
    "malicious": true,
    "score": 92,
    "timestamp": "2026-08-16T10:31:00Z",
    "error": "VIRUSTOTAL_API_KEY is not configured; using mock fallback."
  },
  "abuse_ipdb": {
    "provider": "AbuseIPDB",
    "status": "mock",
    "malicious": true,
    "score": 84,
    "country": "US",
    "timestamp": "2026-08-16T10:31:00Z",
    "error": "ABUSEIPDB_API_KEY is not configured; using mock fallback."
  },
  "risk_level": "Critical",
  "risk_score": 95,
  "risk_breakdown": {
    "base_score": 75,
    "virustotal_modifier": 10,
    "abuseipdb_modifier": 10,
    "raw_score": 95,
    "final_score": 95,
    "risk_level": "Critical"
  }
}
```

Provider statuses:

```text
live
mock
unavailable
```

The existing mock fallback behavior remains, but it is now explicit.

## POST /alerts/{id}/execute

Executes the rule-based playbook workflow, persists execution history, creates
timeline events, and creates or reuses an incident when appropriate.

Success response:

```json
{
  "alert_id": 1,
  "risk_score": 95,
  "risk_level": "Critical",
  "action": "block_ip",
  "status": "completed",
  "execution_id": 1,
  "playbook_name": "High Risk Network Containment",
  "incident_id": 1,
  "simulated": true,
  "message": "SIMULATED playbook action 'block_ip' executed. No real firewall, EDR, cloud, identity, or network containment integration was invoked.",
  "risk_breakdown": {
    "base_score": 75,
    "virustotal_modifier": 10,
    "abuseipdb_modifier": 10,
    "raw_score": 95,
    "final_score": 95,
    "risk_level": "Critical"
  },
  "enrichment": {
    "virus_total": {
      "provider": "VirusTotal",
      "status": "mock",
      "malicious": true,
      "score": 92,
      "timestamp": "2026-08-16T10:31:00Z",
      "error": "VIRUSTOTAL_API_KEY is not configured; using mock fallback."
    },
    "abuse_ipdb": {
      "provider": "AbuseIPDB",
      "status": "mock",
      "malicious": true,
      "score": 84,
      "country": "US",
      "timestamp": "2026-08-16T10:31:00Z",
      "error": "ABUSEIPDB_API_KEY is not configured; using mock fallback."
    }
  }
}
```

Backward-compatible fields still present:

```text
alert_id
risk_score
action
status
```

No real containment integrations are invoked.

## GET /playbooks

Returns the static playbook catalog:

```json
[
  { "id": 1, "name": "High Risk Malware", "action": "isolate_endpoint" },
  { "id": 2, "name": "Brute Force", "action": "block_ip" },
  { "id": 3, "name": "Medium Severity Incident", "action": "create_incident" },
  { "id": 4, "name": "Low Severity Notification", "action": "notify_admin" },
  { "id": 5, "name": "No Action Required", "action": "no_action" }
]
```

## GET /playbook-executions

Returns persisted playbook executions.

Query parameters:

```text
status=completed
alert_id=1
incident_id=1
page=1
limit=10
```

## GET /alerts/{id}/playbook-executions

Returns persisted playbook executions for one alert.

Example response:

```json
[
  {
    "id": 1,
    "alert_id": 1,
    "incident_id": 1,
    "playbook_name": "High Risk Network Containment",
    "action": "block_ip",
    "risk_score": 95,
    "status": "completed",
    "started_at": "2026-08-16T10:31:00",
    "completed_at": "2026-08-16T10:31:01",
    "error_message": null,
    "details": {
      "simulated": true
    }
  }
]
```

## GET /alerts/{id}/timeline

Returns persisted audit events ordered chronologically.

Example response:

```json
[
  {
    "id": 1,
    "event": "Alert Created",
    "event_type": "ALERT_CREATED",
    "description": "Alert 1 created",
    "actor": "api",
    "timestamp": "2026-08-16T10:30:00",
    "metadata": {
      "source": "Splunk",
      "severity": "high"
    }
  },
  {
    "id": 2,
    "event": "Risk Score Calculated",
    "event_type": "RISK_CALCULATED",
    "description": "Risk score calculated for alert 1",
    "actor": "api",
    "timestamp": "2026-08-16T10:31:00",
    "metadata": {
      "final_score": 95,
      "risk_level": "Critical"
    }
  }
]
```

The `event` field remains frontend-friendly. `event_type` is the durable machine
identifier.

## Incident APIs

### POST /incidents

Request:

```json
{
  "title": "Credential attack investigation",
  "description": "Multiple related alerts require investigation.",
  "severity": "high",
  "status": "open",
  "assignee": "analyst-1"
}
```

Response: `201 Created`

```json
{
  "id": 1,
  "title": "Credential attack investigation",
  "description": "Multiple related alerts require investigation.",
  "severity": "high",
  "status": "open",
  "assignee": "analyst-1",
  "created_at": "2026-08-16T10:32:00",
  "updated_at": "2026-08-16T10:32:00",
  "closed_at": null,
  "alerts": []
}
```

### GET /incidents

Query parameters:

```text
status=open
severity=high
assignee=analyst-1
page=1
limit=10
```

### GET /incidents/{incident_id}

Returns an incident with linked alerts.

### PATCH /incidents/{incident_id}

Request:

```json
{
  "status": "contained",
  "assignee": "analyst-2"
}
```

Status updates to `resolved` or `closed` set `closed_at` when it is not already set.

### DELETE /incidents/{incident_id}

Deletes the incident and clears `incident_id` from linked alerts.

### POST /incidents/{incident_id}/alerts/{alert_id}

Associates an alert with an incident. Missing alert or incident IDs return `404`.

## Dashboard

`GET /dashboard` keeps all previous fields and adds SOC metrics backed by persisted
data.

Example:

```json
{
  "total_alerts": 10,
  "new_alerts": 4,
  "investigating": 2,
  "contained": 1,
  "resolved": 2,
  "closed": 1,
  "critical": 1,
  "high": 3,
  "medium": 4,
  "low": 2,
  "automation_completed": 4,
  "high_risk_alerts": 4,
  "playbooks_executed": 5,
  "open_incidents": 2,
  "total_incidents": 3,
  "critical_alerts": 1,
  "successful_playbooks": 4,
  "failed_playbooks": 1,
  "automation_success_rate": 80.0,
  "average_time_to_contain": null,
  "average_time_to_resolve": null,
  "average_time_to_contain_seconds": null,
  "average_time_to_resolve_seconds": null
}
```

Average time metrics return seconds. They return `null` when there is no persisted
transition data to calculate from.

## Stats And Recent Alerts

Existing reporting endpoints remain unchanged:

```text
GET /stats
GET /recent-alerts
```

## Validation And Security Notes

- Invalid enums return FastAPI `422` validation errors.
- Missing alerts/incidents return `404`.
- API keys are read only from environment variables.
- API keys are not logged or returned in responses.
- Built-in playbook actions are explicitly simulated.
- The API does not execute arbitrary user-provided commands or code.
