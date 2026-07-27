"""
=======================================================================
  SOAR INCIDENT CONTAINMENT ENGINE — BACKEND
  Project 3: Enterprise Cloud / MSSP - SOAR Incident Containment Engine
  Infotact Solutions Cybersecurity Internship 2026
=======================================================================

  Week 1: Webhook Ingestion and Data Normalization
    - FastAPI SOAR listener service
    - Simulated SIEM alert ingestion (JSON payloads)
    - Timestamp normalization, IP extraction, schema standardization

  Week 2: Automated Threat Enrichment
    - Threat intelligence integration (AbuseIPDB / VirusTotal mock)
    - IP reputation scoring
    - Geolocation enrichment

  Week 3: Playbook Automation and API Orchestration
    - Automated defensive playbook execution
    - Mock EDR isolation (endpoint containment)
    - Mock AWS Security Group firewall block
    - Conditional playbook logic based on risk score

  Week 4: Case Management Dashboard and RBAC
    - Full case timeline with chronological action log
    - Role-Based Access Control (analyst / senior_analyst / admin)
    - Case status management
    - Statistics and reporting endpoint
=======================================================================
"""

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import re
import uuid
import random
import ipaddress
from datetime import datetime, timezone


# ═══════════════════════════════════════════════════════════════════
# WEEK 4: ROLE-BASED ACCESS CONTROL (RBAC)
# Roles: analyst, senior_analyst, admin
# senior_analyst and admin can approve high-impact playbooks
# ═══════════════════════════════════════════════════════════════════

USERS = {
    "analyst_token":         {"username": "analyst1",       "role": "analyst"},
    "senior_token":          {"username": "senior_analyst1", "role": "senior_analyst"},
    "admin_token":           {"username": "admin1",          "role": "admin"},
}

ROLE_PERMISSIONS = {
    "analyst":        ["view_cases", "ingest_alert", "run_low_playbook"],
    "senior_analyst": ["view_cases", "ingest_alert", "run_low_playbook",
                       "run_high_playbook", "close_case"],
    "admin":          ["view_cases", "ingest_alert", "run_low_playbook",
                       "run_high_playbook", "close_case", "delete_case",
                       "manage_users"],
}

def get_current_user(x_api_token: str = Header(default="analyst_token")):
    user = USERS.get(x_api_token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid API token.")
    return user

def require_permission(permission: str):
    def checker(user=Depends(get_current_user)):
        role = user["role"]
        if permission not in ROLE_PERMISSIONS.get(role, []):
            raise HTTPException(
                status_code=403,
                detail=f"Role '{role}' does not have permission: {permission}"
            )
        return user
    return checker


# ═══════════════════════════════════════════════════════════════════
# IN-MEMORY STORAGE
# Stores all cases, alerts, and playbook action logs
# ═══════════════════════════════════════════════════════════════════

cases: dict[str, dict] = {}        # case_id -> case object
action_log: list[dict] = []        # chronological list of all actions taken


# ═══════════════════════════════════════════════════════════════════
# WEEK 1: DATA NORMALIZATION ENGINE
# Normalizes raw SIEM alert payloads into a standard schema
# Handles different timestamp formats, extracts IPs, classifies alert type
# ═══════════════════════════════════════════════════════════════════

IP_PATTERN = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b"
)

ATTACK_TYPE_KEYWORDS = {
    "brute_force":   ["brute", "brute-force", "login attempt", "failed login",
                      "authentication failure", "ssh", "rdp"],
    "malware":       ["malware", "virus", "trojan", "ransomware", "worm",
                      "suspicious file", "payload", "exploit"],
    "port_scan":     ["port scan", "nmap", "scanning", "reconnaissance", "sweep"],
    "ddos":          ["ddos", "dos", "flood", "traffic spike", "bandwidth"],
    "data_exfil":    ["exfiltration", "data leak", "upload", "outbound", "transfer"],
    "phishing":      ["phishing", "spear phish", "credential harvest", "fake login"],
}

def classify_attack(text: str) -> str:
    text_lower = text.lower()
    for attack_type, keywords in ATTACK_TYPE_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            return attack_type
    return "unknown"

