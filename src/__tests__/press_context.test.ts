import { describe, expect, it } from 'vitest';
import { buildPressContext } from '../engine/pressContext';
import type { Fixture, LeagueTableEntry, MatchState, Team } from '../types';
const fixture: Fixture = { id: 'f4', week: 4, league: 'Premier League', homeTeam: 'Manchester United', awayTeam: 'Liverpool', played: true, score: '2-1' };
const state: MatchState = { currentMinute: 90, homeScore: 2, awayScore: 1, events: [{ id: 1, minute: 80, type: 'goal', player: 'Salah', teamName: 'Liverpool', description: 'Salah scores.', scoreAfter: '2-1' }], isFinished: true, subsUsed: { home: 0, away: 0 }, momentum: -3, tacticalAnalysis: 'A late counterattack', sessionId: 'm4' };
const team = { name: 'Liverpool', league: 'Premier League', tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, players: [{ name: 'Salah' }], activePromises: [{ id: 'p', description: 'Give Salah regular minutes', status: 'pending' }] } as Team;
describe('press career snapshot', () => {
    it('uses the user-oriented score, actual goal, exact derby, real promises, and a competition-scoped sorted table', () => {
        const table = [{ teamName: 'Real Madrid', league: 'La Liga', points: 30, goalDifference: 30, goalsFor: 35 }, { teamName: 'Liverpool', league: 'Premier League', points: 7, goalDifference: 2, goalsFor: 7 }, { teamName: 'Chelsea', league: 'Premier League', points: 10, goalDifference: 4, goalsFor: 9 }] as LeagueTableEntry[];
        const input = buildPressContext(fixture, state, team, undefined, table, [fixture, { ...fixture, id: 'f3', week: 3, homeTeam: 'Liverpool', awayTeam: 'Chelsea', score: '3-0' }]);
        expect(input.fixture).toMatchObject({ userWasHome: false, userGoals: 1, opponentGoals: 2, result: 'lost' });
        expect(input.table).toEqual({ position: 2, teamCount: 2, points: 7 });
        expect(input.events[0].player).toBe('Salah');
        expect(input.derby?.name).toBe('Northwest Derby');
        expect(input.activePromises[0].id).toBe('p');
        expect(input.recentResults[0]).toMatchObject({ score: '3-0', result: 'won' });
    });
});
