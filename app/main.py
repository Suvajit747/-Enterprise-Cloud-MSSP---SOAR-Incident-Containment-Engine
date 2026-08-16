import logging
from datetime import datetime, timezone
from time import perf_counter
from typing import Literal
from uuid import uuid4

from fastapi import Body, Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import case, func, or_, text
from sqlalchemy.orm import Session, selectinload

from . import models, schemas
from .config import API_TITLE, API_VERSION
from .database import (
    Base,
    SessionLocal,
    create_missing_indexes,
    engine,
    sync_database_schema,
)
from .logging_config import configure_logging
from .services.audit_service import create_event, to_timeline_response
from .services.incident_service import (
    associate_alert,
    create_incident as create_incident_record,
    update_incident as update_incident_record,
)
from .services.playbook_service import PlaybookExecutionService
from .services.risk_service import create_alert_fingerprint
from .threat_intelligence import ThreatIntelligenceService

configure_logging()
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)
sync_database_schema()
create_missing_indexes()

app = FastAPI(title=API_TITLE, version=API_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_http_requests(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid4())
    started_at = perf_counter()
    client_host = request.client.host if request.client else None

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((perf_counter() - started_at) * 1000, 2)
        logger.exception(
            "request_failed",
            extra={
                "event": "request_failed",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": 500,
                "duration_ms": duration_ms,
                "client_ip": client_host,
            },
        )
        raise

    duration_ms = round((perf_counter() - started_at) * 1000, 2)
    logger.info(
        "request_completed",
        extra={
            "event": "request_completed",
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "client_ip": client_host,
        },
    )
    response.headers["X-Request-ID"] = request_id
    return response


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _count_when(condition):
    return func.coalesce(func.sum(case((condition, 1), else_=0)), 0)


def _utc_now():
    return datetime.now(timezone.utc)


def _get_alert_or_404(db: Session, alert_id: int):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


def _get_incident_or_404(db: Session, incident_id: int):
    incident = (
        db.query(models.Incident)
        .options(selectinload(models.Incident.alerts))
        .filter(models.Incident.id == incident_id)
        .first()
    )
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.get(
    "/health",
    tags=["System"],
    summary="Check API and database health",
)
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception as error:
        logger.exception(
            "database_health_check_failed",
            extra={"event": "database_health_check_failed"},
        )
        raise HTTPException(status_code=500, detail="Database connection failed") from error
    return {
        "status": "healthy",
        "database": "connected",
        "service": API_TITLE,
        "version": API_VERSION,
    }


@app.get(
    "/version",
    tags=["System"],
    summary="Get API version information",
)
def get_version():
    return {
        "application": API_TITLE,
        "version": API_VERSION,
        "api": "v1",
    }


@app.post("/alerts", response_model=schemas.AlertResponse, status_code=201)
def create_alert(alert: schemas.AlertCreate, db: Session = Depends(get_db)):
    alert_data = alert.model_dump()
    fingerprint = create_alert_fingerprint(alert_data)
    duplicate_alert = (
        db.query(models.Alert)
        .filter(models.Alert.fingerprint == fingerprint)
        .order_by(models.Alert.created_at.asc())
        .first()
    )
    if duplicate_alert is None:
        duplicate_alert = (
            db.query(models.Alert)
            .filter(
                models.Alert.source == alert_data["source"],
                models.Alert.severity == alert_data["severity"],
                models.Alert.title == alert_data["title"],
                models.Alert.description == alert_data["description"],
            )
            .order_by(models.Alert.created_at.asc())
            .first()
        )

    db_alert = models.Alert(**alert_data, fingerprint=fingerprint)
    if duplicate_alert:
        db_alert.duplicate_of_alert_id = duplicate_alert.id
        db_alert.incident_id = duplicate_alert.incident_id

    db.add(db_alert)
    db.flush()
    create_event(
        db,
        event_type="ALERT_CREATED",
        description=f"Alert {db_alert.id} created",
        alert_id=db_alert.id,
        incident_id=db_alert.incident_id,
        actor="api",
        metadata={"source": db_alert.source, "severity": db_alert.severity},
    )
    if duplicate_alert:
        create_event(
            db,
            event_type="DUPLICATE_DETECTED",
            description=f"Alert {db_alert.id} duplicates alert {duplicate_alert.id}",
            alert_id=db_alert.id,
            incident_id=db_alert.incident_id,
            actor="api",
            metadata={
                "duplicate_of_alert_id": duplicate_alert.id,
                "linked_incident_id": db_alert.incident_id,
                "fingerprint": fingerprint,
            },
        )
    db.commit()
    db.refresh(db_alert)
    logger.info(
        "alert_created",
        extra={
            "event": "alert_created",
            "alert_id": db_alert.id,
            "duplicate_of_alert_id": db_alert.duplicate_of_alert_id,
            "incident_id": db_alert.incident_id,
        },
    )
    return db_alert


@app.get("/alerts", response_model=list[schemas.AlertResponse])
def get_alerts(
    status: Literal["new", "investigating", "contained", "resolved", "closed"] | None = None,
    severity: Literal["low", "medium", "high", "critical"] | None = None,
    source: str | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(models.Alert)
    if status:
        query = query.filter(models.Alert.status == status)
    if severity:
        query = query.filter(models.Alert.severity == severity)
    if source:
        query = query.filter(models.Alert.source == source)
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                models.Alert.title.ilike(search_pattern),
                models.Alert.description.ilike(search_pattern),
            )
        )
    skip = (page - 1) * limit
    return query.order_by(models.Alert.created_at.desc()).offset(skip).limit(limit).all()


