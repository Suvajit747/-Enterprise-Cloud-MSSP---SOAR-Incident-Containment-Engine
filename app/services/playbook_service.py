from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from .. import models
from ..playbook import PlaybookEngine
from ..threat_intelligence import ThreatIntelligenceService
from .audit_service import create_event
from .incident_service import get_or_create_auto_incident_for_alert
from .risk_service import calculate_risk_breakdown


PLAYBOOK_NAMES = {
    "block_ip": "High Risk Network Containment",
    "isolate_endpoint": "High Risk Endpoint Isolation",
    "notify_admin": "Medium Severity Analyst Notification",
    "create_incident": "Incident Tracking",
    "no_action": "No Action Required",
}


class PlaybookExecutionService:
    def __init__(
        self,
        threat_service: ThreatIntelligenceService | None = None,
        playbook_engine: PlaybookEngine | None = None,
    ):
        self.threat_service = threat_service or ThreatIntelligenceService()
        self.playbook_engine = playbook_engine or PlaybookEngine()

    def execute_alert(self, db: Session, alert: models.Alert, *, actor: str = "system"):
        create_event(
            db,
            event_type="ENRICHMENT_STARTED",
            description=f"Threat intelligence enrichment started for alert {alert.id}",
            alert_id=alert.id,
            incident_id=alert.incident_id,
            actor=actor,
        )
        virus_total = self.threat_service.enrich_with_virustotal(alert)
        abuse_ipdb = self.threat_service.enrich_with_abuseipdb(alert)
        create_event(
            db,
            event_type="ENRICHMENT_COMPLETED",
            description=f"Threat intelligence enrichment completed for alert {alert.id}",
            alert_id=alert.id,
            incident_id=alert.incident_id,
            actor=actor,
            metadata={
                "virus_total": _provider_summary(virus_total),
                "abuse_ipdb": _provider_summary(abuse_ipdb),
            },
        )

        risk_breakdown = calculate_risk_breakdown(alert, virus_total, abuse_ipdb)
        risk_score = int(risk_breakdown["final_score"])
        risk_level = str(risk_breakdown["risk_level"])
        create_event(
            db,
            event_type="RISK_CALCULATED",
            description=f"Risk score calculated for alert {alert.id}",
            alert_id=alert.id,
            incident_id=alert.incident_id,
            actor=actor,
            metadata=risk_breakdown,
        )

        action = self.playbook_engine.determine_action(alert, risk_score)
        playbook_name = PLAYBOOK_NAMES.get(action, action.replace("_", " ").title())
        create_event(
            db,
            event_type="PLAYBOOK_SELECTED",
            description=f"Selected playbook '{playbook_name}' for alert {alert.id}",
            alert_id=alert.id,
            incident_id=alert.incident_id,
            actor=actor,
            metadata={"playbook_name": playbook_name, "action": action},
        )

        execution = models.PlaybookExecution(
            alert_id=alert.id,
            incident_id=alert.incident_id,
            playbook_name=playbook_name,
            action=action,
            risk_score=risk_score,
            status="running",
            details={
                "simulated": True,
                "risk_breakdown": risk_breakdown,
                "enrichment": {
                    "virus_total": virus_total,
                    "abuse_ipdb": abuse_ipdb,
                },
            },
        )
        db.add(execution)
        db.flush()

        create_event(
            db,
            event_type="PLAYBOOK_STARTED",
            description=f"SIMULATED playbook execution {execution.id} started",
            alert_id=alert.id,
            incident_id=alert.incident_id,
            actor=actor,
            metadata={
                "execution_id": execution.id,
                "playbook_name": playbook_name,
                "action": action,
                "simulated": True,
            },
        )

        result: dict[str, Any]
        try:
            result = self.playbook_engine.execute_playbook(alert, risk_score)
            execution.status = result.get("status", "completed")
            execution.completed_at = _utc_now()
            execution.details = {
                **(execution.details or {}),
                "playbook_result": result,
                "simulation_note": (
                    "SIMULATED only. No firewall, EDR, cloud, identity, or network "
                    "containment integration was invoked."
                ),
            }
            create_event(
                db,
                event_type="PLAYBOOK_COMPLETED",
                description=f"SIMULATED playbook execution {execution.id} completed",
                alert_id=alert.id,
                incident_id=alert.incident_id,
                actor=actor,
                metadata={
                    "execution_id": execution.id,
                    "status": execution.status,
                    "action": action,
                    "simulated": True,
                },
            )
        except Exception as error:
            result = {
                "alert_id": alert.id,
                "risk_score": risk_score,
                "action": action,
                "status": "failed",
                "message": "SIMULATED playbook execution failed before completion",
                "error": str(error),
                "simulated": True,
            }
            execution.status = "failed"
            execution.completed_at = _utc_now()
            execution.error_message = str(error)
            execution.details = {
                **(execution.details or {}),
                "playbook_result": result,
                "simulation_note": (
                    "SIMULATED only. No firewall, EDR, cloud, identity, or network "
                    "containment integration was invoked."
                ),
            }
            create_event(
                db,
                event_type="PLAYBOOK_FAILED",
                description=f"SIMULATED playbook execution {execution.id} failed",
                alert_id=alert.id,
                incident_id=alert.incident_id,
                actor=actor,
                metadata={
                    "execution_id": execution.id,
                    "action": action,
                    "error": str(error),
                    "simulated": True,
                },
            )

        incident = get_or_create_auto_incident_for_alert(
            db,
            alert,
            risk_score=risk_score,
            risk_level=risk_level,
            force=action == "create_incident",
            actor=actor,
        )
        if incident:
            execution.incident_id = incident.id
            execution.details = {
                **(execution.details or {}),
                "incident_id": incident.id,
            }

        db.flush()
        return {
            "alert_id": alert.id,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "action": action,
            "status": execution.status,
            "execution_id": execution.id,
            "playbook_name": playbook_name,
            "incident_id": execution.incident_id,
            "risk_breakdown": risk_breakdown,
            "enrichment": {
                "virus_total": virus_total,
                "abuse_ipdb": abuse_ipdb,
            },
            "execution": execution,
            "details": execution.details or {},
            "simulated": True,
            "message": result.get("message"),
        }


def _provider_summary(provider_response: dict[str, Any]) -> dict[str, Any]:
    return {
        "provider": provider_response.get("provider"),
        "status": provider_response.get("status"),
        "score": provider_response.get("score"),
        "malicious": provider_response.get("malicious"),
        "error": provider_response.get("error"),
    }


def _utc_now():
    return datetime.now(timezone.utc)
