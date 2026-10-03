from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request

from app.modules.administration.repository import AdministrationRepository
from app.modules.administration.schemas import DirectoryUser, RoleUpdate, UserDirectory
from app.modules.administration.service import AdministrationService
from app.modules.auth.dependencies import AdminDependency

router = APIRouter(prefix="/admin", tags=["administration"])


async def get_administration_service(request: Request) -> AdministrationService:
    return AdministrationService(AdministrationRepository(request.app.state.db_client.database))


AdministrationServiceDependency = Annotated[
    AdministrationService, Depends(get_administration_service)
]


@router.get("/users", response_model=UserDirectory)
async def directory(
    admin: AdminDependency,
    service: AdministrationServiceDependency,
    search: Annotated[str, Query(max_length=64)] = "",
    offset: Annotated[int, Query(ge=0, le=100000)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> UserDirectory:
    return await service.directory(search.strip(), offset, limit)


@router.patch("/users/{user_id}/role", response_model=DirectoryUser)
async def change_role(
    user_id: str,
    payload: RoleUpdate,
    admin: AdminDependency,
    service: AdministrationServiceDependency,
) -> DirectoryUser:
    return await service.change_role(admin, user_id, payload.is_admin)
