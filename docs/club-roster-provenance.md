# Club roster provenance — 2026-11-07

The bundled `src/data/clubRosterSnapshot.json` contains source rosters for **all 82 existing playable clubs**, with **2,538 athlete entries and 2,538 unique ESPN athlete IDs**. `coverage.missing` is empty. This is the existing v3.4.0 / `66b6a64` catalog, not an expansion of the game. Its names, ordering, and game league labels were checked against `/tmp/manus-fm-current-rosters/game-club-catalog.json`.

Coverage by the unchanged game leagues is Premier League 20 clubs / 599 athletes; Championship 10 / 308; La Liga 10 / 319; Serie A 10 / 329; Bundesliga 10 / 307; Ligue 1 10 / 305; and MLS 12 / 371. The provider roster size ranges from 24 to 39 athletes. These are ESPN source rosters, not an assertion that every entry belongs to an official registered first-team list.

## Source and freshness

The importer uses ESPN's public structured team inventory and current roster endpoints. Their shapes and soccer competition codes are documented publicly by SportsDataverse and the Public ESPN API reference. No API credentials, LLM calls, generated player names, scraped search snippets, or invented team IDs are used.[1] [2]

Team IDs are resolved from the current `teams?limit=1000` inventories. Every observed inventory reports season year **2026**. The batch loads `eng.1`, `eng.2`, `eng.3`, `eng.4`, `esp.1`, `esp.2`, `ita.1`, `ita.2`, `ger.1`, `ger.2`, `fra.1`, `fra.2`, and `usa.1`. Exact normalized source names and explicit name aliases are used; fuzzy identity guesses are rejected. IDs in the runtime snapshot are observations, not a hand-coded lookup list.[3]

Each resolved club is fetched from its observed domestic competition using `teams/{sourceTeamId}/roster?limit=500`. All 82 roster responses report season year **2026**. European roster season labels refer to 2026–27 and MLS to 2026. Roster source timestamps range from **2026-11-07T14:48:16Z** to **2026-11-07T16:51:15Z**. Roster responses were retrieved between **2026-11-07T16:50:18.230357+00:00** and **2026-11-07T16:51:59.115764+00:00**. Each club retains its exact URL, retrieval time, provider timestamp, competition code, and raw season object; each athlete occurrence retains its competition and season.[4]

The 13 inventory payloads do not provide a source timestamp. Their `sourceTimestamp` values remain `null`, and the absence is recorded in `inventorySources[].warnings`. `retrievedAt` is not substituted for a provider publication timestamp. An old-season roster is not made current by a recent retrieval: the importer rejects absent or incompatible season years, mismatched team identities, and reported source timestamps outside the seven-day snapshot freshness window. Raw rejected sources remain available for diagnosis, with missing coverage instead of fabricated athletes.

## Game leagues and observed source leagues

`gameLeague` is deliberately preserved from the canonical game catalog. `sourceLeagueCode` reports the current inventory association without changing the game's competition setup. The source reports these differences:

- West Ham and Wolves: game Premier League, source `eng.2`.
- Leicester City: game Premier League, source `eng.3`.
- Southampton: game Premier League, source `eng.2`.
- Sunderland, Leeds United, and Coventry City: game Championship, source `eng.1`.
- Girona: game La Liga, source `esp.2`.
- Wolfsburg: game Bundesliga, source `ger.2`.
- Nantes and Reims: game Ligue 1, source `fra.2`.

All other game clubs resolve within the corresponding first-choice source inventory. The MLS inventory names `Atlanta United FC`, `Chicago Fire FC`, and `Red Bull New York` are exact aliases for the inherited game labels `Atlanta United`, `Chicago Fire`, and `NY Red Bulls`. These aliases were read from the current structured inventory; no guessed IDs were introduced.

## Facts retained and remaining source gaps

Athletes retain source IDs, display/full/short/given/family names, the complete source position object, age, birth date, citizenship, citizenship-country metadata, jersey, and player URL. No ages are advanced, dates inferred, names expanded, nationalities guessed, or broad G/D/M/F positions converted into claimed factual granular roles. There are **110 athletes without source age or birth date**, **117 without citizenship or citizenship-country metadata**, and **14 without jersey numbers**. These values remain missing or `null`. Every athlete has a source position object, player URL, and source-provided default-team reference.

`currentClub` means the owner of the current roster endpoint, identified by `sourceName`; it is not a separately verified transfer claim. The original `defaultTeamReference` is retained verbatim. `clubReference` is its public HTTPS equivalent, replacing ESPN's internal `.pvt` reference hostname but preserving the reference path and query. **131 athlete default-team references across 34 clubs point to a different team ID from the roster owner.** Each discrepancy is recorded in `teams[].warnings`; neither the athlete nor a user-authored World Cup association is reassigned. Some references can point to another source team structure; this import does not claim to have resolved their meaning. There are no athlete IDs duplicated across the 82 observed rosters.

