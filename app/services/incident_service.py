from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from .. import models
from .audit_service import create_event


AUTO_INCIDENT_SCORE_THRESHOLD = 75


def create_incident(
    db: Session,
    *,
    title: str,
    description: str,
    severity: str,
    status: str = "open",
    assignee: str | None = None,
    alert_id: int | None = None,
    actor: str = "system",
    metadata: dict[str, Any] | None = None,
) -> models.Incident:
    now = _utc_now()
    incident = models.Incident(
        title=title,
        description=description,
        severity=severity,
        status=status,
        assignee=assignee,
        closed_at=now if status in {"resolved", "closed"} else None,
    )
    db.add(incident)
    db.flush()
    create_event(
        db,
        event_type="INCIDENT_CREATED",
        description=f"Incident {incident.id} created",
        alert_id=alert_id,
        incident_id=incident.id,
        actor=actor,
        metadata=metadata or {"severity": severity, "status": status},
    )
    return incident


def update_incident(
    db: Session,
    incident: models.Incident,
    updates: dict[str, Any],
    *,
    actor: str = "system",
) -> models.Incident:
    changed: dict[str, dict[str, Any]] = {}
    for field, value in updates.items():
        if value is None:
            continue
        previous = getattr(incident, field)
        if previous == value:
            continue
        setattr(incident, field, value)
        changed[field] = {"from": previous, "to": value}

    if "status" in changed:
        if incident.status in {"resolved", "closed"} and incident.closed_at is None:
            incident.closed_at = _utc_now()
            changed["closed_at"] = {"from": None, "to": incident.closed_at}
        elif incident.status not in {"resolved", "closed"}:
            incident.closed_at = None

    if changed:
        incident.updated_at = _utc_now()
        create_event(
            db,
            event_type="INCIDENT_UPDATED",
            description=f"Incident {incident.id} updated",
            incident_id=incident.id,
            actor=actor,
            metadata={"changes": changed},
        )
    return incident


def associate_alert(
    db: Session,
    incident: models.Incident,
    alert: models.Alert,
    *,
    actor: str = "system",
) -> models.Alert:
    previous_incident_id = alert.incident_id
    alert.incident_id = incident.id
    alert.updated_at = _utc_now()
    create_event(
        db,
        event_type="ALERT_ASSOCIATED",
        description=f"Alert {alert.id} associated with incident {incident.id}",
        alert_id=alert.id,
        incident_id=incident.id,
        actor=actor,
        metadata={
            "previous_incident_id": previous_incident_id,
            "incident_id": incident.id,
        },
    )
    return alert


def get_or_create_auto_incident_for_alert(
    db: Session,
    alert: models.Alert,
    *,
    risk_score: int,
    risk_level: str,
    force: bool = False,
    actor: str = "system",
) -> models.Incident | None:
    if not force and risk_score < AUTO_INCIDENT_SCORE_THRESHOLD:
        return None

    if alert.incident_id:
        return db.query(models.Incident).filter(models.Incident.id == alert.incident_id).first()

    if alert.duplicate_of_alert_id:
        original_alert = (
            db.query(models.Alert)
            .filter(models.Alert.id == alert.duplicate_of_alert_id)
            .first()
        )
        if original_alert and original_alert.incident_id:
            incident = (
                db.query(models.Incident)
                .filter(models.Incident.id == original_alert.incident_id)
                .first()
            )
            if incident:
                associate_alert(db, incident, alert, actor=actor)
                return incident

    incident = create_incident(
        db,
        title=f"{risk_level} incident for alert {alert.id}: {alert.title}",
        description=(
            "Automatically created from a high-risk alert after enrichment and "
            "SIMULATED playbook execution. No real containment action was performed."
        ),
        severity=alert.severity,
        status="open",
        assignee=None,
        alert_id=alert.id,
        actor=actor,
        metadata={
            "alert_id": alert.id,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "auto_created": True,
        },
    )
    associate_alert(db, incident, alert, actor=actor)
    return incident


def _utc_now():
    return datetime.now(timezone.utc)
