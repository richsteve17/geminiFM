# Handoff Report

## 1. Observation

- **App.tsx State Saving/Loading**:
  - Direct observation of state saving in `App.tsx` (lines 292-297 & 305-310):
    ```typescript
    const stateToSave = {
        userTeamName, gameMode, isPrologue, currentWeek, weeksInSeason,
        teams, leagueTable, fixtures, news, weeklyResults, appScreen, gameState,
        managerReputation, transferMarket
    };
    localStorage.setItem('gfm_save_v1', JSON.stringify(stateToSave));
    ```
  - Direct observation of state loading in `App.tsx` (lines 325-341):
    ```typescript
    const savedData = localStorage.getItem('gfm_save_v1');
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData);
            setUserTeamName(parsed.userTeamName);
            setGameMode(parsed.gameMode);
            setIsPrologue(parsed.isPrologue);
            setCurrentWeek(parsed.currentWeek);
            setWeeksInSeason(parsed.weeksInSeason);
            setTeams(parsed.teams);
            setLeagueTable(parsed.leagueTable);
            setFixtures(parsed.fixtures);
            setNews(parsed.news);
            setWeeklyResults(parsed.weeklyResults);
            setGameState(parsed.gameState);
            setManagerReputation(parsed.managerReputation || 50);
            if (parsed.transferMarket) setTransferMarket(parsed.transferMarket);
    ```
  - State variables do not currently track `currentYear`.

- **Season Completion and Transitions**:
  - Direct observation of week progression and season ending in `App.tsx` (lines 541-544):
    ```typescript
    if (currentWeek >= weeksInSeason) {
        setAppScreen(AppScreen.START_SCREEN);
        return;
    }
    ```
  - During World Cup mode, `initializeWorldCup` sets `weeksInSeason = 8`.

- **Manager Reputation Adjustments**:
  - Match-by-match reputation is updated in `finishMatch` (lines 646-648):
    ```typescript
    if (userGoals > oppGoals) setManagerReputation(r => Math.min(100, r + 2));
    else if (userGoals === oppGoals) setManagerReputation(r => Math.min(100, r + 1));
    else setManagerReputation(r => Math.max(0, r - 1));
    ```
  - There is currently no tournament-end reputation bonus or transition logic when the World Cup tournament completes.

- **Job Vacancies Generation & App Screen Transitions**:
  - Direct observation of `generateJobs` in `App.tsx` (lines 441-453) which maps available club jobs using `allTeams` and sets the screen to `JOB_CENTRE`:
    ```typescript
    const generateJobs = (currentRep: number | ExperienceLevel) => {
        const rep = typeof currentRep === 'number' ? currentRep : managerReputation;
        const allTeamList: Team[] = Object.values(allTeams);
        // ...
        const jobs: Job[] = vacancies.map(t => ({ teamName: t.name, prestige: t.prestige, chairmanPersonality: t.chairmanPersonality }));
        setAvailableJobs(jobs); setAppScreen(AppScreen.JOB_CENTRE);
    }
    ```
  - Direct observation of `initializeGame` resetting manager reputation in `App.tsx` (line 410):
    ```typescript
    const initializeGame = useCallback((selectedTeamName: string) => {
        setGameMode('Club'); setIsPrologue(false);
        setManagerReputation(70); 
    ```

- **International Tournaments**:
  - Direct observation of `generateWorldCupStructure` in `src/international.ts` (lines 182-184) generating 48 teams:
    ```typescript
    export const generateWorldCupStructure = (): Record<string, Team> => {
        const teams: Record<string, Team> = {};
        const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    ```

- **Live Simulation Loop and Halftime / Match End**:
  - Direct observation of the minute timer and full-time resolution in `App.tsx` (lines 148-151):
    ```typescript
    if (currentPlaybackMinute >= 90) {
        finishMatch();
        return;
    }
    ```

---

## 2. Logic Chain

