#!/usr/bin/env python3
"""Merge validated OSRS Wiki API responses into the generated catalog fixture."""

from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlparse

WIKI_ORIGIN = "https://oldschool.runescape.wiki"
IMAGE_MIME_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}


def plain_text(value: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", value)).split())


def metadata(image: dict[str, Any], key: str) -> str | None:
    value = image.get("extmetadata", {}).get(key, {}).get("value")
    return str(value) if value else None


def trusted_wiki_url(value: str) -> bool:
    parsed = urlparse(value)
    return parsed.scheme == "https" and parsed.hostname == "oldschool.runescape.wiki"


def file_key(value: str) -> str:
    return value.removeprefix("File:").replace("_", " ").casefold()


def merge(
    catalog: dict[str, Any],
    article_response: dict[str, Any],
    image_response: dict[str, Any],
    resolved_at: str,
) -> None:
    article_query = article_response["query"]
    redirects = {item["from"]: item["to"] for item in article_query.get("redirects", [])}
    articles = {item["title"]: item for item in article_query["pages"]}
    images = {file_key(item["title"]): item for item in image_response["query"]["pages"]}
    resolved = 0
    for card in catalog["cards"]:
        requested = card["wiki_article"]
        title = redirects.get(requested, requested)
        article = articles.get(title)
        if article is None or not article.get("pageimage"):
            raise ValueError(f"No representative image for {card['name']} ({requested})")
        image_page = images.get(file_key(str(article["pageimage"])))
        if image_page is None or not image_page.get("imageinfo"):
            raise ValueError(f"No image metadata for {card['name']}")
        image = image_page["imageinfo"][0]
        image_url = str(image.get("thumburl") or image.get("url") or "")
        article_url = str(article.get("fullurl") or "")
        if not trusted_wiki_url(image_url) or not trusted_wiki_url(article_url):
            raise ValueError(f"Untrusted Wiki URL for {card['name']}")
        if image.get("mime") not in IMAGE_MIME_TYPES:
            raise ValueError(f"Unsupported image type for {card['name']}")
        file_name = str(article["pageimage"])
        license_url = metadata(image, "LicenseUrl")
        if license_url and urlparse(license_url).scheme != "https":
            license_url = None
        card["wiki_image"] = {
            "article_title": str(article["title"]),
            "article_url": article_url,
            "file_name": file_name,
            "file_page_url": str(image.get("descriptionurl"))
            if trusted_wiki_url(str(image.get("descriptionurl") or ""))
            else f"{WIKI_ORIGIN}/w/File:{quote(file_name.replace(' ', '_'))}",
            "image_url": image_url,
            "width": int(image.get("thumbwidth") or image.get("width") or 0),
            "height": int(image.get("thumbheight") or image.get("height") or 0),
            "mime_type": str(image["mime"]),
            "attribution": plain_text(
                metadata(image, "Credit")
                or metadata(image, "Artist")
                or "Old School RuneScape Wiki"
            )[:1000],
            "license_name": metadata(image, "LicenseShortName"),
            "license_url": license_url,
            "resolved_at": resolved_at,
        }
        card["fallback_image_accepted"] = True
        resolved += 1
    if resolved != 36:
        raise ValueError(f"Expected 36 resolved card images, got {resolved}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("catalog", type=Path)
    parser.add_argument("articles", type=Path)
    parser.add_argument("images", type=Path)
    parser.add_argument("--resolved-at", required=True)
    args = parser.parse_args()
    catalog = json.loads(args.catalog.read_text())
    merge(
        catalog,
        json.loads(args.articles.read_text()),
        json.loads(args.images.read_text()),
        args.resolved_at,
    )
    args.catalog.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
