from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import DomainValidationError
from app.modules.auth.schemas import CurrentUser
from app.modules.tiles.catalog import EXPECTED_WORKBOOK_SHA256, load_workbook_catalog
from app.modules.tiles.repository import CardRepository
from app.modules.tiles.service import CardService
from app.modules.tiles.wiki import WikiImageResolver

ADMIN = CurrentUser(id="admin-id", discord_id="123", username="Admin", is_admin=True)


def test_bundled_workbook_catalog_matches_audited_counts_and_decisions() -> None:
    catalog = load_workbook_catalog()

    assert catalog["source"]["sha256"] == EXPECTED_WORKBOOK_SHA256
    assert len(catalog["cards"]) == 36
    assert sum(len(card["drops"]) for card in catalog["cards"]) == 213
    tempoross = next(card for card in catalog["cards"] if card["name"] == "Tempoross")
    assert (tempoross["difficulty"], tempoross["tile_score"]) == ("Low", 5.0)
    assert any(entry["name"] == "Little Nightmare" for entry in catalog["bonus_entries"])


async def test_workbook_import_reports_idempotent_usable_catalog() -> None:
    repository = AsyncMock(spec=CardRepository)
    repository.import_workbook.return_value = (0, 36, [])

    result = await CardService(repository).import_workbook(ADMIN)

    assert result.usable is True
    assert result.existing_cards == 36
    assert result.resolved_bonus_entries == 33


def test_wiki_result_rejects_non_wiki_image_host() -> None:
    resolver = WikiImageResolver()
    article = {
        "title": "Vorkath",
        "fullurl": "https://oldschool.runescape.wiki/w/Vorkath",
        "pageimage": "Vorkath.png",
    }
    image = {
        "url": "https://attacker.example/vorkath.png",
        "width": 200,
        "height": 200,
        "mime": "image/png",
        "extmetadata": {},
    }

    with pytest.raises(DomainValidationError, match="untrusted"):
        resolver._to_result(article, image)


def test_wiki_result_keeps_attribution_and_pinned_file() -> None:
    resolver = WikiImageResolver()
    article = {
        "title": "Vorkath",
        "fullurl": "https://oldschool.runescape.wiki/w/Vorkath",
        "pageimage": "Vorkath.png",
    }
    image = {
        "url": "https://oldschool.runescape.wiki/images/Vorkath.png",
        "width": 200,
        "height": 300,
        "mime": "image/png",
        "extmetadata": {
            "Artist": {"value": "<b>Jagex</b>"},
            "LicenseShortName": {"value": "Fair use"},
        },
    }

    result = resolver._to_result(article, image)

    assert result.file_name == "Vorkath.png"
    assert result.attribution == "Jagex"
    assert result.resolved_at <= datetime.now(UTC)
