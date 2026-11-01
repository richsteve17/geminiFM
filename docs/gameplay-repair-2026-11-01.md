# Manus FM 3.2.0 — gameplay regression repair

This is a repair of the inherited Gemini FM product, not delivery of the complete approved football/RPG design. Stadium culture, contextual AI and career consequences remain core requirements.

## Mechanisms repaired

- The supplied ZIP contained real performances, but no recordings had been installed in the game. The chant trigger also inspected only the last event in a batch. Seventeen source-attributed, normalized recordings are now connected to a persistent event cue scheduler. Kickoff unlocks audio with a user gesture, every revealed goal gets a cue, goal cues take priority, pressure has a cooldown, and 10-second asset timeouts cannot leave a cue loading forever. Liverpool's kickoff selects the supplied YNWA performance. Named player chants cannot be used for a different scorer.
- Segment totals were applied before their goal minutes were played. Scores now derive from revealed ledger events. Both 45- and 105-minute intervals pause, extra time is simulated rather than skipped, and a match commits once. The pitch animates resolved passing/crossing/shooting paths rather than decorative token movement. Player position, goalkeeper placement, conditioning, fatigue and tactics participate in outcomes.
- AI match narration had been disconnected. A bounded chunk-level director now accepts descriptions only; it cannot alter goals, players, minutes or spatial results. Failed AI remains visible.
- Generic press questions lacked the actual fixture context, and the next-week routine read the pre-press React snapshot. Questions now use immutable result/event/tactics/competition/promise facts, answers are evaluated with exact evidence quotes, and bounded effects carry into the next-week snapshot. Transcripts, verdicts and applied IDs are saved. Refusals/irrelevant answers are not secretly treated as informed tactical responses. Schema failures have one corrective attempt and then a visible failure/retry path.
- Free agents now have canonical eligibility, identity, accepted terms, signing bonus, wage capacity and squad-cap checks. Signing is one immutable squad/market/finance transition. Released players enter the market instead of disappearing. Free agency now has direct desktop and sidebar navigation rather than being buried behind scouting.
- Saved careers have a schema version and defensive validation. Legacy unrevealed scoreboard values are migrated from the event ledger; malformed squads, live events and press payloads are rejected before React state is instantiated.
- The production scaffold pointed at an unrelated lockfile and evaluated dev-only Vite metadata inside its server bundle. The npm lock agrees with the actual manifest, Vite frontend output is isolated in `dist/public`, and the compiled production entrypoint serves that directory rather than the server bundle.

## Live evidence

An actual Liverpool–Southampton career match played to a 2–0 final score. It paused at 45 minutes, resumed, displayed recorded playback, retained actual AI event descriptions and updated the league table. Its post-match questions referenced the 2–0 result, the current 4–3–3 setup and Gravenberch's 41-minute yellow card. The real AI editorial quoted all three submitted test answers, classified them differently and returned +1 reputation/0 squad-form points. Applying it advanced week 1 to week 2 and reputation 72 to 73. The evaluation ID and article remained in the saved career after reload.

The direct Gemini key returned a concrete free-tier quota error: 20 content requests per day. This is inadequate for a continuing AI career. Text requests now retain the direct Gemini route when it is available and use the verified `gemini-3-flash-preview` managed project route when that quota is exhausted. A live fallback request and the live press editorial returned actual text via `manus/gemini-3-flash-preview`. Provider credentials remain server-side.

## Cost and operating boundaries

Managed inference deducts project credits; it is not free. Its live catalog on 2026-11-01 listed Gemini 3 Flash at 75 input credits and 450 output credits per million tokens. Real cost depends on prompts, completions and retries; the game does not promise a fixed per-match cost. The route caps prompt size, output budget, concurrent requests (3) and hourly requests (240 per process). These are bounded Preview safeguards, not durable cross-instance accounting or authenticated commercial access. Optional video and synthetic spoken previews remain separate from automatic recorded stadium playback. Unsupported managed search-tool calls are explicitly rejected, not represented as verified scouting data.

## Verification and unresolved core scope

TypeScript, 88 tests and production compilation passed. A focused production probe served HTML, the route manifest and a supplied clip with HTTP 200; the static directory does not expose server JavaScript. One independent integration review identified malformed-v2 save handling, a missing extra-time interval and an unbounded recording load; each was corrected.

The source map in `football-reference-implementation-map.md` identifies which supplied football/FIFA/audio/dialogue references connect to code and what remains incomplete. Full world/regen/attribute/board-depth systems, complete club repertoires, layered/generated crowd production and the full worker-backed broadcast pipeline are still required. Tests and a functioning match do not establish that the complete game is fun. This release is saved for Preview, not represented as a published production service.

The inherited roster and initial market are a seeded game database, not a verified November 2026 live roster/free-agent feed. In-game eligibility does not establish a real player’s current contractual status. Real-world roster/market reconciliation remains required, unfinished work; the repaired market is labeled accordingly.
