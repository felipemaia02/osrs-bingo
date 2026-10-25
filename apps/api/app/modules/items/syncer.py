"""Keeps the local OSRS item list fresh in the background (feature 033)."""

import asyncio
import contextlib

from app.core.logging import get_logger, log_event
from app.modules.items.client import WikiItemsError
from app.modules.items.quests import QuestPointService
from app.modules.items.service import ItemService

logger = get_logger(__name__)
CHECK_EVERY_SECONDS = 6 * 60 * 60


class ItemSyncer:
    def __init__(self, service: ItemService, quests: QuestPointService | None = None) -> None:
        self._service = service
        # Quest points table (feature 034), refreshed on the same weekly rhythm.
        self._quests = quests
        self._task: asyncio.Task[None] | None = None

    def start(self) -> None:
        self._task = asyncio.create_task(self._run(), name="osrs-item-sync")

    async def stop(self) -> None:
        if self._task is None:
            return
        self._task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await self._task

    async def _run(self) -> None:
        while True:
            try:
                count = await self._service.sync_if_stale()
                if count is not None:
                    log_event(logger, 20, "osrs_items_synced", count=count)
            except WikiItemsError as exc:
                log_event(logger, 30, "osrs_items_sync_failed", error=str(exc)[:200])
            except Exception as exc:  # the API must keep running whatever happens
                log_event(logger, 40, "osrs_items_sync_crashed", error=type(exc).__name__)
            await self._sync_quests()
            await asyncio.sleep(CHECK_EVERY_SECONDS)

    async def _sync_quests(self) -> None:
        if self._quests is None:
            return
        try:
            count = await self._quests.sync_if_stale()
            if count is not None:
                log_event(logger, 20, "osrs_quest_points_synced", count=count)
        except WikiItemsError as exc:
            log_event(logger, 30, "osrs_quest_points_sync_failed", error=str(exc)[:200])
        except Exception as exc:  # the API must keep running whatever happens
            log_event(logger, 40, "osrs_quest_points_sync_crashed", error=type(exc).__name__)