@app.get("/alerts/{alert_id}", response_model=schemas.AlertResponse)
def get_alert(alert_id: int, db: Session = Depends(get_db)):
    return _get_alert_or_404(db, alert_id)


@app.get(
    "/alerts/{id}/enrichment",
    response_model=schemas.ThreatEnrichmentResponse,
    tags=["Threat Intelligence"],
    summary="Get alert threat enrichment",
)
def get_alert_enrichment(id: int, db: Session = Depends(get_db)):
    alert = _get_alert_or_404(db, id)
    threat_service = ThreatIntelligenceService()
    create_event(
        db,
        event_type="ENRICHMENT_STARTED",
        description=f"Threat intelligence enrichment started for alert {id}",
        alert_id=id,
        incident_id=alert.incident_id,
        actor="api",
    )
    virus_total = threat_service.enrich_with_virustotal(alert)
    abuse_ipdb = threat_service.enrich_with_abuseipdb(alert)
    risk_breakdown = threat_service.calculate_risk_breakdown(alert, virus_total, abuse_ipdb)
    risk_score = int(risk_breakdown["final_score"])
    risk_level = str(risk_breakdown["risk_level"])
    create_event(
        db,
        event_type="ENRICHMENT_COMPLETED",
        description=f"Threat intelligence enrichment completed for alert {id}",
        alert_id=id,
        incident_id=alert.incident_id,
        actor="api",
        metadata={
            "virus_total_status": virus_total.get("status"),
            "abuse_ipdb_status": abuse_ipdb.get("status"),
        },
    )
    create_event(
        db,
        event_type="RISK_CALCULATED",
        description=f"Risk score calculated for alert {id}",
        alert_id=id,
        incident_id=alert.incident_id,
        actor="api",
        metadata=risk_breakdown,
    )
    db.commit()
    return {
        "alert_id": id,
        "virus_total": virus_total,
        "abuse_ipdb": abuse_ipdb,
        "risk_level": risk_level,
        "risk_score": risk_score,
        "risk_breakdown": risk_breakdown,
    }


@app.post(
    "/alerts/{id}/execute",
    response_model=schemas.ExecutePlaybookResponse,
    tags=["SOAR Automation"],
    summary="Execute alert playbook",
)
def execute_alert_playbook(id: int, db: Session = Depends(get_db)):
    alert = _get_alert_or_404(db, id)
    service = PlaybookExecutionService()
    response = service.execute_alert(db, alert, actor="api")
    db.commit()
    db.refresh(response["execution"])
    return response