def extract_ips(text: str) -> list[str]:
    found = IP_PATTERN.findall(text)
    # Filter out private/loopback IPs for enrichment purposes
    public = []
    for ip in found:
        try:
            obj = ipaddress.ip_address(ip)
            if not (obj.is_private or obj.is_loopback or obj.is_reserved):
                public.append(ip)
        except ValueError:
            pass
    return list(set(public)) or found  # fallback: return all if none public

def normalize_timestamp(raw: str | None) -> str:
    if not raw:
        return datetime.now(timezone.utc).isoformat()
    # Try multiple formats
    formats = [
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%d %H:%M:%S",
        "%d/%m/%Y %H:%M:%S",
        "%m/%d/%Y %H:%M:%S",
        "%Y%m%dT%H%M%SZ",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(raw, fmt)
            return dt.replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            continue
    return datetime.now(timezone.utc).isoformat()

def normalize_alert(raw: dict) -> dict:
    """Week 1: Convert any raw SIEM alert format to standard schema."""
    description = (
        raw.get("description") or
        raw.get("message") or
        raw.get("alert_message") or
        raw.get("event_description") or
        "No description provided"
    )
    raw_ips = (
        raw.get("source_ip") or
        raw.get("src_ip") or
        raw.get("attacker_ip") or
        raw.get("ip") or ""
    )
    if isinstance(raw_ips, str) and raw_ips:
        all_ips = [raw_ips] + extract_ips(description)
    else:
        all_ips = extract_ips(description)

    severity_raw = str(
        raw.get("severity") or raw.get("priority") or raw.get("level") or "medium"
    ).lower()
    severity_map = {
        "critical": "critical", "high": "high", "medium": "medium",
        "low": "low", "info": "info", "informational": "info",
        "1": "critical", "2": "high", "3": "medium", "4": "low", "5": "info",
    }
    severity = severity_map.get(severity_raw, "medium")

    return {
        "case_id": str(uuid.uuid4())[:8].upper(),
        "alert_type": classify_attack(description),
        "description": description,
        "source_ips": list(set(all_ips)),
        "severity": severity,
        "timestamp": normalize_timestamp(raw.get("timestamp") or raw.get("time")),
        "raw_alert": raw,
        "host": raw.get("host") or raw.get("hostname") or raw.get("target") or "unknown",
        "siem_source": raw.get("source") or raw.get("siem") or "SIEM",
    }


# ═══════════════════════════════════════════════════════════════════
# WEEK 2: THREAT INTELLIGENCE ENRICHMENT ENGINE
# Simulates AbuseIPDB + VirusTotal lookups
# Returns reputation score, geolocation, known threat actor tags
# ═══════════════════════════════════════════════════════════════════

# Simulated threat intelligence database
THREAT_DB = {
    "45.33.32.156":   {"score": 95, "country": "US", "isp": "Linode LLC",
                       "tags": ["scanner", "known_bad"], "reports": 847},
    "185.220.101.45": {"score": 98, "country": "DE", "isp": "Tor Exit Node",
                       "tags": ["tor_exit", "anonymizer"], "reports": 1203},
    "198.199.82.211": {"score": 72, "country": "US", "isp": "DigitalOcean",
                       "tags": ["brute_force"], "reports": 341},
    "103.21.244.0":   {"score": 88, "country": "CN", "isp": "Cloudflare CDN",
                       "tags": ["ddos", "scanner"], "reports": 562},
    "91.108.4.1":     {"score": 90, "country": "RU", "isp": "Unknown ISP",
                       "tags": ["malware_c2", "ransomware"], "reports": 934},
}

COUNTRY_NAMES = {
    "US": "United States", "DE": "Germany", "CN": "China",
    "RU": "Russia", "IN": "India", "BR": "Brazil", "NL": "Netherlands",
}

def enrich_ip(ip: str) -> dict:
    """Week 2: Enrich an IP with threat intelligence data."""
    if ip in THREAT_DB:
        data = THREAT_DB[ip]
        return {
            "ip": ip,
            "reputation_score": data["score"],
            "country_code": data["country"],
            "country_name": COUNTRY_NAMES.get(data["country"], data["country"]),
            "isp": data["isp"],
            "threat_tags": data["tags"],
            "abuse_reports": data["reports"],
            "is_known_bad": data["score"] >= 75,
            "source": "AbuseIPDB (simulated)",
        }
    # For unknown IPs — generate plausible simulated data
    countries = ["US", "DE", "CN", "RU", "NL", "BR", "IN"]
    isps = ["DigitalOcean LLC", "Amazon AWS", "Google Cloud",
            "Microsoft Azure", "OVH SAS", "Hetzner Online"]
    score = random.randint(10, 85)
    country = random.choice(countries)
    return {
        "ip": ip,
        "reputation_score": score,
        "country_code": country,
        "country_name": COUNTRY_NAMES.get(country, country),
        "isp": random.choice(isps),
        "threat_tags": ["scanner"] if score > 50 else [],
        "abuse_reports": random.randint(0, 200),
        "is_known_bad": score >= 75,
        "source": "AbuseIPDB (simulated)",
    }

def calculate_risk_score(alert: dict, enrichments: list[dict]) -> int:
    """Week 2: Calculate overall risk score from alert severity + IP reputation."""
    base = {
        "critical": 90, "high": 70, "medium": 50, "low": 25, "info": 10
    }.get(alert.get("severity", "medium"), 50)

    if enrichments:
        max_ip_score = max((e.get("reputation_score", 0) for e in enrichments), default=0)
        risk = int((base * 0.5) + (max_ip_score * 0.5))
    else:
        risk = base

    # Boost risk for dangerous attack types
    if alert.get("alert_type") in ("malware", "data_exfil", "ransomware"):
        risk = min(100, risk + 15)

    return min(100, risk)


# ═══════════════════════════════════════════════════════════════════
# WEEK 3: PLAYBOOK AUTOMATION ENGINE
# Executes defensive playbooks based on risk score and alert type
# Mock EDR isolation + Mock AWS Security Group firewall block
# ═══════════════════════════════════════════════════════════════════

def run_playbook(case: dict, user: dict) -> list[dict]:
    """
    Week 3: Execute automated containment playbook.
    Returns list of actions taken with timestamps.
    """
    actions = []
    risk = case.get("risk_score", 0)
    alert_type = case.get("alert_type", "unknown")
    ips = case.get("source_ips", [])
    host = case.get("host", "unknown")
    now = datetime.now(timezone.utc).isoformat()

    def log_action(action_type: str, target: str, result: str, impact: str):
        entry = {
            "action_id": str(uuid.uuid4())[:8].upper(),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action_type": action_type,
            "target": target,
            "result": result,
            "impact": impact,
            "executed_by": f"SOAR-Auto ({user['username']})",
            "playbook": "auto_containment_v1",
        }
        actions.append(entry)
        action_log.append({"case_id": case["case_id"], **entry})
        return entry

    # ── Step 1: Always log the detection ─────────────────────────
    log_action(
        action_type="ALERT_INGESTED",
        target=case["case_id"],
        result=f"Alert normalized. Type: {alert_type}. Risk score: {risk}/100.",
        impact="none"
    )

    # ── Step 2: Enrich with threat intel ─────────────────────────
    log_action(
        action_type="THREAT_INTEL_LOOKUP",
        target=", ".join(ips) if ips else "no IPs",
        result=f"Reputation scores fetched for {len(ips)} IP(s). "
               f"Max score: {case.get('max_ip_score', 0)}/100.",
        impact="none"
    )

    # ── Step 3: Low risk (< 40) — just alert and monitor ─────────
    if risk < 40:
        log_action(
            action_type="MONITORING_ENABLED",
            target=host,
            result="Risk score below threshold. Enhanced monitoring enabled.",
            impact="low"
        )
        return actions

    # ── Step 4: Medium risk (40–69) — block IPs at firewall ──────
    if 40 <= risk < 70:
        for ip in ips:
            log_action(
                action_type="FIREWALL_BLOCK",
                target=ip,
                result=f"AWS Security Group updated — inbound traffic from {ip} BLOCKED.",
                impact="medium"
            )
        log_action(
            action_type="ANALYST_NOTIFIED",
            target="SOC Team",
            result="Alert ticket created. Analyst assigned for review.",
            impact="low"
        )
        return actions

    # ── Step 5: High risk (70–89) — block IPs + isolate host ─────
    if 70 <= risk < 90:
        for ip in ips:
            log_action(
                action_type="FIREWALL_BLOCK",
                target=ip,
                result=f"AWS Security Group updated — inbound traffic from {ip} BLOCKED.",
                impact="medium"
            )
        log_action(
            action_type="EDR_ISOLATE_HOST",
            target=host,
            result=f"EDR isolation command sent to {host}. "
                   f"Host network access suspended pending investigation.",
            impact="high"
        )
        log_action(
            action_type="SENIOR_ANALYST_NOTIFIED",
            target="Senior SOC Team",
            result="High-severity ticket escalated to senior analyst.",
            impact="low"
        )
        return actions

    # ── Step 6: Critical risk (≥ 90) — full containment ──────────
    for ip in ips:
        log_action(
            action_type="FIREWALL_BLOCK",
            target=ip,
            result=f"CRITICAL: AWS Security Group — {ip} BLOCKED across all ports.",
            impact="high"
        )
    log_action(
        action_type="EDR_ISOLATE_HOST",
        target=host,
        result=f"CRITICAL: Host {host} fully isolated from network via EDR.",
        impact="high"
    )
    if alert_type in ("malware", "data_exfil"):
        log_action(
            action_type="MEMORY_DUMP_TRIGGERED",
            target=host,
            result=f"Forensic memory dump initiated on {host} for IR analysis.",
            impact="high"
        )
    log_action(
        action_type="INCIDENT_ESCALATED",
        target="CISO / IR Team",
        result="CRITICAL incident escalated to CISO and Incident Response team.",
        impact="critical"
    )
    return actions


# ═══════════════════════════════════════════════════════════════════
# FASTAPI APP
# ═══════════════════════════════════════════════════════════════════

app = FastAPI(
    title="SOAR Incident Containment Engine",
    description="Security Orchestration, Automation and Response — Infotact Internship 2026",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ────────────────────────────────────────────────────────

class RawAlertPayload(BaseModel):
    source: Optional[str] = "SIEM"
    description: Optional[str] = None
    message: Optional[str] = None
    alert_message: Optional[str] = None
    severity: Optional[str] = "medium"
    source_ip: Optional[str] = None
    src_ip: Optional[str] = None
    attacker_ip: Optional[str] = None
    host: Optional[str] = "unknown-host"
    timestamp: Optional[str] = None

class CaseStatusUpdate(BaseModel):
    status: str   # open | investigating | contained | closed

class SimulateRequest(BaseModel):
    scenario: str  # brute_force | malware | port_scan | ddos | data_exfil | phishing


# ── Endpoints ─────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "service": "SOAR Incident Containment Engine",
        "status": "running",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": [
            "POST /alert/ingest",
            "POST /alert/simulate",
            "GET  /cases",
            "GET  /cases/{case_id}",
            "PUT  /cases/{case_id}/status",
            "GET  /dashboard/stats",
            "GET  /health",
        ]
    }

