#!/usr/bin/env python3
"""Import ESPN national squad pools. No API keys, guessed IDs, generated players or LLM calls.

python3 scripts/import-national-rosters.py --snapshot-date 2026-11-07
Use --offline to rebuild exclusively from cached responses. Game catalog ≠ qualification.
"""
import argparse
import concurrent.futures
import datetime as dt
import hashlib
import json
import re
import time
import unicodedata
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = 'https://site.api.espn.com/apis/site/v2/sports/soccer'
# Explicit inherited game catalog; prestige/formations are gameplay choices, not rankings.
# name|FIFA code|ISO flag code|confederation|prestige|catalog tier
CATALOG = '''England|ENG|eng|UEFA|91|base
France|FRA|FR|UEFA|94|base
Brazil|BRA|BR|CONMEBOL|93|base
Argentina|ARG|AR|CONMEBOL|92|base
Spain|ESP|ES|UEFA|90|base
Germany|GER|DE|UEFA|89|base
Portugal|POR|PT|UEFA|88|base
Netherlands|NED|NL|UEFA|86|base
Italy|ITA|IT|UEFA|87|base
USA|USA|US|CONCACAF|80|base
Japan|JPN|JP|AFC|81|base
Morocco|MAR|MA|CAF|83|base
Belgium|BEL|BE|UEFA|84|base
Croatia|CRO|HR|UEFA|83|base
Uruguay|URU|UY|CONMEBOL|83|base
Colombia|COL|CO|CONMEBOL|82|base
Denmark|DEN|DK|UEFA|82|european
Switzerland|SUI|CH|UEFA|83|european
Austria|AUT|AT|UEFA|81|european
Turkey|TUR|TR|UEFA|82|european
Poland|POL|PL|UEFA|79|european
Hungary|HUN|HU|UEFA|78|european
Scotland|SCO|sct|UEFA|77|european
Czechia|CZE|CZ|UEFA|79|european
Serbia|SRB|RS|UEFA|79|european
Romania|ROU|RO|UEFA|76|european
Slovakia|SVK|SK|UEFA|76|european
Slovenia|SVN|SI|UEFA|75|european
Georgia|GEO|GE|UEFA|74|european
Ukraine|UKR|UA|UEFA|80|european
Albania|ALB|AL|UEFA|73|european
Senegal|SEN|SN|CAF|82|global
South Korea|KOR|KR|AFC|81|global
Australia|AUS|AU|AFC|78|global
Mexico|MEX|MX|CONCACAF|80|global
Canada|CAN|CA|CONCACAF|78|global
Nigeria|NGA|NG|CAF|80|global
Egypt|EGY|EG|CAF|79|global
Cameroon|CMR|CM|CAF|77|global
Algeria|ALG|DZ|CAF|78|global
Ivory Coast|CIV|CI|CAF|80|global
Ghana|GHA|GH|CAF|76|global
Saudi Arabia|KSA|SA|AFC|75|global
Iran|IRN|IR|AFC|76|global
Chile|CHI|CL|CONMEBOL|77|global
Peru|PER|PE|CONMEBOL|76|global
Ecuador|ECU|EC|CONMEBOL|80|global
Costa Rica|CRC|CR|CONCACAF|74|global
New Zealand|NZL|NZ|OFC|70|global
South Africa|RSA|ZA|CAF|74|global
Tunisia|TUN|TN|CAF|75|global
Wales|WAL|wls|UEFA|78|global
Sweden|SWE|SE|UEFA|81|global
Norway|NOR|NO|UEFA|82|global
Ireland|IRL|IE|UEFA|75|global
Greece|GRE|GR|UEFA|78|global
Iceland|ISL|IS|UEFA|73|global
Finland|FIN|FI|UEFA|73|global
Jamaica|JAM|JM|CONCACAF|74|global
Panama|PAN|PA|CONCACAF|73|global
Venezuela|VEN|VE|CONMEBOL|76|global
Paraguay|PAR|PY|CONMEBOL|76|global
China|CHN|CN|AFC|68|global
Mali|MLI|ML|CAF|72|global'''
ALIASES = {'USA': 'United States', 'Turkey': 'Türkiye', 'Ireland': 'Republic of Ireland'}
SPECIAL_TACTICS = {
    'England': ('4-2-3-1', 'Balanced'), 'Germany': ('4-2-3-1', 'Attacking'),
    'Brazil': ('4-3-3', 'All-Out Attack'), 'Argentina': ('4-3-3', 'Attacking'),
    'Portugal': ('4-3-3', 'Attacking'), 'Italy': ('3-5-2', 'Balanced'),
    'USA': ('4-3-3', 'Attacking'), 'Japan': ('4-2-3-1', 'Balanced'),
    'Uruguay': ('4-2-3-1', 'Attacking'), 'Colombia': ('4-3-3', 'Attacking'),
}


