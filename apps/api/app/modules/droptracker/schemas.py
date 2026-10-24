from datetime import datetime

from pydantic import BaseModel, Field

DROPS_PAGE_MAX = 200


class DropTrackerStatus(BaseModel):
    ingest_enabled: bool
    bingo_enabled: bool
    group_id: int
    poll_seconds: int
    key_configured: bool
    last_poll_at: datetime | None
    last_success_at: datetime | None
    last_error: str | None
    newest_received_at: datetime | None
    last_added: int | None
    stored_drops: int


class DropRecord(BaseModel):
    drop_id: int
    player_id: int | None
    player_name: str
    npc_id: int | None
    npc_name: str | None
    item_id: int | None
    item_name: str
    quantity: int
    value_each: int | None
    total_value: int | None
    received_at: datetime
    image_url: str | None
    ingested_at: datetime


class DropQuery(BaseModel):
    player: str = Field(default="", max_length=40)
    npc: str = Field(default="", max_length=80)
    item: str = Field(default="", max_length=80)
    min_value: int = Field(default=0, ge=0)
    offset: int = Field(default=0, ge=0, le=100_000)
    limit: int = Field(default=50, ge=1, le=DROPS_PAGE_MAX)


class DropPage(BaseModel):
    items: list[DropRecord]
    total: int
    offset: int
    limit: int
