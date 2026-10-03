from datetime import datetime
from typing import NotRequired, TypedDict

from bson import ObjectId


class TeamDocument(TypedDict):
    _id: ObjectId
    event_id: ObjectId
    name: str
    normalized_name: str
    color: str | None
    created_at: datetime
    updated_at: datetime
    emblem_url: NotRequired[str | None]
