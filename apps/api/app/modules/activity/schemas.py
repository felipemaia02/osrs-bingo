from datetime import datetime

from pydantic import BaseModel


class TileWorker(BaseModel):
    player_id: str
    name: str
    since: datetime
    expires_at: datetime
    is_you: bool = False


class TileActivity(BaseModel):
    position: int
    players: list[TileWorker]


class TeamActivityResponse(BaseModel):
    """Who on the team is working on each tile (feature 061); tiles nobody works on are left out."""

    tiles: list[TileActivity]
