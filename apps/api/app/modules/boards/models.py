from datetime import datetime
from typing import Any, TypedDict

from bson import ObjectId

from app.modules.boards.schemas import BoardStatus


class BoardDocument(TypedDict, total=False):
    _id: ObjectId
    event_id: ObjectId
    status: BoardStatus
    revision: int
    positions: list[dict[str, Any]]
    created_by: str
    updated_by: str
    created_at: datetime
    updated_at: datetime
    published_by: str
    published_at: datetime

