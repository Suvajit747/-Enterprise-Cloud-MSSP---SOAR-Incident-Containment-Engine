import hashlib
import re
from typing import Any


SEVERITY_BASE_SCORES = {
    "critical": 100,
    "high": 75,
    "medium": 50,
    "low": 25,
}


def calculate_risk_breakdown(
    alert,
    virus_total: dict[str, Any],
    abuse_ipdb: dict[str, Any],
) -> dict[str, int | str]:
    base_score = SEVERITY_BASE_SCORES.get(alert.severity, 0)
    virustotal_modifier = 10 if virus_total.get("malicious") is True else 0
    abuseipdb_modifier = 10 if int(abuse_ipdb.get("score", 0) or 0) > 80 else 0
    raw_score = base_score + virustotal_modifier + abuseipdb_modifier
    final_score = min(raw_score, 100)
    return {
        "base_score": base_score,
        "virustotal_modifier": virustotal_modifier,
        "abuseipdb_modifier": abuseipdb_modifier,
        "raw_score": raw_score,
        "final_score": final_score,
        "risk_level": calculate_risk_level(final_score),
    }


def calculate_risk_level(risk_score: int) -> str:
    if risk_score >= 90:
        return "Critical"
    if risk_score >= 75:
        return "High"
    if risk_score >= 50:
        return "Medium"
    return "Low"


def create_alert_fingerprint(alert_data: dict[str, Any]) -> str:
    fingerprint_fields = [
        alert_data.get("source", ""),
        alert_data.get("severity", ""),
        alert_data.get("title", ""),
        alert_data.get("description", ""),
    ]
    normalized = "|".join(_normalize_text(value) for value in fingerprint_fields)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _normalize_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip().lower())
