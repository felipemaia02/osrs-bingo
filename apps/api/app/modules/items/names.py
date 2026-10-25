"""Item name comparison shared by the item list (033) and DropTracker matching (030)."""

import unicodedata


def normalize_name(value: str | None) -> str:
    """Case-, accent- and spacing-insensitive item/NPC name."""
    text = unicodedata.normalize("NFKD", value or "")
    text = "".join(char for char in text if not unicodedata.combining(char))
    return " ".join(text.casefold().split())
