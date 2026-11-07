# Repository Guidelines

## Project Structure & Module Organization
`index.html` loads Tailwind via CDN and bootstraps the app with `index.tsx`.
Primary source lives in `src/`, with the main UI in `src/App.tsx` and screens in `src/components/`.
Domain data and helpers are grouped in `src/constants.ts`, `src/types.ts`, and `src/utils.ts`.
AI integrations live under `src/services/` (Gemini + media generation).

## Build, Test, and Development Commands
- `npm run dev`: Start the Vite dev server for local development.
- `npm run build`: Produce a production build in `dist/`.
- `npm run preview`: Serve the production build locally.

## Coding Style & Naming Conventions
- TypeScript + React (TSX) with ES modules.
- Indentation is 4 spaces; keep files consistent.
- Components use `PascalCase` (`TeamDetails.tsx`), functions/variables use `camelCase`,
  and constants use `UPPER_SNAKE_CASE`.
- Tailwind utility classes are applied directly in JSX; keep class strings readable.

## Testing Guidelines
Run `npm test -- --run`, `npx tsc --noEmit`, and `npm run build` before handoff. Keep
engine tests close to their feature under `src/__tests__/`.

## Release Record and Season Theme Maintenance
- The homepage release record is generated from `package.json` version, the Git revision, and build timestamp. Bump the patch/minor version for user-visible releases.
- Update `CURRENT_BUILD_CHANGES` in `src/buildInfo.ts` with factual changes included in the release. Do not use placeholder status or invented patch notes.
- The bottom homepage selector uses **source-backed current-season shirt photographs** and separately applies approximate UI palettes. Keep `src/data/seasonThemes.ts`, `src/data/seasonKitCatalog.json`, and the asset provenance manifests aligned. Preserve MLS calendar-year seasons, null unknown metadata, and honest unavailable-image states; never relabel old colours as new kits or claim a blanket artwork licence.
- Pitch players use the pinned anatomical model, `Footballer.tsx`, `matchKits.ts`, and `playerMotion.ts`. Keep source lineage in `docs/footballer-adaptation.json`; source-photo projection is not an official complete kit or a player likeness. Shirt markers identify lineup slots, not unverified real squad numbers. Scope actor poses by team as well as name, preserve normalized skin weights / shader attributes, and freeze the visual clock on pause without modifying football results.

## Commit & Pull Request Guidelines
Commit history follows Conventional Commits (e.g., `feat(match): ...`, `fix(TeamDetails): ...`).
When opening a PR, include:
- A short summary and testing notes (`npm run dev`, `npm run build`).
- Screenshots or clips for UI changes.
- Any relevant issue or feature link.

## Configuration & Secrets
Create a server-only `.env` file with `GEMINI_API_KEY=...` for AI features. Never expose a
provider key through `VITE_*`, `process.env` browser replacement, client bundles, or replay URLs.
All AI requests must transit the validated `/api/ai` gateway.

## Simulation & Career Progression Rules
- **Infinite Cycle Math**: Never use hardcoded year values for tournament schedules or teammate rivalry checks. Use modulo arithmetic (e.g. `year % 4 === 2` for Euros, `year % 4 === 1` for World Cups) to support infinite seasons.
- **Lineup & Availability Validations**: Match kickoff must be blocked if any starting player is marked as `Injured`, `Suspended`, or `SentOff`. Tactical report and efficiency scores must penalize starting unavailable players (e.g., `-20` points per player).
- **Enforce In-Match Substitutions**: Mid-game swaps between starting XI and bench players must trigger an active substitution event logged on the match history, increment the `subsUsed` count, and enforce the FIFA-standard 5-substitution limit.
- **Seasonal Statistics Archiving**: At the end of each season, current campaign player stats (Appearances, Goals, Clean Sheets, Ratings) must be archived into the player's permanent `history` list before current stats are reset for the next season, preserving year-over-year records for informed scouting.

## International tutorial and return relationships
- World Cup is the RTG tutorial. New club access uses `tutorialProgression.ts` across selectors and job paths; roleplay background is not a reputation bypass. Preserve existing careers and best completed tutorial outcomes.
- Do not route the eight-week World Cup final through domestic season reset. Keep actual tournament fixtures, scorers, shootout attempts and substitute actors; complete other nations’ results after tutorial elimination without changing the manager’s finish.
- The owner-supplied corrected World Cup JSON is authoritative for tutorial membership. Preserve its football fields and distinguish it from observed source pools used by the separate expanded background format. Keep shared IDs, source dates and game-derived values explicit; never refresh a saved player's stats/history/age from a new source snapshot.
- Relationship severity must follow actual international events, stakes, club membership and participation. Shared-nationality bonds cannot cancel serious personal feuds. Mediation must validate exact answer evidence; benching is separation, not amnesia.
- Use compact career serialization to omit duplicate national source pools, not actual saved football or relationship facts. Apply training impairment to positive development, never by damping negative performance toward zero.

## Shared interface system
- `src/interface.css` owns paper/ink/forest/brass tokens, local typography, responsive workspace geometry and common control sizing. Use semantic `fm-*` hooks; do not restore the centered glowing logo, navy glass-card wall or rainbow navigation.
- Dark surfaces must declare `fm-inverse` so text, fields, status colours and border tokens change together. Pair foreground/background semantics; do not paste pale utility text onto paper or dark ink onto a dark log.
- Keep primary actions, exact contract/answer inputs, source labels, retries and existing consequence/save callbacks when changing layout. The kit archive is factual photography; club theme colours are accents, not a reason to recolour the entire workspace.
- Venue photography requires location/date/attribution; do not present Wembley as a selected club's ground. Font licences remain in `public/fonts/`. Phone form text stays readable and user zoom remains enabled.

## Current rosters, edition and storage
- `src/product.ts` owns xGaffer '28. The edition label does not change the 2026/27 roster snapshot or 2026 tutorial calendar. Keep historic save/profile keys compatible.
- `clubRosters.ts` is a fresh-start factory, never a Continue migration. Keep complete sourced membership, stable identities and source metadata; game-derived ratings/economics/age fallbacks must not be presented as observed football facts.
- Owned squad capacity is a game limit, not a 25-player senior registration limit. Full source squads include reserves/youth and must not be truncated or prevented from recruiting by an unrelated registration cap.
- Use `careerStorage.ts` for application persistence: bounded gzip with legacy JSON decoding and lightweight preview metadata. Backup quota failure is nonfatal. Canonical career football/history/relationships survive source-payload compaction.
