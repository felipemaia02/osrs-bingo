import re
from datetime import UTC, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

HEX_COLOR_PATTERN = re.compile(r"^#[0-9A-Fa-f]{6}$")


class TeamFields(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    color: str | None = None
    emblem_url: str | None = Field(default=None, max_length=2000)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("Team name must contain visible content")
        return normalized

    @field_validator("color")
    @classmethod
    def validate_color(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        if not HEX_COLOR_PATTERN.fullmatch(value):
            raise ValueError("Team color must be a six-digit hexadecimal color")
        return value.upper()

    @field_validator("emblem_url")
    @classmethod
    def validate_emblem_url(cls, value: str | None) -> str | None:
        if value is None or not value.strip():
            return None
        normalized = value.strip()
        if not normalized.startswith(("http://", "https://")):
            raise ValueError("Team emblem URL must use HTTP or HTTPS")
        return normalized


class TeamCreate(TeamFields):
    pass


class TeamUpdate(TeamFields):
    pass


class TeamResponse(TeamFields):
    model_config = ConfigDict(from_attributes=True)

    id: str
    event_id: str
    member_count: int
    created_at: datetime
    updated_at: datetime


class TeamListResponse(BaseModel):
    items: list[TeamResponse]


def utc_now() -> datetime:
    return datetime.now(UTC)
