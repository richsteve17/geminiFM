# Current club roster hydration

## Fresh-start contract

`getCurrentClubTeams(seedTeams)` constructs **all 150 clubs in the current supported source catalog**, even with an empty seed map. It is a new-career factory, not a Continue migration. Seed clubs absent from that catalog are omitted from fresh-start results only. Saved acquisitions, ownership, ages, ratings, contracts, effects, statistics, history and World Cup data remain untouched.

Existing clubs match by stored observed source team ID, otherwise unambiguous normalized canonical/source name. Their existing map keys, modeled balance/prestige/objectives/chairman/theme/tactics and unambiguous player game priors survive; their league and squad membership come from the current catalog. This keeps Sunderland's canonical key after promotion. New clubs use their source-derived canonical name as key. International seed teams are cloned unchanged. No inputs, nested arrays or global presets are mutated.

All **73 newly introduced clubs** receive the same explicit neutral game preset: prestige 70, balance 50,000,000, transfer budget 10,000,000, Moneyball Advocate modeled chairman, Balanced 4-3-3, empty objectives/promises, and neutral slate/paper UI colours (`#475569`, `#f8fafc`, `#ffffff`). These are balancing values, not observed wealth, owner identity, reputation, authentic shirts or crests. The other **77 clubs** retain their existing game seed attributes. `weeklyWageBill` is recalculated from playable modeled wages.

`clubRosterSource.gameDerivedClub` records `version`, `preset: 'existing-game-seed' | 'neutral-game-preset'`, `economics: true`, `prestige: true`, `colors: 'existing-game-theme' | 'neutral-ui-palette'`, `chairmanPersonality: true`, and `tactics: true`. Source evidence remains separate. No new crest or kit provenance is claimed.

## Exact exported API

```ts
getCurrentClubTeams(
    seedTeams: Record<string, Team>,
    snapshot?: ClubRosterSnapshot,
): Record<string, ClubRosterTeam>
getRawClubRoster(gameName: string, snapshot?: ClubRosterSnapshot): ClubRosterRecord | undefined
getClubRosterSource(team: Team): ClubRosterTeam['clubRosterSource'] | undefined
getClubRosterCoverage(teams?: Record<string, Team>): ClubRosterCoverage
getClubRosterAge(
    athlete: Pick<ClubSourceAthlete, 'age' | 'dateOfBirth' | 'DOB'>,
    snapshotDate?: string,
): { age: number; source: ClubRosterPlayer['clubRosterProvenance']['age'] }
createCurrentFreeAgentMarket(): CurrentFreeAgentPlayer[]
```

Runtime constants: `CLUB_ROSTER_SNAPSHOT`, `CLUB_ROSTER_CATALOG`, `CLUB_ROSTER_SNAPSHOT_DATE`, `CLUB_ROSTER_GAME_DERIVATION_VERSION` (`club-roster-v1`) and `CLUB_ROSTER_NEUTRAL_PRESET` (`club-attributes-v1`).

Exported types/interfaces: `ClubRosterSource`, `ClubSourceAthlete`, `ClubRosterRecord`, `ClubRosterSnapshot`, `ClubOwnershipMethod`, `ClubRosterIssue`, `ClubRosterPlayer`, `ClubRosterTeam`, `ClubRosterCoverage`, `CurrentFreeAgentPlayer`.

`getClubRosterSource` reads only stored metadata and returns undefined for unsourced legacy teams. It never labels an old save with a new global date. `getClubRosterCoverage(teams)` distinguishes bundled source coverage from supplied teams' stored playable coverage; without teams, requested-team counts are zero. The optional snapshot arguments support isolated test fixtures.

## Unchanged identity and player derivation

Provider IDs remain `espn:<sourceAthleteId>`. Authoritative World Cup membership/roles take precedence; nationality otherwise uses source citizenship, not club country. Age uses valid DOB at the actual snapshot date, then source age, then labeled game fallback 25. Stable-ID DOB enrichment retains its existing explicit provenance. Source raw fields remain unchanged.

Position precedence remains supplied exact role, source exact role, shared national gameplay role, verified compatible prior role, then deterministic broad source-role derivation. Unknown roles without usable evidence are quarantined, not filled. Ratings/personality/potential/wages/contracts remain deterministic game derivation or unambiguous prior game values; no clock, network, random generation or LLM calls are used by this factory. New players have no fabricated career statistics/history.

Existing duplicate-owner logic remains supplied association then explicit source-owner reference, never array order or a copied currentClub label. Missing/empty rosters stay empty and labeled missing. Every playable source athlete is retained, including benches over 25; unsupported seed formations receive a supported 4-3-3 fallback warning. Source limitations and losing/unknown entries remain in raw evidence and runtime issues.

`createCurrentFreeAgentMarket()` is unchanged: only the supplied explicitly unattached Jordan players Ehsan Haddad and Saed Al-Rosan. Missing clubs do not imply free agency.

## Simulated European qualification

`src/europe.ts` exports:

```ts
getChampionsLeagueParticipants(
    existingTeams: Record<string, Team>,
): { participants: string[]; newTeams: Record<string, Team> }
```

When input contains club source metadata, it selects up to 36 existing playable source-backed clubs from supported European top divisions only (`eng.1`, `esp.1`, `ita.1`, `ger.1`, `fra.1`), ordered by modeled game prestige and canonical-name tie break. The full catalog supplies 36; MLS, Championship, International, unsourced, missing-squad and division-mismatched teams are excluded. `newTeams` is empty and short coverage is never filled with generated athletes or FC Europe teams. This is **simulated qualification**, not the official UEFA 2026 field. The legacy unsourced-career path is retained for compatibility.

## Verified results — 2026-11-07

Source coverage: 150/150 squads, 4,602 entries / 4,601 unique IDs. Runtime: 149 sourced clubs, one partial club (Málaga's losing duplicate Moussa Diarra entry), no missing clubs, 4,601 playable athletes, 24–39 squad sizes, 202 labeled age fallbacks and 224 Unknown nationalities. Cross-club playable IDs are unique and shared national roles remain consistent. No source gaps are disguised.

Verification commands:

```bash
npm test -- --run src/__tests__/club_rosters.test.ts src/__tests__/europe_rosters.test.ts src/__tests__/authoritative_squads.test.ts
python3 scripts/import-club-rosters.test.py
npx tsc --noEmit
npm test -- --run
npm run build
```

Targeted tests passed; importer checks passed and offline regeneration matched byte-for-byte. Full suite and production build passed; the build retains the pre-existing large-bundle warning. Implementation is limited to roster sources/snapshot/helper, club factory, European participant selection and focused tests/docs. No title/edition, utils, authoritative World Cup files, identity/role logic, save migration or Git commit changes were made.
