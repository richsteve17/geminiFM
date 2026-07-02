# Analysis & Proposals: UEFA Euros, World Cup Expansion, and Tutorial Transition

This report outlines the technical design and proposed code modifications to implement the Euros tournament, World Cup expansion cycle, and the tutorial-to-club career transition.

---

## R1: UEFA Euros Tournament Structure & Scheduling

The Euros occur in **Year 2** and **Year 6** of the game. Because the user manages a Club during these years, the Euros are simulated entirely in the background during the designated international break weeks (**Weeks 10, 20, and 30**).

### 1. Tournament Structure
- **Teams**: 24 teams.
- **Groups**: 6 groups of 4 (Groups A to F).
- **Rosters**: Real rosters are used for major European nations already defined in `NATIONAL_TEAMS` (England, France, Spain, Germany, Portugal, Netherlands, Italy, Belgium, Croatia). Generic rosters (using `generateGenericSquad`) are generated for 15 additional European nations.
- **Knockout Stage**: 
  - Round of 16 (16 teams)
  - Quarter-finals (QF, 8 teams)
  - Semi-finals (SF, 4 teams)
  - Final (2 teams)
- **Qualifying Criteria**: The top 2 teams from each of the 6 groups (12 teams) and the 4 best third-placed teams (4 teams) advance to the Round of 16.

### 2. European Team List
To expand from the 9 European nations in `NATIONAL_TEAMS` to 24, we propose a static list of 15 extra European nations:
```typescript
const EXTRA_EUROPEAN_TEAMS = [
    { name: 'Denmark', flag: '🇩🇰', code: 'DEN', prestige: 82 },
    { name: 'Switzerland', flag: '🇨🇭', code: 'SUI', prestige: 83 },
    { name: 'Austria', flag: '🇦🇹', code: 'AUT', prestige: 81 },
    { name: 'Turkey', flag: '🇹🇷', code: 'TUR', prestige: 82 },
    { name: 'Poland', flag: '🇵🇱', code: 'POL', prestige: 79 },
    { name: 'Hungary', flag: '🇭🇺', code: 'HUN', prestige: 78 },
    { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', code: 'SCO', prestige: 77 },
    { name: 'Czechia', flag: '🇨🇿', code: 'CZE', prestige: 79 },
    { name: 'Serbia', flag: '🇷🇸', code: 'SRB', prestige: 79 },
    { name: 'Romania', flag: '🇷🇴', code: 'ROU', prestige: 76 },
    { name: 'Slovakia', flag: '🇸🇰', code: 'SVK', prestige: 76 },
    { name: 'Slovenia', flag: '🇸🇮', code: 'SVN', prestige: 75 },
    { name: 'Georgia', flag: '🇬🇪', code: 'GEO', prestige: 74 },
    { name: 'Ukraine', flag: '🇺🇦', code: 'UKR', prestige: 80 },
    { name: 'Albania', flag: '🇦🇱', code: 'ALB', prestige: 73 }
];
```

### 3. Background Simulation Schedule
- **Week 10 (Group Stage)**:
  - Generate the 24 teams and assign them to Groups A–F.
  - Simulate all group stage fixtures (3 matches per team) using `simulateQuickMatch`.
  - Calculate standings and rank teams. Select the 16 advancing teams (top 2 per group + 4 best 3rd-placed).
  - Generate Round of 16 fixtures.
  - Publish news feed update: "Euros Group Stage Ends: [Advancing teams] qualify. [Eliminated team] is sent home early."
- **Week 20 (Round of 16 & Quarter-finals)**:
  - Simulate the 8 matches of the Round of 16. If tied, resolve using extra time/penalties.
  - Pair the 8 winners into Quarter-final fixtures.
  - Simulate the 4 Quarter-final matches (resolving ties).
  - Pair the 4 winners into Semi-final fixtures.
  - Publish news feed update summarizing the matches and naming the four semi-finalists.
- **Week 30 (Semi-finals & Final)**:
  - Simulate the 2 Semi-final matches (resolving ties).
  - Simulate the Final (resolving ties) and determine the champion.
  - Apply `PostTournamentMorale` effects to the active club players belonging to the champion country.
  - Publish news feed update celebrating the Euros Champion.

---

## R2: World Cup Expansion Cycle

The World Cup follows an expansion cycle:
- **Year 1 (Tutorial/Prologue)**: 48 teams (12 groups of 4). Played interactively by the user.
- **Year 5**: 64 teams (16 groups of 4). Simulated in the background for the user (who is managing a club).