Only source-reported competition statistics named `appearances`, `subIns`, `totalGoals`, `goalAssists`, `totalShots`, `shotsOnTarget`, `saves`, `shotsFaced`, `goalsConceded`, `redCards`, `yellowCards`, and `ownGoals` are copied into `sourceOccurrences[].statistics`. Zero values are preserved. These are provider competition-season measurements, not game abilities, lifetime international caps, transfer fees, or wages. Full original statistical payloads stay in the raw cache.

No authoritative World Cup JSON, application code, constants, TypeScript engine, UI, or saved careers were changed by this importer. Source discrepancies are annotations only. The separate hydration layer must continue to distinguish raw sourced facts from modeled game attributes and owner-supplied national records.

## Rebuild and verification

The checked-in configuration `scripts/club-roster-sources.json` contains the frozen 82-club catalog, documented competition codes, and name aliases; it contains no source team IDs. `scripts/import-club-rosters.py` uses Python's standard library and at most four concurrent HTTP requests, retries transient failures up to three times, and emits progress every ten clubs.

The fresh date-specific cache is `/tmp/manus-fm-current-rosters/cache`. It contains **95 successful raw responses: 13 inventories and 82 rosters**, plus `snapshot-cache.json` identifying the date and provider. The importer rejects a cache for another date, an undated cache, or a national-roster cache. Online requests cannot be labelled with a historical snapshot date; use that date's preserved cache for historical rebuilds. To collect a new date, pass a new empty `--cache-dir`. `--refresh` explicitly refetches same-date responses only. Offline mode never performs a network request and preserves original retrieval timestamps. The `/tmp` cache is not a durable archival guarantee: retain a copy externally if future byte-identical historical rebuilds are required.

Commands run from `/home/ubuntu/manusfm`:

```bash
# Collect current source facts; rerunning reused the dated cache and fetched only
# the three MLS clubs newly resolved by their observed source-name aliases.
python3 scripts/import-club-rosters.py \
  --snapshot-date 2026-11-07 \
  --cache-dir /tmp/manus-fm-current-rosters/cache --concurrency 4

python3 -m py_compile \
  scripts/import-club-rosters.py scripts/import-club-rosters.test.py
python3 scripts/import-club-rosters.test.py

# Rebuild without network access, retaining source retrieval timestamps.
python3 scripts/import-club-rosters.py \
  --snapshot-date 2026-11-07 \
  --cache-dir /tmp/manus-fm-current-rosters/cache --offline --concurrency 4 \
  --output /tmp/manus-fm-current-rosters/offline-snapshot.json
cmp src/data/clubRosterSnapshot.json \
  /tmp/manus-fm-current-rosters/offline-snapshot.json
sha256sum src/data/clubRosterSnapshot.json \
  /tmp/manus-fm-current-rosters/offline-snapshot.json
```

All **16 network-free tests passed** with no skips after the snapshot was generated. Tests cover raw fact preservation, null source fields, exact alias and lower-division resolution, ambiguous identity rejection, mismatched team rejection, stale seasons and timestamps, preserved reference discrepancies, relevant-stat filtering, explicit missing coverage, dated-cache isolation, and deterministic offline rebuild. A separate direct comparison checked all 82 roster memberships, athlete identities, requested source attributes, source timestamps, and source seasons against the raw responses. The generated catalog was checked against the original canonical export.

The live and offline snapshots are byte-identical. Both have SHA-256:

```text
f57e0082fa044ae3d30d83aa573e9e1cb2317e45ab5d501cd848757f1479df3f
```

The runtime JSON is compact and contains **2,950,371 bytes** including its trailing newline. The requested schema is retained: `schemaVersion`, `snapshotDate`, `inventorySources`, `coverage`, and `teams`, with `coverage` values `source-roster` or `missing`. There are **no renamed or omitted required keys**. Inventory provenance has additional `teamCount` and `warnings` fields. The optional `defaultTeamReference` and `clubReference` are both present where the source provides a default-team reference; they are provenance, not overrides of authoritative owner facts. No Git commit was created.

## References

[1]: https://py.sportsdataverse.org/docs/soccer/reference/site "SportsDataverse ESPN soccer site API reference"
[2]: https://github.com/pseudo-r/Public-ESPN-API/blob/main/docs/sports/soccer.md "Public ESPN API soccer competition and endpoint reference"
[3]: https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams?limit=1000 "ESPN current English Premier League team inventory"
[4]: https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/teams/359/roster?limit=500 "ESPN current Arsenal source roster and season metadata"
