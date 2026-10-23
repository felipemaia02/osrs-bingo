from datetime import datetime

from pydantic import BaseModel

from app.modules.events.schemas import EventStatus


class DropProgressResponse(BaseModel):
    drop_key: str
    drop_name: str
    count: int
    progress: float


class TileProgressResponse(BaseModel):
    position: int
    row: int
    column: int
    progress: float
    requirement: float
    complete: bool
    points: float
    drops: list[DropProgressResponse]


class TeamScoreResponse(BaseModel):
    event_id: str
    team_id: str
    team_name: str
    team_color: str | None
    total: float
    tile_points: float
    completed_tiles: int
    tile_count: int
    completed_rows: list[int]
    completed_columns: list[int]
    row_points: float
    column_points: float
    row_bonus: int | None
    column_bonus: int | None
    tiles: list[TileProgressResponse]
    calculated_at: datetime


class RankingTeam(BaseModel):
    position: int
    tied: bool
    team_id: str
    team_name: str
    team_color: str | None
    member_count: int
    total: float
    tile_points: float
    completed_tiles: int
    completed_rows: int
    row_points: float
    completed_columns: int
    column_points: float


class PlayerContribution(BaseModel):
    player_id: str
    display_name: str
    team_id: str | None
    contribution: float


class RankingResponse(BaseModel):
    event_id: str
    event_name: str
    event_status: EventStatus
    size: int
    tile_count: int
    row_bonus: int | None
    column_bonus: int | None
    teams: list[RankingTeam]
    players: list[PlayerContribution]
    calculated_at: datetime
