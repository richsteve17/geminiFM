import { describe, expect, it } from 'vitest';
import type { MatchState, Player, Team } from '../types';
import { simulateDeterministicQuickMatch, simulateDeterministicSegment, simulateDeterministicShootout } from '../engine/matchEngine';

const player = (name: string, position: Player['position'], rating: number): Player => ({
    name,
    position,
    rating,
    age: 25,
    nationality: 'ENG',
    potential: 88,
    growthRate: 1,
    form: 2,
    personality: 'Professional',
    wage: 50_000,
    status: { type: 'Available' },
    effects: [],
    contractExpires: 3,
    isStarter: true,
    condition: 100,
});

const team = (name: string, rating: number): Team => ({
    name,
    league: 'Premier League',
    players: [
        player(`${name} GK`, 'GK', rating - 2),
        player(`${name} LB`, 'LB', rating - 1),
        player(`${name} CB1`, 'CB', rating),
        player(`${name} CB2`, 'CB', rating),
        player(`${name} RB`, 'RB', rating - 1),
        player(`${name} DM`, 'DM', rating),
        player(`${name} CM1`, 'CM', rating + 1),
        player(`${name} CM2`, 'CM', rating + 1),
        player(`${name} LW`, 'LW', rating + 2),
        player(`${name} ST`, 'ST', rating + 3),
        player(`${name} RW`, 'RW', rating + 2),
    ],
    tactic: { formation: '4-3-3', mentality: 'Balanced' },
    prestige: rating,
    chairmanPersonality: 'Traditionalist',
    balance: 10_000_000,
    weeklyWageBill: 550_000,
    matchDayRevenue: 1_000_000,
    transferBudget: 20_000_000,
    objectives: [],
    activePromises: [],
    weeklyBroadcastRevenue: 800_000,
});

const state: MatchState = {
    currentMinute: 0,
    homeScore: 0,
    awayScore: 0,
    events: [],
    isFinished: false,
    subsUsed: { home: 0, away: 0 },
    momentum: 0,
    tacticalAnalysis: 'Kick off.',
    simulationSeed: 724_101,
};

describe('deterministic match engine', () => {
    it('returns identical ledger output for the same career snapshot', () => {
        const home = team('Northbridge FC', 82);
        const away = team('Southbank United', 79);
        const first = simulateDeterministicSegment(home, away, state, 15, { userTeamName: home.name });
        const second = simulateDeterministicSegment(home, away, state, 15, { userTeamName: home.name });
        expect(second).toEqual(first);
    });

    it('keeps goal events and score deltas internally consistent', () => {
        const home = team('Northbridge FC', 82);
        const away = team('Southbank United', 79);
        const result = simulateDeterministicSegment(home, away, state, 45, { userTeamName: home.name });
        const homeGoals = result.events.filter(event => event.type === 'goal' && event.teamName === home.name).length;
        const awayGoals = result.events.filter(event => event.type === 'goal' && event.teamName === away.name).length;
        expect(result.homeScoreAdded).toBe(homeGoals);
        expect(result.awayScoreAdded).toBe(awayGoals);
        expect(result.events.map(event => event.id).length).toBe(new Set(result.events.map(event => event.id)).size);
        expect(result.events.filter(event => event.type !== 'whistle').every(event => event.pitchX !== undefined && event.pitchY !== undefined)).toBe(true);
    });

    it('resolves background fixtures and shootouts deterministically from a fixture key', () => {
        const home = team('Northbridge FC', 82);
        const away = team('Southbank United', 79);
        expect(simulateDeterministicQuickMatch(home, away, 'fixture-12')).toEqual(simulateDeterministicQuickMatch(home, away, 'fixture-12'));
        const shootout = simulateDeterministicShootout(home, away, 'fixture-12');
        expect(shootout.homePenalties).not.toBe(shootout.awayPenalties);
        expect(simulateDeterministicShootout(home, away, 'fixture-12')).toEqual(shootout);
    });
});
