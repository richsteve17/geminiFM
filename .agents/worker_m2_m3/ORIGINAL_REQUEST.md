# Original Request - 2026-06-26T07:13:37-04:00

Your task is to implement the requirements for:
- R1: UEFA Euros Tournament Structure & Scheduling
- R2: World Cup Expansion Cycle
- R3: World Cup Tutorial to Job Centre Transition

Please load and read the analysis report at: `/Users/stephencoleman/antigravity/Remix:-Gemini-Football-Manager/.agents/explorer_m2_m3/analysis.md`
And follow these technical specifications:

1. Update `src/types.ts`:
   - Ensure `NewsItem` type support `'serious-rift' | 'teammate-bond'` in the `type` field.
   - Add `riftDecision?: { riftPlayerA: string; riftPlayerB: string; choice?: 'bench-a' | 'bench-b' | 'risk-it'; resultEffect?: string; }` optional field to `NewsItem`.
   - Add `currentYear` to state saving if needed (e.g. extending type signatures if any).

2. Update `src/international.ts`:
   - Create `EXTRA_EUROPEAN_TEAMS` and `EXTRA_GLOBAL_TEAMS` lists as proposed.
   - Implement `generateEurosStructure()` to return a record of 24 national teams in groups A-F (Groups of 4).
   - Implement `generateExpandedWorldCupStructure()` to return a record of 64 national teams in groups A-P (Groups of 4).
   - Create group standing calculation helpers to extract top 2 teams and best 3rd-placed teams.
   - Create knockout fixture generator helpers.

3. Update `src/App.tsx`:
   - Declare and persist `currentYear` state (defaults to 1). Save/load it in localStorage. Reset to 1 on handleQuit.
   - Extend season-end transition in `proceedToNextWeek` (when `currentWeek >= weeksInSeason`) for Club mode to increment `currentYear`, reset `currentWeek = 1`, clear standings, and regenerate club fixtures (domestic and UCL).
   - Implement Year 1 interactive World Cup knockouts: at the end of Week 3, generate Round of 32 (32 teams: top 2 of each of the 12 groups + 8 best 3rd-placed). At each week (Week 4 to 8), check if the user is knocked out. If knocked out, calculate reputation and immediately transition to Club/Job Centre. If they progress, pair winners and generate next round fixtures.
   - Implement the reputation adjustment formula on tutorial exit.
   - Transition to Club mode: update `gameMode = 'Club'`, set `isPrologue = false`, set the computed reputation, generate club job vacancies via `generateJobs()`, and navigate to `JOB_CENTRE`.
   - Update `initializeGame` so it preserves `managerReputation` if transitioning from prologue.
   - Implement background simulation of Euros (Year 2 & 6) and World Cup (Year 5) at weeks 10, 20, 30. Display news articles for standings/stages.
   - Update the match engine live playback timer to support Extra Time (up to 120 minutes) and penalty shootouts if score is tied at 90 / 120 minutes for interactive knockout fixtures.
   - Update `simulateQuickMatch` (or create a knockout quick match simulator) to resolve ties using penalties.

4. Run compile and test commands (like `npm run build` and `npm run test`) to ensure everything compiles and passes sanity tests.
5. Create additional unit/integration tests under `src/__tests__/` to verify the tournament structure generation, transition state logic, and knockout matches. Run them and ensure they pass.
6. Write a handoff.md in your directory.
