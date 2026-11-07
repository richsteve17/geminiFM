#!/usr/bin/env python3
"""Offline unit and bundled-data contract tests; no public requests are made."""
import copy
import importlib.util
import json
import tempfile
import unittest
from collections import Counter
from pathlib import Path
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location('club_import', HERE / 'import-club-rosters.py')
IMPORTER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(IMPORTER)
DATE = '2026-11-07'


def record(url, payload):
    return {'url': url, 'snapshotDate': DATE, 'retrievedAt': DATE + 'T16:00:00+00:00',
            'payload': payload}


def inventory(competition, teams):
    return {'sports': [{'leagues': [{'slug': competition,
        'season': {'year': 2026, 'displayName': '2026'},
        'teams': [{'team': team} for team in teams]}]}]}


def roster():
    # Literal representative source facts; no game abilities or financial values.
    return {'status': 'success', 'timestamp': DATE + 'T16:00:00Z',
        'season': {'year': 2026, 'displayName': '2026-27 English Premier League'},
        'team': {'id': '359', 'displayName': 'Arsenal', 'isNational': False},
        'athletes': [{'id': '196176', 'displayName': 'David Raya', 'fullName': 'David Raya',
            'shortName': 'D. Raya', 'firstName': 'David', 'lastName': 'Raya',
            'age': 31, 'dateOfBirth': '1995-09-15T07:00Z', 'citizenship': 'Spain',
            'citizenshipCountry': {'abbreviation': 'ESP'}, 'jersey': '1',
            'position': {'id': '1', 'name': 'Goalkeeper', 'abbreviation': 'G'},
            'defaultTeam': {'$ref': 'http://sports.core.api.espn.pvt/v2/sports/soccer/teams/359?lang=en&region=us'},
            'links': [{'rel': ['playercard'], 'href': 'https://www.espn.com/soccer/player/_/id/196176/david-raya'}],
            'statistics': {'splits': {'categories': [{'stats': [
                {'name': 'appearances', 'value': 9}, {'name': 'totalGoals', 'value': 0},
                {'name': 'unrelatedMeasurement', 'value': 999}]}]}}}]}


class MemoryFetcher:
    def __init__(self, records):
        self.records = records

    def get(self, url):
        if url not in self.records:
            raise RuntimeError('Not cached: ' + url)
        return copy.deepcopy(self.records[url])


