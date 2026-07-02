# Project: Career Honors Board & Trophy Room

## Architecture
- React component dashboard representing the Honors Board/Trophy Room.
- Game state integration tracking the manager's career history (`careerHistory`).
- Season-end checks for domestic league completion and cup/tournament completion to log achievements.
- Local storage persistence for saving/loading honors board data across sessions.

## Code Layout
- `src/types.ts` - Game types, screen names, state models.
- `src/App.tsx` - App screen routing, premium dashboard interface.
- `src/utils.ts` or game loop files - Season-end hooks and automatic achievement logging.
- `src/__tests__/honors_board.test.ts` - Automated unit tests.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Exploration & Design | Analyze code layout, locate season-end logic, search for glassmorphism UI guides. | None | IN_PROGRESS |
| 2 | Implementation | Implement career honors state, season-end logger, glassmorphism dashboard UI, and tests. | M1 | PLANNED |
| 3 | Review & Audit | Verify correctness, passing tests, layout conformance, and run integrity checks. | M2 | PLANNED |

## Interface Contracts
### GameState ↔ HonorsBoard
- State structure containing `careerHistory: CareerHistoryEntry[]`
- Function to record a completed season/campaign.
