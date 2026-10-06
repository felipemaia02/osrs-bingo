import html
import re
from datetime import UTC, datetime
from typing import Any
from urllib.parse import quote, urlparse

import httpx

from app.core.exceptions import AppException, DomainValidationError
from app.modules.tiles.schemas import WIKI_ORIGIN, WikiImage

WIKI_API = f"{WIKI_ORIGIN}/api.php"
WIKI_USER_AGENT = "OSRSBingo/0.1 (card image resolver)"


class WikiImageResolver:
    async def resolve(self, article_title: str) -> WikiImage:
        try:
            async with httpx.AsyncClient(
                timeout=10,
                follow_redirects=True,
                headers={"User-Agent": WIKI_USER_AGENT},
            ) as client:
                article = await self._article(client, article_title)
                image = await self._image(client, article["pageimage"])
        except httpx.HTTPError as exc:
            raise AppException(502, "OSRS Wiki image service is unavailable") from exc
        return self._to_result(article, image)

    async def _article(self, client: httpx.AsyncClient, title: str) -> dict[str, Any]:
        response = await client.get(
            WIKI_API,
            params={
                "action": "query",
                "format": "json",
                "formatversion": 2,
                "redirects": 1,
                "prop": "pageimages|info",
                "piprop": "name",
                "inprop": "url",
                "titles": title,
            },
        )
        response.raise_for_status()
        pages = response.json().get("query", {}).get("pages", [])
        if not pages or pages[0].get("missing") or not pages[0].get("pageimage"):
            raise DomainValidationError("OSRS Wiki article has no representative image")
        return dict(pages[0])

    async def _image(self, client: httpx.AsyncClient, file_name: str) -> dict[str, Any]:
        response = await client.get(
            WIKI_API,
            params={
                "action": "query",
                "format": "json",
                "formatversion": 2,
                "prop": "imageinfo",
                "iiprop": "url|size|mime|extmetadata",
                "iiurlwidth": 512,
                "titles": f"File:{file_name}",
            },
        )
        response.raise_for_status()
        pages = response.json().get("query", {}).get("pages", [])
        if not pages or not pages[0].get("imageinfo"):
            raise DomainValidationError("OSRS Wiki image metadata is unavailable")
        return dict(pages[0]["imageinfo"][0])

    def _to_result(self, article: dict[str, Any], image: dict[str, Any]) -> WikiImage:
        image_url = str(image.get("thumburl") or image.get("url") or "")
        article_url = str(article.get("fullurl") or "")
        self._require_wiki_url(image_url)
        self._require_wiki_url(article_url)
        mime = str(image.get("mime") or "")
        if mime not in {"image/png", "image/jpeg", "image/webp", "image/gif"}:
            raise DomainValidationError("OSRS Wiki returned an unsupported image type")
        metadata = image.get("extmetadata", {})
        license_name = self._metadata(metadata, "LicenseShortName")
        license_url = self._metadata(metadata, "LicenseUrl")
        if license_url:
            self._require_license_url(license_url)
        attribution = self._plain_text(
            self._metadata(metadata, "Credit")
            or self._metadata(metadata, "Artist")
            or "Old School RuneScape Wiki"
        )
        file_name = str(article["pageimage"])
        file_page_url = f"{WIKI_ORIGIN}/w/File:{quote(file_name.replace(' ', '_'))}"
        return WikiImage(
            article_title=str(article["title"]),
            article_url=article_url,
            file_name=file_name,
            file_page_url=file_page_url,
            image_url=image_url,
            width=int(image.get("thumbwidth") or image.get("width") or 0),
            height=int(image.get("thumbheight") or image.get("height") or 0),
            mime_type=mime,
            attribution=attribution[:1000],
            license_name=license_name,
            license_url=license_url,
            resolved_at=datetime.now(UTC),
        )

    @staticmethod
    def _metadata(metadata: dict[str, Any], key: str) -> str | None:
        value = metadata.get(key, {}).get("value")
        return str(value) if value else None

    @staticmethod
    def _plain_text(value: str) -> str:
        return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", value)).split())

    @staticmethod
    def _require_wiki_url(value: str) -> None:
        parsed = urlparse(value)
        if parsed.scheme != "https" or parsed.hostname != "oldschool.runescape.wiki":
            raise DomainValidationError("OSRS Wiki returned an untrusted image URL")

    @staticmethod
    def _require_license_url(value: str) -> None:
        parsed = urlparse(value)
        if parsed.scheme != "https" or parsed.hostname not in {
            "oldschool.runescape.wiki",
            "creativecommons.org",
            "www.jagex.com",
            "jagex.com",
        }:
            raise DomainValidationError("OSRS Wiki returned an untrusted license URL")
