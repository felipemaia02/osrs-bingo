from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.modules.auth.dependencies import AdminDependency
from app.modules.boards.repository import BoardRepository
from app.modules.boards.schemas import BoardResponse, BoardSave
from app.modules.boards.service import BoardService
from app.modules.events.repository import EventRepository
from app.modules.tiles.repository import CardRepository

public_router = APIRouter(prefix="/events/{event_id}/board", tags=["event board"])
admin_router = APIRouter(prefix="/admin/events/{event_id}/board", tags=["event board"])


def get_board_service(request: Request) -> BoardService:
    database = request.app.state.db_client.database
    return BoardService(
        BoardRepository(database), CardRepository(database), EventRepository(database)
    )


BoardServiceDependency = Annotated[BoardService, Depends(get_board_service)]


@public_router.get("", response_model=BoardResponse)
async def public_board(event_id: str, service: BoardServiceDependency) -> BoardResponse:
    return await service.get_public(event_id)


@admin_router.get("", response_model=BoardResponse)
async def admin_board(
    event_id: str, admin: AdminDependency, service: BoardServiceDependency
) -> BoardResponse:
    return await service.get_admin(event_id)


@admin_router.put("", response_model=BoardResponse)
async def save_board(
    event_id: str,
    payload: BoardSave,
    admin: AdminDependency,
    service: BoardServiceDependency,
) -> BoardResponse:
    return await service.save(event_id, payload, admin)

