#!/usr/bin/env python3
"""Offline importer tests: python3 scripts/import-national-rosters.test.py."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('national_import', Path(__file__).with_name('import-national-rosters.py'))
rosters = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rosters)


class NationalRosterImportTests(unittest.TestCase):
    def test_explicit_unique_game_catalog(self):
        catalog = rosters.catalog()
        self.assertEqual(len(catalog), 64)
        self.assertEqual(len({n['name'] for n in catalog}), 64)
        self.assertEqual(len({n['countryCode'] for n in catalog}), 64)
        self.assertEqual(sum(n['catalogTier'] == 'base' for n in catalog), 16)
        self.assertEqual(sum(n['catalogTier'] == 'european' for n in catalog), 15)
        self.assertEqual(sum(n['catalogTier'] == 'global' for n in catalog), 33)
        self.assertEqual(next(n for n in catalog if n['countryCode'] == 'AUS')['confederation'], 'AFC')
        self.assertEqual(next(n for n in catalog if n['countryCode'] == 'BEL')['flag'], '🇧🇪')
        self.assertEqual(rosters.flag('eng'), '🏴󠁧󠁢󠁥󠁮󠁧󠁿')
        self.assertEqual(rosters.flag('sct'), '🏴󠁧󠁢󠁳󠁣󠁴󠁿')

    def test_name_normalization_and_inventory_aliases(self):
        self.assertEqual(rosters.normalize('Aurélien Tchouaméni'), rosters.normalize('Aurelien Tchouameni'))
        self.assertEqual(rosters.ALIASES['Ireland'], 'Republic of Ireland')
        self.assertEqual(rosters.ALIASES['USA'], 'United States')
        self.assertEqual(rosters.ALIASES['Turkey'], 'Türkiye')

    def test_public_ref_preserves_resolved_numeric_club_id(self):
        self.assertEqual(rosters.public_ref('http://sports.core.api.espn.pvt/v2/sports/soccer/teams/331?lang=en&region=us'),
                         'https://sports.core.api.espn.com/v2/sports/soccer/teams/331?lang=en&region=us')

    def test_offline_cache_does_not_fabricate_missing_source(self):
        with tempfile.TemporaryDirectory() as directory:
            fetch = rosters.Fetcher(Path(directory), offline=True)
            url = 'https://example.org/verified-source'
            with self.assertRaisesRegex(RuntimeError, 'Not cached'):
                fetch.get(url)
            import hashlib
            saved = {'url': url, 'retrievedAt': '2026-11-07T15:00:00Z', 'payload': {'athletes': []}}
            (Path(directory) / (hashlib.sha256(url.encode()).hexdigest() + '.json')).write_text(json.dumps(saved))
            self.assertEqual(fetch.get(url), saved)

    def test_appearance_facts_remain_source_competition_stats(self):
        source = {'statistics': {'splits': {'categories': [{'stats': [
            {'name': 'appearances', 'value': 7}, {'name': 'totalGoals', 'value': 3},
        ]}]}}}
        self.assertEqual(rosters.stats(source), {'appearances': 7, 'totalGoals': 3})
        self.assertEqual(rosters.stats({}), {})


if __name__ == '__main__':
    unittest.main()
