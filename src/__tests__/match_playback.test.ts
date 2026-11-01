import { describe, expect, it } from 'vitest';
import type { Fixture, MatchState, Team } from '../types';
import { applyLiveFatigue, nextMatchBoundary, revealMatchMinute } from '../engine/matchPlayback';
import { formationPoints, highlightPath, pointOnPath } from '../engine/matchBroadcast';
import { getRivalry } from '../engine/footballCulture';
const state: MatchState = { currentMinute: 0, homeScore: 0, awayScore: 0, events: [], isFinished: false, subsUsed: { home: 0, away: 0 }, momentum: 0, tacticalAnalysis: '' };
const fixture: Fixture = { id: 'f1', week: 1, league: 'Premier League', homeTeam: 'Liverpool', awayTeam: 'Chelsea', played: false };
describe('live playback regressions', () => {
    it('does not leak the next chunk score before the goal minute and reveals each goal once', () => {
        const pending = [{ id: 123, minute: 7, type: 'goal' as const, teamName: 'Liverpool', description: 'Goal', scoreAfter: '1-0', momentumAfter: 3 }];
        const before = revealMatchMinute(state, pending, 6, 'Liverpool', 'Chelsea');
        expect(before.homeScore).toBe(0);
        const scored = revealMatchMinute(before, pending, 7, 'Liverpool', 'Chelsea');
        expect(scored.homeScore).toBe(1);
        expect(revealMatchMinute(scored, pending, 7, 'Liverpool', 'Chelsea').homeScore).toBe(1);
        expect(scored.events).toHaveLength(1);
    });
    it('resumes halftime by generating minute46 rather than setting an empty target46 queue', () => {
        const half = { ...state, currentMinute: 45 };
        expect(nextMatchBoundary(half, fixture, false).kind).toBe('half-time');
        expect(nextMatchBoundary(half, fixture, true)).toEqual({ kind: 'simulate', target: 55 });
    });
    it('actually generates extra time and then resolves a tied knockout shootout', () => {
        const ko = { ...fixture, isKnockout: true };
        expect(nextMatchBoundary({ ...state, currentMinute: 90 }, ko, true)).toEqual({ kind: 'simulate', target: 100 });
        expect(nextMatchBoundary({ ...state, currentMinute: 100 }, ko, true)).toEqual({ kind: 'simulate', target: 105 });
        expect(nextMatchBoundary({ ...state, currentMinute: 105 }, ko, false).kind).toBe('half-time');
        expect(nextMatchBoundary({ ...state, currentMinute: 105 }, ko, true)).toEqual({ kind: 'simulate', target: 115 });
        expect(nextMatchBoundary({ ...state, currentMinute: 120 }, ko, true)).toEqual({ kind: 'finish', shootout: true });
        expect(nextMatchBoundary({ ...state, currentMinute: 90, homeScore: 1 }, ko, true).kind).toBe('finish');
    });
    it('does not tire unrelated clubs or mutate the source team while watching one fixture', () => {
        const makeTeam = (name: string) => ({ name, tactic: { formation: '4-4-2', mentality: 'Balanced' }, players: [{ name: 'player', isStarter: true, condition: 100, status: { type: 'Available' } }] } as Team);
        const teams = { Liverpool: makeTeam('Liverpool'), Chelsea: makeTeam('Chelsea'), Arsenal: makeTeam('Arsenal') };
        const result = applyLiveFatigue(teams, 'Liverpool', 'Chelsea');
        expect(result.Arsenal).toBe(teams.Arsenal);
        expect(result.Liverpool.players[0].condition).toBeLessThan(100);
        expect(teams.Liverpool.players[0].condition).toBe(100);
    });
    it('renders a real goal path to the correct net and changes shape with formation', () => {
        const path = highlightPath({ id: 1, minute: 1, type: 'goal', teamName: 'Chelsea', pitchX: 12, pitchY: 48, description: 'goal' }, 'Liverpool');
        expect(pointOnPath(path, 1)).toEqual({ x: 0, y: 50 });
        expect(formationPoints('4-4-2')).not.toEqual(formationPoints('5-3-2'));
        expect(formationPoints('4-4-2', true)[0].x).toBe(95);
    });
    it('uses the supplied derby matrix in either direction without treating every fixture as a derby', () => {
        expect(getRivalry('Liverpool', 'Manchester United')?.cardMultiplier).toBe(1.6);
        expect(getRivalry('FC Barcelona', 'Real Madrid')?.name).toBe('El Clásico');
        expect(getRivalry('Liverpool', 'Chelsea')).toBeNull();
    });
});
