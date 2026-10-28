from datetime import UTC, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class EventStatus(StrEnum):
    DRAFT = "draft"
    ACTIVE = "active"
    FINISHED = "finished"


BUY_IN_MAX_LENGTH = 80


class EventFields(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    start_at: datetime
    end_at: datetime
    # Free text such as "5M gp" (feature 022); None means no buy-in.
    buy_in: str | None = Field(default=None, max_length=BUY_IN_MAX_LENGTH)

    @field_validator("name")
    @classmethod
    def strip_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Event name must contain visible content")
        return stripped

    @field_validator("description", "buy_in")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        stripped = value.strip()
        return stripped or None

    @field_validator("start_at", "end_at")
    @classmethod
    def require_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Event timestamps must include a timezone")
        return value.astimezone(UTC)

    @model_validator(mode="after")
    def validate_schedule(self) -> "EventFields":
        if self.end_at <= self.start_at:
            raise ValueError("Event end must be later than start")
        return self


class EventCreate(EventFields):
    pass


class EventUpdate(EventFields):
    pass


RULES_TEXT_MAX_LENGTH = 5000
ADDENDUM_MAX_LENGTH = 1000


class EventRules(BaseModel):
    """The event's written rules (feature 019); plain text, line breaks kept."""

    model_config = ConfigDict(extra="forbid")

    rules_text: str | None = Field(default=None, max_length=RULES_TEXT_MAX_LENGTH)

    @field_validator("rules_text")
    @classmethod
    def normalize_rules_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        lines = [line.rstrip() for line in value.replace("\r\n", "\n").split("\n")]
        text = "\n".join(lines).strip()
        return text or None


class LateJoinUpdate(BaseModel):
    """Allow players to join while the event is active (feature 037)."""

    model_config = ConfigDict(extra="forbid")

    enabled: bool


class RulesAddendumCreate(BaseModel):
    """A clarification added to the rules while the event is active (feature 036)."""

    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=ADDENDUM_MAX_LENGTH)

    @field_validator("text")
    @classmethod
    def visible_text(cls, value: str) -> str:
        lines = [line.rstrip() for line in value.replace("\r\n", "\n").split("\n")]
        text = "\n".join(lines).strip()
        if not text:
            raise ValueError("Write the clarification")
        return text


class RulesAddendum(BaseModel):
    text: str
    added_at: datetime


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    start_at: datetime
    end_at: datetime
    status: EventStatus
    rules_text: str | None = None
    rules_addenda: list[RulesAddendum] = Field(default_factory=list)
    late_join: bool = False
    buy_in: str | None = None
    created_at: datetime
    updated_at: datetime


class EventListResponse(BaseModel):
    items: list[EventResponse]
