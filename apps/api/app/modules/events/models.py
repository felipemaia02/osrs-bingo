from datetime import datetime
from typing import NotRequired, TypedDict

from bson import ObjectId

from app.modules.events.schemas import EventStatus


class EventDocument(TypedDict):
    _id: ObjectId
    name: str
    description: str | None
    start_at: datetime
    end_at: datetime
    status: EventStatus
    created_at: datetime
    updated_at: datetime
    active_slot: NotRequired[int]
