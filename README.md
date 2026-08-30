# SOAR Incident Containment Engine
### Infotact Solutions — Cybersecurity Internship 2026
### Project 3: Enterprise Cloud / MSSP - SOAR Incident Containment Engine

---

## What This Project Does

Security Operations Center (SOC) analysts are overwhelmed by thousands of
alerts every day from SIEM systems like Splunk, AWS GuardDuty, and CrowdStrike.
Manually triaging each alert — looking up IP addresses, blocking them in
firewalls, isolating compromised hosts — takes far too long and lets
attackers move freely across the network.

This SOAR (Security Orchestration, Automation and Response) engine
automatically:

1. **Ingests** raw security alerts from any SIEM via webhook
2. **Normalizes** them into a standard schema regardless of source format
3. **Enriches** source IPs with threat intelligence (reputation scores, geolocation)
4. **Calculates** a risk score combining alert severity + IP reputation
5. **Executes** a defensive playbook automatically based on risk level:
   - Risk < 40 → Enhanced monitoring
   - Risk 40–69 → Firewall block the source IP
   - Risk 70–89 → Firewall block + Isolate the compromised host
   - Risk ≥ 90 → Full containment + Memory dump + CISO escalation
6. **Tracks** every action in a timestamped case management dashboard
7. **Enforces** Role-Based Access Control so only senior analysts can close cases

**Target MTTR (Mean Time to Respond): under 5 seconds** — from alert ingestion
to full containment playbook execution.

---

## How to Run

### Step 1 — Install Python (if not already installed)
Download from https://python.org — tick "Add Python to PATH" during install.

### Step 2 — Open Command Prompt inside the backend folder
Open the `backend` folder in File Explorer → click the address bar → type `cmd` → Enter.

### Step 3 — Install dependencies
```
pip install -r requirements.txt
```
Or if pip isn't recognized:
```
python -m pip install -r requirements.txt
```

### Step 4 — Start the backend server
```
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
You should see:
```
INFO: Uvicorn running on http://127.0.0.1:8000
```

### Step 5 — Open the dashboard
Open `frontend/index.html` in Chrome or Edge.
Double-click the file in File Explorer — no extra setup needed.

### Step 6 — Use the SOAR engine
- Click any **scenario button** (Brute Force, Malware, Port Scan, DDoS, Data Exfil, Phishing)
- Watch the **Playbook Execution** timeline show every automated action taken
- See the **Threat Intelligence** panel show IP reputation and geolocation
- View and manage all cases in the **Case Management** panel
- Switch roles (Analyst / Senior Analyst / Admin) to test RBAC

---

## Project Structure

```
soar-project/
│
├── README.md                    ← This file
├── START.sh                     ← Start script (Mac/Linux)
├── START.bat                    ← Start script (Windows — double-click)
│
├── backend/
│   ├── main.py                  ← FastAPI SOAR engine (all 4 weeks)
│   └── requirements.txt         ← Python dependencies
│
├── frontend/
│   ├── index.html               ← SOAR dashboard UI
│   ├── style.css                ← Dark SOC theme styles
│   └── script.js                ← Dashboard interactivity + API calls
│
└── docs/
    ├── API_DOCS.md              ← API endpoint reference
    ├── COMPONENTS.md            ← Frontend component guide
    ├── PLAYBOOK_GUIDE.md        ← How playbooks work
    └── DAILY_COMMIT_GUIDE.md    ← Git commit messages for all 20 days
