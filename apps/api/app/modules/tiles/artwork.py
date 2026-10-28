"""Card artwork files (feature 041), kept in the screenshot storage under cards/artwork/."""

import re
from uuid import uuid4

from app.core.exceptions import NotFoundError
from app.core.storage import ScreenshotStorage
from app.modules.submissions.images import EXTENSIONS, validate_screenshot
from app.modules.tiles.schemas import CardArtworkUpload

ARTWORK_PREFIX = "cards/artwork/"
ARTWORK_NAME = re.compile(r"^[0-9a-f]{32}\.(png|jpg|webp)$")
CONTENT_TYPES = {extension: content_type for content_type, extension in EXTENSIONS.items()}


async def store_artwork(
    storage: ScreenshotStorage, data: bytes, max_bytes: int
) -> CardArtworkUpload:
    """Checks the image from its content and stores it under a random name."""
    content_type = validate_screenshot(data, max_bytes)
    key = f"{ARTWORK_PREFIX}{uuid4().hex}.{EXTENSIONS[content_type]}"
    await storage.put(key, data, content_type)
    return CardArtworkUpload(key=key, content_type=content_type)


async def artwork_file(
    storage: ScreenshotStorage, name: str
) -> tuple[str | None, bytes | None, str]:
    """A signed URL or the bytes to serve, plus the content type."""
    match = ARTWORK_NAME.fullmatch(name)
    if match is None:
        raise NotFoundError("Artwork")
    key = f"{ARTWORK_PREFIX}{name}"
    content_type = CONTENT_TYPES[match.group(1)]
    url = await storage.signed_url(key)
    if url is not None:
        return url, None, content_type
    return None, await storage.read(key), content_type
