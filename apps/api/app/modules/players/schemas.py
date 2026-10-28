from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.modules.profiles.schemas import Activity, WikiSyncResponse

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


class ParticipantRole(StrEnum):
    CAPTAIN = "captain"
    INSTRUCTOR = "instructor"


class ParticipationUpdate(BaseModel):
    """An admin's change to a participant's role and buy-in (feature 023)."""

    model_config = ConfigDict(extra="forbid")

    role: ParticipantRole | None
    buy_in_status: BuyInStatus
    buy_in_admin_id: str | None = Field(default=None, pattern=OBJECT_ID_PATTERN)

    @model_validator(mode="after")
    def paid_needs_admin(self) -> "ParticipationUpdate":
        if self.buy_in_status == BuyInStatus.PAID and self.buy_in_admin_id is None:
            raise ValueError("Choose the administrator who received the buy-in")
        if self.buy_in_status != BuyInStatus.PAID and self.buy_in_admin_id is not None:
            raise ValueError("Only paid buy-ins have a receiving administrator")
        return self


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
    # Feature 037: requested while the event was active; when the player got their team.
    joined_late: bool = False
    team_assigned_at: datetime | None = None
    status: RegistrationStatus
    event_id: str
    team_id: str | None
    created_at: datetime
    updated_at: datetime


class AccountSnapshot(BaseModel):
    """A linked account's current WOM stats, for the draft preview (feature 024)."""

    id: str
    rsn: str
    is_main: bool
    wom_status: str
    total_level: int | None = None
    combat_level: int | None = None
    combat: dict[str, int] | None = None
    # Every skill level from WOM (feature 032); None until the account is read again.
    skills: dict[str, int] | None = None
    # Quests and diaries from WikiSync (feature 034); None until read again.
    wikisync: WikiSyncResponse | None = None
    ehp: float | None = None
    ehb: float | None = None
    boss_kc: int | None = None


class RosterEntry(PlayerResponse):
    """Admin roster row: the registration plus the player's current profile (feature 023)."""

    role: ParticipantRole | None = None
    # None for nickname registrations (before feature 022).
    boss_kc_total: int | None = None
    ehb_total: float | None = None
    alt_count: int | None = None
    timezone: str | None = None
    teammates: list[str] = Field(default_factory=list)
    buy_in_admin_name: str | None = None
    # The account playing the bingo, then every linked account (main first).
    account: AccountSnapshot | None = None
    accounts: list[AccountSnapshot] = Field(default_factory=list)


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
    items: list[RosterEntry]
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


class TeamAssignmentSelection(PlayerSelection):
    """Several approved players assigned to one team at once (feature 038)."""

    team_id: str = Field(pattern=OBJECT_ID_PATTERN)


class SelectionResult(BaseModel):
    changed: int
    skipped: int


class ApprovalResponse(BaseModel):
    approved_count: int
