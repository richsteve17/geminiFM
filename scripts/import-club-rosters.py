#!/usr/bin/env python3
"""Import current ESPN club roster facts, never game-generated players.

python3 scripts/import-club-rosters.py --snapshot-date 2026-11-07
python3 scripts/import-club-rosters.py --snapshot-date 2026-11-07 --offline

Current league inventories resolve IDs; lower divisions are included. A dated
cache is required, and an old-season roster is rejected rather than relabelled.
Only the compact snapshot is bundled. All original responses stay in the cache.
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
CONFIG = ROOT / 'scripts/club-roster-sources.json'
DEFAULT_CACHE = Path('/tmp/manus-fm-current-rosters/cache')
RELEVANT_STATS = frozenset(('appearances', 'subIns', 'totalGoals', 'goalAssists',
    'totalShots', 'shotsOnTarget', 'saves', 'shotsFaced', 'goalsConceded',
    'redCards', 'yellowCards', 'ownGoals'))


def normalize(value):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', value)
                  .encode('ascii', 'ignore').decode().lower())


def public_ref(value):
    return value.replace('http://sports.core.api.espn.pvt/',
                         'https://sports.core.api.espn.com/').replace(
                         'http://sports.core.api.espn.com/',
                         'https://sports.core.api.espn.com/')


def parse_date(value):
    return dt.datetime.fromisoformat(value.replace('Z', '+00:00')).date()


class Fetcher:
    """A snapshot-specific raw response cache; offline mode never opens a URL."""
    def __init__(self, cache, snapshot_date, offline=False, refresh=False):
        self.cache = Path(cache)
        self.snapshot_date = snapshot_date
        self.offline = offline
        self.refresh = refresh
        self.cache.mkdir(parents=True, exist_ok=True)
        marker = self.cache / 'snapshot-cache.json'
        if marker.exists():
            metadata = json.loads(marker.read_text())
            if metadata.get('snapshotDate') != snapshot_date:
                raise ValueError('Cache belongs to another snapshot date; use a fresh cache directory')
            if metadata.get('provider') != 'ESPN-club-rosters':
                raise ValueError('Not an ESPN club roster cache')
        else:
            if offline or any(self.cache.iterdir()):
                raise ValueError('Missing dated cache marker; do not reuse an undated or national cache')
            marker.write_text(json.dumps({'snapshotDate': snapshot_date,
                                         'provider': 'ESPN-club-rosters'}) + '\n')

    def path(self, url):
        return self.cache / (hashlib.sha256(url.encode()).hexdigest() + '.json')

    def get(self, url):
        path = self.path(url)
        if path.exists() and (self.offline or not self.refresh):
            record = json.loads(path.read_text())
            if record.get('url') != url or record.get('snapshotDate') != self.snapshot_date:
                raise ValueError('Cache identity/date mismatch: ' + url)
            if parse_date(record['retrievedAt']).isoformat() != self.snapshot_date:
                raise ValueError('Cached response was not retrieved on its snapshot date: ' + url)
            return record
        if self.offline:
            raise RuntimeError('Not cached: ' + url)
        if dt.datetime.now(dt.timezone.utc).date().isoformat() != self.snapshot_date:
            raise ValueError('Live current-roster requests cannot reconstruct a different historical date; use its dated cache offline')
        for attempt in range(3):
            try:
                request = urllib.request.Request(url, headers={
                    'User-Agent': 'ManusFM-club-roster-import/1.0', 'Accept': 'application/json'})
                with urllib.request.urlopen(request, timeout=30) as response:
                    payload = json.load(response)
                record = {'url': url, 'snapshotDate': self.snapshot_date,
                          'retrievedAt': dt.datetime.now(dt.timezone.utc).isoformat(),
                          'payload': payload}
                temp = path.with_suffix('.tmp')
                temp.write_text(json.dumps(record, ensure_ascii=False) + '\n')
                temp.replace(path)
                return record
            except urllib.error.HTTPError as exc:
                if exc.code in (400, 404, 422) or attempt == 2:
                    raise
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
                if attempt == 2:
                    raise
            time.sleep(0.5 * 2 ** attempt)
        raise RuntimeError('Unreachable')


def source_info(record, competition, season=None):
    payload = record['payload']
    return {'provider': 'ESPN', 'url': record['url'],
            'retrievedAt': record['retrievedAt'],
            'sourceTimestamp': payload.get('timestamp'),
            'season': payload.get('season') if season is None else season,
            'competition': competition}


def season_problem(season, competition, snapshot_date):
    """Season comes from the provider; date is only a guard against stale labels."""
    if not isinstance(season, dict) or not isinstance(season.get('year'), int):
        return 'Source does not report a season year; current season cannot be established'
    date = dt.date.fromisoformat(snapshot_date)
    expected = date.year if competition == 'usa.1' or date.month >= 7 else date.year - 1
    if season['year'] != expected:
        return f"Old or future source season {season['year']} for {snapshot_date}; not imported as current"
    return None


def timestamp_problem(record, snapshot_date):
    timestamp = record['payload'].get('timestamp')
    if not timestamp:
        return None  # Timestamp absence is disclosed separately; season is mandatory.
    try:
        age = (dt.date.fromisoformat(snapshot_date) - parse_date(timestamp)).days
    except (ValueError, TypeError):
        return 'Unparseable source timestamp; freshness cannot be established'
    if age < 0 or age > 7:
        return f'Source timestamp {timestamp} is outside the snapshot freshness window of 7 days'
    return None


def load_inventory(fetcher, competition, snapshot_date):
    url = f'{SITE}/{competition}/teams?limit=1000'
    try:
        record = fetcher.get(url)
        leagues = [league for sport in record['payload'].get('sports', [])
                   for league in sport.get('leagues', [])]
        if len(leagues) != 1 or leagues[0].get('slug') != competition:
            raise ValueError('Inventory competition identity mismatch')
        league = leagues[0]
        source = source_info(record, competition, league.get('season'))
        teams = [entry['team'] for entry in league.get('teams', [])]
        source['teamCount'] = len(teams)
        problem = season_problem(league.get('season'), competition, snapshot_date)
        problem = problem or timestamp_problem(record, snapshot_date)
        source['warnings'] = [problem] if problem else []
        if source['sourceTimestamp'] is None:
            source['warnings'].append('Inventory has no source timestamp; retrievedAt is not a publication date')
        return competition, {'teams': [] if problem else teams, 'source': source,
                             'season': league.get('season')}
    except Exception as exc:
        return competition, {'teams': [], 'season': None, 'source': {
            'provider': 'ESPN', 'url': url, 'competition': competition,
            'retrievedAt': None, 'sourceTimestamp': None, 'season': None,
            'teamCount': 0, 'warnings': [f'{type(exc).__name__}: {exc}']}}


def catalog(config):
    result = [{'gameName': name, 'gameLeague': league}
              for league, names in config['catalog'].items() for name in names]
    if len(result) != len({item['gameName'] for item in result}):
        raise ValueError('Duplicate club names in catalog')
    return result


def resolve_team(game, inventories, config):
    target_names = {normalize(game['gameName'])}
    target_names.update(normalize(name) for name in config.get('aliases', {}).get(game['gameName'], []))
    matches = []
    for competition in config['leagueInventories'][game['gameLeague']]:
        for team in inventories[competition]['teams']:
            names = {normalize(team[key]) for key in ('displayName', 'name', 'shortDisplayName')
                     if team.get(key)}
            if names & target_names:
                if not str(team.get('id', '')).isdigit():
                    continue
                matches.append((competition, team))
    identities = {str(team['id']) for _, team in matches}
    if len(identities) > 1:
        return None, 'Ambiguous exact-name inventory matches; no guessed identity selected'
    if not matches:
        searched = ', '.join(config['leagueInventories'][game['gameLeague']])
        return None, 'Unresolved in current inventories: ' + searched
    # Multiple current domestic memberships would make the source league ambiguous.
    leagues = {competition for competition, _ in matches}
    if len(leagues) > 1:
        return None, 'Source team occurs in multiple current domestic inventories; league unresolved'
    return matches[0], None


def relevant_stats(athlete):
    statistics = athlete.get('statistics') or {}
    return {stat['name']: stat.get('value')
            for category in (statistics.get('splits') or {}).get('categories', [])
            for stat in category.get('stats', []) if stat.get('name') in RELEVANT_STATS}


def source_player(athlete, source_name, record, competition):
    aid = str(athlete['id'])
    player = {'externalId': 'espn:' + aid, 'sourceAthleteId': aid,
        'name': athlete['displayName'], 'fullName': athlete.get('fullName'),
        'shortName': athlete.get('shortName'), 'firstName': athlete.get('firstName'),
        'lastName': athlete.get('lastName'), 'sourcePosition': athlete.get('position'),
        'age': athlete.get('age'), 'dateOfBirth': athlete.get('dateOfBirth'),
        'citizenship': athlete.get('citizenship'),
        'citizenshipCountry': athlete.get('citizenshipCountry'), 'jersey': athlete.get('jersey'),
        'athleteUrl': next((link.get('href') for link in athlete.get('links', [])
                            if 'playercard' in link.get('rel', [])), None),
        'currentClub': source_name,
        'sourceOccurrences': [{'url': record['url'], 'competition': competition,
                              'season': record['payload'].get('season'),
                              'statistics': relevant_stats(athlete)}]}
    ref = (athlete.get('defaultTeam') or {}).get('$ref')
    if ref:
        player['defaultTeamReference'] = ref
        player['clubReference'] = public_ref(ref)
    return player


def load_roster(game, resolved, inventories, fetcher, snapshot_date):
    team = dict(game, sourceTeamId=None, sourceName=None, sourceLeagueCode=None,
                sources=[], players=[], warnings=[], coverage='missing')
    match, error = resolved
    if error:
        team['warnings'].append(error)
        return team
    competition, identity = match
    source_id = str(identity['id'])
    team.update(sourceTeamId=source_id, sourceName=identity['displayName'],
                sourceLeagueCode=competition)
    url = f'{SITE}/{competition}/teams/{source_id}/roster?limit=500'
    try:
        record = fetcher.get(url)
        payload = record['payload']
        team['sources'].append(source_info(record, competition))
        if payload.get('status') not in (None, 'success'):
            raise ValueError('Provider roster status is not success')
        if str((payload.get('team') or {}).get('id')) != source_id:
            raise ValueError('Roster team identity mismatch')
        if payload['team'].get('isNational'):
            raise ValueError('National-team response returned for a club')
        problem = season_problem(payload.get('season'), competition, snapshot_date)
        problem = problem or timestamp_problem(record, snapshot_date)
        if not problem and payload['season']['year'] != inventories[competition]['season']['year']:
            problem = 'Roster season differs from current inventory season'
        if problem:
            raise ValueError(problem)
        if not payload.get('timestamp'):
            team['warnings'].append('Roster has no source timestamp; retrievedAt is not a publication date')
        pool = {}
        for athlete in payload.get('athletes', []):
            if not str(athlete.get('id', '')).isdigit() or not athlete.get('displayName'):
                team['warnings'].append('Source athlete missing numeric ID or name; skipped, not invented')
                continue
            player = source_player(athlete, team['sourceName'], record, competition)
            aid = player['sourceAthleteId']
            if aid in pool:
                team['warnings'].append('Duplicate source athlete ID ' + aid + '; kept first source identity')
                continue
            pool[aid] = player
            ref = player.get('defaultTeamReference', '')
            reference_id = re.search(r'/teams/(\d+)(?:[/?]|$)', ref)
            if reference_id and reference_id.group(1) != source_id:
                team['warnings'].append(f"Athlete {aid} defaultTeam points to {reference_id.group(1)} rather than roster {source_id}; source discrepancy only, no reassignment")
        team['players'] = list(pool.values())
        if team['players']:
            team['coverage'] = 'source-roster'
        else:
            team['warnings'].append('Current source roster is empty; no fabricated completion')
        if 0 < len(team['players']) < 18:
            team['warnings'].append(f"Only {len(team['players'])} sourced athletes; roster not filled with invented players")
    except Exception as exc:
        team['warnings'].append(f'{competition}: {type(exc).__name__}: {exc}')
    return team


def build_snapshot(config, fetcher, snapshot_date, concurrency=4, progress=print):
    workers = max(1, min(4, concurrency))
    competitions = list(dict.fromkeys(code for codes in config['leagueInventories'].values() for code in codes))
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        inventories = dict(executor.map(lambda code: load_inventory(fetcher, code, snapshot_date), competitions))
    for code in competitions:
        source = inventories[code]['source']
        progress(f"Inventory {code}: {source['teamCount']} teams, season {source['season']}")
    games = catalog(config)
    resolved = [resolve_team(game, inventories, config) for game in games]
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        pending = [executor.submit(load_roster, game, resolution, inventories, fetcher, snapshot_date)
                   for game, resolution in zip(games, resolved)]
        complete = 0
        for future in concurrent.futures.as_completed(pending):
            future.result()
            complete += 1
            if complete % 10 == 0 or complete == len(games):
                progress(f'Club rosters {complete}/{len(games)} complete')
        teams = [future.result() for future in pending]
    occurrences = {}
    for team in teams:
        for player in team['players']:
            occurrences.setdefault(player['externalId'], []).append(team['gameName'])
    for team in teams:
        for player in team['players']:
            clubs = occurrences[player['externalId']]
            if len(clubs) > 1:
                team['warnings'].append(f"Athlete {player['externalId']} occurs in multiple source rosters: {', '.join(clubs)}; preserved as source discrepancy, not a verified transfer")
    coverage = {'catalogClubs': len(teams), 'clubsWithRoster': sum(bool(team['players']) for team in teams),
        'athleteEntries': sum(len(team['players']) for team in teams),
        'uniqueAthleteIds': len(occurrences),
        'missing': [{'gameName': team['gameName'], 'gameLeague': team['gameLeague'],
                     'reason': '; '.join(team['warnings'])} for team in teams if not team['players']]}
    return {'schemaVersion': 1, 'snapshotDate': snapshot_date,
            'inventorySources': [inventories[code]['source'] for code in competitions],
            'coverage': coverage, 'teams': teams}


def write_snapshot(snapshot, path):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')) + '\n')
    temp.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot-date', default=dt.datetime.now(dt.timezone.utc).date().isoformat())
    parser.add_argument('--cache-dir', type=Path, default=DEFAULT_CACHE)
    parser.add_argument('--sources', type=Path, default=CONFIG)
    parser.add_argument('--output', type=Path, default=ROOT / 'src/data/clubRosterSnapshot.json')
    parser.add_argument('--concurrency', type=int, default=4)
    parser.add_argument('--offline', action='store_true')
    parser.add_argument('--refresh', action='store_true', help='Refetch same-date responses; never mix snapshot dates')
    args = parser.parse_args()
    dt.date.fromisoformat(args.snapshot_date)
    config = json.loads(args.sources.read_text())
    fetcher = Fetcher(args.cache_dir, args.snapshot_date, args.offline, args.refresh)
    snapshot = build_snapshot(config, fetcher, args.snapshot_date, args.concurrency,
                              lambda message: print(message, flush=True))
    write_snapshot(snapshot, args.output)
    print(json.dumps(snapshot['coverage'], ensure_ascii=False), flush=True)
    print('Saved ' + str(args.output), flush=True)


if __name__ == '__main__':
    main()
