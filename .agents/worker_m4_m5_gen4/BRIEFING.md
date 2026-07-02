# BRIEFING — 2026-06-27T08:31:41Z

## Mission
Implement Weekly Economics & Player Development (R4) and Teammate Tournament Rivalries & Rifts (R5) in Remix:-Gemini-Football-Manager.

## 🔒 My Identity
- Archetype: implementer, qa, specialist
- Roles: implementer, qa, specialist
- Working directory: /Users/stephencoleman/antigravity/Remix:-Gemini-Football-Manager/.agents/worker_m4_m5_gen4
- Original parent: ceedec9b-374f-430b-b877-0fce99cae021
- Milestone: Milestone 4 & 5

## 🔒 Key Constraints
- Teammate rifts must have high impact: if players have a serious rift and are both selected as starters, they refuse to play together, causing a severe tactical efficiency penalty (-30 points) and a feud warning in `src/utils.ts`'s `analyzeTactics`.
- The News feed must act like an Email system: persistent, stored in local storage, readable retrospectively, and supporting up to 1000 items (not aggressively sliced).
- Gemini AI prompts for press conferences, player talks, and job interviews must pass rich context (manager tactics, standings, player personality, past promises).

## Current Parent
- Conversation ID: ceedec9b-374f-430b-b877-0fce99cae021
- Updated: not yet

## Task Summary
- **What to build**: Weekly economics (wage deduction, broadcast revenue, matchday revenue for played fixtures) and player development training logic; tournament teammate rivalries during international breaks with choices; persistent news feed; rich context prompts for press/talks/interviews.
- **Success criteria**: All code changes successfully compile and are fully functional, satisfying the prompt guidelines. Vitest tests written in `src/__tests__/economics_rivalry.test.ts` pass successfully.
- **Interface contracts**: PROJECT.md
- **Code layout**: PROJECT.md

## Key Decisions Made
- [TBD]

## Artifact Index
- [TBD]

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: None

## Quality Status
- **Build/test result**: Untested
- **Lint status**: Untested
- **Tests added/modified**: None yet

## Loaded Skills
- **Source**: `/Users/stephencoleman/.gemini/config/plugins/modern-web-guidance-plugin/skills/modern-web-guidance/SKILL.md`
  - **Local copy**: `/Users/stephencoleman/antigravity/Remix:-Gemini-Football-Manager/.agents/worker_m4_m5_gen4/modern_web_guidance_SKILL.md`
  - **Core methodology**: Guideline for modern web features, CSS, performance, forms, etc.

