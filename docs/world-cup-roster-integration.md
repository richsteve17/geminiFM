# WC2026 authoritative squad integration

## Input authority and immutable copies

The corrected user-supplied football fields are authoritative for this integration: player names, national membership, clubs, leagues, positions, categories, and the selected squads. No football-fact re-audit or eligibility reinterpretation is performed. Dataset notes describe the dataset; they do not configure the game's relationship/rift rules.

| Input | Bundled copy | SHA-256 |
| --- | --- | --- |
| `2026worldcupsquads(1).json` | `src/data/sources/worldCup2026Squads.base.json` | `2dd1835a574dce5405e554db8c8b3d3d3342abc2881de411a519163ccd637992` |
| `2026worldcupsquadsenriched(1).json` | `src/data/worldCup2026Squads.json` | `868a4b022cd7942ac9500eceaea125b3663ee6e2512d21d4b9299d011e1e81b3` |

Both copies are byte-for-byte, including the original metadata. Runtime identity and game metadata live in TypeScript objects, not in either supplied JSON. There are **48 squads and 1,244 selected players**. Colombia has **23**, South Korea has **25**, and every other squad has 26. No extra players or positions are invented to satisfy a quota. Jordan's final player is **Ibrahim Sabra — Lokomotiva Zagreb**. Panama's **Tomas Rodriguez — Deportivo Saprissa** retains the exact supplied club string.

## Tournament and pool boundaries

`generateWorldCupStructure()` and the `NATIONAL_TEAMS` picker use the supplied 48 countries, in supplied order, with each consecutive four assigned to groups A–L. The supplied order is the game's group assignment; no separate draw is claimed. Every player's stored position is the supplied exact role, except vocabulary-only **CDM → DM** and **CAM → AM**. Formation suitability chooses an XI without rewriting factual player positions or replacing the selected squad.

`NATIONAL_ROSTER_CATALOG` remains the **64-country observed source-pool catalog** from `nationalRosterSnapshot.json`. Its raw football evidence is untouched. `NATIONAL_GAME_CATALOG` is a separate **73-country playable union**, adding Bosnia, Cape Verde, Curacao, DR Congo, Haiti, Iraq, Jordan, Qatar, and Uzbekistan. These new countries use provider-scoped dataset team IDs when a national provider team record is not bundled; they do not receive fabricated ESPN team IDs.

`generateExpandedWorldCupStructure()` remains exactly **64 countries / 16 groups**, explicitly using the original 64-country catalog with manager selections from observed pools. `generateEurosStructure()` retains its existing 24-country / six-group game format and observed-pool selection behavior. Neither factory treats the 73-country union as a divisible-by-four field. Source-pool game roles can use supplied factual positions when a source identity matches a supplied player.

## Shared identity API

`src/engine/rosterIdentity.ts` imports the observed national and club snapshots directly. It does **not** import `clubRosters`, `nationalRosters`, or other club game code, so club/national consumers do not create a circular runtime import.

```ts
interface RosterAthleteQuery {
  name: string;
  nationality?: string; // country name, game/source code, or recognized flag
  club?: string;
  externalId?: string;  // provider-scoped identity
}

resolveRosterAthlete(query: RosterAthleteQuery): SourceAthlete | undefined;
getAuthoritativeWorldCupPlayer(query: RosterAthleteQuery):
  AuthoritativeWorldCupPlayer | undefined;
authoritativeWorldCupPosition(position: string): PlayerPosition;
```

`resolveRosterAthlete` returns an isolated source record with available age/DOB, published names, jersey, and source occurrences. Source records merge only by the same provider ID, never by name. Matching uses exact normalized full or published short names, stripping diacritics and punctuation, with country and club support. It does not use fuzzy spelling, surname-only guesses, or an arbitrary first candidate. Explicit unknown IDs do not fall back to names. Country metadata assists identity; it does not overrule supplied eligibility. If observed citizenship differs, an exact name plus explicit observed source club can establish identity without making an eligibility claim.

`getAuthoritativeWorldCupPlayer` returns the supplied row unchanged plus:

- `countryCode` — the game's national code;
- `datasetPlayerId` — stable `wc2026:<countryCode>:<normalized supplied name>` identity, with a normalized club suffix only for a same-country normalized-name collision;
- `resolvedSourceId?` — an existing provider ID only when source identity resolves unambiguously.

