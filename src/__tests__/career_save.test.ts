import { describe, expect, it } from 'vitest';
import { CAREER_SAVE_VERSION, migrateCareerSave } from '../engine/careerSave';
import { AppScreen, GameState } from '../types';
const legacy = { userTeamName: 'Liverpool', teams: { Liverpool: { name: 'Liverpool', league: 'Premier League', tactic: { formation: '4-4-2', mentality: 'Balanced' }, players: [] } }, fixtures: [{ id: 'f', week: 1, homeTeam: 'Liverpool', awayTeam: 'Chelsea' }], leagueTable: [], currentWeek: 1, currentPlaybackMinute: 6, gameState: GameState.PLAYING, managerReputation: 0, matchState: { currentMinute: 6, homeScore: 1, awayScore: 0, events: [], simulationSeed: 3 }, pendingEvents: [{ id: 1, minute: 7, type: 'goal', teamName: 'Liverpool', description: 'goal' }] };
describe('career save migration', () => {
    it('removes unrevealed scores from legacy live saves but keeps the future event queue', () => {
        const migrated = migrateCareerSave(legacy);
        expect(migrated.matchState.homeScore).toBe(0);
        expect(migrated.pendingEvents).toHaveLength(1);
        expect(migrated.managerReputation).toBe(0);
        expect(legacy.matchState.homeScore).toBe(1);
    });
    it('keeps current saves and their applied press outcome IDs without resetting scores', () => {
        const migrated = migrateCareerSave({ ...legacy, version: 2, appliedPressEvaluationIds: ['press-eval-1'] });
        expect(migrated.matchState.homeScore).toBe(1);
        expect(migrated.appliedPressEvaluationIds).toEqual(['press-eval-1']);
    });
    it('rejects poisoned v2 internals instead of hydrating primitives into React', () => {
        expect(() => migrateCareerSave({ ...legacy, version: 2, teams: { Liverpool: 'not a squad' } })).toThrow('invalid squad');
        expect(() => migrateCareerSave({ ...legacy, version: 2, matchState: 'bad live state' })).toThrow('invalid live match');
        expect(() => migrateCareerSave({ ...legacy, version: 2, pressQuestionResult: { mode: 'ai-questions', session: {} } })).toThrow();
    });
    it('refuses future and malformed career saves before instantiating state', () => {
        expect(() => migrateCareerSave({ ...legacy, version: CAREER_SAVE_VERSION + 1 })).toThrow('newer');
        expect(() => migrateCareerSave({ fixtures: [] })).toThrow('missing');
    });
    it('keeps an unemployed RTG manager without fabricating an elite background', () => {
        const result = migrateCareerSave({ ...legacy, version: 3, gameMode: 'Club', appScreen: AppScreen.JOB_CENTRE, userTeamName: null, matchState: null, pendingEvents: [], tutorialCompletion: null, availableJobs: [] });
        expect(result.userTeamName).toBeNull(); expect(result.hasClubCareer).toBe(false);
    });
    it('preserves the validated tutorial award and completed goal facts in current saves', () => {
        const result = migrateCareerSave({ ...legacy, version: 3, tutorialCompletion: { version: 1, country: 'France', finish: 'Winner', reputation: 100 }, hasClubCareer: false });
        expect(result.tutorialCompletion.finish).toBe('Winner'); expect(result.hasClubCareer).toBe(false);
        expect(() => migrateCareerSave({ ...legacy, version: 3, tutorialCompletion: { finish: 'Made up' } })).toThrow('tutorial result');
    });
});