### 1. 64-Team World Cup Structure
- **Teams**: 64 teams.
- **Groups**: 16 groups of 4 (Groups A to P).
- **Rosters**: Real rosters for the 16 teams in `NATIONAL_TEAMS`. Generic rosters for 48 other nations.
- **Knockout Stage**:
  - Round of 32 (32 teams)
  - Round of 16 (16 teams)
  - Quarter-finals (QF, 8 teams)
  - Semi-finals (SF, 4 teams)
  - Final (2 teams)
- **Qualifying Criteria**: The top 2 teams from each of the 16 groups advance directly to the Round of 32.

### 2. World Cup Expansion Team List
To reach 64 teams, we combine `NATIONAL_TEAMS`, the `EXTRA_EUROPEAN_TEAMS`, and a new list of `EXTRA_GLOBAL_TEAMS`:
```typescript
const EXTRA_GLOBAL_TEAMS = [
    { name: 'Senegal', flag: '🇸🇳', code: 'SEN', prestige: 82 },
    { name: 'South Korea', flag: '🇰🇷', code: 'KOR', prestige: 81 },
    { name: 'Australia', flag: '🇦🇺', code: 'AUS', prestige: 78 },
    { name: 'Mexico', flag: '🇲🇽', code: 'MEX', prestige: 80 },
    { name: 'Canada', flag: '🇨🇦', code: 'CAN', prestige: 78 },
    { name: 'Nigeria', flag: '🇳🇬', code: 'NGA', prestige: 80 },
    { name: 'Egypt', flag: '🇪🇬', code: 'EGY', prestige: 79 },
    { name: 'Cameroon', flag: '🇨🇲', code: 'CMR', prestige: 77 },
    { name: 'Algeria', flag: '🇩🇿', code: 'ALG', prestige: 78 },
    { name: 'Ivory Coast', flag: '🇨🇮', code: 'CIV', prestige: 80 },
    { name: 'Ghana', flag: '🇬🇭', code: 'GHA', prestige: 76 },
    { name: 'Saudi Arabia', flag: '🇸🇦', code: 'KSA', prestige: 75 },
    { name: 'Iran', flag: '🇮🇷', code: 'IRN', prestige: 76 },
    { name: 'Chile', flag: '🇨🇱', code: 'CHI', prestige: 77 },
    { name: 'Peru', flag: '🇵🇪', code: 'PER', prestige: 76 },
    { name: 'Ecuador', flag: '🇪🇨', code: 'ECU', prestige: 80 },
    { name: 'Costa Rica', flag: '🇨🇷', code: 'CRC', prestige: 74 },
    { name: 'New Zealand', flag: '🇳🇿', code: 'NZL', prestige: 70 },
    { name: 'South Africa', flag: '🇿🇦', code: 'RSA', prestige: 74 },
    { name: 'Tunisia', flag: '🇹🇳', code: 'TUN', prestige: 75 },
    { name: 'Wales', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', code: 'WAL', prestige: 78 },
    { name: 'Sweden', flag: '🇸🇪', code: 'SWE', prestige: 81 },
    { name: 'Norway', flag: '🇳🇴', code: 'NOR', prestige: 82 },
    { name: 'Ireland', flag: '🇮🇪', code: 'IRL', prestige: 75 },
    { name: 'Greece', flag: '🇬🇷', code: 'GRE', prestige: 78 },
    { name: 'Iceland', flag: '🇮🇸', code: 'ISL', prestige: 73 },
    { name: 'Finland', flag: '🇫🇮', code: 'FIN', prestige: 73 },
    { name: 'Jamaica', flag: '🇯🇲', code: 'JAM', prestige: 74 },
    { name: 'Panama', flag: '🇵🇦', code: 'PAN', prestige: 73 },
    { name: 'Venezuela', flag: '🇻🇪', code: 'VEN', prestige: 76 },
    { name: 'Paraguay', flag: '🇵🇾', code: 'PAR', prestige: 76 },
    { name: 'China', flag: '🇨🇳', code: 'CHN', prestige: 68 },
    { name: 'Mali', flag: '🇲🇱', code: 'MLI', prestige: 72 }
];
```

### 3. Year 5 Background Simulation Schedule
- **Week 10 (Group Stage)**:
  - Generate 64 teams and assign them to Groups A–P.
  - Simulate all group stage fixtures (3 matches per team).
  - Calculate standings and rank teams. Select the 32 advancing teams (top 2 per group).
  - Generate Round of 32 fixtures.
  - Publish news feed update.
