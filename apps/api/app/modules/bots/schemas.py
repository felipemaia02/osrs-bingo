from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel


class BotScope(StrEnum):
    EVENTS_READ = "events:read"
    BOARDS_READ = "boards:read"
    TEAMS_READ = "teams:read"
    SCORE_READ = "score:read"
    SUBMISSIONS_WRITE = "submissions:write"


class BotKey(BaseModel):
    id: str
    name: str
    scopes: frozenset[BotScope]


class BotKeySummary(BotKey):
    """What admins see when listing keys: never the key or its hash."""

    created_at: datetime
    last_used_at: datetime | None
    revoked_at: datetime | None


class BotCaller(BaseModel):
    key: BotKey
    # The Discord user the bot acts for, on routes that need one.
    acting_discord_id: str | None = None
