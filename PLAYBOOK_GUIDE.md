# Playbook Guide — SOAR Incident Containment Engine

## What is a Playbook?
A playbook is a predefined set of automated response actions that the SOAR
engine executes when a security alert arrives. Instead of a human analyst
manually triaging, the engine follows the playbook logic automatically.

---

## Risk Score Calculation

```
Risk = (Severity × 0.5) + (Max IP Reputation × 0.5)

Severity mapping:
  critical = 90 points
  high     = 70 points
  medium   = 50 points
  low      = 25 points
  info     = 10 points

IP Reputation: 0–100 from AbuseIPDB (simulated)

Bonus: +15 points for malware or data_exfil types
Final score capped at 100.
```

---

## Playbook Tiers

### Tier 1 — Low Risk (0–39)
**Actions:** ALERT_INGESTED → THREAT_INTEL_LOOKUP → MONITORING_ENABLED

Enhanced monitoring is enabled on the host. No blocking occurs.
Suitable for: port scans from low-reputation IPs, info-level alerts.

---

### Tier 2 — Medium Risk (40–69)
**Actions:** ALERT_INGESTED → THREAT_INTEL_LOOKUP → FIREWALL_BLOCK (per IP) → ANALYST_NOTIFIED

AWS Security Group updated to block all inbound traffic from the source IP.
Analyst is notified to review manually.

---

### Tier 3 — High Risk (70–89)
**Actions:** ALERT_INGESTED → THREAT_INTEL_LOOKUP → FIREWALL_BLOCK → EDR_ISOLATE_HOST → SENIOR_ANALYST_NOTIFIED

IP blocked at firewall AND the compromised host is isolated from the network
via the EDR (Endpoint Detection and Response) agent. Senior analyst escalated.

---

### Tier 4 — Critical Risk (90–100)
**Actions:** ALERT_INGESTED → THREAT_INTEL_LOOKUP → FIREWALL_BLOCK → EDR_ISOLATE_HOST → MEMORY_DUMP_TRIGGERED → INCIDENT_ESCALATED

Full containment. Host isolated. Forensic memory dump triggered for IR analysis.
CISO and Incident Response team notified immediately.

---

## Action Type Reference

| Action | Impact | Description |
|--------|--------|-------------|
| ALERT_INGESTED | none | Alert received and normalized from SIEM |
| THREAT_INTEL_LOOKUP | none | IP reputation checked against AbuseIPDB |
| MONITORING_ENABLED | low | Enhanced logging enabled on host |
| FIREWALL_BLOCK | medium | AWS Security Group blocks source IP |
| ANALYST_NOTIFIED | low | Ticket created, analyst assigned |
| SENIOR_ANALYST_NOTIFIED | low | Ticket escalated to senior analyst |
| EDR_ISOLATE_HOST | high | Host network access suspended via EDR |
| MEMORY_DUMP_TRIGGERED | high | Forensic memory dump for IR team |
| INCIDENT_ESCALATED | critical | CISO and IR team notified |

---

## Tested Scenarios and Results

| Scenario | Severity | IP Score | Risk | Tier | Actions Fired |
|----------|----------|---------|------|------|--------------|
| Brute Force | high | 98 | 84 | 3 | FW Block + EDR |
| Malware | critical | 90 | 100 | 4 | Full containment |
| Port Scan | medium | 95 | 72 | 3 | FW Block + EDR |
| DDoS | critical | 88 | 89 | 3 | FW Block + EDR |
| Data Exfil | critical | 72 | 96 | 4 | Full containment |
| Phishing | high | 98 | 84 | 3 | FW Block + EDR |
