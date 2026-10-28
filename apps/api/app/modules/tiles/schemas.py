import re
from datetime import datetime
from enum import StrEnum
from typing import Annotated
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

WIKI_ORIGIN = "https://oldschool.runescape.wiki"
SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class CardStatus(StrEnum):
    ACTIVE = "active"
    RETIRED = "retired"


class CardDifficulty(StrEnum):
    LOW = "Low"
    MID = "Mid"
    HIGH = "High"


class CardKind(StrEnum):
    BOSS = "boss"
    BOSS_GROUP = "boss_group"
    RAID = "raid"
    ACTIVITY = "activity"
    TASK = "task"


class CardCategory(StrEnum):
    """Clan-style groups for browsing the catalog (feature 040); never used for scoring."""

    SKILLING_BOSSES = "skilling_bosses"
    SLAYER_BOSSES = "slayer_bosses"
    WILDERNESS_BOSSES = "wilderness_bosses"
    RAIDS = "raids"
    SOLO_BOSSES = "solo_bosses"
    SKILLING = "skilling"
    MINIGAMES = "minigames"
    OTHER = "other"


class CardSource(StrEnum):
    WORKBOOK = "workbook"
    ADMIN = "admin"


class AcceptedDrop(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str = Field(min_length=1, max_length=120, pattern=SLUG_PATTERN.pattern)
    name: str = Field(min_length=1, max_length=160)
    progress_weight: float = Field(gt=0, le=100000)
    aliases: list[str] = Field(default_factory=list, max_length=20)
    verification_note: str | None = Field(default=None, max_length=1000)
    counting_restriction: str | None = Field(default=None, max_length=1000)
    # OSRS item IDs this drop accepts (feature 033); empty for free-text drops.
    item_ids: list[Annotated[int, Field(ge=0)]] = Field(default_factory=list, max_length=200)
    # False when a specific version was picked: only its IDs count, never the shared name.
    match_by_name: bool = True

    @field_validator("item_ids")
    @classmethod
    def unique_item_ids(cls, item_ids: list[int]) -> list[int]:
        return sorted(set(item_ids))

    @field_validator("name", "verification_note", "counting_restriction")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.split())
        return normalized or None

    @field_validator("aliases")
    @classmethod
    def normalize_aliases(cls, aliases: list[str]) -> list[str]:
        normalized = [" ".join(alias.split()) for alias in aliases]
        if any(not alias for alias in normalized):
            raise ValueError("Drop aliases must contain visible content")
        if len({alias.casefold() for alias in normalized}) != len(normalized):
            raise ValueError("Drop aliases must be unique")
        return normalized


class WikiImage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    article_title: str = Field(min_length=1, max_length=200)
    article_url: str = Field(max_length=2000)
    file_name: str = Field(min_length=1, max_length=300)
    file_page_url: str = Field(max_length=2000)
    image_url: str = Field(max_length=2000)
    width: int = Field(gt=0, le=10000)
    height: int = Field(gt=0, le=10000)
    mime_type: str = Field(pattern=r"^image/(?:png|jpeg|webp|gif)$")
    attribution: str = Field(min_length=1, max_length=1000)
    license_name: str | None = Field(default=None, max_length=300)
    license_url: str | None = Field(default=None, max_length=2000)
    resolved_at: datetime

    @field_validator("article_url", "file_page_url", "image_url")
    @classmethod
    def allow_wiki_urls(cls, value: str | None) -> str | None:
        if value is not None and not value.startswith(f"{WIKI_ORIGIN}/"):
            raise ValueError("Only Old School RuneScape Wiki URLs are allowed")
        return value

    @field_validator("license_url")
    @classmethod
    def allow_license_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        parsed = urlparse(value)
        allowed_hosts = {
            "oldschool.runescape.wiki",
            "creativecommons.org",
            "www.jagex.com",
            "jagex.com",
        }
        if parsed.scheme != "https" or parsed.hostname not in allowed_hosts:
            raise ValueError("Image license URL is not allowlisted")
        return value


ARTWORK_KEY = re.compile(r"^cards/artwork/[0-9a-f]{32}\.(?:png|jpg|webp)$")
ARTIST_MAX_LENGTH = 80


