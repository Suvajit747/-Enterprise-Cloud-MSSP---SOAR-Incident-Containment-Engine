# API Documentation — SOAR Incident Containment Engine

Base URL: `http://127.0.0.1:8000`
Auth Header: `x-api-token: analyst_token` (or senior_token / admin_token)

---

## POST `/alert/ingest`
Ingest a raw custom SIEM alert. Normalizes it, enriches IPs, runs playbook.

**Request:**
```json
{
  "description": "Multiple failed SSH logins from external IP",
  "source_ip": "185.220.101.45",
  "severity": "high",
  "host": "web-server-01",
  "source": "Splunk"
}
```

**Response:**
```json
{
  "case_id": "A1B2C3D4",
  "alert_type": "brute_force",
  "severity": "high",
  "risk_score": 84,
  "source_ips": ["185.220.101.45"],
  "enrichments": [{ "ip": "185.220.101.45", "reputation_score": 98, "country_name": "Germany", "is_known_bad": true, "threat_tags": ["tor_exit"] }],
  "status": "contained",
  "playbook_actions": [
    { "action_type": "ALERT_INGESTED", "target": "A1B2C3D4", "result": "Alert normalized.", "impact": "none" },
    { "action_type": "FIREWALL_BLOCK", "target": "185.220.101.45", "result": "IP BLOCKED.", "impact": "medium" },
    { "action_type": "EDR_ISOLATE_HOST", "target": "web-server-01", "result": "Host isolated.", "impact": "high" }
  ],
  "mttr_seconds": 1.5
}
```

---

## POST `/alert/simulate`
Run a pre-built scenario. Options: `brute_force` `malware` `port_scan` `ddos` `data_exfil` `phishing`

**Request:** `{ "scenario": "malware" }`

---

## GET `/cases`
List all cases. Returns newest first.

**Response:** `{ "total": 3, "cases": [ { "case_id": ..., "severity": ..., "risk_score": ..., "status": ... } ] }`

---

## GET `/cases/{case_id}`
Full case detail including all enrichments and playbook action timeline.

---

## PUT `/cases/{case_id}/status`
Update case status. Requires `senior_token` or `admin_token`.

**Request:** `{ "status": "closed" }`
**Valid values:** `open` `investigating` `contained` `closed`

---

## GET `/dashboard/stats`
Returns aggregated metrics for the dashboard stats bar.

**Response:**
```json
{
  "total_cases": 6,
  "total_actions": 31,
  "by_severity": { "critical": 3, "high": 2, "medium": 1 },
  "by_status": { "contained": 6 },
  "by_type": { "malware": 1, "brute_force": 1 },
  "avg_risk_score": 87.5,
  "containment_rate_pct": 100.0,
  "avg_mttr_seconds": 1.55
}
```

---

## GET `/health`
`{ "status": "ok", "total_cases": 6, "total_actions_taken": 31 }`
