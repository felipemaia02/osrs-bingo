from datetime import datetime
from typing import NotRequired, TypedDict

from bson import ObjectId


class PlayerDocument(TypedDict):
    user_id: NotRequired[ObjectId]
    status: NotRequired[str]
    _id: ObjectId
    event_id: ObjectId
    team_id: ObjectId | None
    display_name: str
    normalized_display_name: str
    created_at: datetime
    updated_at: datetime
