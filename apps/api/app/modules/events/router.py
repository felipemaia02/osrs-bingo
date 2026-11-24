from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status

from app.core.logging import get_logger, log_event
from app.modules.audit.decorator import audited
from app.modules.auth.dependencies import AdminDependency, UserDependency, require_admin
from app.modules.boards.repository import BoardRepository
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import (
    EventCreate,
    EventListResponse,
    EventReadiness,
    EventResponse,
    EventRules,
    EventStatus,
    EventUpdate,
    LateJoinUpdate,
    RulesAddendumCreate,
)
from app.modules.events.service import EventService
from app.modules.players.repository import PlayerRepository
from app.modules.teams.repository import TeamRepository

router = APIRouter(prefix="/events", tags=["events"])
logger = get_logger(__name__)


def get_event_service(request: Request) -> EventService:
    repository = EventRepository(request.app.state.db_client.database)
    boards = BoardRepository(request.app.state.db_client.database)
    players = PlayerRepository(request.app.state.db_client.database)
    teams = TeamRepository(request.app.state.db_client.database)
    return EventService(repository, boards, players, teams)


EventServiceDependency = Annotated[EventService, Depends(get_event_service)]


@router.post(
    "",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
@audited("event.created")
async def create_event(payload: EventCreate, service: EventServiceDependency) -> EventResponse:
    log_event(logger, 20, "event_create_requested")
    return await service.create(payload)


@router.get("", response_model=EventListResponse)
async def list_events(
    service: EventServiceDependency,
    event_statuses: Annotated[list[EventStatus] | None, Query(alias="status")] = None,
) -> EventListResponse:
    """`?status=` may repeat (`?status=draft&status=active`, feature 068)."""
    log_event(
        logger,
        20,
        "events_list_requested",
        status=",".join(event_statuses) if event_statuses else "all",
    )
    return EventListResponse(items=await service.list(event_statuses))


@router.get("/mine", response_model=EventListResponse)
async def my_events(user: UserDependency, service: EventServiceDependency) -> EventListResponse:
    return EventListResponse(items=await service.mine(user.id))


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, service: EventServiceDependency) -> EventResponse:
    log_event(logger, 20, "event_read_requested", event_id=event_id)
    return await service.get(event_id)


@router.patch("/{event_id}", response_model=EventResponse, dependencies=[Depends(require_admin)])
@audited("event.updated", resource_id="event_id")
async def update_event(
    event_id: str,
    payload: EventUpdate,
    service: EventServiceDependency,
) -> EventResponse:
    log_event(logger, 20, "event_update_requested", event_id=event_id)
    return await service.update(event_id, payload)


@router.patch(
    "/{event_id}/rules", response_model=EventResponse, dependencies=[Depends(require_admin)]
)
@audited("event.rules_updated", resource_id="event_id")
async def update_rules(
    event_id: str, payload: EventRules, service: EventServiceDependency
) -> EventResponse:
    log_event(logger, 20, "event_rules_update_requested", event_id=event_id)
    return await service.set_rules(event_id, payload)


@router.patch("/{event_id}/late-join", response_model=EventResponse)
@audited("event.late_join_set", resource_id="event_id")
async def set_late_join(
    event_id: str,
    payload: LateJoinUpdate,
    admin: AdminDependency,
    service: EventServiceDependency,
) -> EventResponse:
    """Let players join while the event is active (feature 037)."""
    return await service.set_late_join(event_id, payload)


@router.post("/{event_id}/rules/addenda", response_model=EventResponse)
@audited("event.addendum_added", resource_id="event_id")
async def add_rules_addendum(
    event_id: str,
    payload: RulesAddendumCreate,
    admin: AdminDependency,
    service: EventServiceDependency,
) -> EventResponse:
    """Add a dated clarification to the rules of the active event (feature 036)."""
    return await service.add_rules_addendum(event_id, payload, admin.id)


@router.get(
    "/{event_id}/readiness", response_model=EventReadiness, dependencies=[Depends(require_admin)]
)
async def event_readiness(event_id: str, service: EventServiceDependency) -> EventReadiness:
    """What is done and missing before activating the event (feature 073)."""
    return await service.readiness(event_id)


@router.post("/{event_id}/activate", response_model=EventResponse)
@audited("event.activated", resource_id="event_id")
async def activate_event(
    event_id: str, admin: AdminDependency, service: EventServiceDependency
) -> EventResponse:
    log_event(logger, 20, "event_activation_requested", event_id=event_id)
    return await service.activate(event_id, admin.id)


@router.post(
    "/{event_id}/finish", response_model=EventResponse, dependencies=[Depends(require_admin)]
)
@audited("event.finished", resource_id="event_id")
async def finish_event(event_id: str, service: EventServiceDependency) -> EventResponse:
    log_event(logger, 20, "event_finish_requested", event_id=event_id)
    return await service.finish(event_id)
