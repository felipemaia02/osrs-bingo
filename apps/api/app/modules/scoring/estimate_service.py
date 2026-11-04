"""Card time estimates for admins (feature 060): WOM boss rates and a live preview."""

import re

from pydantic import BaseModel, ConfigDict, Field

from app.core.exceptions import AppException
from app.modules.profiles.wom import WomClient, WomUnavailableError
from app.modules.scoring.estimates import RATE_MAX_LENGTH, Estimate, suggested_kills_per_hour
from app.modules.scoring.wiki_rates import SOURCE_ANCHOR, WikiDropRateClient, WikiRatesError
from app.modules.tiles.schemas import revision_estimate

WOM_UNAVAILABLE = "Wise Old Man is unavailable; type the kills per hour by hand"
NO_WOM_BOSS = "No Wise Old Man boss has this name"
WIKI_UNAVAILABLE = "The OSRS Wiki is unavailable; type the drop rates by hand"
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


class WikiSource(BaseModel):
    source: str
    rarity: str


class WikiDropRate(BaseModel):
    """`rate` when one wiki line fits the card; else `sources` to pick from (none = not found)."""

    name: str
    rate: str | None
    sources: list[WikiSource]


def same_source(source: str, card_names: set[str]) -> bool:
    """ "Tormented Demon" fits the card "Tormented Demons"; "Ancient chest#Normal" its page."""
    page = wom_key(source.split(SOURCE_ANCHOR)[0])
    return page in card_names or page.rstrip("s") in card_names


def pick_rate(lines: list[tuple[str, str]], card_names: set[str]) -> str | None:
    """The card's own source, else the only rarity every source agrees on."""
    own = {rarity for source, rarity in lines if same_source(source, card_names)}
    if len(own) == 1:
        return own.pop()
    every = {rarity for _source, rarity in lines}
    return every.pop() if len(every) == 1 and not own else None


class EstimateService:
    def __init__(self, wom: WomClient, wiki: WikiDropRateClient | None = None) -> None:
        self._wom = wom
        self._wiki = wiki or WikiDropRateClient()

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

    async def wiki_rates(self, card: str, items: list[str]) -> list[WikiDropRate]:
        """Each drop's rate on the OSRS Wiki for this card ("Import from wiki" button)."""
        try:
            lines = await self._wiki.drop_lines(items)
        except WikiRatesError as error:
            raise AppException(502, WIKI_UNAVAILABLE) from error
        names = {key for key in (wom_key(card), wom_key(card).rstrip("s")) if key}
        result = []
        for item in items:
            found = lines.get(item.casefold(), [])
            result.append(
                WikiDropRate(
                    name=item,
                    rate=pick_rate(found, names),
                    sources=[WikiSource(source=source, rarity=rarity) for source, rarity in found],
                )
            )
        return result

    @staticmethod
    def preview(card: EstimatePreview) -> Estimate:
        return revision_estimate(card)
