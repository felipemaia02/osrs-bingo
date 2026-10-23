from datetime import datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

NOTE_MAX_LENGTH = 280


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
    submitted_at: datetime
    reviewed_at: datetime | None
    reviewer_name: str | None
    rejection_reason: RejectionReason | None
    rejection_note: str | None


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


class ReviewCounts(BaseModel):
    pending: int = 0
    pending_preverification: int = 0
    pending_drop: int = 0


class ReviewQueueQuery(BaseModel):
    status: SubmissionStatus = SubmissionStatus.PENDING
    kind: SubmissionKind | None = None
    offset: int = Field(default=0, ge=0, le=1_000_000)
    limit: int = Field(default=25, ge=1, le=100)


class ReviewQueueResponse(BaseModel):
    items: list[ReviewItem]
    total: int
    offset: int
    limit: int
    counts: ReviewCounts


ReviewDecision = Literal["accepted", "rejected"]
