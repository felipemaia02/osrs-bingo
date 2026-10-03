from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, status

from app.core.logging import get_logger, log_event
from app.modules.auth.dependencies import require_admin
from app.modules.events.repository import EventRepository
from app.modules.events.schemas import (
    EventCreate,
    EventListResponse,
    EventResponse,
    EventStatus,
    EventUpdate,
)
from app.modules.events.service import EventService

router = APIRouter(prefix="/events", tags=["events"])
logger = get_logger(__name__)


def get_event_service(request: Request) -> EventService:
    repository = EventRepository(request.app.state.db_client.database)
    return EventService(repository)


EventServiceDependency = Annotated[EventService, Depends(get_event_service)]


@router.post(
    "",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
async def create_event(payload: EventCreate, service: EventServiceDependency) -> EventResponse:
    log_event(logger, 20, "event_create_requested")
    return await service.create(payload)


@router.get("", response_model=EventListResponse)
async def list_events(
    service: EventServiceDependency,
    event_status: Annotated[EventStatus | None, Query(alias="status")] = None,
) -> EventListResponse:
    log_event(
        logger,
        20,
        "events_list_requested",
        status=event_status.value if event_status else "all",
    )
    return EventListResponse(items=await service.list(event_status))


@router.get("/{event_id}", response_model=EventResponse)
async def get_event(event_id: str, service: EventServiceDependency) -> EventResponse:
    log_event(logger, 20, "event_read_requested", event_id=event_id)
    return await service.get(event_id)


@router.patch("/{event_id}", response_model=EventResponse, dependencies=[Depends(require_admin)])
async def update_event(
    event_id: str,
    payload: EventUpdate,
    service: EventServiceDependency,
) -> EventResponse:
    log_event(logger, 20, "event_update_requested", event_id=event_id)
    return await service.update(event_id, payload)


@router.post(
    "/{event_id}/activate", response_model=EventResponse, dependencies=[Depends(require_admin)]
)
async def activate_event(event_id: str, service: EventServiceDependency) -> EventResponse:
    log_event(logger, 20, "event_activation_requested", event_id=event_id)
    return await service.activate(event_id)


@router.post(
    "/{event_id}/finish", response_model=EventResponse, dependencies=[Depends(require_admin)]
)
async def finish_event(event_id: str, service: EventServiceDependency) -> EventResponse:
    log_event(logger, 20, "event_finish_requested", event_id=event_id)
    return await service.finish(event_id)
