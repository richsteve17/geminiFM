## 2026-06-27T04:12:47Z
Implementing requirements for:
- R4: Weekly Economics & Player Development
- R5: Teammate Tournament Rivalries & Rifts
Including user feedback guidelines:
- Teammate rifts must have high impact: if players have a serious rift and are both selected as starters, they refuse to play together, causing a severe tactical efficiency penalty (-30 points) and a feud warning in `src/utils.ts`'s `analyzeTactics`.
- The News feed must act like an Email system: persistent, stored in local storage, readable retrospectively, and supporting up to 1000 items (not aggressively sliced).
- Gemini AI prompts for press conferences, player talks, and job interviews must pass rich context (manager tactics, standings, player personality, past promises).

Updates required:
1. Update `src/types.ts`:
   - Extend `PlayerEffect` type union to support `InternationalRift` and `TeammateBond`
   - Extend `NewsItem` type's `type` field to support `'serious-rift' | 'teammate-bond'` and add optional `riftDecision`.
2. Update `src/utils.ts`:
   - Update `analyzeTactics` to check for serious chemistry rifts or bad chemistry between any two starters. Feud warning and -30 penalty.
3. Update `src/App.tsx`:
   - Weekly Economics in `proceedToNextWeek`: deduct wage bills, credit broadcast revenue, matchDayRevenue, generate news cash flow.
   - Weekly Player Development in `proceedToNextWeek`: call `calculatePlayerDevelopment` for all players with start/sub/performance context.
   - International breaks teammate tournament rivalries/rifts in weeks 10, 20, 30 of years 2, 5, 6. Call `getTeammateTournamentRivalry`, handle results.
   - Implement `handleRiftDecision` in `App.tsx` and pass to `<NewsScreen onRiftDecision={handleRiftDecision} />`.
   - Make News Feed persistent and email-like, storing up to 1000 items in local storage.
   - Pass rich context into press conferences.
4. Update `src/services/geminiService.ts`:
   - Pass rich context in `evaluatePlayerTalk` and `evaluateInterview`.
   - Ensure `getTeammateTournamentRivalry` is integrated.
5. Compile and run tests, and write tests in `src/__tests__/economics_rivalry.test.ts`.
