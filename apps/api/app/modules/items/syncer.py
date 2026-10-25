"""Keeps the local OSRS item list fresh in the background (feature 033)."""

import asyncio
import contextlib

from app.core.logging import get_logger, log_event
from app.modules.items.client import WikiItemsError
from app.modules.items.service import ItemService

logger = get_logger(__name__)
CHECK_EVERY_SECONDS = 6 * 60 * 60


class ItemSyncer:
    def __init__(self, service: ItemService) -> None:
        self._service = service
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
            await asyncio.sleep(CHECK_EVERY_SECONDS)
