# SOAR Incident Containment Engine

[![Python](https://img.shields.io/badge/Python-3.14-blue)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688)](https://fastapi.tiangolo.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Internship%20Project-green)](#)

Enterprise Cloud MSSP - SOAR Incident Containment Engine is a FastAPI backend for alert intake, investigation, threat intelligence enrichment, risk scoring, and mock SOAR automation.

## Project Overview

This project simulates the backend of a Security Orchestration, Automation, and Response platform. It allows a frontend or analyst workflow to create alerts, filter and search them, enrich them with threat intelligence, calculate risk, and execute mocked containment playbooks.

The system is intentionally built with a clean beginner-friendly backend architecture while preserving realistic cybersecurity concepts used in MSSP and SOC environments.

## Project Architecture

```text
Frontend / Swagger
        |
        v
FastAPI API Layer
        |
        +-- Alert CRUD APIs
        +-- Dashboard and statistics APIs
        +-- Threat Intelligence enrichment
        +-- SOAR playbook execution
        |
        v
SQLAlchemy ORM
        |
        v
SQLite Database
```

Threat Intelligence providers:

```text
VirusTotal API -> fallback to mock data when API key is missing
AbuseIPDB API  -> fallback to mock data when API key is missing
```

Automation providers:

```text
Mock Playbook Engine -> no real firewall, EDR, or network action is executed
```

## Features

- Alert creation with validation
- Alert listing with filtering, search, and pagination
- Alert detail lookup
- Alert status updates
- Alert deletion
- Dashboard metrics
- Daily, severity, and status statistics
- Recent alerts API
- Threat Intelligence enrichment
- Runtime enrichment caching
- Risk score calculation
- Mock SOAR playbook execution
- Playbook catalog API
- Investigation timeline API
- Swagger/OpenAPI documentation
- Environment-based configuration
- Frontend-ready CORS configuration

## Technology Stack

- Python
- FastAPI
- Uvicorn
- SQLAlchemy
- SQLite
- Pydantic
- python-dotenv
- VirusTotal REST API
- AbuseIPDB REST API

## Folder Structure

```text
SOAR project/
├── app/
│   ├── config.py
│   ├── database.py
│   ├── main.py
│   ├── models.py
│   ├── playbook.py
│   ├── schemas.py
│   └── threat_intelligence.py
├── .env.example
├── .gitignore
├── API_USAGE.md
├── LICENSE
└── README.md
```

## Installation Guide

Clone the repository and open the project folder:

```powershell
cd "C:\Users\ssath\OneDrive\Documents\SOAR project"
```

Create a virtual environment:

```powershell
py -m venv .venv
```

Activate the virtual environment:

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
.\.venv\Scripts\python.exe -m pip install fastapi "uvicorn[standard]" sqlalchemy pydantic python-dotenv
```

## Environment Variable Setup

Create a local `.env` file from `.env.example`:

```powershell
Copy-Item .env.example .env
```

Supported variables:

```text
DATABASE_URL=sqlite:///./alerts.db
API_TITLE=SOAR Incident Containment Engine
API_VERSION=1.0.0
VIRUSTOTAL_API_KEY=
ABUSEIPDB_API_KEY=
```

Notes:

- `.env` is ignored by Git and must not be committed.
- If threat intelligence API keys are missing, the backend safely returns mock enrichment data.
- SQLite remains the default database for local development.

## Running the Project

Start the FastAPI server:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Default API URL:

```text
http://127.0.0.1:8000
```

## Swagger Documentation

Open Swagger UI:

```text
http://127.0.0.1:8000/docs
```

Swagger can be used to test all current endpoints without a separate frontend.

## API Overview

Alert APIs:

```text
POST   /alerts
GET    /alerts
GET    /alerts/{alert_id}
PATCH  /alerts/{id}/status
DELETE /alerts/{id}
```

Dashboard and reporting APIs:

```text
GET /dashboard
GET /stats
GET /recent-alerts
```

Threat Intelligence APIs:

```text
GET /alerts/{id}/enrichment
```

SOAR Automation APIs:

```text
POST /alerts/{id}/execute
GET  /playbooks
GET  /alerts/{id}/timeline
```

Detailed request and response examples are available in [API_USAGE.md](API_USAGE.md).

## Frontend Integration

CORS is configured for local frontend development:

```text
http://localhost:5173
http://127.0.0.1:5173
```

Recommended frontend usage:

- Use `GET /alerts` for alert tables.
- Use `status`, `severity`, `source`, and `search` query parameters for filters.
- Use `page` and `limit` for pagination.
- Use `GET /dashboard` for dashboard cards.
- Use `GET /stats` for charts.
- Use `GET /alerts/{id}/enrichment` for alert detail enrichment panels.
- Use `POST /alerts/{id}/execute` for playbook execution buttons.

## Threat Intelligence

The Threat Intelligence module is implemented in:

```text
app/threat_intelligence.py
```

Current capabilities:

- VirusTotal enrichment
- AbuseIPDB enrichment
- Mock fallback when API keys are unavailable
- Timeout and HTTP error handling
- Invalid key and rate limit fallback handling
- Runtime cache for repeated enrichment requests
- Risk score calculation

Risk score base values:

```text
critical -> 100
high     -> 75
medium   -> 50
low      -> 25
```

Score modifiers:

```text
VirusTotal malicious=true -> +10
AbuseIPDB score > 80      -> +10
```

## SOAR Automation

The SOAR Automation module is implemented in:

```text
app/playbook.py
```

Supported mock actions:

```text
notify_admin
isolate_endpoint
block_ip
create_incident
no_action
```

Risk-based playbook rules:

```text
risk >= 90 -> block_ip
risk >= 75 -> isolate_endpoint
risk >= 50 -> notify_admin
risk < 50  -> create_incident
```

Important: automation is mocked. The project does not perform real firewall, EDR, identity, cloud, or network containment actions.

## Git Workflow

Current working branch:

```text
sathish_muneeswaran
```

Recommended commit style:

```text
feat: add new backend capability
fix: correct backend behavior
docs: update project documentation
chore: maintain project setup
```

Before committing:

```powershell
git status --short --branch
```

Commit and push:

```powershell
git add <files>
git commit -m "type: meaningful message"
git push origin sathish_muneeswaran
```

## Future Improvements

- Add persistent automation execution history
- Add persistent threat intelligence enrichment records
- Add authentication and role-based access control
- Add root, health, and version APIs
- Add production database support
- Add unit and integration tests
- Add Docker support
- Add real firewall, EDR, SIEM, and ticketing integrations
- Add background jobs for enrichment and automation
- Add structured logging and audit trails

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