@app.get(
    "/playbooks",
    tags=["SOAR Automation"],
    summary="List available playbooks",
)
def get_playbooks():
    return [
        {"id": 1, "name": "High Risk Malware", "action": "isolate_endpoint"},
        {"id": 2, "name": "Brute Force", "action": "block_ip"},
        {"id": 3, "name": "Medium Severity Incident", "action": "create_incident"},
        {"id": 4, "name": "Low Severity Notification", "action": "notify_admin"},
        {"id": 5, "name": "No Action Required", "action": "no_action"},
    ]


@app.get(
    "/alerts/{id}/timeline",
    response_model=list[schemas.TimelineEventResponse],
    tags=["SOAR Automation"],
    summary="Get alert investigation timeline",
)
def get_alert_timeline(id: int, db: Session = Depends(get_db)):
    _get_alert_or_404(db, id)
    events = (
        db.query(models.AuditEvent)
        .filter(models.AuditEvent.alert_id == id)
        .order_by(models.AuditEvent.timestamp.asc(), models.AuditEvent.id.asc())
        .all()
    )
    return [to_timeline_response(event) for event in events]


@app.delete("/alerts/{id}")
def delete_alert(id: int, db: Session = Depends(get_db)):
    alert = _get_alert_or_404(db, id)
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted successfully"}


@app.patch("/alerts/{id}/status", response_model=schemas.AlertResponse)
def update_alert_status(
    id: int,
    status: Literal["new", "investigating", "contained", "resolved", "closed"] = Body(..., embed=True),
    db: Session = Depends(get_db),
):
    alert = _get_alert_or_404(db, id)
    previous_status = alert.status
    alert.status = status
    alert.updated_at = _utc_now()
    create_event(
        db,
        event_type="STATUS_CHANGED",
        description=f"Alert {id} status changed from {previous_status} to {status}",
        alert_id=id,
        incident_id=alert.incident_id,
        actor="api",
        metadata={"from_status": previous_status, "to_status": status},
    )
    db.commit()
    db.refresh(alert)
    return alert


@app.post("/incidents", response_model=schemas.IncidentResponse, status_code=201)
def create_incident(incident: schemas.IncidentCreate, db: Session = Depends(get_db)):
    db_incident = create_incident_record(
        db,
        title=incident.title,
        description=incident.description,
        severity=incident.severity,
        status=incident.status,
        assignee=incident.assignee,
        actor="api",
    )
    db.commit()
    db.refresh(db_incident)
    return db_incident


