#!/usr/bin/env python3
"""Compile the canonical item/technique workbooks into a browser data module.

Uses only the Python standard library. The spreadsheets in data/catalog-source
remain authoritative; data/workbook-catalogs.js is generated output.
"""

from __future__ import annotations

import json
import posixpath
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "data" / "catalog-source"
OUTPUT = ROOT / "data" / "workbook-catalogs.js"
NS = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "rel": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "pkg": "http://schemas.openxmlformats.org/package/2006/relationships",
}
GAME_REALM_NAMES = [
    "หลอมกาย", "รวบรวมวิญญาณ", "ควบแน่นวิญญาณ", "สร้างรากฐาน", "ก่อตั้งแก่นทอง",
    "ก่อกำเนิดวิญญาณ", "แปรวิญญาณ", "หลอมสุญญตา", "ผสานเต๋า", "ข้ามเคราะห์เซียน",
]
WORKBOOK_REALM_TO_GAME = {
    "หลอมกาย": 1,
    "รวบรวมวิญญาณ": 2,
    "ควบแน่นวิญญาณ": 3,
    "สร้างรากฐาน": 4,
    "แก่นทองคำ": 5,
    "วิญญาณแรกกำเนิด": 6,
    "แปรเทวะ": 7,
    "มหายาน": 9,
    "ข้ามเคราะห์": 10,
}


def annotate_game_realm(row: dict, field: str, game_field: str, stage_field: str | None = None) -> None:
    match = re.fullmatch(r"(.+?)\s+ขั้น\s+(\d+)", str(row.get(field) or "")) if stage_field else None
    name = match.group(1) if match else str(row.get(field) or "")
    realm = WORKBOOK_REALM_TO_GAME.get(name)
    if realm is None:
        raise ValueError(f"No game realm mapping for workbook value {name!r} in {field}")
    row[game_field] = realm
    row[game_field + "_Name"] = GAME_REALM_NAMES[realm - 1]
    if stage_field:
        row[stage_field] = int(match.group(2))


def column_index(reference: str) -> int:
    letters = re.match(r"[A-Z]+", reference or "")
    if not letters:
        raise ValueError(f"Invalid XLSX cell reference: {reference!r}")
    result = 0
    for char in letters.group(0):
        result = result * 26 + ord(char) - 64
    return result - 1


def read_shared_strings(book: zipfile.ZipFile) -> list[str]:
    try:
        root = ET.fromstring(book.read("xl/sharedStrings.xml"))
    except KeyError:
        return []
    return ["".join(part.text or "" for part in item.findall(".//main:t", NS))
            for item in root.findall("main:si", NS)]


def read_cell(cell: ET.Element, shared: list[str]):
    kind = cell.get("t")
    if kind == "inlineStr":
        return "".join(part.text or "" for part in cell.findall(".//main:t", NS))
    value = cell.find("main:v", NS)
    if value is None:
        return None
    raw = value.text or ""
    if kind == "s":
        return shared[int(raw)]
    if kind == "b":
        return raw == "1"
    try:
        number = float(raw)
        return int(number) if number.is_integer() else number
    except ValueError:
        return raw


def workbook_sheets(book: zipfile.ZipFile) -> list[tuple[str, str]]:
    workbook = ET.fromstring(book.read("xl/workbook.xml"))
    rels = ET.fromstring(book.read("xl/_rels/workbook.xml.rels"))
    targets = {rel.get("Id"): rel.get("Target") for rel in rels.findall("pkg:Relationship", NS)}
    result = []
    for sheet in workbook.findall("main:sheets/main:sheet", NS):
        target = targets[sheet.get(f"{{{NS['rel']}}}id")]
        path = target.lstrip("/") if target.startswith("/") else posixpath.normpath(posixpath.join("xl", target))
        result.append((sheet.get("name", ""), path))
    return result


def read_sheet(book: zipfile.ZipFile, path: str, shared: list[str]) -> list[dict]:
    root = ET.fromstring(book.read(path))
    rows = []
    for row in root.findall(".//main:sheetData/main:row", NS):
        cells = {}
        for cell in row.findall("main:c", NS):
            cells[column_index(cell.get("r", ""))] = read_cell(cell, shared)
        if cells:
            rows.append([cells.get(index) for index in range(max(cells) + 1)])
    if not rows:
        return []
    headers = [str(value).strip() if value is not None else "" for value in rows[0]]
    return [
        {headers[index]: values[index] if index < len(values) else None
         for index in range(len(headers)) if headers[index]}
        for values in rows[1:]
        if any(value is not None for value in values)
    ]


def load_workbook(filename: str) -> dict[str, list[dict]]:
    path = SOURCES / filename
    with zipfile.ZipFile(path) as book:
        shared = read_shared_strings(book)
        return {name: read_sheet(book, sheet_path, shared)
                for name, sheet_path in workbook_sheets(book)}


def main() -> None:
    items = load_workbook("Xianxia_DeepLore_Item_Catalog_v16.xlsx")
    techniques = load_workbook("Xianxia_Techniques_UltimateCultivation_v20.xlsx")
    for sheet_rows in items.values():
        for row in sheet_rows:
            annotate_game_realm(row, "Realm_Name", "Game_Realm")
    for sheet_rows in techniques.values():
        for row in sheet_rows:
            annotate_game_realm(row, "Realm_Name", "Game_Realm")
            if row.get("Max_Boundary"):
                annotate_game_realm(row, "Max_Boundary", "Game_Max_Realm", "Game_Max_Stage")
    payload = {
        "realmMapping": {
            "workbookToGame": WORKBOOK_REALM_TO_GAME,
            "gameRealmsWithoutWorkbookEntries": [8],
        },
        "sourceFiles": {
            "items": "data/catalog-source/Xianxia_DeepLore_Item_Catalog_v16.xlsx",
            "techniques": "data/catalog-source/Xianxia_Techniques_UltimateCultivation_v20.xlsx",
        },
        "items": items,
        "techniques": techniques,
    }
    source = "/* Generated by scripts/generate_workbook_catalogs.py; edit the XLSX sources instead. */\n"
    source += "window.OneLifeWorkbookCatalog = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n"
    OUTPUT.write_text(source, encoding="utf-8", newline="\n")
    counts = {"items": sum(map(len, items.values())), "techniques": sum(map(len, techniques.values()))}
    print(f"Generated {OUTPUT.relative_to(ROOT)}: {counts['items']} item rows, {counts['techniques']} technique rows")


if __name__ == "__main__":
    main()
