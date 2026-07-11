from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class AlertCreate(BaseModel):
    source: str = Field(..., min_length=1, max_length=100)
    severity: Literal["low", "medium", "high", "critical"]
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=2000)


class AlertResponse(AlertCreate):
    id: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
