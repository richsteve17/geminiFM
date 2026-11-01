#!/usr/bin/env python3
"""Import the Manus FM club-identity assets from pinned public source snapshots.

This script is intentionally bounded: it retrieves only the explicit club aliases and
national flags listed below. It never searches names or substitutes a near match.

Outputs:
  public/assets/crests/*.svg
  scripts/club-crest-manifest.json
  src/data/clubIdentity.ts

Run from the project root:
  python3 scripts/import_club_crests.py
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import struct
import sys
import tempfile
import time
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "public" / "assets" / "crests"
MANIFEST_PATH = ROOT / "scripts" / "club-crest-manifest.json"
IDENTITY_PATH = ROOT / "src" / "data" / "clubIdentity.ts"

# The FCLOGO repository was archived at this commit. Each club's logo.yaml supplies
# the source name, current/outdated status, style, SVG path, source ID, and reference.
FCLOGO_REPOSITORY = "https://github.com/FCLOGO/fclogo.top"
FCLOGO_COMMIT = "b82b63a4c5a2032215edd1ccb0ab4a3b618f6301"
FCLOGO_RAW = f"https://raw.githubusercontent.com/FCLOGO/fclogo.top/{FCLOGO_COMMIT}/"

# Flag Icons is used only for national flags, never as a club-crest substitute.
FLAG_ICONS_REPOSITORY = "https://github.com/lipis/flag-icons"
FLAG_ICONS_COMMIT = "ac7e0eb3259eb62aa6100c435607e2fe03896a97"
FLAG_ICONS_RAW = f"https://raw.githubusercontent.com/lipis/flag-icons/{FLAG_ICONS_COMMIT}/"

# football-logos.cc's public England album supplies seven exact-name additions that
# FCLOGO did not catalogue. The GitHub commit identifies the inspected catalogue
# project snapshot; each concrete CDN URL below additionally contains its own
# immutable asset suffix and is checksummed after download.
FOOTBALL_LOGOS_REPOSITORY = "https://github.com/Leo4815162342/football-logos"
FOOTBALL_LOGOS_COMMIT = "d94162a038024fd2fb378333432076c60646f1e0"
FOOTBALL_LOGOS_ENGLAND_CATALOGUE_URL = "https://football-logos.cc/england/"
FOOTBALL_LOGOS_SOURCE_NAME = "football-logos.cc (England catalogue)"


@dataclass(frozen=True)
class ClubMapping:
    app_name: str
    source_alias: str
    metadata_path: str | None


@dataclass(frozen=True)
class SupplementaryCrest:
    catalogue_alias: str
    catalogue_id: str
    image_url: str
    image_hash: str
    svg_hash: str


# These are the only non-FCLOGO aliases. They are intentionally keyed by exact
# playable game-team name rather than generated from a slug or fuzzy search.
FOOTBALL_LOGOS_ENGLAND_ALIASES: dict[str, str] = {
    "Norwich City": "Norwich City",
    "Watford": "Watford",
    "Sheffield United": "Sheffield United",
    "Middlesbrough": "Middlesbrough",
    "West Brom": "West Bromwich Albion",
    "Stoke City": "Stoke City",
    "Coventry City": "Coventry City",
}


FOOTBALL_LOGOS_ENGLAND_CRESTS: dict[str, SupplementaryCrest] = {
    "Norwich City": SupplementaryCrest(
        catalogue_alias=FOOTBALL_LOGOS_ENGLAND_ALIASES["Norwich City"],
        catalogue_id="norwich-city",
        image_url="https://assets.football-logos.cc/logos/england/256x256/norwich-city.5cf24a54.png",
        image_hash="5cf24a54",
        svg_hash="f7a3f5a2",
    ),
    "Watford": SupplementaryCrest(
        catalogue_alias=FOOTBALL_LOGOS_ENGLAND_ALIASES["Watford"],
        catalogue_id="watford",
        image_url="https://assets.football-logos.cc/logos/england/256x256/watford.99d74158.png",
        image_hash="99d74158",
        svg_hash="a7601e46",
    ),
    "Sheffield United": SupplementaryCrest(
        catalogue_alias=FOOTBALL_LOGOS_ENGLAND_ALIASES["Sheffield United"],
        catalogue_id="sheffield-united",
        image_url="https://assets.football-logos.cc/logos/england/256x256/sheffield-united.1c8f00ec.png",
        image_hash="1c8f00ec",
        svg_hash="c71f29f2",
    ),
    "Middlesbrough": SupplementaryCrest(
        catalogue_alias=FOOTBALL_LOGOS_ENGLAND_ALIASES["Middlesbrough"],
        catalogue_id="middlesbrough",
        image_url="https://assets.football-logos.cc/logos/england/256x256/middlesbrough.b9f845aa.png",
        image_hash="b9f845aa",
        svg_hash="18295feb",
    ),
    "West Brom": SupplementaryCrest(
        catalogue_alias=FOOTBALL_LOGOS_ENGLAND_ALIASES["West Brom"],
        catalogue_id="west-bromwich-albion",
        image_url="https://assets.football-logos.cc/logos/england/256x256/west-bromwich-albion.bc428244.png",
        image_hash="bc428244",
        svg_hash="3cadce38",
    ),
    "Stoke City": SupplementaryCrest(
        catalogue_alias=FOOTBALL_LOGOS_ENGLAND_ALIASES["Stoke City"],
        catalogue_id="stoke-city",
        image_url="https://assets.football-logos.cc/logos/england/256x256/stoke-city.d394721d.png",
        image_hash="d394721d",
        svg_hash="a3ed962e",
    ),
    "Coventry City": SupplementaryCrest(
        catalogue_alias=FOOTBALL_LOGOS_ENGLAND_ALIASES["Coventry City"],
        catalogue_id="coventry-city",
        image_url="https://assets.football-logos.cc/logos/england/256x256/coventry-city.936f87b8.png",
        image_hash="936f87b8",
        svg_hash="a2b850bf",
    ),
}


# This map is the complete playable TEAMS set (82). Each non-null path is an exact
# FCLOGO catalogue directory, not a fuzzy query. The seven entries with no FCLOGO
# metadata are explicitly resolved by FOOTBALL_LOGOS_ENGLAND_CRESTS above.
CLUB_MAPPINGS: tuple[ClubMapping, ...] = (
    ClubMapping("Manchester City", "Man City", "src/data/logos/theFA/clubs/002_Man City/logo.yaml"),
    ClubMapping("Liverpool", "Liverpool", "src/data/logos/theFA/clubs/004_Liverpool/logo.yaml"),
    ClubMapping("Arsenal", "Arsenal", "src/data/logos/theFA/clubs/003_Arsenal/logo.yaml"),
    ClubMapping("Chelsea", "Chelsea", "src/data/logos/theFA/clubs/001_Chelsea/logo.yaml"),
    ClubMapping("Tottenham", "Hotspur", "src/data/logos/theFA/clubs/018_Hotspur/logo.yaml"),
    ClubMapping("Newcastle United", "Newcastle", "src/data/logos/theFA/clubs/015_Newcastle/logo.yaml"),
    ClubMapping("Aston Villa", "Aston Villa", "src/data/logos/theFA/clubs/005_Aston Villa/logo.yaml"),
    ClubMapping("West Ham", "West Ham", "src/data/logos/theFA/clubs/019_West Ham/logo.yaml"),
    ClubMapping("Brighton", "Brighton", "src/data/logos/theFA/clubs/008_Brighton/logo.yaml"),
    ClubMapping("Manchester United", "Man United", "src/data/logos/theFA/clubs/014_Man United/logo.yaml"),
    ClubMapping("Everton", "Everton", "src/data/logos/theFA/clubs/010_Everton/logo.yaml"),
    ClubMapping("Wolves", "Wolves", "src/data/logos/theFA/clubs/020_Wolves/logo.yaml"),
    ClubMapping("Fulham", "Fulham", "src/data/logos/theFA/clubs/011_Fulham/logo.yaml"),
    ClubMapping("Nottingham Forest", "Nottingham", "src/data/logos/theFA/clubs/016_Nottingham/logo.yaml"),
    ClubMapping("Leicester City", "Leicester", "src/data/logos/theFA/clubs/013_Leicester/logo.yaml"),
    ClubMapping("Bournemouth", "Bournemouth", "src/data/logos/theFA/clubs/006_Bournemouth/logo.yaml"),
    ClubMapping("Crystal Palace", "Crystal Palace", "src/data/logos/theFA/clubs/009_Crystal Palace/logo.yaml"),
    ClubMapping("Ipswich Town", "Ipswich", "src/data/logos/theFA/clubs/012_Ipswich/logo.yaml"),
    ClubMapping("Southampton", "Southampton", "src/data/logos/theFA/clubs/017_Southampton/logo.yaml"),
    ClubMapping("Brentford", "Brentford", "src/data/logos/theFA/clubs/007_Brentford/logo.yaml"),
    ClubMapping("Sunderland", "Sunderland", "src/data/logos/theFA/clubs/023_Sunderland/logo.yaml"),
    ClubMapping("Burnley", "Burnley", "src/data/logos/theFA/clubs/022_Burnley/logo.yaml"),
    ClubMapping("Leeds United", "Leeds United", "src/data/logos/theFA/clubs/021_Leeds United/logo.yaml"),
    ClubMapping("Norwich City", FOOTBALL_LOGOS_ENGLAND_ALIASES["Norwich City"], None),
    ClubMapping("Watford", FOOTBALL_LOGOS_ENGLAND_ALIASES["Watford"], None),
    ClubMapping("Sheffield United", FOOTBALL_LOGOS_ENGLAND_ALIASES["Sheffield United"], None),
    ClubMapping("Middlesbrough", FOOTBALL_LOGOS_ENGLAND_ALIASES["Middlesbrough"], None),
    ClubMapping("West Brom", FOOTBALL_LOGOS_ENGLAND_ALIASES["West Brom"], None),
    ClubMapping("Stoke City", FOOTBALL_LOGOS_ENGLAND_ALIASES["Stoke City"], None),
    ClubMapping("Coventry City", FOOTBALL_LOGOS_ENGLAND_ALIASES["Coventry City"], None),
    ClubMapping("Real Madrid", "Real Madrid", "src/data/logos/RFEF/clubs/001_Real Madrid/logo.yaml"),
    ClubMapping("FC Barcelona", "Barcelona", "src/data/logos/RFEF/clubs/006_Barcelona/logo.yaml"),
    ClubMapping("Atletico Madrid", "Atletico Madrid", "src/data/logos/RFEF/clubs/002_Atletico Madrid/logo.yaml"),
    ClubMapping("Sevilla", "Sevilla", "src/data/logos/RFEF/clubs/018_Sevilla/logo.yaml"),
    ClubMapping("Real Sociedad", "Real Sociedad", "src/data/logos/RFEF/clubs/017_Real Sociedad/logo.yaml"),
    ClubMapping("Athletic Bilbao", "Athletic Bilbao", "src/data/logos/RFEF/clubs/004_Athletic Bilbao/logo.yaml"),
    ClubMapping("Valencia", "Valencia", "src/data/logos/RFEF/clubs/019_Valencia/logo.yaml"),
    ClubMapping("Villarreal", "Villarreal", "src/data/logos/RFEF/clubs/021_Villarreal/logo.yaml"),
    ClubMapping("Real Betis", "Real Betis", "src/data/logos/RFEF/clubs/016_Real Betis/logo.yaml"),
    ClubMapping("Girona", "Girona", "src/data/logos/RFEF/clubs/008_Girona/logo.yaml"),
    ClubMapping("Juventus", "Juventus", "src/data/logos/FIGC/clubs/001_Juventus/logo.yaml"),
    # FCLOGO's directory label has a typo; its logo metadata identifies Inter Milan.
    ClubMapping("Inter Milan", "Intel Milan", "src/data/logos/FIGC/clubs/002_Intel Milan/logo.yaml"),
    ClubMapping("AC Milan", "AC Milan", "src/data/logos/FIGC/clubs/013_AC Milan/logo.yaml"),
    ClubMapping("Napoli", "Napoli", "src/data/logos/FIGC/clubs/015_Napoli/logo.yaml"),
    ClubMapping("AS Roma", "Roma", "src/data/logos/FIGC/clubs/017_Roma/logo.yaml"),
    ClubMapping("Lazio", "Lazio", "src/data/logos/FIGC/clubs/011_Lazio/logo.yaml"),
    ClubMapping("Atalanta", "Atalanta", "src/data/logos/FIGC/clubs/003_Atalanta/logo.yaml"),
    ClubMapping("Fiorentina", "Fiorentina", "src/data/logos/FIGC/clubs/008_Fiorentina/logo.yaml"),
    ClubMapping("Bologna", "Bologna", "src/data/logos/FIGC/clubs/004_Bologna/logo.yaml"),
    ClubMapping("Torino", "Torino", "src/data/logos/FIGC/clubs/018_Torino/logo.yaml"),
    ClubMapping("Bayern Munich", "Bayern Munich", "src/data/logos/DFB/clubs/001_Bayern Munich/logo.yaml"),
    ClubMapping("Dortmund", "Dortmund", "src/data/logos/DFB/clubs/002_Dortmund/logo.yaml"),
    ClubMapping("RB Leipzig", "Leipzig", "src/data/logos/DFB/clubs/006_Leipzig/logo.yaml"),
    ClubMapping("Bayer Leverkusen", "Leverkusen", "src/data/logos/DFB/clubs/004_Leverkusen/logo.yaml"),
    ClubMapping("Eintracht Frankfurt", "Frankfurt", "src/data/logos/DFB/clubs/007_Frankfurt/logo.yaml"),
    ClubMapping("Stuttgart", "Stuttgart", "src/data/logos/DFB/clubs/005_Stuttgart/logo.yaml"),
    ClubMapping("Wolfsburg", "Wolfsburg", "src/data/logos/DFB/clubs/012_Wolfsburg/logo.yaml"),
    ClubMapping("Gladbach", "Monchengladbach", "src/data/logos/DFB/clubs/014_Monchengladbach/logo.yaml"),
    ClubMapping("Union Berlin", "Union Berlin", "src/data/logos/DFB/clubs/015_Union Berlin/logo.yaml"),
    ClubMapping("Hoffenheim", "Hoffenheim", "src/data/logos/DFB/clubs/008_Hoffenheim/logo.yaml"),
    ClubMapping("PSG", "Paris", "src/data/logos/FFF/clubs/001_ Paris/logo.yaml"),
    ClubMapping("Marseille", "Marseille", "src/data/logos/FFF/clubs/009_Marseille/logo.yaml"),
    ClubMapping("Lyon", "Lyon", "src/data/logos/FFF/clubs/008_Lyon/logo.yaml"),
    ClubMapping("Monaco", "Monaco", "src/data/logos/FFF/clubs/010_Monaco/logo.yaml"),
    ClubMapping("Nice", "Nice", "src/data/logos/FFF/clubs/013_Nice/logo.yaml"),
    ClubMapping("Lille", "Lille", "src/data/logos/FFF/clubs/007_Lille/logo.yaml"),
    ClubMapping("Lens", "Lens", "src/data/logos/FFF/clubs/006_Lens/logo.yaml"),
    ClubMapping("Rennes", "Rennais", "src/data/logos/FFF/clubs/015_Rennais/logo.yaml"),
    ClubMapping("Nantes", "Nantes", "src/data/logos/FFF/clubs/012_Nantes/logo.yaml"),
    ClubMapping("Reims", "Reims", "src/data/logos/FFF/clubs/014_Reims/logo.yaml"),
    ClubMapping("Inter Miami", "Inter Miami CF", "src/data/logos/USSF/clubs/013_Inter Miami CF/logo.yaml"),
    ClubMapping("LA Galaxy", "LA Galaxy", "src/data/logos/USSF/clubs/011_LA Galaxy/logo.yaml"),
    ClubMapping("NYCFC", "New York City", "src/data/logos/USSF/clubs/018_New York City/logo.yaml"),
    ClubMapping("Atlanta United", "Atlanta United", "src/data/logos/USSF/clubs/001_Atlanta United/logo.yaml"),
    ClubMapping("Seattle Sounders", "Seattle Sounders", "src/data/logos/USSF/clubs/025_Seattle Sounders/logo.yaml"),
    ClubMapping("Portland Timbers", "Portland Timbers", "src/data/logos/USSF/clubs/022_Portland Timbers/logo.yaml"),
    ClubMapping("LAFC", "LA FC", "src/data/logos/USSF/clubs/012_LA FC/logo.yaml"),
    ClubMapping("Columbus Crew", "Columbus Crew", "src/data/logos/USSF/clubs/007_Columbus Crew/logo.yaml"),
    ClubMapping("Toronto FC", "Toronto FC", "src/data/logos/USSF/clubs/028_Toronto FC/logo.yaml"),
    ClubMapping("Chicago Fire", "Chicago Fire", "src/data/logos/USSF/clubs/004_Chicago Fire/logo.yaml"),
    ClubMapping("Philadelphia Union", "Philadelphia Union", "src/data/logos/USSF/clubs/021_Philadelphia Union/logo.yaml"),
    ClubMapping("NY Red Bulls", "New York Red Bulls", "src/data/logos/USSF/clubs/019_New York Red Bulls/logo.yaml"),
)

# All current international names in src/international.ts. Keys are exact game names;
# values are Flag Icons' explicit ISO-style file names (including constituent flags).
NATIONAL_FLAGS: dict[str, str] = {
    "England": "gb-eng",
    "France": "fr",
    "Brazil": "br",
    "Argentina": "ar",
    "Spain": "es",
    "Germany": "de",
    "Portugal": "pt",
    "Netherlands": "nl",
    "Italy": "it",
    "USA": "us",
    "Japan": "jp",
    "Morocco": "ma",
    "Belgium": "be",
    "Croatia": "hr",
    "Uruguay": "uy",
    "Colombia": "co",
    "Denmark": "dk",
    "Switzerland": "ch",
    "Austria": "at",
    "Turkey": "tr",
    "Poland": "pl",
    "Hungary": "hu",
    "Scotland": "gb-sct",
    "Czechia": "cz",
    "Serbia": "rs",
    "Romania": "ro",
    "Slovakia": "sk",
    "Slovenia": "si",
    "Georgia": "ge",
    "Ukraine": "ua",
    "Albania": "al",
    "Senegal": "sn",
    "South Korea": "kr",
    "Australia": "au",
    "Mexico": "mx",
    "Canada": "ca",
    "Nigeria": "ng",
    "Egypt": "eg",
    "Cameroon": "cm",
    "Algeria": "dz",
    "Ivory Coast": "ci",
    "Ghana": "gh",
    "Saudi Arabia": "sa",
    "Iran": "ir",
    "Chile": "cl",
    "Peru": "pe",
    "Ecuador": "ec",
    "Costa Rica": "cr",
    "New Zealand": "nz",
    "South Africa": "za",
    "Tunisia": "tn",
    "Wales": "gb-wls",
    "Sweden": "se",
    "Norway": "no",
    "Ireland": "ie",
    "Greece": "gr",
    "Iceland": "is",
    "Finland": "fi",
    "Jamaica": "jm",
    "Panama": "pa",
    "Venezuela": "ve",
    "Paraguay": "py",
    "China": "cn",
    "Mali": "ml",
}


class ImportErrorWithContext(RuntimeError):
    """A source response did not meet the deterministic-import contract."""


def source_url(raw_base: str, path: str) -> str:
    return raw_base + quote(path, safe="/")


def fetch_bytes(url: str) -> bytes:
    request = Request(url, headers={"User-Agent": "manus-fm-crest-import/1.0", "Accept": "image/svg+xml,text/plain,*/*"})
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with urlopen(request, timeout=30) as response:
                payload = response.read()
                if response.status != 200:
                    raise ImportErrorWithContext(f"Unexpected HTTP {response.status} for {url}")
                return payload
        except (HTTPError, URLError, TimeoutError) as error:
            last_error = error
            if attempt == 2:
                break
            time.sleep(1 + attempt)
    raise ImportErrorWithContext(f"Unable to retrieve {url}: {last_error}")


def parse_logo_yaml(payload: bytes, metadata_url: str) -> list[dict[str, str]]:
    """Parse the small, stable FCLOGO logo.yaml record subset without PyYAML."""
    try:
        text = payload.decode("utf-8")
    except UnicodeDecodeError as error:
        raise ImportErrorWithContext(f"Metadata is not UTF-8: {metadata_url}") from error
    if "<html" in text.lower():
        raise ImportErrorWithContext(f"Metadata response looks like HTML: {metadata_url}")

    records: list[dict[str, str]] = []
    current: dict[str, str] | None = None
    for line in text.splitlines():
        if line == "- data: logo":
            if current:
                records.append(current)
            current = {"data": "logo"}
            continue
        if current is None:
            continue
        match = re.match(r"^  ([A-Za-z][A-Za-z0-9]*):\s*(.*)$", line)
        if not match:
            continue
        key, value = match.groups()
        current[key] = value.strip().strip("'\"")
    if current:
        records.append(current)

    if not records:
        raise ImportErrorWithContext(f"No logo records found in {metadata_url}")
    return records


def select_current_color_logo(records: list[dict[str, str]], mapping: ClubMapping, metadata_url: str) -> dict[str, str]:
    candidates = [
        record
        for record in records
        if record.get("style") == "color"
        and record.get("isOutdated") == "false"
        and record.get("isDoubtful") == "false"
    ]
    if len(candidates) != 1:
        details = ", ".join(
            f"{record.get('svgPath', '?')} (style={record.get('style')}, outdated={record.get('isOutdated')}, doubtful={record.get('isDoubtful')})"
            for record in candidates
        ) or "none"
        raise ImportErrorWithContext(
            f"{mapping.app_name}: expected exactly one current, non-doubtful color SVG in {metadata_url}; got {len(candidates)}: {details}"
        )
    selected = candidates[0]
    required = ("svgPath", "sourceID", "version", "verName")
    absent = [key for key in required if not selected.get(key)]
    if absent:
        raise ImportErrorWithContext(f"{mapping.app_name}: selected metadata lacks {', '.join(absent)}")
    return selected


def validate_svg(payload: bytes, url: str) -> None:
    leading = payload.lstrip(b"\xef\xbb\xbf\x00\t\r\n ")
    if not leading.startswith(b"<") or b"<html" in leading[:512].lower():
        raise ImportErrorWithContext(f"Expected SVG rather than an error document at {url}")
    try:
        root = ET.fromstring(payload)
    except ET.ParseError as error:
        raise ImportErrorWithContext(f"Invalid SVG XML at {url}: {error}") from error
    if root.tag.rsplit("}", 1)[-1] != "svg":
        raise ImportErrorWithContext(f"Expected SVG root element at {url}, found {root.tag!r}")


def validate_png(payload: bytes, url: str) -> None:
    if not payload.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ImportErrorWithContext(f"Expected PNG rather than an error document at {url}")
    if len(payload) < 33:
        raise ImportErrorWithContext(f"PNG is too short to contain an IHDR chunk at {url}")
    chunk_length = struct.unpack(">I", payload[8:12])[0]
    if chunk_length != 13 or payload[12:16] != b"IHDR":
        raise ImportErrorWithContext(f"PNG lacks a valid IHDR chunk at {url}")
    width, height = struct.unpack(">II", payload[16:24])
    if width == 0 or height == 0:
        raise ImportErrorWithContext(f"PNG has invalid dimensions at {url}")


def validate_asset(payload: bytes, url: str, asset_format: str) -> None:
    if asset_format == "svg":
        validate_svg(payload, url)
    elif asset_format == "png":
        validate_png(payload, url)
    else:
        raise ImportErrorWithContext(f"Unsupported crest asset format {asset_format!r} at {url}")


def file_key(name: str, kind: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return f"national-{normalized}" if kind == "national" else normalized


def asset_record(
    *,
    name: str,
    kind: str,
    source_name: str,
    source_url_value: str,
    payload: bytes,
    source_commit: str,
    asset_format: str,
    extra: dict[str, Any],
) -> dict[str, Any]:
    filename = f"{file_key(name, kind)}.{asset_format}"
    return {
        "name": name,
        "kind": kind,
        "imageUrl": f"/assets/crests/{filename}",
        "localPath": f"public/assets/crests/{filename}",
        "sourceUrl": source_url_value,
        "sourceName": source_name,
        "sourceCommit": source_commit,
        "sha256": hashlib.sha256(payload).hexdigest(),
        "bytes": len(payload),
        "assetFormat": asset_format,
        **extra,
    }


def write_asset(directory: Path, record: dict[str, Any], payload: bytes) -> None:
    path = directory / Path(record["imageUrl"]).name
    path.write_bytes(payload)


def ts_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def write_typescript(records: list[dict[str, Any]], missing_clubs: list[str]) -> None:
    lines = [
        "// Generated by scripts/import_club_crests.py. Do not hand-edit asset hashes.",
        "",
        "export type ClubIdentityRecord = {",
        "  name: string;",
        "  imageUrl: string;",
        "  sourceUrl: string;",
        "  sourceName: string;",
        "  kind: 'club' | 'national';",
        "};",
        "",
        "export type ClubIdentityAssetProvenance = ClubIdentityRecord & {",
        "  sha256: string;",
        "  sourceCommit: string;",
        "};",
        "",
        "export const CLUB_IDENTITY_ASSET_PROVENANCE: readonly ClubIdentityAssetProvenance[] = [",
    ]
    for record in records:
        lines.append("  {")
        for key in ("name", "imageUrl", "sourceUrl", "sourceName", "kind", "sha256", "sourceCommit"):
            lines.append(f"    {key}: {ts_string(record[key])},")
        lines.append("  },")
    lines.extend([
        "] as const;",
        "",
        "export const CLUB_IDENTITIES: readonly ClubIdentityRecord[] = CLUB_IDENTITY_ASSET_PROVENANCE.map(",
        "  ({ name, imageUrl, sourceUrl, sourceName, kind }) => ({ name, imageUrl, sourceUrl, sourceName, kind }),",
        ");",
        "",
        "const identityByExactName = new Map<string, ClubIdentityRecord>(",
        "  CLUB_IDENTITIES.map((record) => [record.name, record]),",
        ");",
        "",
        "/** Returns a local packaged identity only for an exact playable-team name. */",
        "export function getClubIdentity(name: string): ClubIdentityRecord | null {",
        "  return identityByExactName.get(name) ?? null;",
        "}",
        "",
        "export const CLUB_IDENTITY_COVERAGE = {",
        f"  playableClubCount: {len(CLUB_MAPPINGS)},",
        f"  clubCrestCount: {sum(record['kind'] == 'club' for record in records)},",
        f"  missingClubNames: [{', '.join(ts_string(name) for name in missing_clubs)}],",
        f"  internationalTeamCount: {len(NATIONAL_FLAGS)},",
        f"  nationalFlagCount: {sum(record['kind'] == 'national' for record in records)},",
        "} as const;",
        "",
    ])
    IDENTITY_PATH.write_text("\n".join(lines), encoding="utf-8")


def import_assets() -> dict[str, Any]:
    if len(CLUB_MAPPINGS) != 82:
        raise ImportErrorWithContext(f"Expected 82 playable club mappings, found {len(CLUB_MAPPINGS)}")
    if len({mapping.app_name for mapping in CLUB_MAPPINGS}) != len(CLUB_MAPPINGS):
        raise ImportErrorWithContext("Duplicate playable club name in explicit mapping")
    if len(NATIONAL_FLAGS) != 64:
        raise ImportErrorWithContext(f"Expected 64 international teams, found {len(NATIONAL_FLAGS)}")
    unresolved_mappings = [mapping.app_name for mapping in CLUB_MAPPINGS if mapping.metadata_path is None]
    if set(unresolved_mappings) != set(FOOTBALL_LOGOS_ENGLAND_CRESTS):
        raise ImportErrorWithContext(
            "Supplementary crest map must resolve exactly the non-FCLOGO clubs: "
            f"mappings={unresolved_mappings}, supplementary={list(FOOTBALL_LOGOS_ENGLAND_CRESTS)}"
        )

    ASSET_DIR.parent.mkdir(parents=True, exist_ok=True)
    temporary_dir = Path(tempfile.mkdtemp(prefix="manusfm-crests-", dir=ASSET_DIR.parent))
    records: list[dict[str, Any]] = []
    missing_clubs: list[str] = []
    try:
        for mapping in CLUB_MAPPINGS:
            if mapping.metadata_path is None:
                supplementary = FOOTBALL_LOGOS_ENGLAND_CRESTS.get(mapping.app_name)
                if supplementary is None:
                    missing_clubs.append(mapping.app_name)
                    continue
                if mapping.source_alias != supplementary.catalogue_alias:
                    raise ImportErrorWithContext(
                        f"{mapping.app_name}: supplementary alias mismatch "
                        f"{mapping.source_alias!r} != {supplementary.catalogue_alias!r}"
                    )
                payload = fetch_bytes(supplementary.image_url)
                validate_asset(payload, supplementary.image_url, "png")
                record = asset_record(
                    name=mapping.app_name,
                    kind="club",
                    source_name=FOOTBALL_LOGOS_SOURCE_NAME,
                    source_url_value=supplementary.image_url,
                    payload=payload,
                    source_commit=FOOTBALL_LOGOS_COMMIT,
                    asset_format="png",
                    extra={
                        "catalogueAlias": supplementary.catalogue_alias,
                        "catalogueId": supplementary.catalogue_id,
                        "catalogueUrl": FOOTBALL_LOGOS_ENGLAND_CATALOGUE_URL,
                        "catalogueAssetHash": supplementary.image_hash,
                        "catalogueSvgHash": supplementary.svg_hash,
                    },
                )
                write_asset(temporary_dir, record, payload)
                records.append(record)
                continue
            metadata_url = source_url(FCLOGO_RAW, mapping.metadata_path)
            logo_metadata = parse_logo_yaml(fetch_bytes(metadata_url), metadata_url)
            selected = select_current_color_logo(logo_metadata, mapping, metadata_url)
            asset_path = str(Path(mapping.metadata_path).parent / selected["svgPath"])
            asset_source_url = source_url(FCLOGO_RAW, asset_path)
            payload = fetch_bytes(asset_source_url)
            validate_svg(payload, asset_source_url)
            record = asset_record(
                name=mapping.app_name,
                kind="club",
                source_name="FCLOGO",
                source_url_value=asset_source_url,
                payload=payload,
                source_commit=FCLOGO_COMMIT,
                asset_format="svg",
                extra={
                    "catalogueAlias": mapping.source_alias,
                    "metadataUrl": metadata_url,
                    "catalogueSourceID": selected["sourceID"],
                    "catalogueVersion": selected["version"],
                    "catalogueName": selected["verName"],
                    "catalogueReference": selected.get("reference", ""),
                },
            )
            write_asset(temporary_dir, record, payload)
            records.append(record)

        for name, flag_code in NATIONAL_FLAGS.items():
            asset_path = f"flags/4x3/{flag_code}.svg"
            asset_source_url = source_url(FLAG_ICONS_RAW, asset_path)
            payload = fetch_bytes(asset_source_url)
            validate_svg(payload, asset_source_url)
            record = asset_record(
                name=name,
                kind="national",
                source_name="Flag Icons (national flag)",
                source_url_value=asset_source_url,
                payload=payload,
                source_commit=FLAG_ICONS_COMMIT,
                asset_format="svg",
                extra={"flagCode": flag_code},
            )
            write_asset(temporary_dir, record, payload)
            records.append(record)

        club_records = [record for record in records if record["kind"] == "club"]
        national_records = [record for record in records if record["kind"] == "national"]
        if len(club_records) != len(CLUB_MAPPINGS) or missing_clubs:
            raise ImportErrorWithContext(
                f"Unexpected club coverage: {len(club_records)} imported, {len(missing_clubs)} missing; expected 82/0"
            )
        if len(national_records) != 64:
            raise ImportErrorWithContext(f"Unexpected national flag coverage: {len(national_records)} imported; expected 64")
        if len({record["name"] for record in records}) != len(records):
            raise ImportErrorWithContext("A club and national identity collide on the same exact name")
        if len({record["imageUrl"] for record in records}) != len(records):
            raise ImportErrorWithContext("Local asset filename collision")

        # Replace the controlled asset directory only after every download validates.
        ASSET_DIR.mkdir(parents=True, exist_ok=True)
        for old_asset in ASSET_DIR.glob("*.*"):
            if old_asset.suffix in {".svg", ".png"}:
                old_asset.unlink()
        for new_asset in temporary_dir.glob("*.*"):
            shutil.move(str(new_asset), ASSET_DIR / new_asset.name)

        manifest = {
            "schemaVersion": 1,
            "generatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "sources": {
                "fclogo": {"repository": FCLOGO_REPOSITORY, "commit": FCLOGO_COMMIT},
                "flagIcons": {"repository": FLAG_ICONS_REPOSITORY, "commit": FLAG_ICONS_COMMIT},
                "footballLogos": {
                    "repository": FOOTBALL_LOGOS_REPOSITORY,
                    "commit": FOOTBALL_LOGOS_COMMIT,
                    "catalogueUrl": FOOTBALL_LOGOS_ENGLAND_CATALOGUE_URL,
                },
            },
            "coverage": {
                "playableClubCount": len(CLUB_MAPPINGS),
                "clubCrestCount": len(club_records),
                "missingClubNames": missing_clubs,
                "internationalTeamCount": len(NATIONAL_FLAGS),
                "nationalFlagCount": len(national_records),
            },
            "assets": records,
        }
        MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        write_typescript(records, missing_clubs)
        return manifest
    finally:
        shutil.rmtree(temporary_dir, ignore_errors=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Import pinned club crests and national flags for Manus FM.")
    parser.add_argument("--check", action="store_true", help="Validate the existing generated manifest and local files without network access.")
    args = parser.parse_args()

    if args.check:
        if not MANIFEST_PATH.exists():
            raise ImportErrorWithContext(f"Manifest not found: {MANIFEST_PATH}")
        manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        bad: list[str] = []
        assets = manifest.get("assets", [])
        expected_coverage = {
            "playableClubCount": len(CLUB_MAPPINGS),
            "clubCrestCount": len(CLUB_MAPPINGS),
            "missingClubNames": [],
            "internationalTeamCount": len(NATIONAL_FLAGS),
            "nationalFlagCount": len(NATIONAL_FLAGS),
        }
        if manifest.get("coverage") != expected_coverage:
            bad.append(f"coverage mismatch: expected {expected_coverage}, found {manifest.get('coverage')}")
        club_records = [record for record in assets if record.get("kind") == "club"]
        national_records = [record for record in assets if record.get("kind") == "national"]
        if {record.get("name") for record in club_records} != {mapping.app_name for mapping in CLUB_MAPPINGS}:
            bad.append("club manifest names do not exactly cover all 82 playable clubs")
        if len(club_records) != len(CLUB_MAPPINGS) or len(national_records) != len(NATIONAL_FLAGS):
            bad.append(f"unexpected asset counts: {len(club_records)} clubs, {len(national_records)} national flags")
        if len(assets) != len(CLUB_MAPPINGS) + len(NATIONAL_FLAGS):
            bad.append(f"unexpected total asset count: {len(assets)}")
        for record in assets:
            path = ROOT / record["localPath"]
            if not path.exists():
                bad.append(f"missing {path.relative_to(ROOT)}")
                continue
            payload = path.read_bytes()
            try:
                validate_asset(payload, str(path), record.get("assetFormat", ""))
            except ImportErrorWithContext as error:
                bad.append(str(error))
                continue
            actual_hash = hashlib.sha256(payload).hexdigest()
            if actual_hash != record["sha256"]:
                bad.append(f"hash mismatch {path.relative_to(ROOT)}")
        if bad:
            raise ImportErrorWithContext("Asset check failed:\n" + "\n".join(bad))
        print(f"Validated all 82 club crests and 64 national flags ({len(assets)} local assets) against the manifest.")
        return 0

    manifest = import_assets()
    coverage = manifest["coverage"]
    print(
        f"Imported {coverage['clubCrestCount']} club crests and {coverage['nationalFlagCount']} national flags; "
        f"{len(coverage['missingClubNames'])} clubs remain null."
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ImportErrorWithContext as error:
        print(f"crest import failed: {error}", file=sys.stderr)
        raise SystemExit(1)