- **R1: Euros Structure & scheduling**:
  - Since the user manages a club team after the Year 1 prologue, international matches for the Euros must be simulated in the background.
  - Designated international break weeks are `Weeks 10, 20, and 30`. We can map the group stages to Week 10, round of 16 and quarter-finals to Week 20, and semi-finals and final to Week 30.
  - Adding 15 European countries (`EXTRA_EUROPEAN_TEAMS`) is required to expand the pool of European teams from 9 in `NATIONAL_TEAMS` to 24 for a standard 6-group Euros structure.

- **R2: World Cup Expansion**:
  - Standard tournament formats dictate that 64 teams require 16 groups of 4.
  - This requires generating an additional 48 teams beyond the 16 base teams in `NATIONAL_TEAMS`. We can achieve this by combining the 15 extra European teams and 33 new global teams (`EXTRA_GLOBAL_TEAMS`).
  - Advancing the top 2 teams from each of the 16 groups yields exactly 32 teams for the Round of 32 knockout bracket.

- **R3: Tutorial to Job Centre Transition**:
  - To transition smoothly from the World Cup prologue to the Club career:
    1. During Weeks 4–8 of the prologue, we evaluate the user's progress. If they lose or finish the final, we end the prologue.
    2. We update the manager's reputation based on their final tournament stage.
    3. We set `gameMode = 'Club'` and `currentYear = 1`.
    4. We generate job vacancies based on their updated reputation and transition to `AppScreen.JOB_CENTRE`.
    5. We ensure that `initializeGame` does not reset the reputation back to 70 if the user is transitioning from the prologue.

- **App.tsx State & Match Engine**:
  - Persisting `currentYear` in `localStorage` is necessary so the save/load system doesn't lose track of the current season year.
  - In `proceedToNextWeek`, if `currentWeek >= weeksInSeason`, we should reset the week to 1, increment `currentYear`, clear the league table standings (without losing roster updates/transfers), and generate new domestic/European fixtures.
  - Knockout matches must not end in a draw. The match engine needs to extend matches to 120 minutes if tied at 90, and decide the winner via penalty shootouts if tied at 120.

---

## 3. Caveats

- **Tactical and UI Customization**: This proposal does not touch the visual component code directly, though the UI will automatically handle the transitioned screens (`AppScreen.JOB_CENTRE`, etc.).
- **Morale Effects**: The proposed positive and negative morale effects on club players after international tournaments assume the presence of corresponding national attributes on club players or matching by nationality string.

---

## 4. Conclusion

The technical path to implement R1, R2, and R3 is clear:
1. Introduce `currentYear` state and persist it in `localStorage`.
2. Expand `proceedToNextWeek` to handle year-over-year transitions for Club mode.
3. Track user knockout qualification and match status during Year 1 Weeks 4-8. If they are eliminated, calculate their reputation bonus, transition to Club mode, and display the Job Centre with vacancies tailored to their reputation.
4. Implement background tournament simulation for Euros (Years 2 & 6) and World Cup 64 (Year 5) during Weeks 10, 20, and 30.
5. Extend the match engine playback loop and `simulateQuickMatch` to support extra time and penalty shootouts for knockout stages.

---

## 5. Verification Method

To verify these changes after implementation:
1. **Interactive Test**: Start the World Cup prologue. Purposely lose in the group stage or round of 32. Verify that:
   - The game mode transitions to Club.
   - The manager reputation is adjusted correctly based on the formula.
   - The Job Centre is displayed with jobs fitting the reputation.
   - Starting a club team keeps the reputation.
2. **Progression Test**: Advance to the end of a club season (Week 38+) and verify that:
   - `currentYear` increments to 2.
   - `currentWeek` resets to 1.
   - Standings are cleared, and a new set of domestic and European fixtures is generated.
3. **Background Simulation Test**: Play through Year 2. At weeks 10, 20, and 30, verify that:
   - Euros matches simulate in the background.
   - News feed reports progress at each stage.
   - At week 30, a champion is declared and news is generated.
4. **Knockout Match Test**: Play a knockout match and end in a draw at 90 minutes. Verify that the match engine enters extra time (91-120 minutes) and resolves with a penalty shootout if still tied.
