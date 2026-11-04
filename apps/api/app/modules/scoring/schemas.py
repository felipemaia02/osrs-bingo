from datetime import datetime

from pydantic import BaseModel

from app.modules.events.schemas import EventStatus
from app.modules.players.schemas import ParticipantRole
from app.modules.profiles.schemas import Activity
from app.modules.scoring.estimates import Estimate


class DropProgressResponse(BaseModel):
    drop_key: str
    drop_name: str
    count: int
    progress: float


class TileProgressResponse(BaseModel):
    position: int
    row: int
    column: int
    bonus: bool
    progress: float
    requirement: float
    complete: bool
    points: float
    # Kills and hours still expected for the team (060); None once complete.
    remaining_estimate: Estimate | None = None
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
    bonus_points: float
    completed_bonus: int
    bonus_count: int
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
    bonus_points: float
    completed_bonus: int


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
    bonus_count: int
    row_bonus: int | None
    column_bonus: int | None
    teams: list[RankingTeam]
    players: list[PlayerContribution]
    calculated_at: datetime


class TeamMember(BaseModel):
    """A member of the viewer's own team with their points in it (feature 050)."""

    player_id: str
    display_name: str
    discord_username: str | None
    role: ParticipantRole | None
    timezone: str | None
    activity: Activity | None
    position: int
    tied: bool
    points: float
    drop_count: int


class TeamDrop(BaseModel):
    """One of the team's newest accepted drops and the points it gave its player."""

    submission_id: str
    player_name: str
    card_name: str
    drop_name: str | None
    quantity: int
    points: float
    accepted_at: datetime


class TeamHomeResponse(BaseModel):
    """The viewer's own team page (feature 050): never another team's data."""

    event_id: str
    team_id: str
    team_name: str
    team_color: str | None
    emblem_url: str | None
    members: list[TeamMember]
    recent_drops: list[TeamDrop]
