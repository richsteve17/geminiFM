# Manus FM — Baseline Regression Ledger

**Baseline:** `manusfm-baseline-v3-20260930` at `5ed9844`
**Audit date:** 2026-09-30
**Branch:** `manusfm/upgrade`

## Hard evidence

- Baseline `npm test`: **36/37 passed; 1 failed.** The press-conference test executes a live Gemini path and receives variable output, making the test nondeterministic.
- Baseline `tsc --noEmit`: **439 errors across 7 files** (independent audit evidence). Existing CI runs tests/build but not a type check.
- Baseline source directly injects the Gemini key into the browser bundle and appends it to generated replay URLs.

## P0: must be replaced before feature expansion

| Defect | Mechanism | Primary locations |
|---|---|---|
| Browser Gemini key exposure | Vite defines `process.env.*` with the server key; browser services construct `GoogleGenAI`; replay URLs append the key. | `vite.config.ts`, `src/services/geminiService.ts`, `src/services/chantService.ts` |
| Active-match save corruption | Saves omit `currentFixture`, `matchState`, event queue, playback checkpoint, shout, speed, and workflow state; loading can restore an impossible `PLAYING`/`POST_MATCH` screen. | `src/App.tsx` save/load and playback loop |
| Mutable imported catalog | App shallow-copies `TEAMS` then mutates nested team/player objects; new careers and quit/restart can inherit a contaminated world. | `src/App.tsx`, `src/constants.ts` |
| LLM controls match truth | Gemini segment output changes score/momentum/events with only shallow coercion; event ledger, team/player identity, event order, score reconciliation, and schema constraints are absent. | `src/services/geminiService.ts`, `src/App.tsx` |
| Broken source contract | Required team/player properties are omitted by catalog/national-team data; missing imports and non-existent types yield a large TypeScript error set. | `src/types.ts`, `src/constants.ts`, `src/international.ts`, `src/App.tsx`, `src/services/geminiService.ts` |

## P1: core campaign integrity

| Defect | Mechanism |
|---|---|
| No deterministic RNG | `Math.random()` drives generation, fixtures, results, event IDs, players, finances, and chants. “Deterministic” quick match is random. |
| Stale async match writes | Late Gemini calls can write after pause/quit/retry because no match/session token or abort guard exists. |
| Invalid fatigue/substitutions | Every club’s starters lose condition every playback minute; live drag-and-drop can bypass substitutions and the five-sub limit. |
| Unversioned persistence | Save v1 has no schema version/migration/validation. Autosave misses meaningful career state; Job Centre loses vacancies after load. |
| Broken commands | Transfers can credit/remove a player without adding them to buyer; signing can ignore fee/budget; promises are defined but never resolved. |
| Fragmented competition state | UCL has only random league-phase fixtures; World Cup roster selection clones templates; background tournament results/honors and full stage progression are incomplete. |

## P2: presentation is not connected to game truth

- `PitchView` has sine-wave dots and a synthetic ball rather than team/player/possession/event frames.
- Audio is split between client AI/TTS paths; chant generation is not a catalog-backed terrace engine, audio contexts/caches are unmanaged, and video polling can run without bounded cancellation.

## Safe upgrade order

1. Gate the baseline with a type check and regression fixtures.
2. Move Gemini and media behind a server-side, typed, rate-limited gateway.
3. Introduce versioned immutable career snapshots/commands and full match-session state.
4. Replace match authority with seeded deterministic simulation and ledger validation.
5. Move jobs, transfers, promises, and competitions onto atomic domain commands.
6. Make 3D pitch/audio presentation consume that deterministic truth.
