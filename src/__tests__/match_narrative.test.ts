import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyMatchNarrative, directMatchNarrative } from '../services/matchNarrative';
import type { MatchSegment } from '../engine/matchEngine';
import type { MatchState, Team } from '../types';
const segment: MatchSegment = { homeScoreAdded: 1, awayScoreAdded: 0, momentum: 3, tacticalAnalysis: 'home pressure', events: [{ id: 1, minute: 7, type: 'goal', teamName: 'Liverpool', player: 'Salah', description: 'Goal', scoreAfter: '1-0', pitchX: 89, pitchY: 50 }] };
const team = (name: string): Team => ({ name, tactic: { formation: '4-4-2', mentality: 'Balanced' }, players: [], activePromises: [], league: 'Premier League', balance: 0, objectives: [], chairmanPersonality: 'Traditionalist', prestige: 80 });
const state: MatchState = { currentMinute: 0, homeScore: 0, awayScore: 0, events: [], isFinished: false, subsUsed: { home: 0, away: 0 }, momentum: 0, tacticalAnalysis: '' };
afterEach(() => vi.unstubAllGlobals());
describe('AI match director regression', () => {
    it('actually calls the server gateway and applies its event descriptions', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ text: JSON.stringify({ tacticalAnalysis: 'Liverpool found space behind the high line.', events: [{ id: 1, description: 'Salah finishes the Liverpool counterattack.' }] }) }) });
        vi.stubGlobal('fetch', fetchMock);
        const result = await directMatchNarrative(team('Liverpool'), team('Chelsea'), state, segment, { userTeamName: 'Liverpool' });
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(JSON.parse(fetchMock.mock.calls[0][1].body).contents).toContain('startingScore');
        expect(result.presentation?.mode).toBe('ai');
        expect(result.events[0].description).toContain('counterattack');
    });
    it('ignores provider attempts to alter scores, minutes, players, or spatial data', () => {
        const result = applyMatchNarrative(segment, { events: [{ id: 1, description: 'Salah finishes the Liverpool counterattack.', minute: 80, player: 'Invented', type: 'card' }] } as never);
        expect(result.homeScoreAdded).toBe(1);
        expect(result.events[0]).toMatchObject({ minute: 7, player: 'Salah', type: 'goal', pitchX: 89 });
    });
    it('does not claim AI is working after provider failure', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
        const result = await directMatchNarrative(team('Liverpool'), team('Chelsea'), state, segment, { userTeamName: 'Liverpool' });
        expect(result.presentation?.mode).toBe('local');
        expect(result.presentation?.reason).toContain('unavailable');
        expect(result.events).toEqual(segment.events);
    });
});