- **Week 20 (R32, R16, QF)**:
  - Simulate R32 (16 matches) -> simulate R16 (8 matches) -> simulate QF (4 matches). All draw matches are resolved via shootout.
  - Pair the 4 winners into Semi-final fixtures.
  - Publish news feed update with the QF results and semi-finalists.
- **Week 30 (SF & Final)**:
  - Simulate SF (2 matches) -> simulate Final (1 match).
  - Determine champion, apply morale boosts/penalties to club players.
  - Publish news feed update celebrating the World Cup Champion.

---

## R3: World Cup Tutorial to Job Centre Transition

### 1. Year 1 Interactive Tutorial Knockouts (Weeks 4–8)
During Year 1, the user plays as the National Team manager in the World Cup.
- **Group Stage (Weeks 1-3)**: The user plays 3 interactive matches.
- **Week 4 (Round of 32)**:
  - At the end of Week 3, the game ranks all 12 groups.
  - Top 2 teams per group + 8 best 3rd-placed teams qualify.
  - **Check Qualification**: If the user's team is not in the qualified 32 list, they are knocked out. Show heartbreak news, apply reputation penalty, and immediately transition to the Job Centre.
  - If qualified, pair teams (e.g., sort the 32 teams by group performance; Seed 1 vs Seed 32, Seed 2 vs Seed 31, etc.).
  - Generate the 16 Round of 32 fixtures for Week 4.
  - Set the user's fixture as `currentFixture` for Week 4.
- **Week 5 (Round of 16)**:
  - At the end of Week 4, check if the user won. If lost, they are knocked out. Transition to the Job Centre.
  - If won, simulate the other 15 matches (resolving draws).
  - Pair the 16 winners, generate Round of 16 fixtures for Week 5, and set `currentFixture`.
- **Week 6 (Quarter-finals)**:
  - If user lost in Week 5: transition to Job Centre.
  - If won, simulate other 7 matches, generate QF fixtures, set `currentFixture`.
- **Week 7 (Semi-finals)**:
  - If user lost in Week 6: transition to Job Centre.
  - If won, simulate other 3 matches, generate SF fixtures, set `currentFixture`.
- **Week 8 (Final)**:
  - If user lost in Week 7: transition to Job Centre.
  - If won, simulate other match, generate Final fixture, set `currentFixture`.
  - At the end of Week 8 (Final match played), the tournament is complete regardless of the result. Transition to the Job Centre.

### 2. Reputation Adjustment Formula
The manager starts the World Cup tutorial with a baseline reputation of **90%**. At the end of the World Cup campaign, the reputation is adjusted based on the furthest stage reached:
- **Champions (Won Final)**: +10% (final: 100%)
- **Runners-Up (Lost Final)**: +0% (final: 90%)
- **Semi-Finalists (Lost SF)**: -5% (final: 85%)
- **Quarter-Finalists (Lost QF)**: -10% (final: 80%)
- **Round of 16 (Lost R16)**: -15% (final: 75%)
- **Round of 32 (Lost R32)**: -20% (final: 70%)
- **Group Stage Exit**: -25% (final: 65%)

This updated reputation directly dictates which club vacancies are available in the Job Centre.

### 3. Transition to Club Mode
Once the reputation is updated:
1. Transition `gameMode = 'Club'`.
2. Clear the national team roster from state (the user will select a Club team).
3. Call `generateJobs(updatedReputation)`. This populates `availableJobs` with club vacancies tailored to the user's new reputation.
4. Set `appScreen = AppScreen.JOB_CENTRE`.
5. Set `currentYear = 1` and `currentWeek = 1` for the new Club career.
6. When the user successfully interviews and accepts a job, `initializeGame(teamName)` is called.
   - We must modify `initializeGame` so that if `isPrologue` is active, it preserves the `managerReputation` (instead of resetting it to 70).
   - Set `isPrologue = false`.
   - Initialize the club league table and fixtures.

---

## App.tsx State and Session Lifecycle Changes

To persist the current year and support proper multi-year progression in Club mode, we propose the following changes:

### 1. State Variables
Add a state variable for tracking the current year:
```typescript
const [currentYear, setCurrentYear] = useState<number>(1);
```

### 2. Saving State (`saveGame` and `useEffect` auto-save)
Ensure `currentYear` is included in the saved state object:
```typescript
const stateToSave = {
    userTeamName, gameMode, isPrologue, currentWeek, weeksInSeason, currentYear,
    teams, leagueTable, fixtures, news, weeklyResults, appScreen, gameState,
    managerReputation, transferMarket, internationalTournament
};
```

### 3. Loading State (`handleContinue`)
Restore `currentYear` from the parsed save file:
```typescript
setCurrentYear(parsed.currentYear || 1);
```

