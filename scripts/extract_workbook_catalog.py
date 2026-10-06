#!/usr/bin/env python3
"""Extract the approved Bingo card catalog from the audited XLSX package."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import OrderedDict
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET
from zipfile import ZipFile

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
NS = {"m": MAIN_NS, "r": REL_NS}
EXPECTED_SHA256 = "ba75ef2a701e4ec90e66609a4de89c1189996bb96b20d79fce47687fb901958e"

RAIDS = {"Chambers of Xeric", "Theatre of Blood", "Tombs of Amascut"}
BOSS_GROUPS = {
    "God Wars Dungeon",
    "DT2 Bosses",
    "Wilderness Trio",
    "Dagannoth Kings",
    "Moons of Peril",
    "Medium Boots",
}
ACTIVITIES = {"Tempoross", "Guardians of the Rift", "Wintertodt", "Zalcano", "Thieving"}
TASKS = {"Mortimer", "Skilling Tools"}
NAME_NORMALIZATION = {"Godwars Dungeon": "God Wars Dungeon", "GOTR": "Guardians of the Rift"}
WIKI_ARTICLES = {
    "Medium Boots": "Clue scroll (medium)",
    "Mortimer": "Slayer",
    "Skilling Tools": "Dragon pickaxe",
    "Wilderness Trio": "Wilderness bosses",
    "DT2 Bosses": "Desert Treasure II - The Fallen Empire",
    "Mad Angel": "Doom of Mokhaiotl",
    "Maggot King": "Royal Titans",
    "Demonic Gorillas": "Demonic gorilla",
    "Armoured Zombies": "Zombie axe",
}


def slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", normalized.casefold()).strip("-")


def cell_values(source: Path, sheet_name: str) -> dict[str, str]:
    with ZipFile(source) as archive:
        shared_root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
        shared = [
            "".join(node.text or "" for node in item.iter(f"{{{MAIN_NS}}}t"))
            for item in shared_root.findall("m:si", NS)
        ]
        workbook = ET.fromstring(archive.read("xl/workbook.xml"))
        relationships = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
        targets = {item.attrib["Id"]: item.attrib["Target"] for item in relationships}
        sheets = workbook.find("m:sheets", NS)
        if sheets is None:
            raise ValueError("Workbook has no sheets")
        sheet = next(item for item in sheets if item.attrib["name"] == sheet_name)
        target = targets[sheet.attrib[f"{{{REL_NS}}}id"]].lstrip("/")
        if not target.startswith("xl/"):
            target = f"xl/{target}"
        worksheet = ET.fromstring(archive.read(target))
        result: dict[str, str] = {}
        for cell in worksheet.findall(".//m:sheetData/m:row/m:c", NS):
            value_node = cell.find("m:v", NS)
            if value_node is None or value_node.text is None:
                continue
            value = value_node.text
            if cell.attrib.get("t") == "s":
                value = shared[int(value)]
            result[cell.attrib["r"]] = value
        return result


def card_kind(name: str) -> str:
    if name in RAIDS:
        return "raid"
    if name in BOSS_GROUPS:
        return "boss_group"
    if name in ACTIVITIES:
        return "activity"
    if name in TASKS:
        return "task"
    return "boss"


def extract(source: Path) -> dict[str, Any]:
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    if digest != EXPECTED_SHA256:
        raise ValueError(f"Unexpected workbook SHA-256: {digest}")
    values = cell_values(source, "Accepted Drops")
    grouped: OrderedDict[str, dict[str, Any]] = OrderedDict()
    for row in range(84, 297):
        label = values.get(f"B{row}")
        if not label:
            continue
        raw_name, drop_name = label.split(" - ", 1)
        name = NAME_NORMALIZATION.get(raw_name, raw_name)
        tier = values[f"H{row}"].title()
        score = float(values[f"K{row}"])
        requirement = float(values[f"L{row}"])
        if name == "Tempoross":
            tier, score = "Low", 5.0
        card = grouped.setdefault(
            name,
            {
                "slug": slug(name),
                "name": name,
                "description": None,
                "kind": card_kind(name),
                "difficulty": tier,
                "tile_score": score,
                "completion_requirement": requirement,
                "wiki_article": WIKI_ARTICLES.get(name, name),
                "fallback_image_accepted": True,
                "rule_note": (
                    "Imported as Low/5 from the official Board formula; the flattened table "
                    "stored Mid/10."
                    if name == "Tempoross"
                    else None
                ),
                "source_cells": [],
                "drops": [],
            },
        )
        card["source_cells"].extend([f"Accepted Drops!{column}{row}" for column in "BHKLO"])
        card["drops"].append(
            {
                "key": slug(drop_name),
                "name": drop_name,
                "progress_weight": float(values[f"O{row}"]),
                "aliases": [],
                "verification_note": None,
                "counting_restriction": None,
                "source_cell": f"Accepted Drops!B{row}:O{row}",
            }
        )
    bonuses: list[dict[str, Any]] = []
    for row in range(297, 329):
        label = values.get(f"B{row}")
        if not label:
            continue
        category, name = label.split(" - ", 1)
        bonuses.append(
            {
                "category": category,
                "name": name,
                "value": float(values[f"O{row}"]),
                "source_cell": f"Accepted Drops!B{row}:O{row}",
            }
        )
    bonuses.append(
        {
            "category": "Nightmare",
            "name": "Little Nightmare",
            "value": 4.0,
            "source_cell": "Accepted Drops primary Nightmare block (flattened omission repair)",
        }
    )
    cards = list(grouped.values())
    if len(cards) != 36 or sum(len(card["drops"]) for card in cards) != 213:
        raise ValueError("Workbook card/drop counts do not match the audited source")
    if len(bonuses) != 33:
        raise ValueError("Workbook bonus count plus approved repair must be 33")
    return {
        "source": {
            "file_name": source.name,
            "sha256": digest,
            "source_bonus_count": 32,
            "resolved_bonus_count": 33,
        },
        "cards": cards,
        "bonus_entries": bonuses,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    catalog = extract(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    main()
