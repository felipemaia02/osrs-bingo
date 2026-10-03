from typing import Annotated

from fastapi import APIRouter, Depends, Request, status

from app.core.config import settings
from app.modules.auth.dependencies import require_admin
from app.modules.events.repository import EventRepository
from app.modules.players.repository import PlayerRepository
from app.modules.teams.repository import TeamRepository
from app.modules.teams.schemas import TeamCreate, TeamListResponse, TeamResponse, TeamUpdate
from app.modules.teams.service import TeamService

router = APIRouter(prefix="/events/{event_id}/teams", tags=["teams"])


def get_team_service(request: Request) -> TeamService:
    database = request.app.state.db_client.database
    return TeamService(
        TeamRepository(database), PlayerRepository(database), EventRepository(database), settings
    )


TeamServiceDependency = Annotated[TeamService, Depends(get_team_service)]


@router.post(
    "",
    response_model=TeamResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
async def create_team(
    event_id: str, payload: TeamCreate, service: TeamServiceDependency
) -> TeamResponse:
    return await service.create(event_id, payload)


@router.get("", response_model=TeamListResponse)
async def list_teams(event_id: str, service: TeamServiceDependency) -> TeamListResponse:
    return TeamListResponse(items=await service.list(event_id))


@router.patch("/{team_id}", response_model=TeamResponse, dependencies=[Depends(require_admin)])
async def update_team(
    event_id: str, team_id: str, payload: TeamUpdate, service: TeamServiceDependency
) -> TeamResponse:
    return await service.update(event_id, team_id, payload)
