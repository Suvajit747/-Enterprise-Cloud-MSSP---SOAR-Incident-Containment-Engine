from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, JSON, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


def utc_now():
    return datetime.now(timezone.utc)


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = (
        Index("ix_alerts_status_created_at", "status", "created_at"),
        Index("ix_alerts_severity_created_at", "severity", "created_at"),
        Index("ix_alerts_source_created_at", "source", "created_at"),
        Index("ix_alerts_created_at", "created_at"),
        Index("ix_alerts_fingerprint", "fingerprint"),
        Index("ix_alerts_incident_id", "incident_id"),
    )

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, default="new", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=True)
    fingerprint = Column(String, nullable=True)
    duplicate_of_alert_id = Column(
        Integer,
        ForeignKey("alerts.id", ondelete="SET NULL"),
        nullable=True,
    )
    incident_id = Column(
        Integer,
        ForeignKey("incidents.id", ondelete="SET NULL"),
        nullable=True,
    )

    incident = relationship("Incident", back_populates="alerts")
    duplicate_of = relationship("Alert", remote_side=[id], uselist=False)
    audit_events = relationship(
        "AuditEvent",
        back_populates="alert",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    playbook_executions = relationship(
        "PlaybookExecution",
        back_populates="alert",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Incident(Base):
    __tablename__ = "incidents"
    __table_args__ = (
        Index("ix_incidents_status_created_at", "status", "created_at"),
        Index("ix_incidents_severity_created_at", "severity", "created_at"),
        Index("ix_incidents_assignee", "assignee"),
    )

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    status = Column(String, default="open", nullable=False)
    assignee = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    alerts = relationship("Alert", back_populates="incident")
    audit_events = relationship("AuditEvent", back_populates="incident")
    playbook_executions = relationship("PlaybookExecution", back_populates="incident")


class AuditEvent(Base):
    __tablename__ = "audit_events"
    __table_args__ = (
        Index("ix_audit_events_alert_timestamp", "alert_id", "timestamp"),
        Index("ix_audit_events_incident_timestamp", "incident_id", "timestamp"),
        Index("ix_audit_events_event_type", "event_type"),
    )

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(
        Integer,
        ForeignKey("alerts.id", ondelete="CASCADE"),
        nullable=True,
    )
    incident_id = Column(
        Integer,
        ForeignKey("incidents.id", ondelete="SET NULL"),
        nullable=True,
    )
    event_type = Column(String, nullable=False)
    description = Column(String, nullable=False)
    actor = Column(String, default="system", nullable=False)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    event_metadata = Column("metadata", JSON, default=dict, nullable=False)

    alert = relationship("Alert", back_populates="audit_events")
    incident = relationship("Incident", back_populates="audit_events")


class PlaybookExecution(Base):
    __tablename__ = "playbook_executions"
    __table_args__ = (
        Index("ix_playbook_executions_alert_started_at", "alert_id", "started_at"),
        Index("ix_playbook_executions_incident_started_at", "incident_id", "started_at"),
        Index("ix_playbook_executions_status", "status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(
        Integer,
        ForeignKey("alerts.id", ondelete="CASCADE"),
        nullable=False,
    )
    incident_id = Column(
        Integer,
        ForeignKey("incidents.id", ondelete="SET NULL"),
        nullable=True,
    )
    playbook_name = Column(String, nullable=False)
    action = Column(String, nullable=False)
    risk_score = Column(Integer, nullable=False)
    status = Column(String, default="queued", nullable=False)
    started_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(String, nullable=True)
    details = Column(JSON, default=dict, nullable=False)

    alert = relationship("Alert", back_populates="playbook_executions")
    incident = relationship("Incident", back_populates="playbook_executions")
