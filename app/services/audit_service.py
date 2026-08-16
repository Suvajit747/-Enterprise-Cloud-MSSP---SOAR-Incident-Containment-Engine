from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from .. import models


EVENT_LABELS = {
    "ALERT_CREATED": "Alert Created",
    "STATUS_CHANGED": "Status Changed",
    "ENRICHMENT_STARTED": "Threat Intelligence Started",
    "ENRICHMENT_COMPLETED": "Threat Intelligence Completed",
    "RISK_CALCULATED": "Risk Score Calculated",
    "PLAYBOOK_SELECTED": "Playbook Selected",
    "PLAYBOOK_STARTED": "Playbook Started",
    "PLAYBOOK_COMPLETED": "Playbook Executed",
    "PLAYBOOK_FAILED": "Playbook Failed",
    "INCIDENT_CREATED": "Incident Created",
    "INCIDENT_UPDATED": "Incident Updated",
    "ALERT_ASSOCIATED": "Alert Associated With Incident",
    "DUPLICATE_DETECTED": "Duplicate Alert Detected",
}


def create_event(
    db: Session,
    *,
    event_type: str,
    description: str,
    alert_id: int | None = None,
    incident_id: int | None = None,
    actor: str = "system",
    metadata: dict[str, Any] | None = None,
) -> models.AuditEvent:
    event = models.AuditEvent(
        alert_id=alert_id,
        incident_id=incident_id,
        event_type=event_type,
        description=description,
        actor=actor,
        event_metadata=_json_safe(metadata or {}),
    )
    db.add(event)
    db.flush()
    return event


def event_label(event_type: str) -> str:
    return EVENT_LABELS.get(event_type, event_type.replace("_", " ").title())


def to_timeline_response(event: models.AuditEvent) -> dict[str, Any]:
    return {
        "id": event.id,
        "event": event_label(event.event_type),
        "event_type": event.event_type,
        "description": event.description,
        "actor": event.actor,
        "timestamp": event.timestamp,
        "metadata": event.event_metadata or {},
    }


def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    if isinstance(value, tuple):
        return [_json_safe(item) for item in value]
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return str(value)
