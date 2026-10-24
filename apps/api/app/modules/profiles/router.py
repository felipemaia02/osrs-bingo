from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.modules.auth.dependencies import UserDependency
from app.modules.profiles.repository import ProfileRepository
from app.modules.profiles.schemas import AccountAdd, Preferences, ProfileResponse
from app.modules.profiles.service import ProfileService

router = APIRouter(prefix="/profile/me", tags=["profile"])


async def get_profile_service(request: Request) -> ProfileService:
    return ProfileService(
        ProfileRepository(request.app.state.db_client.database), request.app.state.wom_client
    )


ProfileServiceDependency = Annotated[ProfileService, Depends(get_profile_service)]


@router.get("", response_model=ProfileResponse)
async def get_profile(user: UserDependency, service: ProfileServiceDependency) -> ProfileResponse:
    return await service.get(user)


@router.patch("/preferences", response_model=ProfileResponse)
async def set_preferences(
    payload: Preferences, user: UserDependency, service: ProfileServiceDependency
) -> ProfileResponse:
    return await service.set_preferences(user, payload)


@router.post("/accounts", response_model=ProfileResponse, status_code=201)
async def add_account(
    payload: AccountAdd, user: UserDependency, service: ProfileServiceDependency
) -> ProfileResponse:
    return await service.add_account(user, payload)


@router.delete("/accounts/{account_id}", response_model=ProfileResponse)
async def remove_account(
    account_id: str, user: UserDependency, service: ProfileServiceDependency
) -> ProfileResponse:
    return await service.remove_account(user, account_id)


@router.post("/accounts/{account_id}/main", response_model=ProfileResponse)
async def make_main(
    account_id: str, user: UserDependency, service: ProfileServiceDependency
) -> ProfileResponse:
    return await service.make_main(user, account_id)


@router.post("/accounts/{account_id}/refresh", response_model=ProfileResponse)
async def refresh(
    account_id: str, user: UserDependency, service: ProfileServiceDependency
) -> ProfileResponse:
    return await service.refresh(user, account_id)


@router.post("/accounts/{account_id}/track", response_model=ProfileResponse)
async def track(
    account_id: str, user: UserDependency, service: ProfileServiceDependency
) -> ProfileResponse:
    return await service.track(user, account_id)
