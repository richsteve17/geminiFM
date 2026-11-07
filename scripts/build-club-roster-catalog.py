#!/usr/bin/env python3
"""Regenerate the seven supported leagues from the dated ESPN inventory cache.

Canonical IDs are observations retained from the previous source snapshot, used
only for game-name compatibility. The importer still verifies each name/alias
against the current inventory; IDs never imply current division membership.
"""
import argparse
import importlib.util
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('club_import', HERE / 'import-club-rosters.py')
IMPORTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORTER)
SUPPORTED = {'Premier League': ('eng.1', 20), 'Championship': ('eng.2', 24),
             'La Liga': ('esp.1', 20), 'Serie A': ('ita.1', 20),
             'Bundesliga': ('ger.1', 18), 'Ligue 1': ('fra.1', 18), 'MLS': ('usa.1', 30)}


def build_catalog(config, fetcher, snapshot_date):
    config = json.loads(json.dumps(config))
    config['catalogBaseline'] = 'ESPN current supported domestic inventories / ' + snapshot_date
    config['snapshotDate'] = snapshot_date
    config['leagueInventories'] = {league: [code] for league, (code, _) in SUPPORTED.items()}
    config['expectedLeagueCounts'] = {league: count for league, (_, count) in SUPPORTED.items()}
    config['catalog'] = {}
    config['catalogSources'] = []
    canonical = config.get('canonicalSourceTeamIds', {})
    seen_ids, seen_names = set(), set()
    for league, (code, count) in SUPPORTED.items():
        _, inventory = IMPORTER.load_inventory(fetcher, code, snapshot_date)
        teams = inventory['teams']
        if len(teams) != count:
            raise ValueError(f'{code}: expected {count} valid current clubs, found {len(teams)}')
        config['catalog'][league] = []
        for team in teams:
            source_id = str(team.get('id', ''))
            name = canonical.get(source_id, team['displayName'])
            if not source_id.isdigit() or source_id in seen_ids or name in seen_names:
                raise ValueError('Invalid or duplicate current club identity: ' + name)
            seen_ids.add(source_id)
            seen_names.add(name)
            config['catalog'][league].append(name)
            aliases = list(dict.fromkeys(config.get('aliases', {}).get(name, []) + [
                team[key] for key in ('displayName', 'name', 'shortDisplayName')
                if team.get(key) and team[key] != name]))
            if aliases:
                config.setdefault('aliases', {})[name] = aliases
        config['catalogSources'].append(inventory['source'])
    # Historical exclusion evidence is retained; it never changes saved teams.
    return config


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sources', type=Path, default=IMPORTER.CONFIG)
    parser.add_argument('--cache-dir', type=Path, default=IMPORTER.DEFAULT_CACHE)
    parser.add_argument('--snapshot-date', default='2026-11-07')
    args = parser.parse_args()
    config = json.loads(args.sources.read_text())
    fetcher = IMPORTER.Fetcher(args.cache_dir, args.snapshot_date, offline=True)
    config = build_catalog(config, fetcher, args.snapshot_date)
    args.sources.write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n')
    print('Supported clubs:', sum(map(len, config['catalog'].values())))


if __name__ == '__main__':
    main()