@app.get("/health")
def health():
    return {
        "status": "ok",
        "total_cases": len(cases),
        "total_actions_taken": len(action_log),
    }


# ── WEEK 1 + 2 + 3: Main alert ingestion endpoint ────────────────

@app.post("/alert/ingest")
def ingest_alert(
    payload: RawAlertPayload,
    user=Depends(require_permission("ingest_alert"))
):
    """
    Week 1: Receive raw SIEM alert, normalize it.
    Week 2: Enrich source IPs with threat intelligence.
    Week 3: Execute automated containment playbook.
    """
    raw = payload.model_dump(exclude_none=True)

    # Week 1: Normalize
    alert = normalize_alert(raw)

    # Week 2: Enrich IPs
    enrichments = [enrich_ip(ip) for ip in alert["source_ips"]]
    risk_score = calculate_risk_score(alert, enrichments)
    max_ip_score = max((e.get("reputation_score", 0) for e in enrichments), default=0)

    # Build case object
    case_id = alert["case_id"]
    case = {
        **alert,
        "risk_score": risk_score,
        "max_ip_score": max_ip_score,
        "enrichments": enrichments,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "actions": [],
        "assigned_to": user["username"],
    }

    # Week 3: Run playbook
    playbook_actions = run_playbook(case, user)
    case["actions"] = playbook_actions

    # Determine containment status from actions taken
    action_types = [a["action_type"] for a in playbook_actions]
    if "EDR_ISOLATE_HOST" in action_types:
        case["status"] = "contained"
    elif "FIREWALL_BLOCK" in action_types:
        case["status"] = "investigating"

    cases[case_id] = case

    return {
        "case_id": case_id,
        "alert_type": case["alert_type"],
        "severity": case["severity"],
        "risk_score": risk_score,
        "source_ips": case["source_ips"],
        "enrichments": enrichments,
        "status": case["status"],
        "playbook_actions": playbook_actions,
        "mttr_seconds": len(playbook_actions) * 0.3,  # simulated sub-5-sec MTTR
        "message": f"Alert processed. {len(playbook_actions)} automated actions executed."
    }


