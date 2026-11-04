from typing import Annotated

from fastapi import APIRouter, Depends, Path, Request

from app.modules.activity.repository import ActivityRepository
from app.modules.activity.schemas import TeamActivityResponse
from app.modules.activity.service import ActivityService
from app.modules.audit.decorator import audited
from app.modules.auth.dependencies import AdminDependency, UserDependency
from app.modules.boards.repository import BoardRepository
from app.modules.events.repository import EventRepository
from app.modules.players.repository import PlayerRepository
from app.modules.teams.repository import TeamRepository

player_router = APIRouter(prefix="/events/{event_id}/my-team/activity", tags=["tile activity"])
admin_router = APIRouter(prefix="/admin/events/{event_id}/teams", tags=["tile activity"])

Position = Annotated[int, Path(ge=1, le=100)]


def get_activity_service(request: Request) -> ActivityService:
    database = request.app.state.db_client.database
    return ActivityService(
        ActivityRepository(database),
        EventRepository(database),
        PlayerRepository(database),
        TeamRepository(database),
        BoardRepository(database),
    )


ActivityServiceDependency = Annotated[ActivityService, Depends(get_activity_service)]


@player_router.get("", response_model=TeamActivityResponse)
async def own_team_activity(
    event_id: str, user: UserDependency, service: ActivityServiceDependency
) -> TeamActivityResponse:
    return await service.own_team(event_id, user)


@player_router.put("/{position}", response_model=TeamActivityResponse)
@audited("activity.started", resource_id="position")
async def start_working(
    event_id: str, position: Position, user: UserDependency, service: ActivityServiceDependency
) -> TeamActivityResponse:
    """Marks (or keeps marked for 7 more days) the player on the tile."""
    return await service.start(event_id, position, user)


@player_router.delete("/{position}", response_model=TeamActivityResponse)
@audited("activity.stopped", resource_id="position")
async def stop_working(
    event_id: str, position: Position, user: UserDependency, service: ActivityServiceDependency
) -> TeamActivityResponse:
    return await service.stop(event_id, position, user)


@admin_router.get("/{team_id}/activity", response_model=TeamActivityResponse)
async def team_activity(
    event_id: str, team_id: str, admin: AdminDependency, service: ActivityServiceDependency
) -> TeamActivityResponse:
    return await service.any_team(event_id, team_id)
