from dataclasses import dataclass
from datetime import datetime
from typing import NotRequired, TypedDict

from bson import ObjectId


class BuyInRecord(TypedDict):
    status: str
    # The admin who received the payment (feature 023).
    admin_id: ObjectId | None
    updated_at: datetime


@dataclass(frozen=True)
class NewRegistration:
    display_name: str
    account_id: str
    activity: str | None
    teammate_ids: list[str]


class PlayerDocument(TypedDict):
    user_id: NotRequired[ObjectId]
    status: NotRequired[str]
    discord_username: NotRequired[str | None]
    _id: ObjectId
    event_id: ObjectId
    team_id: ObjectId | None
    display_name: str
    normalized_display_name: str
    account_id: NotRequired[str]
    activity: NotRequired[str | None]
    teammate_ids: NotRequired[list[ObjectId]]
    agreements_accepted_at: NotRequired[datetime]
    buy_in: NotRequired[BuyInRecord]
    # captain | instructor (feature 023)
    role: NotRequired[str | None]
    created_at: datetime
    updated_at: datetime


class RosterDocument(PlayerDocument, total=False):
    """A roster row with its profile experience and lookups (feature 023)."""

    boss_kc_total: int | None
    ehb_total: float | None
    account_count: int | None
    timezone: str | None
    mate_users: list[dict[str, object]]
    mate_profiles: list[dict[str, object]]
    buy_in_admin: list[dict[str, object]]


class TeamExperience(TypedDict):
    _id: ObjectId
    player_count: int
    boss_kc_total: int
    ehb_total: float
    captains: list[str]
