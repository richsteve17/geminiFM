# National roster snapshot — 7 November 2026

The game catalog contains **64 distinct actual national teams and 2,015 sourced athlete entries**. All 64 have a source roster; 60 have at least 26 athletes. The four short pools are Costa Rica with 23, Ireland with 24, Finland with 25 and Iceland with 24. They are deliberately not completed with invented footballers. The full pool is preserved separately from the manager-selected squad.

`src/data/nationalRosterSnapshot.json` is an ESPN squad-pool snapshot retrieved on **2026-11-07**, not an official final World Cup 2026 selection. Retrieval date is not the date a federation selected a squad. ESPN exposes competition-specific roster lists; supported sources supplement inadequate outfield/goalkeeper coverage or a missing recognized seeded identity. Separate seasons and sources are retained. Older competition members are therefore pool candidates, not a claim of current callup or eligibility confirmation. [1] [2]

The actual source records identify Jude Bellingham as ESPN athlete `291281`, Kylian Mbappé as `231388`, Aurélien Tchouaméni as `265919` and Thibaut Courtois as `134283`. Courtois is retained from the verified Belgium World Cup source even when the friendly pool is already sufficiently large. Full accented display names and original numeric IDs are retained; stable game identity uses the `espn:` prefix. [3] [4] [5]

## Game formats, not qualification claims

The 48-team game uses an explicit catalog of the original 16 base countries, all 15 European extras and the first 17 global extras. `WORLD_CUP_GAME_COUNTRY_CODES` lists these entries. The expanded format uses all 64 catalog countries. The 24-team Euro game uses the nine original European base countries and all 15 European extras. These catalogs are game design choices; their membership and group assignments are not sourced qualification results. No repeated country or names such as `England (E)` are generated.

`NATIONAL_TEAMS` exposes all 48 source-backed game teams to legacy selection callers. `generateWorldCupStructure()`, `generateExpandedWorldCupStructure()` and `generateEurosStructure()` retain their existing group-format APIs and return fresh squads rather than shared mutable roster arrays. Group-standing, advancement and knockout-seeding helpers retain their original interfaces.

National metadata includes the catalog FIFA code, correct flag, confederation, source team ID, source display name and source country abbreviation. The source names `United States`, `Türkiye` and `Republic of Ireland` resolve the existing game labels `USA`, `Turkey` and `Ireland`; they do not create additional countries. Australia is in AFC. England, Scotland and Wales have distinct flags and identities. Source crest URLs and colours remain separate from real qualification or ranking claims.

## Data retrieval and provenance

The importer discovers numeric IDs from the ESPN international-friendly inventory, not hardcoded country IDs. It checks the World Cup, European Championship and Africa Cup inventories to decide which additional roster endpoints actually contain each resolved national team. The verified inventory sizes are 198 friendly teams, 48 World Cup teams and 24 Euro teams; `caf.nations` provides source-supported African supplemental coverage. [6] [7] [8] [10]

For each of the 64 catalog countries, it requests the documented `/teams/{resolved_id}/roster?limit=500` endpoint. The primary roster is `fifa.friendly`; supported competition lists supplement it until usable 23-outfield/3-keeper cover and recognized key identities are present, where sources permit. Membership is deduplicated by ESPN athlete ID, not display name. Each imported athlete keeps the original ID, full and short names, position object, date of birth, source age, jersey where supplied, source status and injuries, citizenship, player URL and the source occurrences. Each occurrence retains its competition, season and provider statistics. Each nation retains its request URLs, actual retrieval timestamps and source timestamps. [1] [3] [4] [5]

The source athlete's `defaultTeam.$ref` supplies club IDs. The importer resolves only deduplicated source-provided references against the verified public counterpart, `sports.core.api.espn.com`. This batch contains 628 unique club references and 1,973 source-reported athlete/club associations. A national-team default reference is not treated as a club. Missing, failed or deliberately unenriched references are recorded as uncertainty and produce no invented `currentClub`. The ESPN default team is a source-reported club association, not independently verified transfer status. [9]

The import has a concurrency ceiling of four, request timeout of 25 seconds and at most three attempts with bounded backoff. It does not retry definitive 400/404/422 responses, guess IDs, perform per-nation LLM research, or silently manufacture missing rosters. Responses are cached by URL under `/tmp/manusfm-national-roster-cache`; full raw provider responses are available there during this execution. The bundled snapshot contains the preserved athlete facts and provenance without requiring live requests at game startup.

To refresh from the current public source:

```bash
python3 scripts/import-national-rosters.py --snapshot-date 2026-11-07 --concurrency 4
```

To reconstruct from the exact cached observations without additional requests, use `--offline` with the same snapshot date and cache directory. Cached records retain their original retrieval timestamps; changing the label does not make cached observations current. The cache is temporary and is not part of the shipped game. Offline importer tests run with:

```bash
python3 scripts/import-national-rosters.test.py
npm test -- src/__tests__/national_rosters.test.ts src/__tests__/tournament.test.ts
```

## Source facts versus game values

ESPN generally provides broad national positions `G`, `D`, `M` and `F`. The exact provider position object is preserved. Specific playable roles such as `LB`, `DM` and `LW` are **game-derived**, using deterministic within-family assignments and explicit role priors for recognizable existing seed identities. They are not claimed to be ESPN scouting positions. A missing usable position is preserved in raw source evidence but excluded from playable selection with a warning; Peru's Francesco Luis Andrealli (`espn:5330850`) is such a case.

