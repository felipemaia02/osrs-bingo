import re
from datetime import datetime
from enum import StrEnum
from zoneinfo import available_timezones

from pydantic import BaseModel, ConfigDict, Field, field_validator

RSN_MAX_LENGTH = 12
# Raw input may carry extra spaces; the cleaned name must fit RSN_MAX_LENGTH.
RSN_INPUT_MAX_LENGTH = 32
RSN_PATTERN = re.compile(rf"^[A-Za-z0-9 _-]{{1,{RSN_MAX_LENGTH}}}$")
MAX_ACCOUNTS = 10
TIMEZONES = frozenset(available_timezones())
MEMBER_SEARCH_MIN_LENGTH = 2
MEMBER_SEARCH_MAX_LENGTH = 40
MEMBER_SEARCH_LIMIT = 10
COMBAT_SKILLS = ("attack", "strength", "defence", "hitpoints", "ranged", "prayer", "magic")


class Activity(StrEnum):
    UNDER_1H = "under_1h"
    ONE_TO_THREE_H = "one_to_three_h"
    OVER_3H = "over_3h"


class WomStatus(StrEnum):
    FOUND = "found"
    NOT_FOUND = "not_found"
    UNAVAILABLE = "unavailable"


def normalize_rsn(rsn: str) -> str:
    """OSRS treats spaces, underscores and hyphens alike and ignores case."""
    return re.sub(r"[ _-]+", " ", rsn).strip().casefold()


class AccountAdd(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rsn: str = Field(min_length=1, max_length=RSN_INPUT_MAX_LENGTH)

    @field_validator("rsn")
    @classmethod
    def valid_rsn(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not RSN_PATTERN.fullmatch(cleaned):
            raise ValueError("Use 1-12 letters, numbers, spaces, - or _")
        return cleaned


class Preferences(BaseModel):
    model_config = ConfigDict(extra="forbid")

    timezone: str | None = None
    activity: Activity | None = None

    @field_validator("timezone")
    @classmethod
    def known_timezone(cls, value: str | None) -> str | None:
        if value is not None and value not in TIMEZONES:
            raise ValueError("Unknown time zone")
        return value


class WikiSyncStatus(StrEnum):
    FOUND = "found"
    NOT_FOUND = "not_found"
    UNAVAILABLE = "unavailable"


class DiaryRegion(BaseModel):
    region: str
    easy: bool
    medium: bool
    hard: bool
    elite: bool


class WikiSyncResponse(BaseModel):
    """Quests and achievement diaries from the WikiSync plugin (feature 034)."""

    status: WikiSyncStatus
    quest_points: int | None = None
    quests_completed: int | None = None
    quests_total: int | None = None
    hard_diaries: int | None = None
    diaries: list[DiaryRegion] = Field(default_factory=list)
    checked_at: datetime | None = None


class AccountResponse(BaseModel):
    id: str
    rsn: str
    is_main: bool
    wom_status: WomStatus
    total_level: int | None
    ehp: float | None
    ehb: float | None
    boss_kc: int | None
    combat: dict[str, int] | None
    # Every skill level from WOM (feature 032); None until the account is read again.
    skills: dict[str, int] | None = None
    # Kill count per boss (feature 039); None until the account is read again.
    bosses: dict[str, int] | None = None
    # None until the account is read again after feature 034.
    wikisync: WikiSyncResponse | None = None
    wom_updated_at: datetime | None
    checked_at: datetime | None
    wom_url: str


class BalanceTotals(BaseModel):
    # Without excluded bosses and raids (feature 039).
    boss_kc: int
    raids_kc: int = 0
    ehb: float
    counted: int
    total: int
    not_found: list[str]


class ProfileResponse(BaseModel):
    discord_id: str
    username: str
    timezone: str | None
    activity: Activity | None
    accounts: list[AccountResponse]
    totals: BalanceTotals


class MemberResponse(BaseModel):
    """A clan member for the preferred-teammates search (feature 022)."""

    user_id: str
    username: str
    main_rsn: str | None