class ClubImportTests(unittest.TestCase):
    def setUp(self):
        self.game = {'gameName': 'Arsenal', 'gameLeague': 'Premier League'}
        self.identity = {'id': '359', 'displayName': 'Arsenal'}
        self.config = {'catalog': {'Premier League': ['Arsenal']},
                       'leagueInventories': {'Premier League': ['eng.1', 'eng.2']}, 'aliases': {}}
        self.url = IMPORTER.SITE + '/eng.1/teams/359/roster?limit=500'
        self.inventories = {'eng.1': {'teams': [self.identity], 'season': {'year': 2026}},
                            'eng.2': {'teams': [], 'season': {'year': 2026}}}

    def load(self, payload):
        return IMPORTER.load_roster(self.game, (('eng.1', self.identity), None),
            self.inventories, MemoryFetcher({self.url: record(self.url, payload)}), DATE)

    def test_facts_preserved_without_role_or_age_generation(self):
        payload = roster()
        team = self.load(payload)
        player = team['players'][0]
        self.assertEqual(team['coverage'], 'source-roster')
        self.assertEqual(player['sourcePosition'], payload['athletes'][0]['position'])
        self.assertEqual(player['age'], 31)
        self.assertEqual(player['dateOfBirth'], '1995-09-15T07:00Z')
        self.assertEqual(player['externalId'], 'espn:196176')
        self.assertEqual(player['defaultTeamReference'], payload['athletes'][0]['defaultTeam']['$ref'])
        self.assertTrue(player['clubReference'].startswith('https://sports.core.api.espn.com/'))
        self.assertEqual(player['currentClub'], 'Arsenal')
        self.assertFalse({'rating', 'wage', 'fee', 'position'} & player.keys())
        self.assertEqual(player['sourceOccurrences'][0]['statistics'], {'appearances': 9, 'totalGoals': 0})

    def test_absent_age_and_position_stay_null(self):
        payload = roster()
        for field in ('age', 'dateOfBirth', 'position', 'citizenship', 'firstName', 'lastName'):
            del payload['athletes'][0][field]
        player = self.load(payload)['players'][0]
        for field in ('age', 'dateOfBirth', 'sourcePosition', 'citizenship', 'firstName', 'lastName'):
            self.assertIsNone(player[field])

    def test_old_roster_season_is_rejected_with_source_retained(self):
        payload = roster()
        payload['season']['year'] = 2025
        team = self.load(payload)
        self.assertEqual(team['players'], [])
        self.assertEqual(team['coverage'], 'missing')
        self.assertEqual(team['sources'][0]['season']['year'], 2025)
        self.assertTrue(any('not imported as current' in warning for warning in team['warnings']))

    def test_unreported_roster_season_is_rejected(self):
        payload = roster()
        del payload['season']
        self.assertEqual(self.load(payload)['coverage'], 'missing')

    def test_old_timestamp_and_wrong_identity_are_rejected(self):
        for mutate in (lambda p: p.update(timestamp='2026-10-01T00:00:00Z'),
                       lambda p: p['team'].update(id='360'),
                       lambda p: p['team'].update(isNational=True)):
            payload = roster()
            mutate(payload)
            self.assertEqual(self.load(payload)['players'], [])

    def test_default_team_conflict_is_disclosed_not_reassigned(self):
        payload = roster()
        payload['athletes'][0]['defaultTeam']['$ref'] = 'https://sports.core.api.espn.com/v2/sports/soccer/teams/360'
        team = self.load(payload)
        self.assertEqual(team['players'][0]['currentClub'], 'Arsenal')
        self.assertTrue(any('source discrepancy only' in warning for warning in team['warnings']))

    def test_invalid_or_duplicate_athletes_not_fabricated(self):
        payload = roster()
        payload['athletes'].append(copy.deepcopy(payload['athletes'][0]))
        payload['athletes'].append({'displayName': 'Missing identifier'})
        payload['athletes'].append({'id': 'not-numeric', 'displayName': 'Invalid identifier'})
        team = self.load(payload)
        self.assertEqual(len(team['players']), 1)
        self.assertTrue(any('Duplicate' in warning for warning in team['warnings']))

    def test_exact_alias_resolution_in_lower_division(self):
        game = {'gameName': 'West Brom', 'gameLeague': 'Premier League'}
        self.config['aliases'] = {'West Brom': ['West Bromwich Albion']}
        self.inventories['eng.2']['teams'] = [{'id': '383', 'displayName': 'West Bromwich Albion'}]
        result, error = IMPORTER.resolve_team(game, self.inventories, self.config)
        self.assertIsNone(error)
        self.assertEqual(result[0], 'eng.2')
        self.assertEqual(result[1]['id'], '383')
        result, error = IMPORTER.resolve_team({'gameName': 'West', 'gameLeague': 'Premier League'}, self.inventories, self.config)
        self.assertIsNone(result)
        self.assertIn('Unresolved', error)

    def test_ambiguous_inventory_ids_and_leagues_not_guessed(self):
        self.inventories['eng.2']['teams'] = [{'id': '360', 'displayName': 'Arsenal'}]
        self.assertIn('Ambiguous', IMPORTER.resolve_team(self.game, self.inventories, self.config)[1])
        self.inventories['eng.2']['teams'][0]['id'] = '359'
        self.assertIn('multiple current', IMPORTER.resolve_team(self.game, self.inventories, self.config)[1])

    def test_current_season_date_guard_and_mls(self):
        self.assertIsNone(IMPORTER.season_problem({'year': 2026}, 'eng.1', DATE))
        self.assertIsNone(IMPORTER.season_problem({'year': 2026}, 'usa.1', '2026-02-01'))
        self.assertIsNone(IMPORTER.season_problem({'year': 2025}, 'eng.1', '2026-02-01'))
        self.assertIsNotNone(IMPORTER.season_problem({'year': 2025}, 'eng.1', DATE))

    def test_complete_offline_cache_rebuild_never_uses_network(self):
        with tempfile.TemporaryDirectory() as folder:
            fetcher = IMPORTER.Fetcher(Path(folder), DATE)
            for code, teams in [('eng.1', [self.identity]), ('eng.2', [])]:
                url = f'{IMPORTER.SITE}/{code}/teams?limit=1000'
                fetcher.path(url).write_text(json.dumps(record(url, inventory(code, teams))))
            fetcher.path(self.url).write_text(json.dumps(record(self.url, roster())))
            offline = IMPORTER.Fetcher(Path(folder), DATE, offline=True)
            with patch('urllib.request.urlopen', side_effect=AssertionError('Network forbidden')):
                first = IMPORTER.build_snapshot(self.config, offline, DATE, 50, lambda _: None)
                second = IMPORTER.build_snapshot(self.config, offline, DATE, 1, lambda _: None)
            self.assertEqual(first, second)
            self.assertEqual(first['coverage'], {'catalogClubs': 1, 'clubsWithRoster': 1,
                'athleteEntries': 1, 'uniqueAthleteIds': 1, 'missing': []})
            output = Path(folder) / 'out.json'
            IMPORTER.write_snapshot(first, output)
            self.assertEqual(len(output.read_text().splitlines()), 1)
            self.assertEqual(json.loads(output.read_text()), first)

    def test_cache_date_identity_and_missing_response_fail_closed(self):
        with tempfile.TemporaryDirectory() as folder:
            cache = Path(folder)
            fetcher = IMPORTER.Fetcher(cache, DATE)
            with self.assertRaises(ValueError):
                IMPORTER.Fetcher(cache, '2026-11-08', offline=True)
            fetcher.path(self.url).write_text(json.dumps(record(self.url, roster()) | {'snapshotDate': '2025-01-01'}))
            with patch('urllib.request.urlopen', side_effect=AssertionError('Network forbidden')):
                with self.assertRaises(ValueError):
                    IMPORTER.Fetcher(cache, DATE, offline=True).get(self.url)
                with self.assertRaises(RuntimeError):
                    IMPORTER.Fetcher(cache, DATE, offline=True).get(self.url + '&missing=1')
        with tempfile.TemporaryDirectory() as folder:
            (Path(folder) / 'old-national.json').write_text('{}')
            with self.assertRaises(ValueError):
                IMPORTER.Fetcher(Path(folder), DATE)

    def test_missing_sources_are_explicit(self):
        snapshot = IMPORTER.build_snapshot(self.config, MemoryFetcher({}), DATE, progress=lambda _: None)
        self.assertEqual(snapshot['coverage']['clubsWithRoster'], 0)
        self.assertEqual(len(snapshot['coverage']['missing']), 1)
        self.assertEqual(snapshot['teams'][0]['coverage'], 'missing')

    def test_old_inventory_season_is_not_used_for_id_resolution(self):
        url = IMPORTER.SITE + '/eng.1/teams?limit=1000'
        payload = inventory('eng.1', [self.identity])
        payload['sports'][0]['leagues'][0]['season']['year'] = 2025
        _, result = IMPORTER.load_inventory(MemoryFetcher({url: record(url, payload)}), 'eng.1', DATE)
        self.assertEqual(result['teams'], [])
        self.assertEqual(result['source']['teamCount'], 1)


