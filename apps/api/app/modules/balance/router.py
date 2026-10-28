from typing import Annotated

from fastapi import APIRouter, Depends, Request

from app.modules.auth.dependencies import AdminDependency
from app.modules.balance.kc import RAIDS
from app.modules.balance.repository import BossKcSettingsRepository
from app.modules.balance.schemas import BossKcSettings, BossKcSettingsUpdate

router = APIRouter(prefix="/boss-kc-settings", tags=["team balance"])


def get_settings_repository(request: Request) -> BossKcSettingsRepository:
    return BossKcSettingsRepository(request.app.state.db_client.database)


SettingsDependency = Annotated[BossKcSettingsRepository, Depends(get_settings_repository)]


async def _response(settings: BossKcSettingsRepository) -> BossKcSettings:
    excluded = await settings.excluded()
    known = sorted({*await settings.known_bosses(), *excluded})
    return BossKcSettings(excluded=excluded, raids=list(RAIDS), known=known)


@router.get("", response_model=BossKcSettings)
async def get_boss_kc_settings(
    admin: AdminDependency, settings: SettingsDependency
) -> BossKcSettings:
    return await _response(settings)


@router.put("", response_model=BossKcSettings)
async def set_boss_kc_settings(
    payload: BossKcSettingsUpdate, admin: AdminDependency, settings: SettingsDependency
) -> BossKcSettings:
    await settings.set_excluded(payload.excluded, admin.id)
    return await _response(settings)
