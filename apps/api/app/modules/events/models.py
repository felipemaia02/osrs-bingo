from datetime import datetime
from typing import Any, NotRequired, TypedDict

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
    rules_text: NotRequired[str | None]
    # Players may request to join while the event is active (feature 037).
    late_join: NotRequired[bool]
    # Clarifications added while the event is active (feature 036).
    rules_addenda: NotRequired[list[dict[str, Any]]]
    buy_in: NotRequired[str | None]
