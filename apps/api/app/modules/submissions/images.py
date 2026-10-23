"""Screenshot validation from file content (never from the client's name or type)."""

from app.core.exceptions import AppException

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
JPEG_SIGNATURE = b"\xff\xd8\xff"
WEBP_RIFF = b"RIFF"
WEBP_FORMAT = b"WEBP"
WEBP_FORMAT_OFFSET = 8

INVALID_IMAGE_DETAIL = "Screenshot must be a PNG, JPEG or WebP image"
IMAGE_TOO_LARGE_DETAIL = "Screenshot is too large"

EXTENSIONS = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}


def sniff_image_type(data: bytes) -> str | None:
    if data.startswith(PNG_SIGNATURE):
        return "image/png"
    if data.startswith(JPEG_SIGNATURE):
        return "image/jpeg"
    if (
        data.startswith(WEBP_RIFF)
        and data[WEBP_FORMAT_OFFSET : WEBP_FORMAT_OFFSET + len(WEBP_FORMAT)] == WEBP_FORMAT
    ):
        return "image/webp"
    return None


def validate_screenshot(data: bytes, max_bytes: int) -> str:
    """Returns the sniffed content type or raises a 4xx error."""
    if len(data) > max_bytes:
        raise AppException(413, IMAGE_TOO_LARGE_DETAIL)
    content_type = sniff_image_type(data)
    if content_type is None:
        raise AppException(422, INVALID_IMAGE_DETAIL)
    return content_type
