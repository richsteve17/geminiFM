#!/usr/bin/env python3
"""Package source-catalog kit photographs; never synthesize kit facts or artwork.

Run from /home/ubuntu/manusfm:
  python3 scripts/package-kit-assets.py --candidates /tmp/manus-kit-import/catalog-candidates.json \
    --teams /tmp/manus-kit-import/teams.json --legacy /tmp/manus-kit-import/legacy-verified.json
Requires requests, Pillow, numpy. Candidate generation is documented in scripts/kit-import.mjs.
"""
import argparse
import hashlib
import io
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse

import numpy as np
import requests
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'public' / 'kits' / '2026'
ORDER = {'home': 0, 'away': 1, 'third': 2}


def hex_color(rgb):
    return '#' + ''.join(f'{int(channel):02X}' for channel in rgb)


def palette(image):
    """Sample only the garment's central region; UI approximations, not supplier specs."""
    rgb = image.convert('RGB')
    width, height = rgb.size
    crop = rgb.crop((int(width * .25), int(height * .25), int(width * .75), int(height * .80)))
    crop.thumbnail((96, 96))
    # Quantize fabric variations and small branding without adding or changing artwork.
    quantized = crop.quantize(colors=8)
    colors = quantized.getpalette()
    counts = sorted(quantized.getcolors() or [], reverse=True)
    ranked = [(count, tuple(colors[index * 3:index * 3 + 3])) for count, index in counts]
    primary = ranked[0][1] if ranked else (32, 40, 50)
    secondary = None
    for count, color in ranked[1:]:
        if np.linalg.norm(np.array(primary, dtype=float) - np.array(color, dtype=float)) >= 75:
            secondary = color
            break
    if secondary is None:
        # An accessible neutral UI accent, explicitly not another claimed shirt colour.
        luminance = relative_luminance(primary)
        secondary = (245, 247, 250) if luminance < .35 else (25, 35, 48)
    text = (255, 255, 255) if relative_luminance(primary) < .179 else (13, 22, 35)
    return {'bg': hex_color(primary), 'accent': hex_color(secondary), 'text': hex_color(text)}


def relative_luminance(rgb):
    channels = np.array(rgb, dtype=float) / 255
    channels = np.where(channels <= .04045, channels / 12.92, ((channels + .055) / 1.055) ** 2.4)
    return float(np.dot(channels, [.2126, .7152, .0722]))


def fetch_image(url):
    if urlparse(url).scheme != 'https' or urlparse(url).hostname != 'www.footballkitarchive.com':
        raise ValueError('image URL is not on the sourced archive host')
    last_error = None
    for attempt in range(2):
        try:
            response = requests.get(url, timeout=(8, 22), headers={'User-Agent': 'ManusFM-kit-assets/1.0'})
            response.raise_for_status()
            if not response.headers.get('Content-Type', '').lower().startswith('image/'):
                raise ValueError('source returned a non-image body')
            if len(response.content) > 12 * 1024 * 1024:
                raise ValueError('image exceeds packaging limit')
            image = Image.open(io.BytesIO(response.content))
            image.load()
            image = ImageOps.exif_transpose(image)
            if min(image.size) < 100:
                raise ValueError('image is too small for a kit reference')
            return image, response.content
        except Exception as error:
            last_error = error
    raise ValueError(str(last_error))


