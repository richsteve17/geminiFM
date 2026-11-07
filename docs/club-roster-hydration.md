# Current club roster hydration

## New-career lifecycle only

`getCurrentClubTeams(seedTeams)` in `src/engine/clubRosters.ts` builds isolated club templates from `src/data/clubRosterSnapshot.json`. Invoke it only when constructing a **new career**, before selecting the manager's club and assembling competitions. Do not invoke it when loading or migrating saved careers. Saved acquisitions, releases, club ownership, ages, ratings, contracts, effects, statistics and history remain authoritative career state.

The factory never mutates seed teams, their nested arrays/theme/tactics, source snapshots or previous factory results. It copies club balance, prestige, objectives, chairman, transfer budget and theme, but replaces squad membership with the current sourced squad. It recalculates `weeklyWageBill` as the sum of the resulting game wages. The curated `Team.league` remains unchanged; actual source competition is recorded separately as `clubRosterSource.sourceLeagueCode`. Unsupported legacy formations are normalized to supported `4-3-3` with an explicit warning.

No saved-career acquisition or replacement migration is provided. Metadata-only UI accessors do not hydrate or modify a save.

## Public API

```ts
getCurrentClubTeams(
    seedTeams: Record<string, Team>,
    snapshot?: ClubRosterSnapshot,
): Record<string, ClubRosterTeam>

getRawClubRoster(gameName, snapshot?): ClubRosterRecord | undefined
getClubRosterSource(team): ClubRosterTeam['clubRosterSource'] | undefined
getClubRosterCoverage(teams?): ClubRosterCoverage
getClubRosterAge(athlete, snapshotDate?): { age, source }
createCurrentFreeAgentMarket(): CurrentFreeAgentPlayer[]
```

`CLUB_ROSTER_SNAPSHOT`, `CLUB_ROSTER_CATALOG`, `CLUB_ROSTER_SNAPSHOT_DATE`, and `CLUB_ROSTER_GAME_DERIVATION_VERSION` are also exported. The optional snapshot argument permits isolated fixture tests without touching shipped source data.

Use `getClubRosterSource(team)` for a career header. It returns that team's stored snapshot metadata, or `undefined` for unsourced legacy careers. Do not use the current global snapshot date to label a legacy career as refreshed. The exported current snapshot date is independent of the game's edition branding. `getClubRosterCoverage(teams)` reports both the bundled source coverage and the supplied teams' stored coverage; those are deliberately distinct concepts.

`ClubRosterPlayer` extends `Player` with `squadNumber`, `dateOfBirth`, `externalId`, `datasetPlayerId`, source names, `clubRosterFacts`, `clubRosterProvenance`, and `gameDerived`. `squadNumber` is a numeric conversion of a real source jersey value only, never a lineup-index number. Non-numeric or absent shirts remain undefined. `clubRosterSource`, `rosterWarnings` and `unresolvedRosterPlayers` extend the team.

## Facts versus game derivation

Provider-scoped athlete IDs are retained exactly as `espn:<sourceAthleteId>`. Full supplied/source names, raw DOB, citizenship, shirts, source positions, source URLs and occurrences remain separate from simulation values. Full original provider records are available through `getRawClubRoster`, including records that are not playable.

Age prefers a valid DOB and is calculated using UTC calendar dates **at the actual snapshot date**, not the game's edition or current wall clock. A missing club DOB can be enriched only from the same verified provider ID through the shared identity resolver. This is labelled `verified-identity-source`; an older national age display is never copied for that enrichment. If no usable DOB exists, a usable club-source age is retained. Otherwise game age 25 is used with `gameDerived.ageFallback: true`. Invalid calendar dates and future/unusable ages do not silently become factual ages. Raw club facts remain raw even when runtime DOB is enriched.

Nationality prefers supplied authoritative national membership when resolved, otherwise source citizenship. Missing citizenship and membership remain `Unknown`; the club's country is never used as a fabricated athlete nationality. The raw citizenship evidence is retained independently of the game's nationality display.

Position precedence is:

1. The supplied authoritative World Cup role, with `CDM → DM` and `CAM → AM` normalization.
2. An exact granular source role.
3. An existing shared national gameplay role, so club and national copies remain consistent; this does **not** make a derived role a provider fact.
4. A compatible, unambiguously identified prior club game role.
5. A deterministic, versioned gameplay role derived from a broad source `D/M/F` family.

Provider `G` identifies `GK` without a granular role guess. Broad role assignments are explicitly marked `gameDerived.position: true`. Unknown source roles with no authoritative, shared or verified prior role remain in raw evidence and are recorded in `unresolvedRosterPlayers`, rather than receiving an invented position/player.

