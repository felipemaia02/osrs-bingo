from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.modules.audit.actions import AuditGroup


class AuditActor(BaseModel):
    kind: str  # user | bot
    id: str | None = None
    name: str
    # A bot acting for a Discord user (feature 048).
    on_behalf_of: str | None = None


class AuditResource(BaseModel):
    type: str
    id: str | None = None
    label: str | None = None


class AuditEntry(BaseModel):
    """What the audit log stores and returns: no prose, the page translates `action`."""

    id: str
    at: datetime
    action: str
    actor: AuditActor
    event_id: str | None = None
    team_id: str | None = None
    resource: AuditResource
    payload: dict[str, Any] = Field(default_factory=dict)


class AuditPage(BaseModel):
    items: list[AuditEntry]
    next_cursor: str | None


class AuditQuery(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    event_id: str | None = Field(default=None, max_length=24)
    group: AuditGroup | None = None
    actor: str | None = Field(default=None, max_length=64)
    since: datetime | None = Field(default=None, alias="from")
    until: datetime | None = Field(default=None, alias="to")
    cursor: str | None = Field(default=None, max_length=64)
    limit: int = Field(default=50, ge=1, le=100)


class BotAuditQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")

    after: str | None = Field(default=None, max_length=64)
    group: AuditGroup | None = None
    limit: int = Field(default=50, ge=1, le=100)
