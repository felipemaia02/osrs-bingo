from datetime import datetime
from typing import NotRequired, TypedDict

from bson import ObjectId


class SubmissionDocument(TypedDict):
    _id: ObjectId
    event_id: ObjectId
    team_id: ObjectId
    player_id: ObjectId
    user_id: ObjectId
    kind: str
    status: str
    position: int
    row: int
    column: int
    card_id: str
    card_revision: int
    card_name: str
    requires_preverification: bool
    drop_key: str | None
    drop_name: str | None
    progress_weight: float | None
    quantity: int
    note: str | None
    screenshot_key: str
    screenshot_type: str
    submitted_at: datetime
    reviewed_at: NotRequired[datetime | None]
    reviewed_by: NotRequired[str | None]
    reviewer_name: NotRequired[str | None]
    rejection_reason: NotRequired[str | None]
    rejection_note: NotRequired[str | None]
    # Present only while a pre-verification is pending or accepted (unique per
    # event, player and position), so a rejected one can be sent again.
    preverification_gate: NotRequired[str]
