from datetime import datetime
from typing import Any, TypedDict

from bson import ObjectId

from app.modules.tiles.schemas import CardStatus


class CardDocument(TypedDict, total=False):
    _id: ObjectId
    slug: str
    status: CardStatus
    current_revision: int
    revisions: list[dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    retired_by: str
    retired_at: datetime
    retirement_reason: str

