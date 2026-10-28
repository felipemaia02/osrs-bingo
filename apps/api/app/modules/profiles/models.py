from datetime import datetime
from typing import Any, NotRequired, TypedDict

from bson import ObjectId


class LinkedAccount(TypedDict):
    id: str
    rsn: str
    normalized: str
    is_main: bool
    wom_status: str
    total_level: NotRequired[int | None]
    ehp: NotRequired[float | None]
    ehb: NotRequired[float | None]
    boss_kc: NotRequired[int | None]
    combat: NotRequired[dict[str, int] | None]
    skills: NotRequired[dict[str, int] | None]
    # Kill count per boss (feature 039); None until the account is read again.
    bosses: NotRequired[dict[str, int] | None]
    # WikiSync quests and diaries (feature 034); see profiles.wikisync.stored().
    wikisync: NotRequired[dict[str, Any] | None]
    wom_updated_at: NotRequired[datetime | None]
    checked_at: NotRequired[datetime | None]


class ProfileDocument(TypedDict):
    _id: ObjectId
    timezone: NotRequired[str | None]
    activity: NotRequired[str | None]
    accounts: list[LinkedAccount]
    created_at: datetime
    updated_at: datetime
