from datetime import datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

NOTE_MAX_LENGTH = 280
QUERY_MAX_LENGTH = 60


class SubmissionKind(StrEnum):
    DROP = "drop"
    PREVERIFICATION = "preverification"


class SubmissionStatus(StrEnum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"


class RejectionReason(StrEnum):
    UNREADABLE_SCREENSHOT = "unreadable_screenshot"
    ITEM_MISMATCH = "item_mismatch"
    OUTSIDE_EVENT_PERIOD = "outside_event_period"
    # Feature 035: the same drop was already sent (manually or by DropTracker).
    DUPLICATE = "duplicate"
    OTHER = "other"


class SubmissionReject(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: RejectionReason
    note: str | None = Field(default=None, max_length=NOTE_MAX_LENGTH)

    @model_validator(mode="after")
    def other_needs_note(self) -> "SubmissionReject":
        self.note = " ".join(self.note.split()) if self.note else None
        if self.reason == RejectionReason.OTHER and not self.note:
            raise ValueError("Describe the reason when choosing Other")
        return self


class SubmissionSource(StrEnum):
    MANUAL = "manual"
    DROPTRACKER = "droptracker"


class SubmissionResponse(BaseModel):
    id: str
    event_id: str
    kind: SubmissionKind
    status: SubmissionStatus
    position: int
    row: int
    column: int
    card_id: str
    card_revision: int
    card_name: str
    drop_key: str | None
    drop_name: str | None
    progress_weight: float | None
    quantity: int
    note: str | None
    # The card's pre-verification instructions, for pre-verification submissions.
    preverification_note: str | None = None
    submitted_at: datetime
    reviewed_at: datetime | None
    reviewer_name: str | None
    rejection_reason: RejectionReason | None
    rejection_note: str | None
    source: SubmissionSource = SubmissionSource.MANUAL
    has_screenshot: bool = True
    # Set when an admin reverted an accepted submission (feature 035).
    reverted_at: datetime | None = None


class SubmissionCounts(BaseModel):
    all: int = 0
    pending: int = 0
    accepted: int = 0
    rejected: int = 0


class OwnSubmissionsResponse(BaseModel):
    items: list[SubmissionResponse]
    counts: SubmissionCounts


class ReviewItem(SubmissionResponse):
    player_id: str
    player_name: str
    team_id: str
    team_name: str | None
    team_color: str | None
    requires_preverification: bool
    # For drops of cards that require it: the player's pre-verification state.
    preverification_status: SubmissionStatus | None
    within_event: bool
    # The reviewing admin plays on this submission's team: someone else reviews it (026).
    own_team: bool = False
    # IDs of pending/accepted submissions that look like the same drop (feature 035).
    possible_duplicates: list[str] = Field(default_factory=list)


class ReviewCounts(BaseModel):
    pending: int = 0
    pending_preverification: int = 0
    pending_drop: int = 0


class ReviewQueueQuery(BaseModel):
    status: SubmissionStatus = SubmissionStatus.PENDING
    kind: SubmissionKind | None = None
    # Player, item or card name (feature 035, for finding accepted submissions to revert).
    q: str = Field(default="", max_length=QUERY_MAX_LENGTH)
    offset: int = Field(default=0, ge=0, le=1_000_000)
    limit: int = Field(default=25, ge=1, le=100)


class ReviewQueueResponse(BaseModel):
    items: list[ReviewItem]
    total: int
    offset: int
    limit: int
    counts: ReviewCounts


ReviewDecision = Literal["accepted", "rejected"]


class TileHistoryItem(BaseModel):
    id: str
    player_name: str
    drop_name: str | None
    progress_weight: float | None
    status: SubmissionStatus
    source: SubmissionSource
    submitted_at: datetime
    has_screenshot: bool
    # The same item as the submission under review.
    same_item: bool
    possible_duplicate: bool


class TileHistoryResponse(BaseModel):
    """What a team already has on a tile, shown next to a submission in review (035)."""

    team_id: str
    team_name: str | None
    card_name: str
    progress: float
    requirement: float
    complete: bool
    items: list[TileHistoryItem]