def flag(code):
    if len(code) == 3:
        return '\U0001f3f4' + ''.join(chr(0xe0061 + ord(c) - ord('a')) for c in 'gb' + code) + '\U000e007f'
    return ''.join(chr(0x1f1e6 + ord(c) - ord('A')) for c in code)


def catalog():
    result = []
    for line in CATALOG.splitlines():
        name, code, iso, confed, prestige, tier = line.split('|')
        formation, mentality = SPECIAL_TACTICS.get(name, ('4-3-3', 'Balanced'))
        result.append(dict(name=name, countryCode=code, flag=flag(iso), confederation=confed,
                           prestige=int(prestige), catalogTier=tier, formation=formation, mentality=mentality))
    assert len(result) == len({x['countryCode'] for x in result}) == 64
    return result


def normalize(name):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower())


class Fetcher:
    def __init__(self, cache, offline=False):
        self.cache, self.offline = cache, offline
        cache.mkdir(parents=True, exist_ok=True)

    def get(self, url):
        path = self.cache / (hashlib.sha256(url.encode()).hexdigest() + '.json')
        if path.exists():
            return json.loads(path.read_text())
        if self.offline:
            raise RuntimeError('Not cached: ' + url)
        for attempt in range(3):
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'ManusFM-roster-import/1.0', 'Accept': 'application/json'})
                with urllib.request.urlopen(req, timeout=25) as response:
                    payload = json.load(response)
                record = {'url': url, 'retrievedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'payload': payload}
                path.write_text(json.dumps(record, ensure_ascii=False) + '\n')
                return record
            except urllib.error.HTTPError as exc:
                if exc.code in (400, 404, 422) or attempt == 2:
                    raise
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
                if attempt == 2:
                    raise
            time.sleep(0.5 * 2 ** attempt)
        raise RuntimeError('Unreachable')


def source_info(record, competition):
    p = record['payload']
    return dict(provider='ESPN', url=record['url'], retrievedAt=record['retrievedAt'],
                sourceTimestamp=p.get('timestamp'), competition=competition, season=p.get('season'))


def stats(athlete):
    return {s['name']: s.get('value') for c in athlete.get('statistics', {}).get('splits', {}).get('categories', [])
            for s in c.get('stats', [])}


def public_ref(ref):
    return ref.replace('http://sports.core.api.espn.pvt/', 'https://sports.core.api.espn.com/').replace(
        'http://sports.core.api.espn.com/', 'https://sports.core.api.espn.com/')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot-date', default=dt.date.today().isoformat())
    parser.add_argument('--cache-dir', type=Path, default=Path('/tmp/manusfm-national-roster-cache'))
    parser.add_argument('--concurrency', type=int, default=4)
    parser.add_argument('--offline', action='store_true')
    parser.add_argument('--clubs-cache-only', action='store_true', help='Reuse known club associations; disclose uncached club references instead of fetching additional enrichment.')
    parser.add_argument('--output', type=Path, default=ROOT / 'src/data/nationalRosterSnapshot.json')
    args = parser.parse_args()
    dt.date.fromisoformat(args.snapshot_date)
    fetcher = Fetcher(args.cache_dir, args.offline)
    workers = max(1, min(4, args.concurrency))
    inventories = {}
    inventory_sources = []
    competitions = ['fifa.friendly', 'fifa.world', 'uefa.euro', 'caf.nations']
    for competition in competitions:
        rec = fetcher.get(f'{SITE}/{competition}/teams?limit=1000')
        teams = rec['payload']['sports'][0]['leagues'][0]['teams']
        inventories[competition] = {normalize(t['team']['displayName']): t['team'] for t in teams}
        inventory_sources.append({'url': rec['url'], 'retrievedAt': rec['retrievedAt'], 'competition': competition, 'teamCount': len(teams)})
        print(f'Inventory {competition}: {len(teams)} teams', flush=True)
    configs = catalog()
    for config in configs:
        resolved = inventories['fifa.friendly'].get(normalize(ALIASES.get(config['name'], config['name'])))
        if not resolved or not str(resolved['id']).isdigit():
            raise RuntimeError('Unresolved catalog nation: ' + config['name'])
        config['sourceTeamId'] = str(resolved['id'])
        config['sourceName'] = resolved['displayName']
        config['sourceCountryCode'] = resolved.get('abbreviation')
        config['crestUrl'] = next((x.get('href') for x in resolved.get('logos', []) if x.get('href')), None)
        config['colors'] = {'primary': '#' + resolved.get('color', '555555'), 'secondary': '#' + resolved.get('alternateColor', 'FFFFFF')}
    assert len({x['sourceTeamId'] for x in configs}) == 64

    def load_nation(config):
        pool, sources, warnings = {}, [], []
        # A union of source squad pools, never an assertion of official final selection.
        required_identities = {'BEL': {'134283'}, 'ENG': {'291281'}, 'FRA': {'231388', '265919'}}.get(config['countryCode'], set())
        def has_playable_cover():
            positions = [p.get('sourcePosition', {}).get('abbreviation') for p in pool.values() if p.get('sourcePosition')]
            return sum(p in ('G', 'GK') for p in positions) >= 3 and sum(p in ('D', 'M', 'F', 'LB', 'CB', 'RB', 'DM', 'CM', 'AM', 'ST', 'CF', 'LW', 'RW', 'LM', 'RM', 'LWB', 'RWB') for p in positions) >= 23 and required_identities.issubset(pool)
        for competition in competitions:
            inventory = inventories[competition]
            if competition != 'fifa.friendly' and config['sourceTeamId'] not in {str(t['id']) for t in inventory.values()}:
                continue
            if competition != 'fifa.friendly' and has_playable_cover():
                break
            url = f"{SITE}/{competition}/teams/{config['sourceTeamId']}/roster?limit=500"
            try:
                rec = fetcher.get(url)
                p = rec['payload']
                if str(p.get('team', {}).get('id')) != config['sourceTeamId'] or not p.get('team', {}).get('isNational'):
                    raise ValueError('Roster team identity mismatch')
                source = source_info(rec, competition)
                sources.append(source)
                for a in p.get('athletes', []):
                    if not a.get('id') or not a.get('displayName'):
                        warnings.append('Source athlete missing identifier/name; not imported')
                        continue
                    aid = str(a['id'])
                    occurrence = {'url': url, 'competition': competition, 'season': p.get('season'), 'statistics': stats(a)}
                    if aid in pool:
                        pool[aid]['sourceOccurrences'].append(occurrence)
                        continue
                    pool[aid] = dict(externalId='espn:' + aid, sourceAthleteId=aid, uid=a.get('uid'),
                        name=a['displayName'], fullName=a.get('fullName'), shortName=a.get('shortName'),
                        firstName=a.get('firstName'), lastName=a.get('lastName'),
                        sourcePosition=a.get('position'), age=a.get('age'), dateOfBirth=a.get('dateOfBirth'),
                        citizenship=a.get('citizenship'), citizenshipCountry=a.get('citizenshipCountry'),
                        jersey=a.get('jersey'), sourceStatus=a.get('status'), injuries=a.get('injuries', []),
                        athleteUrl=next((x.get('href') for x in a.get('links', []) if 'playercard' in x.get('rel', [])), None),
                        clubReference=public_ref(a.get('defaultTeam', {}).get('$ref', '')) or None,
                        sourceOccurrences=[occurrence])
            except Exception as exc:
                warnings.append(f'{competition}: {type(exc).__name__}: {exc}')
        if len(pool) < 26:
            warnings.append(f'Only {len(pool)} sourced athletes; no invented completion to 26')
        config = dict(config, players=list(pool.values()), sources=sources, warnings=warnings,
                      coverage='source-pool' if pool else 'missing-source-roster')
        print(f"{config['countryCode']}: {len(pool)} sourced athletes", flush=True)
        return config

    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        nations = list(executor.map(load_nation, configs))
    # Resolve only the unique club references carried by roster athletes, not per-player lookups.
    club_refs = sorted({p['clubReference'] for n in nations for p in n['players'] if p['clubReference']})
    print(f'Resolving {len(club_refs)} source-provided unique club references', flush=True)

    def load_club(url):
        try:
            if args.clubs_cache_only and not (args.cache_dir / (hashlib.sha256(url.encode()).hexdigest() + '.json')).exists():
                return url, None, 'Uncached source club association; enrichment deliberately not requested'
            rec = fetcher.get(url)
            p = rec['payload']
            if p.get('isNational'):
                return url, None, 'defaultTeam is a national team, not a current club'
            return url, {'id': str(p['id']), 'name': p.get('displayName') or p.get('name'),
                         'url': url, 'retrievedAt': rec['retrievedAt']}, None
        except Exception as exc:
            return url, None, f'{type(exc).__name__}: {exc}'
    clubs = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        for i, (url, club, error) in enumerate(executor.map(load_club, club_refs), 1):
            clubs[url] = (club, error)
            if i % 40 == 0 or i == len(club_refs):
                print(f'Club references {i}/{len(club_refs)}', flush=True)
    for nation in nations:
        for player in nation['players']:
            club, error = clubs.get(player['clubReference'], (None, 'No club reference in source'))
            player['currentClub'] = club['name'] if club else None
            player['clubSource'] = club
            player['clubUncertainty'] = error
    coverage = {'catalogNations': len(nations), 'nationsWithRoster': sum(bool(n['players']) for n in nations),
                'nationsWithAtLeast26': sum(len(n['players']) >= 26 for n in nations),
                'athleteEntries': sum(len(n['players']) for n in nations),
                'uniqueAthleteIds': len({p['externalId'] for n in nations for p in n['players']}),
                'athletesWithClub': sum(bool(p['currentClub']) for n in nations for p in n['players']),
                'below26': [{'countryCode': n['countryCode'], 'name': n['name'], 'count': len(n['players'])} for n in nations if len(n['players']) < 26]}
    snapshot = {'schemaVersion': 1, 'snapshotDate': args.snapshot_date,
        'description': 'ESPN national squad pools observed on the snapshot date; not official final WC2026 selections. Game tournament participants are a curated catalog, not real qualification.',
        'uncertainty': ['ESPN unofficial public endpoints can be stale or competition-specific; retrieval date is not selection date.',
                        'Multiple verified competition pools may be unioned for source-supported keeper/outfield cover and recognized seeded identities; each athlete occurrence retains season and competition.',
                        'ESPN defaultTeam is source-reported current club, not independently verified transfer status.',
                        'ESPN positions are often broad G/D/M/F; specific game roles are derived, not sourced.',
                        'Provider season statistics are competition-scoped, not lifetime international caps; kept separately from game career statistics.'],
        'inventorySources': inventory_sources, 'coverage': coverage, 'nations': nations}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    # Compact the bundled payload; source values and per-request provenance are unchanged.
    args.output.write_text(json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(json.dumps(coverage, ensure_ascii=False), flush=True)
    print('Saved ' + str(args.output), flush=True)


if __name__ == '__main__':
    main()
