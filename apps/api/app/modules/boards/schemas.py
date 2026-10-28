from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.modules.tiles.schemas import (
    AcceptedDrop,
    CardArtwork,
    CardCategory,
    CardDifficulty,
    CardKind,
    CardProvenance,
    WikiImage,
)

MIN_BOARD_SIZE = 3
MAX_BOARD_SIZE = 6
DEFAULT_BOARD_SIZE = MAX_BOARD_SIZE
LINE_BONUS_MAX = 1000
UPDATE_REASON_MAX_LENGTH = 500
# Grid positions plus a bonus row of up to `size` cards (feature 020).
MAX_BOARD_POSITIONS = MAX_BOARD_SIZE**2 + MAX_BOARD_SIZE


class BoardStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"


class BoardPositionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    position: int = Field(ge=1, le=MAX_BOARD_POSITIONS)
    card_id: str = Field(min_length=24, max_length=24)
    card_revision: int = Field(ge=1)


class BoardSave(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_revision: int = Field(ge=0)
    size: int = Field(default=DEFAULT_BOARD_SIZE, ge=MIN_BOARD_SIZE, le=MAX_BOARD_SIZE)
    # Points per completed row/column (features 006/019); required before activation.
    row_bonus: int | None = Field(default=None, ge=0, le=LINE_BONUS_MAX)
    column_bonus: int | None = Field(default=None, ge=0, le=LINE_BONUS_MAX)
    # Bonus cards under the grid (feature 020): positions size² + 1 … size² + bonus_slots.
    bonus_slots: int = Field(default=0, ge=0, le=MAX_BOARD_SIZE)
    positions: list[BoardPositionInput] = Field(
        default_factory=list, max_length=MAX_BOARD_POSITIONS
    )

    @model_validator(mode="after")
    def unique_positions_and_cards(self) -> "BoardSave":
        positions = [item.position for item in self.positions]
        cards = [item.card_id for item in self.positions]
        if self.bonus_slots > self.size:
            raise ValueError("The bonus row can't be longer than the board size")
        if any(position > self.size**2 + self.bonus_slots for position in positions):
            raise ValueError("Board positions must fit the board size")
        if len(set(positions)) != len(positions):
            raise ValueError("Board positions must be unique")
        if len(set(cards)) != len(cards):
            raise ValueError("A card cannot appear more than once on the board")
        return self


class BoardCardSnapshot(BaseModel):
    card_id: str
    slug: str
    card_revision: int
    name: str
    description: str | None
    kind: CardKind
    difficulty: CardDifficulty
    tile_score: float
    completion_requirement: float
    drops: list[AcceptedDrop]
    wiki_image: WikiImage | None
    artwork: CardArtwork | None = None
    fallback_image_accepted: bool
    rule_note: str | None
    provenance: CardProvenance
    requires_preverification: bool = False
    categories: list[CardCategory] = Field(default_factory=list)


class BoardPositionUpdate(BaseModel):
    """Fix a square of the live board with a newer revision of its card (feature 036)."""

    model_config = ConfigDict(extra="forbid")

    card_revision: int = Field(ge=1)
    reason: str = Field(min_length=1, max_length=UPDATE_REASON_MAX_LENGTH)

    @field_validator("reason")
    @classmethod
    def visible_reason(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if not cleaned:
            raise ValueError("Explain the change")
        return cleaned


class PositionUpdateRecord(BaseModel):
    from_revision: int
    to_revision: int
    reason: str
    updated_by_name: str
    updated_at: datetime


class BoardPositionResponse(BaseModel):
    position: int
    row: int
    column: int
    bonus: bool = False
    card: BoardCardSnapshot
    # Changes made while the event was active, oldest first (feature 036).
    updates: list[PositionUpdateRecord] = Field(default_factory=list)


class BoardResponse(BaseModel):
    event_id: str
    status: BoardStatus
    revision: int
    size: int
    row_bonus: int | None = None
    column_bonus: int | None = None
    bonus_slots: int = 0
    complete: bool
    positions: list[BoardPositionResponse]
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None = None
