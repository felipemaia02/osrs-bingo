from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.profiles.schemas import Activity

OBJECT_ID_PATTERN = r"^[0-9a-fA-F]{24}$"
MAX_TEAMMATES = 3


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


class BuyInStatus(StrEnum):
    """Extensible on purpose (design decision 4); admins change it in feature 023."""

    PENDING = "pending"
    PAID = "paid"


class JoinRequest(BaseModel):
    """A player's request to join a draft event (feature 022)."""

    model_config = ConfigDict(extra="forbid")

    account_id: str = Field(pattern=OBJECT_ID_PATTERN)
    activity: Activity | None = None
    teammate_ids: list[Annotated[str, Field(pattern=OBJECT_ID_PATTERN)]] = Field(
        default_factory=list, max_length=MAX_TEAMMATES
    )
    accept_rules: Literal[True]
    accept_drop_account: Literal[True]
    accept_team: Literal[True]

    @field_validator("teammate_ids")
    @classmethod
    def distinct_teammates(cls, value: list[str]) -> list[str]:
        if len({item.lower() for item in value}) != len(value):
            raise ValueError("Pick each teammate only once")
        return value


class PlayerUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    team_id: str | None


class PlayerResponse(PlayerFields):
    model_config = ConfigDict(from_attributes=True)

    id: str
    discord_username: str | None = None
    # None for registrations made before feature 022 (typed nickname).
    account_id: str | None = None
    activity: Activity | None = None
    buy_in_status: BuyInStatus | None = None
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


MAX_SELECTION = 25


class PlayerSelection(BaseModel):
    """Registrations chosen on one roster page (at most one page of 25)."""

    model_config = ConfigDict(extra="forbid")

    player_ids: list[Annotated[str, Field(pattern=OBJECT_ID_PATTERN)]] = Field(
        min_length=1, max_length=MAX_SELECTION
    )

    @field_validator("player_ids")
    @classmethod
    def unique_ids(cls, value: list[str]) -> list[str]:
        if len({player_id.lower() for player_id in value}) != len(value):
            raise ValueError("Each registration can be selected only once")
        return value


class SelectionResult(BaseModel):
    changed: int
    skipped: int


class ApprovalResponse(BaseModel):
    approved_count: int
