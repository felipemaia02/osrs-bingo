import re
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.players.schemas import RosterEntry

HEX_COLOR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")


class TeamFields(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: str | None = None
    emblem_url: str | None = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("Team name must contain visible content")
        return normalized

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        if not HEX_COLOR_PATTERN.fullmatch(value):
            raise ValueError("Team color must be a six-digit hexadecimal color")
        return value.upper()

    @field_validator("emblem_url")
    @classmethod
    def validate_emblem_url(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        normalized = value.strip()
        if not normalized.startswith(("http://", "https://")):
            raise ValueError("Team emblem URL must use HTTP or HTTPS")
        return normalized


class TeamCreate(TeamFields):
    pass


class TeamUpdate(TeamFields):
    pass


class TeamResponse(TeamFields):
    model_config = ConfigDict(from_attributes=True)

    id: str
    event_id: str
    member_count: int
    created_at: datetime
    updated_at: datetime


class TeamListResponse(BaseModel):
    items: list[TeamResponse]


class TeamBalance(BaseModel):
    team_id: str
    name: str
    color: str | None
    emblem_url: str | None
    player_count: int
    boss_kc_total: int
    # Raids KC apart from boss KC (feature 039).
    raids_kc_total: int = 0
    ehb_total: float
    captain: str | None
    # EHB versus the average per team, in percent (rounded).
    ehb_vs_average: int
    players_short: int
    balanced: bool


class DraftCaptain(BaseModel):
    team_id: str
    team_name: str
    color: str | None
    emblem_url: str | None
    captain: str | None
    captain_ehb: float | None


class DraftPreviewResponse(BaseModel):
    """Captains per team and approved players still without a team (feature 024)."""

    captains: list[DraftCaptain]
    players: list[RosterEntry]


class TeamBalanceResponse(BaseModel):
    average_ehb: float
    teams: list[TeamBalance]


def utc_now() -> datetime:
    return datetime.now(UTC)
