# xGaffer '28

AI football management with deterministic match results, consequential staff conversations, World Cup-to-career progression, international player relationships and a 3D broadcast pitch.

**’28 is the edition label.** Current club squads are observed on 2026-11-07, the roster season is 2026/27 (MLS uses its calendar year), and the tutorial remains the 2026 World Cup. The edition does not advance the simulated calendar or fabricate future football data.

## Current implementation

- New careers use **82 sourced club squads / 2,538 unique athletes**. Actual membership, names, IDs, source ages/DOB and squad numbers are separate from versioned game-derived ratings, detailed roles where only broad positions are supplied, personalities and contract economics.
- The World Cup tutorial uses the owner's authoritative **48 squads / 1,244 players**. Its actual results unlock RTG opportunities and produce the international history used by the relationship engine. The separate expanded background format retains 64 nations.
- Deterministic live and background match ledgers retain goal actors, keeper/penalty duels, substitutions and playback state. AI narrates and evaluates decisions; prose cannot rewrite the result ledger.
- The pitch uses a sourced anatomical skinned footballer model with articulated football poses. Source shirt photos are projected onto the shirt; secondary garments and player likenesses are not claimed as official assets.
- The supplied chant songbook and 17 recordings connect to match cues through the audio director. Unmatched club/cue recordings are explicitly unavailable. Paid synthetic media is separately opt-in.
- Continue preserves the actual career's membership, transfers, ages, contracts, balance, stats, history, fixtures and relationships. New source snapshots are **not** transplanted into existing saves.
- Saves omit duplicate source payloads and use a bounded gzip/base64 envelope. Legacy plain JSON and the historic save/profile keys remain readable. Compression uses the already-pinned **[fflate](https://github.com/101arrowz/fflate)** implementation bundled with Three.js; no new dependency or server transaction is required.
- The paper/ink/forest club workspace, local typography, authentic kit archive and dark broadcast interface are preserved.

The game competition catalog remains curated: observed source league associations are recorded separately from inherited game leagues. Full league-membership expansion and a validated live-scout-to-contract import boundary are distinct unfinished work, not accomplished by changing a roster label.

## Main modules

| Path | Responsibility |
|---|---|
| `src/product.ts` | Approved product name and edition |
| `src/buildInfo.ts` | Real version/revision/timestamp release record |
| `src/engine/clubRosters.ts` | Fresh-career current squads and explicit unattached records |
| `src/engine/rosterIdentity.ts` | Shared supplied/source identity joins |
| `src/engine/nationalRosters.ts` | Authoritative tutorial squads and separate observed pools |
| `src/engine/matchEngine.ts` | Seeded football results and actor ledger |
| `src/engine/internationalRelationships.ts` | Causal rifts, bonds and intervention effects |
| `src/engine/careerStorage.ts` | Compressed storage, legacy decoding and backup handling |
| `src/services/` | Server-gateway facade, grounded interactions and stadium playback |
| `server/ai/` | Server-only AI policy, provider routing and media proxy |
| `src/interface.css` | Shared responsive interface tokens and workspace geometry |

## Run

Use Node.js 22+ from the project directory:

```bash
npm ci
npm run dev
npm run check
npm test -- --run
python3 scripts/import-club-rosters.test.py
npm run build
```

The server honors the configured `PORT`. Production serves `dist/public` through `dist/index.js`.

AI is a core game capability. The server needs either its configured Gemini key or managed runtime inference credentials. Provider credentials stay server-side; `/api/ai` remains the validated client gateway. Never place provider keys in `VITE_*` variables or client bundles.

## Data maintenance

`src/data/worldCup2026Squads.json` and `src/data/sources/worldCup2026Squads.base.json` are byte-preserved copies of the corrected owner-supplied files. Do not reinterpret dataset metadata as a replacement for the goal/penalty/stakes/participation design.

`scripts/import-club-rosters.py` performs one bounded catalog import. The committed snapshot and provenance document preserve the delivered roster facts; reproducing an older raw import requires its date-isolated source cache. Refresh only the new-career baseline, never a continued football timeline.

See `docs/club-roster-provenance.md`, `docs/club-roster-hydration.md`, and `docs/world-cup-roster-integration.md` for exact source and adapter contracts. Server-authoritative persistence, full world/regen expansion, complete club atmosphere coverage and permanent publication remain separate work.
