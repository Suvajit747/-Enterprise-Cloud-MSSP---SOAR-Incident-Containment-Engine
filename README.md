# SOAR Incident Containment Engine

[![Python](https://img.shields.io/badge/Python-3.14-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688)](https://fastapi.tiangolo.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

SOAR Incident Containment Engine is a FastAPI backend for alert intake, enrichment,
risk scoring, incident management, audit timelines, and simulated SOAR playbook
execution.

The project remains intentionally lightweight: FastAPI, SQLAlchemy, Pydantic, and
SQLite by default. The Phase 1 upgrade adds persistent SOAR workflow state without
rewriting the application or introducing external infrastructure.

## Architecture

```text
Alert Ingestion
      |
      v
Alert
      |
      v
Deduplication
      |
      v
Threat Intelligence
      |
      v
Risk Engine
      |
      v
Playbook Engine
      |
      v
Playbook Execution
      |
      v
Incident
      |
      v
Audit / Timeline
      |
      v
SOC Dashboard
```

## Main Capabilities

- Alert CRUD with filtering, search, pagination, and status updates
- Alert deduplication by source, severity, title, and description fingerprint
- Persistent incident CRUD and alert-to-incident association
- Persistent audit events powering `GET /alerts/{id}/timeline`
- Persistent playbook execution history
- VirusTotal and AbuseIPDB enrichment with live/mock/unavailable status metadata
- Risk score breakdown with capped final score
- Automatic incident creation for high-risk alerts and `create_incident` playbook actions
- Dashboard metrics from persisted alerts, incidents, playbook executions, and audit events
- Structured JSON request logging with request IDs
- SQLite local development through `DATABASE_URL`

## Data Models

Core database tables:

```text
alerts
  id, source, severity, title, description, status, created_at, updated_at,
  fingerprint, duplicate_of_alert_id, incident_id

incidents
  id, title, description, severity, status, assignee,
  created_at, updated_at, closed_at

audit_events
  id, alert_id, incident_id, event_type, description, actor, timestamp, metadata

playbook_executions
  id, alert_id, incident_id, playbook_name, action, risk_score, status,
  started_at, completed_at, error_message, details
```

Incident statuses:

```text
open
investigating
contained
resolved
closed
```

Playbook execution statuses:

```text
queued
running
completed
failed
skipped
```

## Project Structure

```text
SOAR project/
├── app/
│   ├── services/
│   │   ├── audit_service.py
│   │   ├── incident_service.py
│   │   ├── playbook_service.py
│   │   └── risk_service.py
│   ├── config.py
│   ├── database.py
│   ├── logging_config.py
│   ├── main.py
│   ├── models.py
│   ├── playbook.py
│   ├── schemas.py
│   └── threat_intelligence.py
├── tests/
├── soar-frontend/
├── .env.example
├── API_USAGE.md
└── requirements.txt
```

## Setup

Create and activate a virtual environment:

```powershell
cd "C:\Users\ssath\OneDrive\Documents\SOAR project"
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Create `.env` from the example:

```powershell
Copy-Item .env.example .env
```

Supported environment variables:

```text
DATABASE_URL=sqlite:///./alerts.db
API_TITLE=SOAR Incident Containment Engine
API_VERSION=1.0.0
LOG_LEVEL=INFO
VIRUSTOTAL_API_KEY=
ABUSEIPDB_API_KEY=
```

Do not commit `.env`, API keys, or database credentials.

## Run Locally

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Default API URL:

```text
http://127.0.0.1:8000
```

Swagger UI:

```text
http://127.0.0.1:8000/docs
```

## API Overview

System:

```text
GET /health
GET /version
```

Alerts:

```text
POST   /alerts
GET    /alerts
GET    /alerts/{alert_id}
PATCH  /alerts/{id}/status
DELETE /alerts/{id}
GET    /alerts/{id}/enrichment
GET    /alerts/{id}/timeline
POST   /alerts/{id}/execute
GET    /alerts/{id}/playbook-executions
```

Incidents:

```text
POST   /incidents
GET    /incidents
GET    /incidents/{incident_id}
PATCH  /incidents/{incident_id}
DELETE /incidents/{incident_id}
POST   /incidents/{incident_id}/alerts/{alert_id}
```

Automation and reporting:

```text
GET /playbooks
GET /playbook-executions
GET /dashboard
GET /stats
GET /recent-alerts
```

Detailed examples are in [API_USAGE.md](API_USAGE.md).

## Threat Intelligence

The backend keeps the existing VirusTotal and AbuseIPDB integrations. When API keys
are missing or a provider cannot return a usable result, the response falls back to
documented mock data and labels it clearly:

```json
{
  "provider": "VirusTotal",
  "status": "mock",
  "malicious": true,
  "score": 92,
  "timestamp": "2026-08-16T00:00:00Z",
  "error": "VIRUSTOTAL_API_KEY is not configured; using mock fallback."
}
```

Provider statuses:

```text
live        real provider response was used
mock        documented fallback data was used
unavailable provider has no usable data available
```

No API keys are logged or returned in API responses.

## Risk Scoring

Severity remains the foundation:

```text
critical -> 100
high     -> 75
medium   -> 50
low      -> 25
```

Modifiers:

```text
VirusTotal malicious=true -> +10
AbuseIPDB score > 80      -> +10
```

Responses include a breakdown and cap `final_score` at 100:

```json
{
  "base_score": 75,
  "virustotal_modifier": 10,
  "abuseipdb_modifier": 10,
  "raw_score": 95,
  "final_score": 95,
  "risk_level": "Critical"
}
```

Risk levels:

```text
Low       < 50
Medium    50-74
High      75-89
Critical  90-100
```

## Playbook Workflow

`POST /alerts/{id}/execute` now persists the execution:

1. Load the alert
2. Record enrichment start
3. Run VirusTotal and AbuseIPDB enrichment
4. Record enrichment completion
5. Calculate and persist risk breakdown
6. Select a playbook
7. Create a `PlaybookExecution`
8. Execute the playbook through the local rule engine
9. Mark the execution `completed`, `failed`, or `skipped`
10. Create or reuse an incident when appropriate
11. Record timeline events

All built-in actions are simulated. The backend does not call firewall, EDR, cloud,
identity, or network containment systems.

## Database Notes

SQLite remains the default local database. On startup, the app:

- Creates missing new tables with SQLAlchemy metadata
- Adds missing nullable Phase 1 columns to existing SQLite `alerts` tables
- Creates missing indexes with `checkfirst=True`

The startup sync is additive only. It does not drop tables, delete rows, or rebuild
the existing database.

## Testing

Run the backend tests:

```powershell
.\.venv\Scripts\python.exe -m unittest discover tests
```

The tests cover incident CRUD, alert-to-incident linking, persisted timelines,
playbook execution history, playbook failure persistence, risk scoring, enrichment
status metadata, duplicate detection, dashboard metrics, and existing endpoint
compatibility.

## Remaining Limitations

- Built-in playbook actions are simulated and do not perform real containment.
- SQLite is intended for local development; production deployment should add a
  migration tool and a managed database.
- Threat intelligence is fetched synchronously during API requests.
- There is no authentication or RBAC yet.