def package(record):
    name, kit_type = record['team']['targetName'], record['kit']['type']
    legacy = record.get('_legacy')
    source_url = record['source']['kitPageUrl']
    image_url = legacy['imageUrl'] if legacy else record['verifiedContent']['imageUrl']
    try:
        cached = record.get('_cached')
        if cached:
            result, proof = cached
            local = ROOT / 'public' / result['imageUrl'].lstrip('/')
            if result['originalImageUrl'] == image_url and result['sourceUrl'] == source_url and local.is_file():
                with Image.open(local) as packaged:
                    packaged.verify()
                return name, result, proof, None
        image, original = fetch_image(image_url)
        source_size = image.size
        digest = hashlib.sha256(original).hexdigest()
        slug = source_url.rstrip('/').split('/')[-1]
        filename = f'{slug}-{digest[:10]}.webp'
        image.thumbnail((480, 560), Image.Resampling.LANCZOS)  # never upscale or trim content
        if image.mode not in ('RGB', 'RGBA'):
            image = image.convert('RGBA' if 'transparency' in image.info else 'RGB')
        image.save(ASSETS / filename, format='WEBP', quality=90, method=6)
        if legacy:
            result = dict(legacy)
            result.update({'season': '2026/27', 'paletteProvenance': 'source-reviewed'})
        else:
            result = {
                'id': kit_type,
                'label': f"{kit_type.upper()} · {record['kit']['season']}",
                'season': record['kit']['season'],
                **palette(image),
                'colorNames': [], 'design': None, 'brand': None, 'sponsor': None,
                'released': None, 'description': None, 'sourceName': 'Football Kit Archive',
                'sourceUrl': source_url, 'paletteProvenance': 'image-sampled',
            }
        result.update({
            'imageUrl': f'/kits/2026/{filename}', 'originalImageUrl': image_url,
            'catalogUrl': record['source']['catalogUrl'],
            'publicationStatus': 'archive-reference',
        })
        proof = {
            'club': name, 'id': kit_type, 'season': result['season'],
            'sourceUrl': source_url, 'catalogUrl': record['source']['catalogUrl'],
            'originalImageUrl': image_url, 'imageUrl': result['imageUrl'],
            'originalSha256': digest, 'sourceDimensions': list(source_size),
            'packagedDimensions': list(image.size), 'bytes': (ASSETS / filename).stat().st_size,
            'paletteProvenance': result['paletteProvenance'],
            'publicationStatus': 'archive-reference',
        }
        return name, result, proof, None
    except Exception as error:
        return name, None, None, {'club': name, 'id': kit_type, 'sourceUrl': source_url, 'imageUrl': image_url, 'error': str(error)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--candidates', required=True)
    parser.add_argument('--teams', required=True)
    parser.add_argument('--legacy', required=True)
    parser.add_argument('--workers', type=int, default=6)
    parser.add_argument('--refresh', action='store_true', help='Re-fetch unchanged source images rather than reusing the verified local snapshot')
    args = parser.parse_args()
    catalog = json.loads(Path(args.candidates).read_text())
    teams = set(json.loads(Path(args.teams).read_text()))
    legacy = json.loads(Path(args.legacy).read_text())
    records = {}
    for record in catalog['records']:
        name = record['team']['targetName']
        kit_type = record['kit']['type']
        if name in teams and kit_type in ORDER:
            key = (name, kit_type)
            if key in records and records[key]['source']['kitPageUrl'] != record['source']['kitPageUrl']:
                raise ValueError(f'Ambiguous primary kit sources: {name} {kit_type}')
            records[key] = record
    # Retain individually reviewed source facts; source acquisition is not a rewrite.
    for name, kits in legacy.items():
        for item in kits:
            key = (name, item['id'])
            if key in records:
                records[key]['_legacy'] = item
                records[key]['source']['kitPageUrl'] = item['sourceUrl']
    old_catalog_path = ROOT / 'src' / 'data' / 'seasonKitCatalog.json'
    old_manifest_path = ROOT / 'docs' / 'kit-asset-manifest-2026.json'
    if not args.refresh and old_catalog_path.exists() and old_manifest_path.exists():
        old_catalog = json.loads(old_catalog_path.read_text())
        old_proof = {(p['club'], p['id']): p for p in json.loads(old_manifest_path.read_text())['records']}
        for name, kits in old_catalog.items():
            for kit in kits:
                key = (name, kit['id'])
                if key in records and key in old_proof:
                    records[key]['_cached'] = (kit, old_proof[key])
    ASSETS.mkdir(parents=True, exist_ok=True)
    imported, evidence, failures = {}, [], []
    print(f'Packaging {len(records)} sourced kits across {len({name for name, _ in records})} clubs', flush=True)
    with ThreadPoolExecutor(max_workers=max(1, min(args.workers, 8))) as executor:
        tasks = [executor.submit(package, records[key]) for key in sorted(records)]
        for index, task in enumerate(as_completed(tasks), 1):
            name, result, proof, error = task.result()
            if error:
                failures.append(error)
                print(f"FAILED {name} {error['id']}: {error['error'][:120]}", flush=True)
            else:
                imported.setdefault(name, []).append(result)
                evidence.append(proof)
            if index % 20 == 0 or index == len(tasks):
                print(f'{index}/{len(tasks)} processed; {len(failures)} unavailable', flush=True)
    imported = {name: sorted(kits, key=lambda kit: ORDER[kit['id']]) for name, kits in sorted(imported.items())}
    output = ROOT / 'src' / 'data' / 'seasonKitCatalog.json'
    output.write_text(json.dumps(imported, ensure_ascii=False, indent=2) + '\n')
    manifest = {
        'catalogDate': '2026-11-01', 'sourceName': 'Football Kit Archive',
        'clubsImported': len(imported), 'kitsImported': len(evidence), 'playableClubs': len(teams),
        'missingClubs': sorted(teams - set(imported)), 'failedImages': failures,
        'albumSources': [item['source'] for item in catalog['sources']],
        'records': sorted(evidence, key=lambda row: (row['club'], ORDER[row['id']])),
        'policy': 'Archive references, not official release certification. Missing metadata is null. New UI palettes are sampled approximations. Resizing preserves source aspect ratio and never upscales.',
    }
    (ROOT / 'docs' / 'kit-asset-manifest-2026.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({key: manifest[key] for key in ['clubsImported', 'kitsImported', 'missingClubs', 'failedImages']}), flush=True)


if __name__ == '__main__':
    main()
