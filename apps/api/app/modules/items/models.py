"""Turns OSRS Wiki item rows into the local item list (feature 033)."""

from pathlib import PurePosixPath
from typing import Any, TypedDict
from urllib.parse import quote

from app.modules.items.names import normalize_name
from app.modules.tiles.schemas import WIKI_ORIGIN


class ItemDocument(TypedDict):
    name: str
    label: str
    normalized_name: str
    item_ids: list[int]
    image: str | None


def icon_url(image: str | None) -> str | None:
    if not image:
        return None
    return f"{WIKI_ORIGIN}/images/{quote(image.replace(' ', '_'))}"


def _first(value: Any) -> str | None:
    if isinstance(value, list):
        return str(value[0]) if value else None
    return str(value) if value else None


def _ids(value: Any) -> list[int]:
    raw = value if isinstance(value, list) else [value]
    return sorted({int(item) for item in raw if str(item).strip().isdigit()})


def _label(name: str, image: str | None, anchor: str | None) -> str:
    """The image file tells same-name versions apart ("Bird nest (seeds).png")."""
    stem = PurePosixPath(image).stem if image else ""
    # Only "Name (version)" files name a version; "Coins 10000.png" is just a picture.
    if stem.casefold().startswith(f"{name} (".casefold()):
        return stem
    return f"{name} ({anchor})" if anchor else name


def to_items(rows: list[dict[str, Any]]) -> list[ItemDocument]:
    """Wiki rows with a name and a numeric ID; rows with the same label (e.g. every
    "Clue scroll (elite)" step) become one item with all their IDs."""
    items: dict[str, ItemDocument] = {}
    for row in rows:
        name = " ".join(str(row.get("item_name") or "").split())
        ids = _ids(row.get("item_id"))
        if not name or not ids:
            continue
        image = _first(row.get("image"))
        image = image.removeprefix("File:") if image else None
        label = _label(name, image, _first(row.get("version_anchor")))
        item = items.setdefault(
            label,
            ItemDocument(
                name=name,
                label=label,
                normalized_name=normalize_name(name),
                item_ids=[],
                image=image,
            ),
        )
        item["item_ids"] = sorted({*item["item_ids"], *ids})
    return list(items.values())
