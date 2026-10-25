from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.modules.auth.dependencies import AdminDependency, UserDependency
from app.modules.boards.repository import BoardRepository
from app.modules.events.repository import EventRepository
from app.modules.players.repository import PlayerRepository
from app.modules.scoring.schemas import RankingResponse, TeamScoreResponse
from app.modules.scoring.service import ScoringService
from app.modules.submissions.repository import SubmissionRepository
from app.modules.teams.repository import TeamRepository

player_router = APIRouter(tags=["scoring"])
admin_router = APIRouter(prefix="/admin", tags=["scoring"])


async def get_scoring_service(request: Request) -> ScoringService:
    database = request.app.state.db_client.database
    return ScoringService(
        EventRepository(database),
        BoardRepository(database),
        TeamRepository(database),
        PlayerRepository(database),
        SubmissionRepository(database),
    )


ScoringServiceDependency = Annotated[ScoringService, Depends(get_scoring_service)]


@player_router.get("/events/{event_id}/score/me", response_model=TeamScoreResponse)
async def own_team_score(
    event_id: str, user: UserDependency, service: ScoringServiceDependency
) -> TeamScoreResponse:
    return await service.own_team(event_id, user)


@admin_router.get("/events/{event_id}/ranking", response_model=RankingResponse)
async def ranking(
    event_id: str, admin: AdminDependency, service: ScoringServiceDependency
) -> RankingResponse:
    return await service.ranking(event_id)
