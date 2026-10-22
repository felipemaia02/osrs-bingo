from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.modules.tiles.schemas import (
    AcceptedDrop,
    CardDifficulty,
    CardKind,
    CardProvenance,
    WikiImage,
)

MIN_BOARD_SIZE = 3
MAX_BOARD_SIZE = 6
DEFAULT_BOARD_SIZE = MAX_BOARD_SIZE


class BoardStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"


class BoardPositionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    position: int = Field(ge=1, le=MAX_BOARD_SIZE**2)
    card_id: str = Field(min_length=24, max_length=24)
    card_revision: int = Field(ge=1)


class BoardSave(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_revision: int = Field(ge=0)
    size: int = Field(default=DEFAULT_BOARD_SIZE, ge=MIN_BOARD_SIZE, le=MAX_BOARD_SIZE)
    positions: list[BoardPositionInput] = Field(default_factory=list, max_length=MAX_BOARD_SIZE**2)

    @model_validator(mode="after")
    def unique_positions_and_cards(self) -> "BoardSave":
        positions = [item.position for item in self.positions]
        cards = [item.card_id for item in self.positions]
        if any(position > self.size**2 for position in positions):
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
    fallback_image_accepted: bool
    rule_note: str | None
    provenance: CardProvenance


class BoardPositionResponse(BaseModel):
    position: int
    row: int
    column: int
    card: BoardCardSnapshot


class BoardResponse(BaseModel):
    event_id: str
    status: BoardStatus
    revision: int
    size: int
    complete: bool
    positions: list[BoardPositionResponse]
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None = None