@app.get("/incidents", response_model=list[schemas.IncidentResponse])
def get_incidents(
    status: Literal["open", "investigating", "contained", "resolved", "closed"] | None = None,
    severity: Literal["low", "medium", "high", "critical"] | None = None,
    assignee: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(models.Incident).options(selectinload(models.Incident.alerts))
    if status:
        query = query.filter(models.Incident.status == status)
    if severity:
        query = query.filter(models.Incident.severity == severity)
    if assignee:
        query = query.filter(models.Incident.assignee == assignee)
    skip = (page - 1) * limit
    return query.order_by(models.Incident.created_at.desc()).offset(skip).limit(limit).all()


@app.get("/incidents/{incident_id}", response_model=schemas.IncidentResponse)
def get_incident(incident_id: int, db: Session = Depends(get_db)):
    return _get_incident_or_404(db, incident_id)


@app.patch("/incidents/{incident_id}", response_model=schemas.IncidentResponse)
def update_incident(
    incident_id: int,
    incident_update: schemas.IncidentUpdate,
    db: Session = Depends(get_db),
):
    incident = _get_incident_or_404(db, incident_id)
    updates = incident_update.model_dump(exclude_unset=True)
    update_incident_record(db, incident, updates, actor="api")
    db.commit()
    db.refresh(incident)
    return incident


@app.delete("/incidents/{incident_id}")
def delete_incident(incident_id: int, db: Session = Depends(get_db)):
    incident = _get_incident_or_404(db, incident_id)
    for alert in incident.alerts:
        alert.incident_id = None
        alert.updated_at = _utc_now()
    create_event(
        db,
        event_type="INCIDENT_UPDATED",
        description=f"Incident {incident_id} deleted",
        actor="api",
        metadata={"deleted_incident_id": incident_id, "title": incident.title},
    )
    db.delete(incident)
    db.commit()
    return {"message": "Incident deleted successfully"}


@app.post(
    "/incidents/{incident_id}/alerts/{alert_id}",
    response_model=schemas.IncidentResponse,
)
def associate_alert_with_incident(
    incident_id: int,
    alert_id: int,
    db: Session = Depends(get_db),
):
    incident = _get_incident_or_404(db, incident_id)
    alert = _get_alert_or_404(db, alert_id)
    associate_alert(db, incident, alert, actor="api")
    db.commit()
    return _get_incident_or_404(db, incident_id)


@app.get(
    "/playbook-executions",
    response_model=list[schemas.PlaybookExecutionResponse],
)
def get_playbook_executions(
    status: Literal["queued", "running", "completed", "failed", "skipped"] | None = None,
    alert_id: int | None = None,
    incident_id: int | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
):
    query = db.query(models.PlaybookExecution)
    if status:
        query = query.filter(models.PlaybookExecution.status == status)
    if alert_id:
        query = query.filter(models.PlaybookExecution.alert_id == alert_id)
    if incident_id:
        query = query.filter(models.PlaybookExecution.incident_id == incident_id)
    skip = (page - 1) * limit
    return (
        query.order_by(models.PlaybookExecution.started_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@app.get(
    "/alerts/{id}/playbook-executions",
    response_model=list[schemas.PlaybookExecutionResponse],
)
def get_alert_playbook_executions(id: int, db: Session = Depends(get_db)):
    _get_alert_or_404(db, id)
    return (
        db.query(models.PlaybookExecution)
        .filter(models.PlaybookExecution.alert_id == id)
        .order_by(models.PlaybookExecution.started_at.desc())
        .all()
    )


@app.get(
    "/dashboard",
    tags=["Dashboard"],
    summary="Get dashboard metrics",
)
def get_dashboard(db: Session = Depends(get_db)):
    alert_metrics = db.query(
        func.count(models.Alert.id).label("total_alerts"),
        _count_when(models.Alert.status == "new").label("new_alerts"),
        _count_when(models.Alert.status == "investigating").label("investigating"),
        _count_when(models.Alert.status == "contained").label("contained"),
        _count_when(models.Alert.status == "resolved").label("resolved"),
        _count_when(models.Alert.status == "closed").label("closed"),
        _count_when(models.Alert.severity == "critical").label("critical"),
        _count_when(models.Alert.severity == "high").label("high"),
        _count_when(models.Alert.severity == "medium").label("medium"),
        _count_when(models.Alert.severity == "low").label("low"),
        _count_when(models.Alert.status.in_(["contained", "resolved", "closed"])).label(
            "automation_completed"
        ),
        _count_when(models.Alert.severity.in_(["critical", "high"])).label(
            "high_risk_alerts"
        ),
    ).one()
    incident_metrics = db.query(
        func.count(models.Incident.id).label("total_incidents"),
        _count_when(models.Incident.status.in_(["open", "investigating", "contained"])).label(
            "open_incidents"
        ),
    ).one()
    execution_metrics = db.query(
        func.count(models.PlaybookExecution.id).label("playbooks_executed"),
        _count_when(models.PlaybookExecution.status == "completed").label(
            "successful_playbooks"
        ),
        _count_when(models.PlaybookExecution.status == "failed").label("failed_playbooks"),
    ).one()
    playbooks_executed = int(execution_metrics.playbooks_executed)
    successful_playbooks = int(execution_metrics.successful_playbooks)
    automation_success_rate = (
        round((successful_playbooks / playbooks_executed) * 100, 2)
        if playbooks_executed
        else None
    )
    average_time_to_contain = _calculate_average_transition_seconds(db, {"contained"})
    average_time_to_resolve = _calculate_average_transition_seconds(
        db, {"resolved", "closed"}
    )
    return {
        "total_alerts": int(alert_metrics.total_alerts),
        "new_alerts": int(alert_metrics.new_alerts),
        "investigating": int(alert_metrics.investigating),
        "contained": int(alert_metrics.contained),
        "resolved": int(alert_metrics.resolved),
        "closed": int(alert_metrics.closed),
        "critical": int(alert_metrics.critical),
        "high": int(alert_metrics.high),
        "medium": int(alert_metrics.medium),
        "low": int(alert_metrics.low),
        "automation_completed": int(alert_metrics.automation_completed),
        "high_risk_alerts": int(alert_metrics.high_risk_alerts),
        "playbooks_executed": playbooks_executed,
        "open_incidents": int(incident_metrics.open_incidents),
        "total_incidents": int(incident_metrics.total_incidents),
        "critical_alerts": int(alert_metrics.critical),
        "successful_playbooks": successful_playbooks,
        "failed_playbooks": int(execution_metrics.failed_playbooks),
        "automation_success_rate": automation_success_rate,
        "average_time_to_contain": average_time_to_contain,
        "average_time_to_resolve": average_time_to_resolve,
        "average_time_to_contain_seconds": average_time_to_contain,
        "average_time_to_resolve_seconds": average_time_to_resolve,
    }


@app.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    daily_alerts = (
        db.query(func.date(models.Alert.created_at), func.count(models.Alert.id))
        .group_by(func.date(models.Alert.created_at))
        .order_by(func.date(models.Alert.created_at))
        .all()
    )
    severity_counts = dict(
        db.query(models.Alert.severity, func.count(models.Alert.id))
        .group_by(models.Alert.severity)
        .all()
    )
    status_counts = dict(
        db.query(models.Alert.status, func.count(models.Alert.id))
        .group_by(models.Alert.status)
        .all()
    )
    return {
        "daily_alerts": [
            {"date": alert_date, "count": count}
            for alert_date, count in daily_alerts
        ],
        "alerts_by_severity": {
            "critical": severity_counts.get("critical", 0),
            "high": severity_counts.get("high", 0),
            "medium": severity_counts.get("medium", 0),
            "low": severity_counts.get("low", 0),
        },
        "alerts_by_status": {
            "new": status_counts.get("new", 0),
            "investigating": status_counts.get("investigating", 0),
            "contained": status_counts.get("contained", 0),
            "resolved": status_counts.get("resolved", 0),
            "closed": status_counts.get("closed", 0),
        },
    }


@app.get("/recent-alerts", response_model=list[schemas.AlertResponse])
def get_recent_alerts(db: Session = Depends(get_db)):
    return db.query(models.Alert).order_by(models.Alert.created_at.desc()).limit(10).all()


def _calculate_average_transition_seconds(
    db: Session,
    target_statuses: set[str],
) -> float | None:
    alert_created_at = {
        alert.id: alert.created_at
        for alert in db.query(models.Alert.id, models.Alert.created_at).all()
    }
    incident_created_at = {
        incident.id: incident.created_at
        for incident in db.query(models.Incident.id, models.Incident.created_at).all()
    }
    events = (
        db.query(models.AuditEvent)
        .filter(models.AuditEvent.event_type.in_(["STATUS_CHANGED", "INCIDENT_UPDATED"]))
        .order_by(models.AuditEvent.timestamp.asc(), models.AuditEvent.id.asc())
        .all()
    )

    durations: list[float] = []
    seen_keys: set[tuple[str, int, str]] = set()
    for event in events:
        metadata = event.event_metadata or {}
        if event.event_type == "STATUS_CHANGED":
            to_status = metadata.get("to_status")
            if to_status not in target_statuses or event.alert_id is None:
                continue
            key = ("alert", event.alert_id, to_status)
            start = alert_created_at.get(event.alert_id)
        else:
            status_change = metadata.get("changes", {}).get("status", {})
            to_status = status_change.get("to")
            if to_status not in target_statuses or event.incident_id is None:
                continue
            key = ("incident", event.incident_id, to_status)
            start = incident_created_at.get(event.incident_id)

        if key in seen_keys:
            continue
        duration = _duration_seconds(start, event.timestamp)
        if duration is not None:
            durations.append(duration)
            seen_keys.add(key)

    if not durations:
        return None
    return round(sum(durations) / len(durations), 2)


def _duration_seconds(start: datetime | None, end: datetime | None) -> float | None:
    if start is None or end is None:
        return None
    start_utc = _as_naive_utc(start)
    end_utc = _as_naive_utc(end)
    return max((end_utc - start_utc).total_seconds(), 0.0)


def _as_naive_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)