# ── WEEK 1: Simulate pre-built SIEM scenarios ─────────────────────

SIMULATED_SCENARIOS = {
    "brute_force": {
        "source": "Splunk SIEM",
        "description": "Multiple failed SSH login attempts detected from external IP. "
                       "127 failed authentication failures in 60 seconds from 185.220.101.45.",
        "severity": "high",
        "source_ip": "185.220.101.45",
        "host": "web-server-01",
        "timestamp": "2026-07-11T08:00:00Z",
    },
    "malware": {
        "source": "CrowdStrike EDR",
        "description": "Suspicious file execution detected. Ransomware payload identified "
                       "on endpoint. C2 beacon to 91.108.4.1 detected.",
        "severity": "critical",
        "source_ip": "91.108.4.1",
        "host": "workstation-finance-04",
        "timestamp": "2026-07-11T09:15:00Z",
    },
    "port_scan": {
        "source": "Snort IDS",
        "description": "Port scanning reconnaissance activity detected. "
                       "SYN sweep from 45.33.32.156 across 1024 ports.",
        "severity": "medium",
        "source_ip": "45.33.32.156",
        "host": "firewall-edge-01",
        "timestamp": "2026-07-11T10:30:00Z",
    },
    "ddos": {
        "source": "AWS GuardDuty",
        "description": "Volumetric DDoS attack detected. Traffic flood from "
                       "103.21.244.0 exceeding 10Gbps threshold.",
        "severity": "critical",
        "source_ip": "103.21.244.0",
        "host": "load-balancer-01",
        "timestamp": "2026-07-11T11:45:00Z",
    },
    "data_exfil": {
        "source": "Darktrace",
        "description": "Unusual outbound data transfer detected. Potential data "
                       "exfiltration to external IP 198.199.82.211. 4.2GB uploaded.",
        "severity": "critical",
        "source_ip": "198.199.82.211",
        "host": "db-server-prod-02",
        "timestamp": "2026-07-11T13:00:00Z",
    },
    "phishing": {
        "source": "Microsoft Defender",
        "description": "Phishing email detected. Credential harvesting link clicked "
                       "by user. External connection to 185.220.101.45 initiated.",
        "severity": "high",
        "source_ip": "185.220.101.45",
        "host": "laptop-hr-08",
        "timestamp": "2026-07-11T14:20:00Z",
    },
}

