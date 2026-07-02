# BRIEFING — 2026-06-26T11:24:10Z

## Mission
Empirically verify the correctness of the UEFA Euros, World Cup Expansion, and Tutorial career transitions, including standings edge cases and knockout shootouts.

## 🔒 My Identity
- Archetype: Empirical Challenger
- Roles: critic, specialist
- Working directory: /Users/stephencoleman/antigravity/Remix:-Gemini-Football-Manager/.agents/challenger_m2_m3_2
- Original parent: ceedec9b-374f-430b-b877-0fce99cae021
- Milestone: M2/M3 Verification
- Instance: 1 of 1

## 🔒 Key Constraints
- Review-only — do NOT modify implementation code (unless fixing a test or writing tests)
- Rely on empirical proof (tests, execution) rather than code reading alone

## Current Parent
- Conversation ID: ceedec9b-374f-430b-b877-0fce99cae021
- Updated: not yet

## Review Scope
- **Files to review**: `src/__tests__/tournament.test.ts`, relevant standings, shootouts, tournament logic, and tutorial career transitions.
- **Interface contracts**: Standings logic, tiebreakers, 3rd placed team rankings, knockout shootouts, career transitions.
- **Review criteria**: Empirical correctness, edge cases (goal difference, goals scored, head-to-head if applicable, 3rd placed comparison), shootout correctness.

## Key Decisions Made
- Initial plan: Run existing vitest tests, inspect the test file and source code, write additional tests/harnesses if needed to cover edge cases.

## Attack Surface
- **Hypotheses tested**: TBD
- **Vulnerabilities found**: TBD
- **Untested angles**: TBD

## Loaded Skills
- None loaded.

## Artifact Index
- None.