```

---

## Four-Week Implementation

### Week 1 — Webhook Ingestion and Data Normalization
- FastAPI SOAR listener service built
- Accepts raw SIEM alert JSON in any format
- Normalizes: timestamps (6 different formats supported), IP extraction,
  attack type classification, severity mapping
- 6 pre-built simulated scenarios: brute_force, malware, port_scan,
  ddos, data_exfil, phishing
- Endpoint: `POST /alert/ingest` and `POST /alert/simulate`

### Week 2 — Automated Threat Enrichment
- Threat intelligence lookup for every source IP in the alert
- Returns: reputation score (0–100), country, ISP, threat tags, report count
- Simulates AbuseIPDB API with a built-in threat database of known bad IPs
- Risk score calculated: 50% alert severity + 50% IP reputation score
- Bonus boost for dangerous attack types (malware, data_exfil)

### Week 3 — Playbook Automation and API Orchestration
- Automated defensive playbook executes in < 5 seconds
- 4 risk tiers with escalating response actions:
  - MONITORING_ENABLED → FIREWALL_BLOCK → EDR_ISOLATE_HOST →
    MEMORY_DUMP_TRIGGERED → INCIDENT_ESCALATED
- Mock AWS Security Group IP blocking via boto3-style simulation
- Mock EDR host isolation
- All actions logged with timestamp, target, result, executor

### Week 4 — Case Management Dashboard and RBAC
- Full case timeline with chronological action log
- Role-Based Access Control: analyst / senior_analyst / admin
- `GET /cases` — list all cases with filters
- `GET /cases/{id}` — full case detail
- `PUT /cases/{id}/status` — update status (senior_analyst+ only)
- `GET /dashboard/stats` — aggregated metrics
- Frontend filter by status: open / investigating / contained / closed

---

## API Endpoints

Base URL: `http://127.0.0.1:8000`

| Method | Endpoint | Role Required | Description |
|--------|----------|--------------|-------------|
| GET | `/health` | any | Server health check |
| GET | `/` | any | API overview |
| POST | `/alert/ingest` | analyst+ | Ingest custom SIEM alert |
| POST | `/alert/simulate` | analyst+ | Run pre-built scenario |
| GET | `/cases` | analyst+ | List all cases |
| GET | `/cases/{id}` | analyst+ | Full case detail |
| PUT | `/cases/{id}/status` | senior_analyst+ | Update case status |
| GET | `/dashboard/stats` | analyst+ | Dashboard statistics |
| GET | `/docs` | any | Interactive API explorer |

### RBAC Tokens (for testing)
Send as HTTP header: `x-api-token: <token>`

| Token | Role | Can Do |
|-------|------|--------|
| `analyst_token` | Analyst | View cases, ingest alerts |
| `senior_token` | Senior Analyst | + Close/update cases, run high-impact playbooks |
| `admin_token` | Admin | Everything |

---

## Risk Score and Playbook Logic

```
Risk Score = (Severity Score × 0.5) + (IP Reputation Score × 0.5)

Severity scores:  critical=90  high=70  medium=50  low=25  info=10
IP reputation:    0–100 from AbuseIPDB (simulated)

Bonus: +15 points for malware or data_exfil attack types

Playbook tiers:
  Score  0–39  → MONITORING_ENABLED
  Score 40–69  → FIREWALL_BLOCK (per IP)
  Score 70–89  → FIREWALL_BLOCK + EDR_ISOLATE_HOST + SENIOR_NOTIFIED
  Score 90–100 → FIREWALL_BLOCK + EDR_ISOLATE_HOST +
                 MEMORY_DUMP_TRIGGERED + INCIDENT_ESCALATED
```

---

## Real Test Results

| Scenario | Risk Score | Actions | Status |
|----------|-----------|---------|--------|
| Brute Force | 84/100 | 5 | Contained |
| Malware | 100/100 | 6 | Contained |
| Port Scan | 72/100 | 5 | Contained |
| DDoS | 89/100 | 5 | Contained |
| Data Exfil | 96/100 | 6 | Contained |
| Phishing | 84/100 | 5 | Contained |

All scenarios tested and verified working end-to-end.

---

## Team

| Member | Role | Files |
|--------|------|-------|
| Member 1 | Backend API | `backend/main.py` |
| Member 2 | Threat Enrichment | `backend/main.py` (Week 2 section) |
| Member 3 | Playbook Engine | `backend/main.py` (Week 3 section) |
| Member 4 | Frontend + Documentation | `frontend/`, `docs/`, `README.md` |

---

*Infotact Solutions · Electronic City, Bengaluru, Karnataka 560100*