class BundledSnapshotTests(unittest.TestCase):
    def test_catalog_scope(self):
        config = json.loads(IMPORTER.CONFIG.read_text())
        games = IMPORTER.catalog(config)
        self.assertEqual(len(games), 82)
        self.assertEqual(Counter(game['gameLeague'] for game in games), {
            'Premier League': 20, 'Championship': 10, 'La Liga': 10, 'Serie A': 10,
            'Bundesliga': 10, 'Ligue 1': 10, 'MLS': 12})
        self.assertNotIn('sourceTeamId', json.dumps(config))

    def test_bundled_contract_and_coverage(self):
        path = IMPORTER.ROOT / 'src/data/clubRosterSnapshot.json'
        if not path.exists():
            self.skipTest('Snapshot not generated yet')
        snapshot = json.loads(path.read_text())
        config = json.loads(IMPORTER.CONFIG.read_text())
        self.assertEqual(snapshot['schemaVersion'], 1)
        self.assertEqual(snapshot['snapshotDate'], DATE)
        self.assertEqual([(t['gameName'], t['gameLeague']) for t in snapshot['teams']],
            [(g['gameName'], g['gameLeague']) for g in IMPORTER.catalog(config)])
        teams = snapshot['teams']
        players = [p for t in teams for p in t['players']]
        self.assertEqual(snapshot['coverage']['catalogClubs'], 82)
        self.assertEqual(snapshot['coverage']['clubsWithRoster'], sum(bool(t['players']) for t in teams))
        self.assertEqual(snapshot['coverage']['athleteEntries'], len(players))
        self.assertEqual(snapshot['coverage']['uniqueAthleteIds'], len({p['externalId'] for p in players}))
        self.assertEqual({t['gameName'] for t in teams if not t['players']},
                         {t['gameName'] for t in snapshot['coverage']['missing']})
        for team in teams:
            self.assertEqual(team['coverage'], 'source-roster' if team['players'] else 'missing')
            self.assertEqual(len(team['players']), len({p['externalId'] for p in team['players']}))
            if team['players']:
                self.assertIsNone(IMPORTER.season_problem(team['sources'][0]['season'], team['sourceLeagueCode'], DATE))
            for player in team['players']:
                self.assertEqual(player['externalId'], 'espn:' + player['sourceAthleteId'])
                self.assertTrue(player['sourceAthleteId'].isdigit())
                self.assertEqual(player['currentClub'], team['sourceName'])
                self.assertTrue(player['name'])
                for occurrence in player['sourceOccurrences']:
                    self.assertEqual(occurrence['competition'], team['sourceLeagueCode'])
                    self.assertTrue(set(occurrence['statistics']) <= IMPORTER.RELEVANT_STATS)
                self.assertFalse({'rating', 'wage', 'fee', 'position'} & player.keys())


if __name__ == '__main__':
    unittest.main(verbosity=2)