Ratings, wages, personalities, starting status, initial availability, condition and contracts are gameplay values, not facts attributed to ESPN. Rating priors for recognizable stars and deterministic rating variation are labeled game-derived. A missing age uses a disclosed game fallback; a provided age and date of birth remain preserved. There are no generated player names in national squads.

Provider appearance statistics are stored within the source competition occurrence, separate from `Player.stats` and `Player.history`. They are not lifetime international caps, and missing provider statistics do not become zero-valued factual caps. Initial game career statistics are not populated from competition totals. Existing career statistics, history, ages, contracts and display names are preserved verbatim by identity linking.

## Callable roster and identity APIs

The APIs are exported from `src/engine/nationalRosters.ts`; the principal callup/selection helpers are also re-exported by `src/international.ts`.

- `getNationalSquadPool(countryCode)` returns a fresh full sourced pool, not a selected 26.
- `createNationalRosterTeam(countryCode, group?)` returns a fresh playable team with country metadata, source provenance, full `nationalSquadPool`, `rosterWarnings` and selected `players`.
- `selectNationalSquad(pool, size = 26, formation = '4-3-3')` chooses a balanced available XI plus cover and up to 26 actual sourced athletes. It targets three goalkeepers, defensive, midfield and attacking depth where the source supports it. It never adds a body to a short pool.
- `selectNationalStartingXI(pool, formation)` supports the existing six formations without changing the stored position, stats or identity of a player. Unavailable players are not selected as starters.
- `resolveNationalPlayerIdentity(player)` uses a verified external ID or an unambiguous normalized name, national membership and compatible position. Accent and punctuation normalization does not erase real source display names. Ambiguous initials are not guessed; explicit game-role priors distinguish Jude and Jobe Bellingham.
- `linkNationalRosterIdentitiesToClubTeams(clubTeams)` returns copies annotated with verified external IDs and source names. Names such as `J. Bellingham`, `A. Tchouameni` and `T. Courtois` remain the actual club display names. The helper does not change career statistics or histories.
- `hydrateNationalTeamsFromCareer(nationalTeams, clubTeams)` takes two `Record<string, Team>` arguments in that order and returns national team copies using the uniquely identified current club career players. The current club name, career rating, age, stats and history survive; full source name remains in `sourceName`. It retains the club display name for scorer matching. A club's `On International Duty` status becomes available only in the national copy, not in the untouched club input. Duplicate club identities remain source-pool candidates with an explicit warning rather than selecting one arbitrarily.

The hydration helper is a **next-callup operation**, not a save/load migration. The parent application must not reselect a manager's saved squad or overwrite saved player values merely by serializing or loading it. When a save omits `nationalSquadPool`, a later callup can rebuild the source pool from the bundled snapshot. All helpers leave their inputs unchanged.

## Knockout match facts

`simulateKnockoutQuickMatch()` retains actual regulation events, participant names and goalkeeper names from the deterministic match engine. A draw continues through actual 91–120 minute simulation events rather than inserting unexplained extra-time goals. A remaining draw uses the existing deterministic shootout. Shootout scores stay separate from match-goal and scorer facts; they are not added to player match-goal statistics.

## Save size boundary

The full raw source snapshot is bundled once. Runtime `nationalRosterFacts` copies keep only identity, position and scoped appearance facts; complete citizenship, club-source and injury records remain in the source snapshot rather than every player copy. A team still carries a full source pool alongside its selected players, so a plain serialization of both duplicates data unnecessarily.

The parent serializer omits `nationalSquadPool`, `nationalRosterFacts` and duplicate source occurrences from persisted national teams. It retains selected players, external IDs, display names, current clubs, stats, history, tactics and country metadata. This avoids spending the localStorage budget on immutable provider evidence and does not change the manager's saved selection. The provenance can be reconstructed from the bundled snapshot on the next callup. Measured 48/64-nation runtime JSON is 3,491,784/4,612,394 bytes; compact corresponding save snapshots are 519,221/690,803 bytes. `--clubs-cache-only` reuses known associations without requesting uncached enrichment.

## References

[1]: https://py.sportsdataverse.org/docs/soccer/reference/site "SportsDataverse documented ESPN soccer team roster endpoint"
[2]: https://publicapis.io/espn-sports-api "ESPN public endpoint overview and unofficial API limitations"
[3]: https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.friendly/teams/448/roster?limit=500 "ESPN England friendly roster observed 7 November 2026"
[4]: https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.friendly/teams/478/roster?limit=500 "ESPN France friendly roster observed 7 November 2026"
[5]: https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams/459/roster?limit=500 "ESPN Belgium competition roster including Thibaut Courtois"
[6]: https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.friendly/teams?limit=1000 "ESPN international friendly national team inventory"
[7]: https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams?limit=1000 "ESPN World Cup competition team inventory"
[8]: https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.euro/teams?limit=1000 "ESPN European Championship competition team inventory"
[9]: https://sports.core.api.espn.com/v2/sports/soccer/teams/331?lang=en&region=us "Verified public ESPN club reference endpoint for Brighton and Hove Albion"
[10]: https://site.api.espn.com/apis/site/v2/sports/soccer/caf.nations/teams?limit=1000 "ESPN Africa Cup national team inventory"