### 4. Season Transitions in Club Mode
Currently, when `currentWeek >= weeksInSeason`, the season ends and goes to the start screen. We propose:
```typescript
if (currentWeek >= weeksInSeason) {
    if (gameMode === 'Club') {
        // Increment year
        const nextYear = currentYear + 1;
        setCurrentYear(nextYear);
        setCurrentWeek(1);

        // Reset Standings for all Club teams (keep rosters/attributes intact)
        const updatedTable: LeagueTableEntry[] = Object.values(teams).map(t => ({
            teamName: t.name,
            league: t.league,
            played: 0, won: 0, drawn: 0, lost: 0,
            goalsFor: 0, goalsAgainst: 0, goalDifference: 0,
            points: 0
        }));
        setLeagueTable(updatedTable);

        // Regenerate Domestic & Champions League Fixtures using current teams state
        const domesticFixtures = generateFixtures(Object.values(teams));
        const { participants, newTeams } = getChampionsLeagueParticipants(teams);
        const finalTeamsState = { ...teams, ...newTeams };
        setTeams(finalTeamsState);

        const clWeeks = [5, 9, 13, 17, 21, 25, 29, 33];
        const clFixtures = generateSwissFixtures(participants.map(n => finalTeamsState[n]));
        const finalFixtures: Fixture[] = [];
        domesticFixtures.forEach(f => {
            let gameWeek = f.week;
            if (f.week >= 5) gameWeek++; if (f.week >= 9) gameWeek++; if (f.week >= 13) gameWeek++;
            if (f.week >= 17) gameWeek++; if (f.week >= 21) gameWeek++; if (f.week >= 25) gameWeek++;
            if (f.week >= 29) gameWeek++; if (f.week >= 33) gameWeek++;
            finalFixtures.push({ ...f, week: gameWeek });
        });
        clFixtures.forEach(f => { if (clWeeks[f.week - 1]) finalFixtures.push({ ...f, week: clWeeks[f.week - 1] }); });

        setFixtures(finalFixtures);
        setWeeksInSeason(Math.max(...finalFixtures.map(f => f.week)) + 10);
        setCurrentFixture(finalFixtures.find(f => (f.homeTeam === userTeamName || f.awayTeam === userTeamName) && f.week === 1));
        setMatchState(null);
        setGameState(GameState.PRE_MATCH);

        setNews(prev => [{
            id: Date.now(),
            week: 1,
            title: `Welcome to Year ${nextYear}!`,
            body: `The new domestic and European campaign has officially kicked off. Good luck!`,
            type: 'tournament-result'
        }, ...prev]);
        
        return;
    } else {
        setAppScreen(AppScreen.START_SCREEN);
        return;
    }
}
```

---

## Technical Details: Resolving Knockout Ties in the Match Engine

### 1. Interactive Matches (User Playing)
In `App.tsx` live simulation loop:
- If a match is a knockout stage (e.g. stage !== 'Group Stage' and league === 'International'):
  - If at 90 minutes the score is tied, **do not** call `finishMatch()`.
  - Instead, extend the match to 120 minutes by updating `simulationTargetMinute = 120` (simulate extra time in two 15-minute segments).
  - If still tied at 120 minutes, trigger a penalty shootout sequence:
    - Generate a random penalty shootout score (e.g. 4-3, 5-4, etc.).
    - Append a penalty shootout event to `pendingEvents` so it displays in the Match View.
    - Set a `penaltyWinner: 'home' | 'away'` property on the `MatchState` object.
- In `finishMatch()`, check `penaltyWinner` if scores are tied to declare the correct match winner.

### 2. Background Simulated Matches
Modify `simulateQuickMatch` or create `simulateKnockoutQuickMatch` to handle knockout ties:
```typescript
export const simulateKnockoutQuickMatch = (homeTeam: Team, awayTeam: Team): { homeGoals: number, awayGoals: number, penaltyWinner?: 'home' | 'away', penaltyScore?: string } => {
    let { homeGoals, awayGoals } = simulateQuickMatch(homeTeam, awayTeam);
    if (homeGoals === awayGoals) {
        // Resolve with shootout
        const homePenalties = Math.floor(Math.random() * 5) + 3;
        const awayPenalties = Math.random() < 0.5 ? homePenalties + 1 : homePenalties - 1;
        return {
            homeGoals,
            awayGoals,
            penaltyWinner: homePenalties > awayPenalties ? 'home' : 'away',
            penaltyScore: `${homePenalties}-${awayPenalties}`
        };
    }
    return { homeGoals, awayGoals };
};
```
