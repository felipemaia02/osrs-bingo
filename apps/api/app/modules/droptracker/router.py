from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request

from app.core.config import settings
from app.modules.auth.dependencies import AdminDependency
from app.modules.droptracker.repository import DropRepository
from app.modules.droptracker.schemas import DropPage, DropQuery, DropTrackerStatus
from app.modules.droptracker.service import DropTrackerService

router = APIRouter(prefix="/admin/droptracker", tags=["droptracker"])


async def get_droptracker_service(request: Request) -> DropTrackerService:
    return DropTrackerService(DropRepository(request.app.state.db_client.database), None, settings)


DropTrackerServiceDependency = Annotated[DropTrackerService, Depends(get_droptracker_service)]


@router.get("/status", response_model=DropTrackerStatus)
async def status(
    admin: AdminDependency, service: DropTrackerServiceDependency
) -> DropTrackerStatus:
    return await service.status()


@router.get("/drops", response_model=DropPage)
async def drops(
    admin: AdminDependency,
    service: DropTrackerServiceDependency,
    query: Annotated[DropQuery, Query()],
) -> DropPage:
    return await service.drops(query)
