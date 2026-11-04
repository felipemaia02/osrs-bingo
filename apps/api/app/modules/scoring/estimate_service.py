"""Card time estimates for admins (feature 060): WOM boss rates and a live preview."""

from pydantic import BaseModel, ConfigDict, Field

from app.core.exceptions import AppException
from app.modules.profiles.wom import WomClient, WomUnavailableError
from app.modules.scoring.estimates import Estimate, suggested_kills_per_hour
from app.modules.tiles.schemas import revision_estimate

WOM_UNAVAILABLE = "Wise Old Man is unavailable; type the kills per hour by hand"


class EhbRate(BaseModel):
    boss: str
    label: str
    ironman_kills_per_hour: float
    suggested_kills_per_hour: float


class PreviewDrop(BaseModel):
    """A drop row being edited: only what the estimate uses."""

    model_config = ConfigDict(extra="ignore")

    progress_weight: float = Field(gt=0, le=100_000)
    drop_rate: float | None = Field(default=None, gt=0, le=10_000_000)


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

    @staticmethod
    def preview(card: EstimatePreview) -> Estimate:
        return revision_estimate(card)