@app.post("/alert/simulate")
def simulate_alert(
    payload: SimulateRequest,
    user=Depends(require_permission("ingest_alert"))
):
    """Week 1: Inject a pre-built simulated SIEM scenario for testing."""
    scenario = SIMULATED_SCENARIOS.get(payload.scenario)
    if not scenario:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown scenario. Choose from: {list(SIMULATED_SCENARIOS.keys())}"
        )
    raw = normalize_alert(scenario)
    enrichments = [enrich_ip(ip) for ip in raw["source_ips"]]
    risk_score = calculate_risk_score(raw, enrichments)
    max_ip_score = max((e.get("reputation_score", 0) for e in enrichments), default=0)

    case_id = raw["case_id"]
    case = {
        **raw,
        "risk_score": risk_score,
        "max_ip_score": max_ip_score,
        "enrichments": enrichments,
        "status": "open",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "actions": [],
        "assigned_to": user["username"],
    }
    playbook_actions = run_playbook(case, user)
    case["actions"] = playbook_actions

    action_types = [a["action_type"] for a in playbook_actions]
    if "EDR_ISOLATE_HOST" in action_types:
        case["status"] = "contained"
    elif "FIREWALL_BLOCK" in action_types:
        case["status"] = "investigating"

    cases[case_id] = case

    return {
        "case_id": case_id,
        "scenario": payload.scenario,
        "alert_type": case["alert_type"],
        "severity": case["severity"],
        "risk_score": risk_score,
        "source_ips": case["source_ips"],
        "enrichments": enrichments,
        "status": case["status"],
        "playbook_actions": playbook_actions,
        "mttr_seconds": round(len(playbook_actions) * 0.3, 2),
        "message": f"Scenario '{payload.scenario}' processed. "
                   f"{len(playbook_actions)} automated actions executed."
    }


