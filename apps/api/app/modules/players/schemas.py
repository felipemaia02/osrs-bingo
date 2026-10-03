from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RegistrationStatus(StrEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REMOVED = "removed"


class PlayerFields(BaseModel):
    display_name: str = Field(min_length=1, max_length=12)

    @field_validator("display_name", mode="before")
    @classmethod
    def normalize_display_name(cls, value: str) -> str:
        if not isinstance(value, str):
            raise ValueError("Player name must be text")
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("Player name must contain visible content")
        return normalized


class PlayerCreate(PlayerFields):
    model_config = ConfigDict(extra="forbid")


class PlayerUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    team_id: str | None


class PlayerResponse(PlayerFields):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: RegistrationStatus
    event_id: str
    team_id: str | None
    created_at: datetime
    updated_at: datetime


class PlayerListResponse(BaseModel):
    items: list[PlayerResponse]


class ApprovalResponse(BaseModel):
    approved_count: int
