from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.exceptions import AppException, NotFoundError
from app.core.storage import LocalScreenshotStorage
from app.modules.boards.service import is_publishable_board
from app.modules.submissions.images import PNG_SIGNATURE
from app.modules.tiles.artwork import artwork_file, store_artwork
from app.modules.tiles.schemas import CardArtwork
from tests.unit.test_tiles_service import card_payload

PNG = PNG_SIGNATURE + b"\x00" * 64


async def test_artwork_is_stored_under_a_random_name_and_served_back(tmp_path: Path) -> None:
    storage = LocalScreenshotStorage(tmp_path)

    upload = await store_artwork(storage, PNG, max_bytes=1024)

    assert upload.content_type == "image/png"
    assert upload.key.startswith("cards/artwork/") and upload.key.endswith(".png")
    name = upload.key.removeprefix("cards/artwork/")
    assert await artwork_file(storage, name) == (None, PNG, "image/png")


async def test_artwork_must_be_an_image_within_the_size_limit(tmp_path: Path) -> None:
    storage = LocalScreenshotStorage(tmp_path)
    with pytest.raises(AppException) as wrong_type:
        await store_artwork(storage, b"GIF89a....", max_bytes=1024)
    assert wrong_type.value.status_code == 422
    with pytest.raises(AppException) as too_big:
        await store_artwork(storage, PNG, max_bytes=10)
    assert too_big.value.status_code == 413


async def test_only_artwork_names_can_be_read(tmp_path: Path) -> None:
    storage = LocalScreenshotStorage(tmp_path)
    with pytest.raises(NotFoundError):
        await artwork_file(storage, "../../events/x/submissions/y.png")
    with pytest.raises(AppException) as missing:
        await artwork_file(storage, "0" * 32 + ".png")
    assert missing.value.status_code == 404


def test_a_card_can_use_artwork_instead_of_the_wiki_image() -> None:
    artwork = {"key": "cards/artwork/" + "a" * 32 + ".png", "content_type": "image/png"}
    payload = card_payload(
        fallback_image_accepted=False, artwork={**artwork, "artist": "  Rune  Rita "}
    )
    assert payload.artwork is not None and payload.artwork.artist == "Rune Rita"
    with pytest.raises(ValidationError):
        CardArtwork(key="events/x/submissions/y.png", content_type="image/png")
    with pytest.raises(ValidationError, match="Wiki image"):
        card_payload(fallback_image_accepted=False)
    board = {
        "size": 3,
        "positions": [
            {"position": index, "card": {"card_id": str(index), "artwork": artwork}}
            for index in range(1, 10)
        ],
    }
    assert is_publishable_board(board)
