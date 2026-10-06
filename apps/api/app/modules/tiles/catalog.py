import json
from importlib.resources import files
from typing import Any, cast

EXPECTED_WORKBOOK_SHA256 = "ba75ef2a701e4ec90e66609a4de89c1189996bb96b20d79fce47687fb901958e"


def load_workbook_catalog() -> dict[str, Any]:
    resource = files("app.modules.tiles").joinpath("data/workbook_catalog.json")
    catalog = cast(dict[str, Any], json.loads(resource.read_text(encoding="utf-8")))
    source = catalog.get("source", {})
    cards = catalog.get("cards", [])
    bonuses = catalog.get("bonus_entries", [])
    if source.get("sha256") != EXPECTED_WORKBOOK_SHA256:
        raise RuntimeError("Bundled workbook catalog source hash is invalid")
    if len(cards) != 36 or sum(len(card.get("drops", [])) for card in cards) != 213:
        raise RuntimeError("Bundled workbook catalog card/drop counts are invalid")
    if source.get("source_bonus_count") != 32 or len(bonuses) != 33:
        raise RuntimeError("Bundled workbook bonus catalog counts are invalid")
    return catalog
