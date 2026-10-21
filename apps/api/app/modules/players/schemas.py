from datetime import datetime
from enum import StrEnum
from typing import Literal

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


class PlayerListQuery(BaseModel):
    group: Literal["all", "pending", "unassigned", "assigned"] = "all"
    search: str = Field(default="", max_length=80)
    team_id: str | None = Field(default=None, pattern=r"^[0-9a-fA-F]{24}$")
    offset: int = Field(default=0, ge=0, le=1000000)
    limit: int = Field(default=25, ge=1, le=100)


class PlayerCounts(BaseModel):
    pending: int = 0
    unassigned: int = 0
    assigned: int = 0


class PlayerListResponse(BaseModel):
    items: list[PlayerResponse]
    total: int
    offset: int
    limit: int
    counts: PlayerCounts


class ApprovalResponse(BaseModel):
    approved_count: int
