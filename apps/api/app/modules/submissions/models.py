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
    preverification_note: NotRequired[str | None]
    screenshot_key: str
    screenshot_type: str
    # Manual uploads (feature 035): the exact same file flags a possible duplicate.
    screenshot_sha256: NotRequired[str]
    submitted_at: datetime
    reviewed_at: NotRequired[datetime | None]
    reviewed_by: NotRequired[str | None]
    reviewer_name: NotRequired[str | None]
    rejection_reason: NotRequired[str | None]
    rejection_note: NotRequired[str | None]
    # Present only while a pre-verification is pending or accepted (unique per
    # event, player and position), so a rejected one can be sent again.
    preverification_gate: NotRequired[str]
    # Automatic drops from DropTracker (feature 030): no stored screenshot, the
    # DropTracker image instead, and the drop id (unique per board position).
    source: NotRequired[str]
    droptracker_drop_id: NotRequired[int]
    screenshot_url: NotRequired[str | None]
    # An accepted submission undone by an admin (feature 035).
    reverted_at: NotRequired[datetime]
    reverted_by: NotRequired[str]
