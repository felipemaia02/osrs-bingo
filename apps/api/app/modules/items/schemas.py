from pydantic import BaseModel


class ItemOption(BaseModel):
    """One pick in the card drop search (feature 033)."""

    name: str
    # What the card shows: the name, or the version ("Bird nest (seeds)").
    label: str
    item_ids: list[int]
    icon_url: str | None
    # True for an item with one version and for the "any version" entry of a group.
    any_version: bool
    versions: int


class ItemSearchResponse(BaseModel):
    # False until the first download of the wiki item list finishes.
    ready: bool
    items: list[ItemOption]