# ── WEEK 4: Case Management ───────────────────────────────────────

@app.get("/cases")
def list_cases(user=Depends(require_permission("view_cases"))):
    """Week 4: List all cases with summary info."""
    result = []
    for cid, c in cases.items():
        result.append({
            "case_id": cid,
            "alert_type": c["alert_type"],
            "severity": c["severity"],
            "risk_score": c["risk_score"],
            "status": c["status"],
            "source_ips": c["source_ips"],
            "host": c["host"],
            "created_at": c["created_at"],
            "action_count": len(c.get("actions", [])),
            "assigned_to": c.get("assigned_to", "unassigned"),
        })
    # newest first
    result.sort(key=lambda x: x["created_at"], reverse=True)
    return {"total": len(result), "cases": result}


@app.get("/cases/{case_id}")
def get_case(case_id: str, user=Depends(require_permission("view_cases"))):
    """Week 4: Get full case detail including timeline of actions."""
    case = cases.get(case_id.upper())
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found.")
    return case


@app.put("/cases/{case_id}/status")
def update_case_status(
    case_id: str,
    body: CaseStatusUpdate,
    user=Depends(require_permission("close_case"))
):
    """Week 4: Update case status. Requires senior_analyst or admin role."""
    case = cases.get(case_id.upper())
    if not case:
        raise HTTPException(status_code=404, detail=f"Case {case_id} not found.")
    valid = ["open", "investigating", "contained", "closed"]
    if body.status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid}")
    case["status"] = body.status
    case["updated_at"] = datetime.now(timezone.utc).isoformat()
    case["updated_by"] = user["username"]
    return {"case_id": case_id, "status": body.status, "updated_by": user["username"]}


# ── WEEK 4: Dashboard Statistics ──────────────────────────────────

@app.get("/dashboard/stats")
def dashboard_stats(user=Depends(require_permission("view_cases"))):
    """Week 4: Aggregated statistics for the dashboard."""
    total = len(cases)
    if total == 0:
        return {
            "total_cases": 0,
            "total_actions": 0,
            "by_severity": {},
            "by_status": {},
            "by_type": {},
            "avg_risk_score": 0,
            "avg_actions_per_case": 0,
            "cases_contained": 0,
            "containment_rate_pct": 0,
        }

    by_severity: dict[str, int] = {}
    by_status: dict[str, int] = {}
    by_type: dict[str, int] = {}
    total_risk = 0
    total_actions = 0
    contained = 0

    for c in cases.values():
        sev = c.get("severity", "unknown")
        by_severity[sev] = by_severity.get(sev, 0) + 1

        st = c.get("status", "unknown")
        by_status[st] = by_status.get(st, 0) + 1
        if st == "contained":
            contained += 1

        at = c.get("alert_type", "unknown")
        by_type[at] = by_type.get(at, 0) + 1

        total_risk += c.get("risk_score", 0)
        total_actions += len(c.get("actions", []))

    return {
        "total_cases": total,
        "total_actions": total_actions,
        "by_severity": by_severity,
        "by_status": by_status,
        "by_type": by_type,
        "avg_risk_score": round(total_risk / total, 1),
        "avg_actions_per_case": round(total_actions / total, 1),
        "cases_contained": contained,
        "containment_rate_pct": round((contained / total) * 100, 1),
        "avg_mttr_seconds": round((total_actions / total) * 0.3, 2),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
