# SOAR Incident Containment Engine API Usage

This document describes the current backend API contract for frontend integration.

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

## Environment

Supported environment variables:

```text
DATABASE_URL=sqlite:///./alerts.db
API_TITLE=SOAR Incident Containment Engine
API_VERSION=1.0.0
VIRUSTOTAL_API_KEY=
ABUSEIPDB_API_KEY=
```

If `VIRUSTOTAL_API_KEY` or `ABUSEIPDB_API_KEY` is missing, the backend returns mock enrichment data.

## Shared Values

Valid severities:

```text
low
medium
high
critical
```

Valid statuses:

```text
new
investigating
contained
resolved
closed
```

Common not found response:

```json
{
  "detail": "Alert not found"
}
```

## POST /alerts

Creates a new alert.

Request:

```json
{
  "source": "Splunk",
  "severity": "high",
  "title": "Brute Force Attack",
  "description": "Multiple failed login attempts detected"
}
```

Success response: `201 Created`

```json
{
  "source": "Splunk",
  "severity": "high",
  "title": "Brute Force Attack",
  "description": "Multiple failed login attempts detected",
  "id": 1,
  "status": "new",
  "created_at": "2026-07-16T10:30:00"
}
```

Frontend notes:

- Use this endpoint when a user submits a new alert or when ingesting alerts from a frontend form.
- `title` and `description` cannot be empty or whitespace-only.
- Invalid severity returns `422`.

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

Example:

```text
GET /alerts?status=new&severity=high&search=Brute&page=1&limit=10
```

Success response: `200 OK`

```json
[
  {
    "source": "Splunk",
    "severity": "high",
    "title": "Brute Force Attack",
    "description": "Multiple failed login attempts detected",
    "id": 1,
    "status": "new",
    "created_at": "2026-07-16T10:30:00"
  }
]
```

Frontend notes:

- Use `page` and `limit` for table pagination.
- Use `search` for title and description search.
- Use `status`, `severity`, and `source` for filter controls.
- `page` must be at least `1`.
- `limit` must be between `1` and `100`.

## GET /alerts/{alert_id}

Returns one alert by ID.

Example:

```text
GET /alerts/1
```

Success response: `200 OK`

```json
{
  "source": "Splunk",
  "severity": "high",
  "title": "Brute Force Attack",
  "description": "Multiple failed login attempts detected",
  "id": 1,
  "status": "new",
  "created_at": "2026-07-16T10:30:00"
}
```

Frontend notes:

- Use this endpoint for alert detail pages.
- Missing alerts return `404`.

## PATCH /alerts/{id}/status

Updates alert status.

Request:

```json
{
  "status": "investigating"
}
```

Success response: `200 OK`

```json
{
  "source": "Splunk",
  "severity": "high",
  "title": "Brute Force Attack",
  "description": "Multiple failed login attempts detected",
  "id": 1,
  "status": "investigating",
  "created_at": "2026-07-16T10:30:00"
}
```

Frontend notes:

- Use this endpoint for status dropdowns or workflow buttons.
- Invalid statuses return `422`.
- Missing alerts return `404`.

## DELETE /alerts/{id}

Deletes one alert.

Example:

```text
DELETE /alerts/1
```

Success response: `200 OK`

```json
{
  "message": "Alert deleted successfully"
}
```

Frontend notes:

- Use confirmation UI before calling this endpoint.
- Missing alerts return `404`.

## GET /alerts/{id}/enrichment

Returns threat intelligence enrichment for one alert.

Example:

```text
GET /alerts/1/enrichment
```

Success response: `200 OK`

```json
{
  "alert_id": 1,
  "virus_total": {
    "malicious": true,
    "score": 92
  },
  "abuse_ipdb": {
    "score": 84,
    "country": "US"
  },
  "risk_level": "High",
  "risk_score": 95
}
```

Frontend notes:

- Use this endpoint on alert detail pages or enrichment panels.
- Results are cached in memory during runtime for repeated requests.
- If API keys are not configured, mock data is returned.
- Missing alerts return `404`.

## POST /alerts/{id}/execute

Runs the mock SOAR playbook for one alert.

Example:

```text
POST /alerts/1/execute
```

Success response: `200 OK`

```json
{
  "alert_id": 1,
  "risk_score": 95,
  "action": "block_ip",
  "status": "completed"
}
```

Playbook risk rules:

```text
risk >= 90 -> block_ip
risk >= 75 -> isolate_endpoint
risk >= 50 -> notify_admin
risk < 50 -> create_incident
```

Frontend notes:

- Use this endpoint from an "Execute Playbook" button.
- The current implementation is mocked and does not call real firewall or EDR systems.
- Missing alerts return `404`.

## GET /playbooks

Returns available mock playbooks.

Example:

```text
GET /playbooks
```

Success response: `200 OK`

```json
[
  {
    "id": 1,
    "name": "High Risk Malware",
    "action": "isolate_endpoint"
  },
  {
    "id": 2,
    "name": "Brute Force",
    "action": "block_ip"
  }
]
```

Frontend notes:

- Use this endpoint to render playbook cards, dropdowns, or automation reference panels.
- The list is static for now.

## GET /alerts/{id}/timeline

Returns a mock investigation timeline.

Example:

```text
GET /alerts/1/timeline
```

Success response: `200 OK`

```json
[
  {
    "event": "Alert Created"
  },
  {
    "event": "Threat Intelligence Completed"
  },
  {
    "event": "Risk Score Calculated"
  },
  {
    "event": "Playbook Executed"
  }
]
```

Frontend notes:

- Use this endpoint for an alert investigation timeline component.
- Missing alerts return `404`.

## GET /dashboard

Returns dashboard metrics.

Example:

```text
GET /dashboard
```

Success response: `200 OK`

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
  "playbooks_executed": 4
}
```

Frontend notes:

- Use this endpoint for dashboard summary cards.
- `playbooks_executed` is currently derived from high-risk alerts until persistent playbook history is added.

## GET /stats

Returns daily, severity, and status statistics.

Example:

```text
GET /stats
```

Success response: `200 OK`

```json
{
  "daily_alerts": [
    {
      "date": "2026-07-16",
      "count": 5
    }
  ],
  "alerts_by_severity": {
    "critical": 1,
    "high": 3,
    "medium": 4,
    "low": 2
  },
  "alerts_by_status": {
    "new": 4,
    "investigating": 2,
    "contained": 1,
    "resolved": 2,
    "closed": 1
  }
}
```

Frontend notes:

- Use this endpoint for charts and trend visualizations.
- `daily_alerts` is suitable for a line chart.
- Severity and status objects are suitable for pie charts or bar charts.

## GET /recent-alerts

Returns the latest 10 alerts.

Example:

```text
GET /recent-alerts
```

Success response: `200 OK`

```json
[
  {
    "source": "Splunk",
    "severity": "high",
    "title": "Brute Force Attack",
    "description": "Multiple failed login attempts detected",
    "id": 1,
    "status": "new",
    "created_at": "2026-07-16T10:30:00"
  }
]
```

Frontend notes:

- Use this endpoint for "Recent Alerts" widgets.
- It always returns at most 10 records.

## Frontend Error Handling

Recommended handling:

```text
200 -> render data
201 -> show created success state
404 -> show "Alert not found"
422 -> show validation errors near form fields
500 -> show generic backend error message
```

For local frontend development, CORS already allows:

```text
http://localhost:5173
http://127.0.0.1:5173
```
