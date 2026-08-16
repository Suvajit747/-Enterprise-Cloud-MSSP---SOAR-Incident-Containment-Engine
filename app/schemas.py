from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


Severity = Literal["low", "medium", "high", "critical"]
AlertStatus = Literal["new", "investigating", "contained", "resolved", "closed"]
IncidentStatus = Literal["open", "investigating", "contained", "resolved", "closed"]
ProviderStatus = Literal["live", "mock", "unavailable"]
RiskLevel = Literal["Low", "Medium", "High", "Critical"]
PlaybookExecutionStatus = Literal["queued", "running", "completed", "failed", "skipped"]


class AlertCreate(BaseModel):
    source: str = Field(..., min_length=1, max_length=100)
    severity: Severity
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)

    @field_validator("title", "description")
    @classmethod
    def validate_not_empty(cls, value: str):
        if not value.strip():
            raise ValueError("Field cannot be empty")
        return value.strip()


class AlertResponse(AlertCreate):
    id: int
    status: str
    created_at: datetime
    updated_at: datetime | None = None
    incident_id: int | None = None
    duplicate_of_alert_id: int | None = None

    model_config = {"from_attributes": True}


class IncidentCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)
    severity: Severity
    status: IncidentStatus = "open"
    assignee: str | None = Field(default=None, max_length=100)

    @field_validator("title", "description", "assignee")
    @classmethod
    def validate_optional_text(cls, value: str | None):
        if value is None:
            return value
        if not value.strip():
            raise ValueError("Field cannot be empty")
        return value.strip()


class IncidentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=2000)
    severity: Severity | None = None
    status: IncidentStatus | None = None
    assignee: str | None = Field(default=None, max_length=100)

    @field_validator("title", "description", "assignee")
    @classmethod
    def validate_optional_text(cls, value: str | None):
        if value is None:
            return value
        if not value.strip():
            raise ValueError("Field cannot be empty")
        return value.strip()


class IncidentResponse(IncidentCreate):
    id: int
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None = None
    alerts: list[AlertResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class AuditEventResponse(BaseModel):
    id: int
    alert_id: int | None = None
    incident_id: int | None = None
    event_type: str
    description: str
    actor: str
    timestamp: datetime
    metadata: dict[str, Any] = Field(default_factory=dict)


class TimelineEventResponse(AuditEventResponse):
    event: str


class ThreatProviderResponse(BaseModel):
    provider: str
    status: ProviderStatus
    score: int
    malicious: bool | None = None
    country: str | None = None
    timestamp: str
    error: str | None = None


class RiskBreakdown(BaseModel):
    base_score: int
    virustotal_modifier: int
    abuseipdb_modifier: int
    raw_score: int
    final_score: int
    risk_level: RiskLevel


class ThreatEnrichmentResponse(BaseModel):
    alert_id: int
    virus_total: ThreatProviderResponse
    abuse_ipdb: ThreatProviderResponse
    risk_level: RiskLevel
    risk_score: int
    risk_breakdown: RiskBreakdown


class PlaybookExecutionResponse(BaseModel):
    id: int
    alert_id: int
    incident_id: int | None = None
    playbook_name: str
    action: str
    risk_score: int
    status: PlaybookExecutionStatus
    started_at: datetime
    completed_at: datetime | None = None
    error_message: str | None = None
    details: dict[str, Any] = Field(default_factory=dict)

    model_config = {"from_attributes": True}


class ExecutePlaybookResponse(BaseModel):
    alert_id: int
    risk_score: int
    risk_level: RiskLevel
    action: str
    status: PlaybookExecutionStatus
    execution_id: int
    playbook_name: str
    incident_id: int | None = None
    risk_breakdown: RiskBreakdown
    enrichment: dict[str, ThreatProviderResponse]
    execution: PlaybookExecutionResponse
    details: dict[str, Any] = Field(default_factory=dict)
    simulated: bool
    message: str | None = None
