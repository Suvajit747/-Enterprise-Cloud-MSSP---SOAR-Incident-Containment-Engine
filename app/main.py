from typing import Literal

from fastapi import Body, Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import case, func, or_, text
from sqlalchemy.orm import Session

from . import models, schemas
from .config import API_TITLE, API_VERSION
from .database import Base, SessionLocal, create_missing_indexes, engine
from .playbook import PlaybookEngine
from .threat_intelligence import ThreatIntelligenceService

Base.metadata.create_all(bind=engine)
create_missing_indexes()

app = FastAPI(title=API_TITLE, version=API_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _count_when(condition):
    return func.coalesce(func.sum(case((condition, 1), else_=0)), 0)


@app.get(
    "/health",
    tags=["System"],
    summary="Check API and database health",
)
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
    except Exception as error:
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
    db_alert = models.Alert(**alert.model_dump())
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
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
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@app.get(
    "/alerts/{id}/enrichment",
    tags=["Threat Intelligence"],
    summary="Get alert threat enrichment",
)
def get_alert_enrichment(id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == id).first()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    threat_service = ThreatIntelligenceService()
    virus_total = threat_service.enrich_with_virustotal(alert)
    abuse_ipdb = threat_service.enrich_with_abuseipdb(alert)
    risk_score = threat_service.calculate_risk_score(alert, virus_total, abuse_ipdb)
    risk_level = threat_service.calculate_risk_level(risk_score)
    return {
        "alert_id": id,
        "virus_total": virus_total,
        "abuse_ipdb": abuse_ipdb,
        "risk_level": risk_level,
        "risk_score": risk_score,
    }


@app.post(
    "/alerts/{id}/execute",
    tags=["SOAR Automation"],
    summary="Execute alert playbook",
)
def execute_alert_playbook(id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == id).first()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    threat_service = ThreatIntelligenceService()
    virus_total = threat_service.enrich_with_virustotal(alert)
    abuse_ipdb = threat_service.enrich_with_abuseipdb(alert)
    risk_score = threat_service.calculate_risk_score(alert, virus_total, abuse_ipdb)
    playbook_engine = PlaybookEngine()
    playbook_result = playbook_engine.execute_playbook(alert, risk_score)
    return {
        "alert_id": id,
        "risk_score": risk_score,
        "action": playbook_result["action"],
        "status": playbook_result["status"],
    }


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
    tags=["SOAR Automation"],
    summary="Get alert investigation timeline",
)
def get_alert_timeline(id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == id).first()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return [
        {"event": "Alert Created"},
        {"event": "Threat Intelligence Completed"},
        {"event": "Risk Score Calculated"},
        {"event": "Playbook Executed"},
    ]


@app.delete("/alerts/{id}")
def delete_alert(id: int, db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == id).first()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted successfully"}


@app.patch("/alerts/{id}/status", response_model=schemas.AlertResponse)
def update_alert_status(
    id: int,
    status: Literal["new", "investigating", "contained", "resolved", "closed"] = Body(..., embed=True),
    db: Session = Depends(get_db),
):
    alert = db.query(models.Alert).filter(models.Alert.id == id).first()
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.status = status
    db.commit()
    db.refresh(alert)
    return alert


@app.get(
    "/dashboard",
    tags=["Dashboard"],
    summary="Get dashboard metrics",
)
def get_dashboard(db: Session = Depends(get_db)):
    metrics = db.query(
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
    high_risk_alerts = int(metrics.high_risk_alerts)
    playbooks_executed = high_risk_alerts
    return {
        "total_alerts": int(metrics.total_alerts),
        "new_alerts": int(metrics.new_alerts),
        "investigating": int(metrics.investigating),
        "contained": int(metrics.contained),
        "resolved": int(metrics.resolved),
        "closed": int(metrics.closed),
        "critical": int(metrics.critical),
        "high": int(metrics.high),
        "medium": int(metrics.medium),
        "low": int(metrics.low),
        "automation_completed": int(metrics.automation_completed),
        "high_risk_alerts": high_risk_alerts,
        "playbooks_executed": playbooks_executed,
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
