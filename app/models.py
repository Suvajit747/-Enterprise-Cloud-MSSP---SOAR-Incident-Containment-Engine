from sqlalchemy import Column, DateTime, Index, Integer, String
from sqlalchemy.sql import func

from .database import Base


class Alert(Base):
    __tablename__ = "alerts"
    __table_args__ = (
        Index("ix_alerts_status_created_at", "status", "created_at"),
        Index("ix_alerts_severity_created_at", "severity", "created_at"),
        Index("ix_alerts_source_created_at", "source", "created_at"),
        Index("ix_alerts_created_at", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, default="new", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
