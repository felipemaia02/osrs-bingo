from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request

from app.modules.auth.dependencies import UserDependency
from app.modules.balance.repository import BossKcSettingsRepository
from app.modules.items.quests import QuestPointService
from app.modules.profiles.repository import ProfileRepository
from app.modules.profiles.schemas import (
    MEMBER_SEARCH_MAX_LENGTH,
    MEMBER_SEARCH_MIN_LENGTH,
    AccountAdd,
    MemberResponse,
    Preferences,
    ProfileResponse,
)
from app.modules.profiles.service import ProfileService
from app.modules.profiles.wikisync import WikiSyncClient

router = APIRouter(prefix="/profile", tags=["profile"])


async def get_profile_service(request: Request) -> ProfileService:
    database = request.app.state.db_client.database
    return ProfileService(
        ProfileRepository(database),
        request.app.state.wom_client,
        WikiSyncClient(),
        QuestPointService(database).points,
        BossKcSettingsRepository(database).excluded,
    )


ProfileServiceDependency = Annotated[ProfileService, Depends(get_profile_service)]


@router.get("/me", response_model=ProfileResponse)
async def get_profile(user: UserDependency, service: ProfileServiceDependency) -> ProfileResponse:
    return await service.get(user)


@router.patch("/me/preferences", response_model=ProfileResponse)
async def set_preferences(
    payload: Preferences, user: UserDependency, service: ProfileServiceDependency
) -> ProfileResponse:
    return await service.set_preferences(user, payload)


@router.post("/me/accounts", response_model=ProfileResponse, status_code=201)
async def add_account(
    payload: AccountAdd, user: UserDependency, service: ProfileServiceDependency
) -> ProfileResponse:
    return await service.add_account(user, payload)


@router.delete("/me/accounts/{account_id}", response_model=ProfileResponse)
async def remove_account(
    account_id: str, user: UserDependency, service: ProfileServiceDependency
) -> ProfileResponse:
    return await service.remove_account(user, account_id)


@router.post("/me/accounts/{account_id}/main", response_model=ProfileResponse)
async def make_main(
    account_id: str, user: UserDependency, service: ProfileServiceDependency
) -> ProfileResponse:
    return await service.make_main(user, account_id)


@router.post("/me/accounts/{account_id}/refresh", response_model=ProfileResponse)
async def refresh(
    account_id: str, user: UserDependency, service: ProfileServiceDependency
) -> ProfileResponse:
    return await service.refresh(user, account_id)


@router.post("/me/accounts/{account_id}/track", response_model=ProfileResponse)
async def track(
    account_id: str, user: UserDependency, service: ProfileServiceDependency
) -> ProfileResponse:
    return await service.track(user, account_id)


@router.get("/members", response_model=list[MemberResponse])
async def search_members(
    user: UserDependency,
    service: ProfileServiceDependency,
    search: str = Query(min_length=MEMBER_SEARCH_MIN_LENGTH, max_length=MEMBER_SEARCH_MAX_LENGTH),
) -> list[MemberResponse]:
    return await service.members(user, search)