class CardArtwork(BaseModel):
    """Clan artwork uploaded for a card (feature 041); shown instead of the Wiki image."""

    model_config = ConfigDict(extra="forbid")

    key: str = Field(pattern=ARTWORK_KEY.pattern)
    content_type: str = Field(pattern=r"^image/(?:png|jpeg|webp)$")
    artist: str | None = Field(default=None, max_length=ARTIST_MAX_LENGTH)

    @field_validator("artist")
    @classmethod
    def normalize_artist(cls, value: str | None) -> str | None:
        cleaned = " ".join((value or "").split())
        return cleaned or None


class CardArtworkUpload(BaseModel):
    key: str
    content_type: str


class CardRevisionFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    kind: CardKind
    difficulty: CardDifficulty
    tile_score: float = Field(ge=0, le=100000)
    completion_requirement: float = Field(gt=0, le=100000)
    drops: list[AcceptedDrop] = Field(min_length=1, max_length=100)
    wiki_image: WikiImage | None = None
    artwork: CardArtwork | None = None
    fallback_image_accepted: bool = False
    rule_note: str | None = Field(default=None, max_length=2000)
    # Players must have an accepted pre-verification before drops of this card count.
    requires_preverification: bool = False
    categories: list[CardCategory] = Field(default_factory=list, max_length=len(CardCategory))

    @field_validator("categories")
    @classmethod
    def unique_categories(cls, values: list[CardCategory]) -> list[CardCategory]:
        return sorted(set(values))

    @field_validator("name", "description", "rule_note")
    @classmethod
    def normalize_card_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = " ".join(value.split())
        return normalized or None

    @model_validator(mode="after")
    def unique_drops_and_image(self) -> "CardRevisionFields":
        keys = [drop.key for drop in self.drops]
        names = [drop.name.casefold() for drop in self.drops]
        if len(set(keys)) != len(keys) or len(set(names)) != len(names):
            raise ValueError("Accepted drops must have unique keys and names")
        if self.wiki_image is None and self.artwork is None and not self.fallback_image_accepted:
            raise ValueError("Select a validated Wiki image or explicitly accept the fallback")
        return self


class PreverificationInstructionsRequired(BaseModel):
    """Input-only rule (feature 019): stored revisions from before it must still load."""

    @model_validator(mode="after")
    def preverification_needs_instructions(self) -> "PreverificationInstructionsRequired":
        if getattr(self, "requires_preverification", False) and not getattr(
            self, "rule_note", None
        ):
            raise ValueError("Describe the pre-verification players must send")
        return self


class CardCreate(CardRevisionFields, PreverificationInstructionsRequired):
    slug: str = Field(min_length=1, max_length=120, pattern=SLUG_PATTERN.pattern)
    change_reason: str = Field(min_length=1, max_length=500)


class CardRevisionCreate(CardRevisionFields, PreverificationInstructionsRequired):
    expected_revision: int = Field(ge=1)
    change_reason: str = Field(min_length=1, max_length=500)


class CardRetire(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_revision: int = Field(ge=1)
    reason: str = Field(min_length=1, max_length=500)


class CardProvenance(BaseModel):
    source: CardSource
    source_ref: str | None = None
    source_cells: list[str] = Field(default_factory=list)
    derived_from_revision: int | None = None


class CardRevisionResponse(CardRevisionFields):
    revision: int
    provenance: CardProvenance
    change_reason: str
    created_by: str
    created_at: datetime


class CardSummary(BaseModel):
    id: str
    slug: str
    status: CardStatus
    current_revision: int
    revision: CardRevisionResponse
    created_at: datetime
    updated_at: datetime


class CardDetail(CardSummary):
    revisions: list[CardRevisionResponse]
    retired_by: str | None = None
    retired_at: datetime | None = None
    retirement_reason: str | None = None


class CardListResponse(BaseModel):
    items: list[CardSummary]


class WorkbookImportResponse(BaseModel):
    source_sha256: str
    expected_cards: int
    expected_drops: int
    source_bonus_entries: int
    resolved_bonus_entries: int
    imported_cards: int
    existing_cards: int
    conflicting_slugs: list[str]
    usable: bool


class WikiImageResolveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    article_title: str = Field(min_length=1, max_length=200)

    @field_validator("article_title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("Wiki article title must contain visible content")
        return normalized


class LinkItemsResponse(BaseModel):
    """Result of linking catalog drops to OSRS items by exact name (feature 033)."""

    linked_cards: int
    linked_drops: int
    unlinked_drops: int
    # Workbook cards that got their bundled categories (feature 040).
    categorized_cards: int = 0
    skipped_cards: list[str]
