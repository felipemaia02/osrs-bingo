from datetime import datetime
from typing import NotRequired, TypedDict

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
    wom_updated_at: NotRequired[datetime | None]
    checked_at: NotRequired[datetime | None]


class ProfileDocument(TypedDict):
    _id: ObjectId
    timezone: NotRequired[str | None]
    activity: NotRequired[str | None]
    accounts: list[LinkedAccount]
    created_at: datetime
    updated_at: datetime
