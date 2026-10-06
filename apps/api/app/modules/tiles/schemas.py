import re
from datetime import datetime
from enum import StrEnum
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
    fallback_image_accepted: bool = False
    rule_note: str | None = Field(default=None, max_length=2000)

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
        if self.wiki_image is None and not self.fallback_image_accepted:
            raise ValueError("Select a validated Wiki image or explicitly accept the fallback")
        return self


class CardCreate(CardRevisionFields):
    slug: str = Field(min_length=1, max_length=120, pattern=SLUG_PATTERN.pattern)
    change_reason: str = Field(min_length=1, max_length=500)


class CardRevisionCreate(CardRevisionFields):
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