The source does not provide exact ratings, wages, contract lengths, personality, potential or stamina. The factory uses transparent deterministic game derivation under `club-roster-v1`, with hash inputs tied to athlete identity and attribute type. It makes no LLM/network calls, reads no wall clock, and performs no random trait generation. Unambiguous prior game ratings, potential, growth rate, personality, wages, contract durations, stamina and market values can be retained as **game priors**, not current real-world contract or scouting facts. A prior is indexed globally so a sourced transfer may retain its game rating while its stale club, age, display name and membership are not retained. Ambiguous abbreviated identities or multiple seed copies do not supply priors.

New players start available, at full condition, with no fabricated match statistics, effects or historical career record. The existing `selectNationalStartingXI` selects a balanced deterministic XI in formation order. Every other playable sourced athlete stays on the bench, even when the squad exceeds 25 players. No squad-size truncation or filler generation occurs.

## Ownership and gaps

A source athlete listed by only one catalog club has that source owner. For a provider ID appearing across multiple clubs, the factory first tries the supplied authoritative user club association, then an explicit source owner reference (team ID/name or provider team URL). It never chooses by array order or blindly trusts a copied `currentClub` display label. Conflicting or unresolved owners are quarantined from playable copies and recorded against affected teams. Resolved losing records are also explicitly recorded rather than silently dropped.

A missing or empty current source roster yields an empty squad and `clubRosterSource.status: 'missing'`, not stale seed players labelled current. Unknown positions, invalid IDs and repeated entries produce explicit issues and partial coverage. Raw evidence is retained. A short pool or a missing goalkeeper receives a kickoff warning; no fictional filler is added.

`completePlayableMembership` means all entries in that sourced squad were hydrated into playable membership. It does not assert official registration, transfer certification, final selection, or that provider metadata covers all real-world facts.

## Explicit current free-agent market

`createCurrentFreeAgentMarket()` contains only the supplied rows explicitly marked `club: 'unattached'` and `league: 'Free Agent'`: Jordan's **Ehsan Haddad** and **Saed Al-Rosan**. It does not infer free agency from unknown/missing clubs, carry stale transfer targets, or invent a larger market. Unresolved provider IDs use the shared stable authoritative dataset IDs. Source kind is `authoritative-explicit-unattached`; simulation attributes remain game-derived. Career releases are the responsibility of the existing career market lifecycle, not this constructor.

## Shared identity integration and performance

The shared module exports `resolveRosterAthlete({name, nationality?, club?, externalId?})` and `getAuthoritativeWorldCupPlayer(query)`, returning the supplied row plus `countryCode`, `datasetPlayerId` and optional `resolvedSourceId`. The supplied World Cup JSON is consumed as authoritative without a re-audit.

`clubRosters` imports the shared identity module and national XI/pool helpers. The identity module must not import the club runtime, avoiding a circular runtime dependency. Prior aliases and their countries are indexed once per factory call rather than scanning every athlete for every stale seed player. The shared national role cache stores only IDs and positions and is private to this module; full national pools are not attached to club entities. An actual full-catalog integration test ran in approximately 191 ms after indexing, versus approximately 12.8 seconds before the optimization.

## Verified snapshot and integrity

Verified against the bundled **2026-11-07** snapshot:

| Check | Result |
| --- | ---: |
| Catalog clubs with source squads | 82 / 82 |
| Playable source athletes | 2,538 |
| Unique playable provider IDs | 2,538 |
| Missing club squads | 0 |
| Partial club membership / unresolved records | 0 |
| Smallest–largest retained squad | 24–39 |
| Supplied authoritative exact-role matches | 434 |
| Shared national/club provider IDs | 667 |
| Shared national/club role mismatches | 0 |
| Explicit age fallbacks (missing usable source age/DOB) | 110 |
| Unknown nationality (missing usable citizenship/membership) | 117 |

The last two rows are source-fact limitations, not hidden fictional data. No current missing DOB could be enriched from another verified identity source in this snapshot; the stable-ID enrichment path is covered by an isolated regression fixture.

## Verification

`src/__tests__/club_rosters.test.ts` has 21 regression tests covering source replacement versus stale seeds, full benches, immutability, identity priors and ambiguity, supplied national roles, stable-ID DOB enrichment, explicit broad/unknown role and age behavior, missing sources, deterministic economics/selection, ownership references/conflicts, raw/accessor isolation, actual 82-club integration, shared national roles and the exact explicit unattached market.

Final verification on 2026-11-07:

- `npm test`: **226 tests passed across 35 files** (including concurrent integration tests).
- `npm run check`: **passed**, exit 0.

Files owned by this implementation: `src/engine/clubRosters.ts`, `src/__tests__/club_rosters.test.ts`, and this document. No App/constants/national-roster/data/identity/type/Git files were edited by this implementation.
