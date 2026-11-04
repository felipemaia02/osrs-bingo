from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.modules.auth.dependencies import AdminDependency, UserDependency
from app.modules.boards.repository import BoardRepository
from app.modules.events.repository import EventRepository
from app.modules.players.repository import PlayerRepository
from app.modules.scoring.estimate_service import EhbRate, EstimatePreview, EstimateService
from app.modules.scoring.estimates import Estimate
from app.modules.scoring.schemas import RankingResponse, TeamHomeResponse, TeamScoreResponse
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


@player_router.get("/events/{event_id}/team/me", response_model=TeamHomeResponse)
async def own_team_home(
    event_id: str, user: UserDependency, service: ScoringServiceDependency
) -> TeamHomeResponse:
    return await service.own_team_home(event_id, user)


@admin_router.get("/events/{event_id}/teams/{team_id}/score", response_model=TeamScoreResponse)
async def team_score(
    event_id: str, team_id: str, admin: AdminDependency, service: ScoringServiceDependency
) -> TeamScoreResponse:
    return await service.team_score(event_id, team_id)


@admin_router.get("/events/{event_id}/ranking", response_model=RankingResponse)
async def ranking(
    event_id: str, admin: AdminDependency, service: ScoringServiceDependency
) -> RankingResponse:
    return await service.ranking(event_id)


def get_estimate_service(request: Request) -> EstimateService:
    return EstimateService(request.app.state.wom_client)


EstimateServiceDependency = Annotated[EstimateService, Depends(get_estimate_service)]


@admin_router.get("/estimates/ehb-rates", response_model=list[EhbRate])
async def ehb_rates(admin: AdminDependency, service: EstimateServiceDependency) -> list[EhbRate]:
    """WOM ironman EHB kills per hour per boss, with the 80 % suggestion (feature 060)."""
    return await service.ehb_rates()


@admin_router.post("/estimates/preview", response_model=Estimate)
async def preview_estimate(
    payload: EstimatePreview, admin: AdminDependency, service: EstimateServiceDependency
) -> Estimate:
    """Expected kills and hours for the card being edited; changes nothing."""
    return service.preview(payload)
