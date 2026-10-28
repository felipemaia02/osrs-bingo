from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, Request, UploadFile, status
from fastapi.responses import RedirectResponse, Response

from app.core.config import settings
from app.core.storage import ScreenshotStorage
from app.modules.auth.dependencies import AdminDependency
from app.modules.items.router import ItemServiceDependency
from app.modules.tiles.artwork import artwork_file, store_artwork
from app.modules.tiles.repository import CardRepository
from app.modules.tiles.schemas import (
    CardArtworkUpload,
    CardCreate,
    CardDetail,
    CardListResponse,
    CardRetire,
    CardRevisionCreate,
    LinkItemsResponse,
    WikiImage,
    WikiImageResolveRequest,
    WorkbookImportResponse,
)
from app.modules.tiles.service import CardService
from app.modules.tiles.wiki import WikiImageResolver

router = APIRouter(prefix="/admin/cards", tags=["card catalog"])
wiki_router = APIRouter(prefix="/admin/wiki-images", tags=["card catalog"])
artwork_router = APIRouter(prefix="/card-artwork", tags=["card catalog"])
ARTWORK_CACHE = "public, max-age=604800, immutable"


def get_card_service(request: Request) -> CardService:
    return CardService(CardRepository(request.app.state.db_client.database))


CardServiceDependency = Annotated[CardService, Depends(get_card_service)]


def get_wiki_image_resolver() -> WikiImageResolver:
    return WikiImageResolver()


WikiImageResolverDependency = Annotated[WikiImageResolver, Depends(get_wiki_image_resolver)]


@router.get("", response_model=CardListResponse)
async def list_cards(
    admin: AdminDependency,
    service: CardServiceDependency,
    include_retired: Annotated[bool, Query()] = False,
) -> CardListResponse:
    return CardListResponse(items=await service.list(include_retired))


@router.post("", response_model=CardDetail, status_code=status.HTTP_201_CREATED)
async def create_card(
    payload: CardCreate, admin: AdminDependency, service: CardServiceDependency
) -> CardDetail:
    return await service.create(payload, admin)


@router.post("/import-workbook", response_model=WorkbookImportResponse)
async def import_workbook(
    admin: AdminDependency, service: CardServiceDependency
) -> WorkbookImportResponse:
    return await service.import_workbook(admin)


@router.post("/link-items", response_model=LinkItemsResponse)
async def link_items(
    admin: AdminDependency, service: CardServiceDependency, items: ItemServiceDependency
) -> LinkItemsResponse:
    return await service.link_items(admin, items)


@wiki_router.post("/resolve", response_model=WikiImage)
async def resolve_wiki_image(
    payload: WikiImageResolveRequest,
    admin: AdminDependency,
    resolver: WikiImageResolverDependency,
) -> WikiImage:
    return await resolver.resolve(payload.article_title)


@router.get("/{card_id}", response_model=CardDetail)
async def get_card(
    card_id: str, admin: AdminDependency, service: CardServiceDependency
) -> CardDetail:
    return await service.get(card_id)


@router.post("/{card_id}/revisions", response_model=CardDetail)
async def add_card_revision(
    card_id: str,
    payload: CardRevisionCreate,
    admin: AdminDependency,
    service: CardServiceDependency,
) -> CardDetail:
    return await service.add_revision(card_id, payload, admin)


@router.post("/{card_id}/retire", response_model=CardDetail)
async def retire_card(
    card_id: str,
    payload: CardRetire,
    admin: AdminDependency,
    service: CardServiceDependency,
) -> CardDetail:
    return await service.retire(card_id, payload, admin)


@router.post("/artwork", response_model=CardArtworkUpload, status_code=status.HTTP_201_CREATED)
async def upload_artwork(
    request: Request, admin: AdminDependency, image: Annotated[UploadFile, File()]
) -> CardArtworkUpload:
    """Clan artwork for a card (feature 041); saved with the next card revision."""
    storage: ScreenshotStorage = request.app.state.screenshot_storage
    data = await image.read(settings.max_screenshot_bytes + 1)
    return await store_artwork(storage, data, settings.max_screenshot_bytes)


@artwork_router.get("/{name}")
async def artwork(name: str, request: Request) -> Response:
    """Public: boards show the artwork to everyone. Names are random and never change."""
    storage: ScreenshotStorage = request.app.state.screenshot_storage
    url, data, content_type = await artwork_file(storage, name)
    if url is not None:
        return RedirectResponse(url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    return Response(content=data, media_type=content_type, headers={"Cache-Control": ARTWORK_CACHE})
