"""Card time estimates for admins (feature 060): WOM boss rates and a live preview."""

import re

from pydantic import BaseModel, ConfigDict, Field

from app.core.exceptions import AppException
from app.modules.profiles.wom import WomClient, WomUnavailableError
from app.modules.scoring.estimates import RATE_MAX_LENGTH, Estimate, suggested_kills_per_hour
from app.modules.tiles.schemas import revision_estimate

WOM_UNAVAILABLE = "Wise Old Man is unavailable; type the kills per hour by hand"
NO_WOM_BOSS = "No Wise Old Man boss has this name"
# WOM names some bosses with an article: Hueycoatl → the_hueycoatl.
WOM_PREFIX = "the_"


def wom_key(name: str) -> str:
    """ "Phantom Muspah" → "phantom_muspah", like WOM's boss metrics."""
    return re.sub(r"[^a-z0-9]+", "_", name.casefold()).strip("_")


class EhbRate(BaseModel):
    boss: str
    label: str
    ironman_kills_per_hour: float
    suggested_kills_per_hour: float


class PreviewDrop(BaseModel):
    """A drop row being edited: only what the estimate uses."""

    model_config = ConfigDict(extra="ignore")

    progress_weight: float = Field(gt=0, le=100_000)
    drop_rate: str | None = Field(default=None, max_length=RATE_MAX_LENGTH)


class EstimatePreview(BaseModel):
    """The card editor's unsaved values."""

    model_config = ConfigDict(extra="ignore")

    completion_requirement: float = Field(gt=0, le=100_000)
    drops: list[PreviewDrop] = Field(max_length=100)
    kills_per_hour: float | None = Field(default=None, gt=0, le=10_000)


class EstimateService:
    def __init__(self, wom: WomClient) -> None:
        self._wom = wom

    async def ehb_rates(self) -> list[EhbRate]:
        try:
            rates = await self._wom.ironman_ehb_rates()
        except WomUnavailableError as error:
            raise AppException(502, WOM_UNAVAILABLE) from error
        return [
            EhbRate(
                boss=boss,
                label=boss.replace("_", " ").title(),
                ironman_kills_per_hour=rate,
                suggested_kills_per_hour=suggested_kills_per_hour(rate),
            )
            for boss, rate in sorted(rates)
        ]

    async def match(self, name: str) -> EhbRate:
        """The WOM boss named like the card ("Find on WOM" button); 404 when none is."""
        key = wom_key(name)
        by_boss = {rate.boss: rate for rate in await self.ehb_rates()}
        found = by_boss.get(key) or by_boss.get(WOM_PREFIX + key)
        if found is None:
            raise AppException(404, NO_WOM_BOSS)
        return found

    @staticmethod
    def preview(card: EstimatePreview) -> Estimate:
        return revision_estimate(card)