The getter also accepts published source short names and provider IDs, and returns a copy. Its `position` stays **CDM/CAM** when supplied that way; club consumers should call `authoritativeWorldCupPosition(row.position)`. Unresolved rows retain dataset IDs, not fabricated ESPN IDs. Emiliano Martinez of Uruguay and Emiliano Martinez of Argentina remain separate identities; a name-only ambiguous query returns `undefined`.

`getAuthoritativeWorldCupSquad(country)` returns enriched identity rows for a supplied country. `getWorldCup2026Squad(country)` in `nationalRosters.ts` returns fresh playable copies, preserving supplied membership, order, and count. `getNationalSquadPool` and `getRawNationalSquadPool` preserve access to observed pools for the original 64 nations. For the nine additions without a bundled observed national pool, they expose the explicit supplied squad, with honest dataset provenance.

## Football facts versus game-derived values

`authoritativeWorldCupFacts` stores the supplied row and identity annotations on a runtime player. `nationalRosterFacts` retains identity/appearance evidence and the supplied exact position. A resolved source age is reused; DOB can calculate age as of the dataset compilation date if age is absent. Missing age defaults to **25**, explicitly marked `gameDerived.ageFallback: true`. Ratings, personality, and wages remain game-derived. Supplied positions are marked `gameDerived.position: false`.

At verification on 2026-11-07, against the bundled 82-club / 2,538-player source snapshot, **855** supplied players resolved to existing source IDs and sourced ages; **389** retained stable dataset-only identities and the flagged age fallback. These are identity/age coverage gaps, not disputed squad or football facts. No additional external lookup or paid generation was used to fill them.

`linkNationalRosterIdentitiesToClubTeams` attaches shared identities and supplied factual positions without changing display names, ages, contracts, wages, history, stats, effects, or actual current career ownership. Dataset club fields remain submission facts; a transferred player's runtime `currentClub` can correctly name the current career owner.

## Selection metadata and hydration

New approved World Cup teams carry:

```ts
nationalRosterSource: {
  kind: 'authoritative-tournament-squad',
  officialFinalSelection: true,
  selectionAuthority: 'user-approved-WC2026',
  dataset: 'src/data/worldCup2026Squads.json',
  suppliedSquadSize: /* actual 23, 25, or 26 */,
  snapshotDate: '2026-11-07',
  sources: /* supplied input provenance */,
  observedPool: /* separate observed source-pool provenance */
}
```

Observed game selections retain `kind: 'source-squad-pool'` and `officialFinalSelection: false`. `createNationalRosterTeam(country, group?, mode?)` defaults to approved WC2026 membership where supplied; callers generating other international games may explicitly pass `'source-pool'`.

`hydrateNationalTeamsFromCareer(nationalTeams, clubTeams)` enriches the **existing selected players**; it does not call `selectNationalSquad` to replace them with a new 26-player selection. It preserves selection count/order, saved starter choices, official membership metadata, team state, and saved player data. Uniquely linked current club players supply actual career names, ownership, ages, contracts, stats/history, and rift effects. National copies normalize club `On International Duty` availability without mutating the club original. Supplied factual positions remain available on approved copies. Duplicate current-club identities are not arbitrarily assigned and produce a warning.

Compact official saves can recover bundled appearance and authoritative-row facts without padding a short selection. Older saves lacking approved-selection metadata retain their selected player identities/count and are not silently migrated into WC2026 membership. Saved source-pool metadata is preserved. The parent application owns any explicit fresh-career lifecycle or legacy-save migration policy.

## Verification and unchanged mechanics

`src/__tests__/authoritative_squads.test.ts` checks input hashes, all 1,244 rows, exact countries/counts/roles, corrected rows, identity safety, sourced ages and flagged defaults, club-role propagation, transfer ownership, unchanged career state, compact saves, old selections, and duplicate identity handling. Existing national, tournament, tutorial, and relationship suites remain part of verification.

Match fixture APIs, recorded scoring/participation facts, extra time, penalties/shootouts, and rift/relationship rules are unchanged by this integration. The source imports and integration are deterministic and do not mutate either input datasets or the caller's career records.
