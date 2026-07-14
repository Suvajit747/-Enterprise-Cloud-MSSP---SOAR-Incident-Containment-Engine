from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class AlertCreate(BaseModel):
    source: str = Field(..., min_length=1, max_length=100)
    severity: Literal["low", "medium", "high", "critical"]
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

    model_config = {"from_attributes": True}
