from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status

from app.modules.administration.repository import AdministrationRepository
from app.modules.auth.dependencies import AdminDependency, UserDependency
from app.modules.events.repository import EventRepository
from app.modules.players.repository import PlayerRepository
from app.modules.players.schemas import (
    ApprovalResponse,
    JoinRequest,
    ParticipationUpdate,
    PlayerListQuery,
    PlayerListResponse,
    PlayerResponse,
    PlayerSelection,
    PlayerUpdate,
    SelectionResult,
)
from app.modules.players.service import PlayerService
from app.modules.profiles.repository import ProfileRepository
from app.modules.teams.repository import TeamRepository

router = APIRouter(prefix="/events/{event_id}/players", tags=["players"])


async def get_player_service(request: Request) -> PlayerService:
    database = request.app.state.db_client.database
    return PlayerService(
        PlayerRepository(database),
        TeamRepository(database),
        EventRepository(database),
        ProfileRepository(database),
        AdministrationRepository(database),
    )


PlayerServiceDependency = Annotated[PlayerService, Depends(get_player_service)]


@router.post("", response_model=PlayerResponse, status_code=status.HTTP_201_CREATED)
async def create_player(
    event_id: str, payload: JoinRequest, user: UserDependency, service: PlayerServiceDependency
) -> PlayerResponse:
    return await service.create(event_id, payload, user.id)


@router.get("/me", response_model=PlayerResponse | None)
async def own_registration(
    event_id: str, user: UserDependency, service: PlayerServiceDependency
) -> PlayerResponse | None:
    return await service.own_registration(event_id, user.id)


@router.get("", response_model=PlayerListResponse)
async def list_players(
    event_id: str,
    admin: AdminDependency,
    service: PlayerServiceDependency,
    query: Annotated[PlayerListQuery, Query()],
) -> PlayerListResponse:
    return await service.list(event_id, query)


@router.post("/approve-all", response_model=ApprovalResponse)
async def approve_all(
    event_id: str, admin: AdminDependency, service: PlayerServiceDependency
) -> ApprovalResponse:
    return ApprovalResponse(approved_count=await service.approve_all(event_id))


@router.post("/approve-selected", response_model=SelectionResult)
async def approve_selected(
    event_id: str,
    payload: PlayerSelection,
    admin: AdminDependency,
    service: PlayerServiceDependency,
) -> SelectionResult:
    return await service.approve_selected(event_id, payload.player_ids)


@router.post("/remove-selected", response_model=SelectionResult)
async def remove_selected(
    event_id: str,
    payload: PlayerSelection,
    admin: AdminDependency,
    service: PlayerServiceDependency,
) -> SelectionResult:
    return await service.remove_selected(event_id, payload.player_ids)


@router.post("/{player_id}/approve", response_model=PlayerResponse)
async def approve_player(
    event_id: str, player_id: str, admin: AdminDependency, service: PlayerServiceDependency
) -> PlayerResponse:
    return await service.approve(event_id, player_id)


@router.patch("/{player_id}", response_model=PlayerResponse)
async def update_player(
    event_id: str,
    player_id: str,
    payload: PlayerUpdate,
    admin: AdminDependency,
    service: PlayerServiceDependency,
) -> PlayerResponse:
    return await service.update(event_id, player_id, payload)


@router.patch("/{player_id}/participation", response_model=PlayerResponse)
async def update_participation(
    event_id: str,
    player_id: str,
    payload: ParticipationUpdate,
    admin: AdminDependency,
    service: PlayerServiceDependency,
) -> PlayerResponse:
    return await service.update_participation(event_id, player_id, payload)


@router.delete("/{player_id}", response_model=PlayerResponse)
async def remove_player(
    event_id: str, player_id: str, admin: AdminDependency, service: PlayerServiceDependency
) -> PlayerResponse:
    return await service.remove(event_id, player_id)
