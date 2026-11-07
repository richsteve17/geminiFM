# Current supported club roster provenance — 2026-11-07

The domestic catalog now contains **all 150 clubs** observed in the seven supported ESPN current inventories. Every club has a sourced roster: **4,602 raw athlete entries / 4,601 unique ESPN IDs**, with no missing squads. This replaces the earlier 82-club subset and corrects division assignments; it does not refresh saved careers or change the xGaffer '28 edition or tutorial calendar.

| Game division | ESPN inventory | Clubs | Source athlete entries |
| --- | --- | ---: | ---: |
| Premier League | eng.1 | 20 | 603 |
| Championship | eng.2 | 24 | 735 |
| La Liga | esp.1 | 20 | 628 |
| Serie A | ita.1 | 20 | 652 |
| Bundesliga | ger.1 | 18 | 541 |
| Ligue 1 | fra.1 | 18 | 527 |
| MLS | usa.1 | 30 | 916 |

## Membership and compatible names

`scripts/build-club-roster-catalog.py` reads only the dated cached current inventories, checks their expected counts, and generates `scripts/club-roster-sources.json`. The manifest retains observed prior `sourceTeamId → gameName` mappings in `canonicalSourceTeamIds`. These are compatibility aliases, not permission to import clubs outside their observed current divisions. New clubs use observed source display names; existing clubs retain canonical names such as Tottenham, FC Barcelona, PSG, Sunderland and NY Red Bulls. Observed source display/name/short-name aliases let the existing importer independently resolve their current inventory identities.

Sunderland, Leeds United and Coventry City now belong to Premier League; West Ham, Wolves and Southampton to Championship. Leicester City (`eng.3`), Girona (`esp.2`), Wolfsburg (`ger.2`), Nantes and Reims (`fra.2`) are excluded from the new domestic catalog. Their historical ID mapping/exclusion evidence remains in the manifest. No saved team is deleted or moved.

Only `eng.1`, `eng.2`, `esp.1`, `ita.1`, `ger.1`, `fra.1`, `usa.1` are used for this import. The unchanged importer reused cached responses and fetched **73 missing roster responses**, with at most four concurrent requests. No unsupported divisions were expanded and no broad research, media or paid AI was used.

## Facts, provenance and limitations

The compact snapshot retains source team identity, source competition, URLs, retrieval timestamps, provider timestamps, season objects, athlete IDs/names, complete source position objects, age/DOB/citizenship/jersey fields, public owner references and selected source statistics. Full responses remain in `/tmp/manus-fm-current-rosters/cache`. All roster season years are checked against 2026; European source labels are 2026–27 and MLS is calendar-year 2026. Inventory publication timestamps are absent, retained as null and disclosed; retrieval times are not publication dates. Freshness/season/identity validation and date-specific cache isolation remain unchanged.

There are **202 source entries lacking both age and DOB**, **224 lacking citizenship metadata**, and **22 lacking jersey values**. Null source fields remain null. Runtime fallback age and modeled positions remain separately labeled; absent nationality remains Unknown unless authoritative national membership supplies it. No athlete names or membership fillers are generated, and source rosters are not asserted to be official senior registration lists.

The ID `espn:213535`, Moussa Diarra, occurs in both Málaga and Lens source rosters. The existing explicit source-owner-reference logic assigns the playable copy to Lens and records the losing Málaga entry as an ownership issue. Both raw entries remain in the snapshot. Runtime coverage is therefore **149 fully playable clubs, one partial club (Málaga), 4,601 playable athletes and zero missing clubs**. This is resolution of source evidence, not a separately certified transfer claim. Squad sizes remain 24–39; none is truncated at 25.

## Rebuild and verification

```bash
python3 scripts/build-club-roster-catalog.py --snapshot-date 2026-11-07
python3 scripts/import-club-rosters.py --snapshot-date 2026-11-07 \
  --cache-dir /tmp/manus-fm-current-rosters/cache --concurrency 4
# Historical replay: strictly offline, retaining original source timestamps.
python3 scripts/import-club-rosters.py --snapshot-date 2026-11-07 \
  --cache-dir /tmp/manus-fm-current-rosters/cache --offline --concurrency 4 \
  --output /tmp/manus-fm-current-rosters/expanded-offline.json
cmp src/data/clubRosterSnapshot.json /tmp/manus-fm-current-rosters/expanded-offline.json
python3 scripts/import-club-rosters.test.py
```

The cache now contains 168 successful raw responses: 13 previously cached inventories and 155 rosters (150 supported, plus five previously fetched excluded clubs). The manifest replay reads only seven inventories. The temporary cache is not a durable historical archive; preserve it externally if future byte-identical historical rebuilds are needed. A future live date requires its own fresh dated cache; the helper's supported-count checks deliberately fail closed if membership expectations change.

The generated and offline-rebuilt snapshots are byte-identical, SHA-256 `f3aa4fc63b819da64309d256d89503df2fe1dc67619a1bbebc4f4e7d40d11df2`.

The importer contract tests compare every supported club's IDs/division and every compact source athlete record against cached source responses, prohibit network during those checks, and verify aliases, missing facts, duplicate warnings, stale source rejection and deterministic cache replay. See `club-roster-hydration.md` for the factory/API and modeled game attributes.
