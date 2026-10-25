from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request

from app.modules.auth.dependencies import AdminDependency
from app.modules.items.repository import ItemRepository
from app.modules.items.schemas import ItemSearchResponse
from app.modules.items.service import ItemService

router = APIRouter(prefix="/admin/items", tags=["card catalog"])
MAX_QUERY_LENGTH = 80


def get_item_service(request: Request) -> ItemService:
    return ItemService(ItemRepository(request.app.state.db_client.database))


ItemServiceDependency = Annotated[ItemService, Depends(get_item_service)]


@router.get("", response_model=ItemSearchResponse)
async def search_items(
    admin: AdminDependency,
    service: ItemServiceDependency,
    q: Annotated[str, Query(max_length=MAX_QUERY_LENGTH)] = "",
) -> ItemSearchResponse:
    return await service.search(q)
