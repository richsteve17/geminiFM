import { describe, expect, it } from 'vitest';
import type { ContractTerms, Player, PlayerStats, Team } from '../types';
import {
    getFreeAgentEligibility,
    isFreeAgent,
    mergeFreeAgentsIntoMarket,
    signFreeAgent,
    toFreeAgent,
} from '../engine/freeAgency';

const terms: ContractTerms = {
    wage: 20_000,
    length: 3,
    signingBonus: 25_000,
    performanceBonus: 2_000,
    bonusType: 'appearance',
};

const makePlayer = (overrides: Partial<Player> = {}): Player => ({
    name: 'A. Unattached',
    position: 'ST',
    rating: 78,
    age: 25,
    nationality: '🏴',
    personality: 'Professional',
    wage: 15_000,
    status: { type: 'Available' },
    effects: [],
    contractExpires: 0,
    isStarter: false,
    condition: 100,
    currentClub: 'Free Agent',
    ...overrides,
});

const makeTeam = (overrides: Partial<Team> = {}): Team => ({
    name: 'Test FC',
    league: 'Premier League',
    players: [makePlayer({ name: 'Existing Player', currentClub: 'Test FC', wage: 10_000 })],
    tactic: { formation: '4-3-3', mentality: 'Balanced' },
    prestige: 70,
    chairmanPersonality: 'Traditionalist',
    balance: 2_000_000,
    weeklyWageBill: 10_000,
    transferBudget: 500_000,
    objectives: [],
    activePromises: [],
    ...overrides,
});

describe('free-agency state transition', () => {
    it('keeps an unattached player eligible when the transfer window is closed and charges no selling-club fee', () => {
        const player = makePlayer({ currentClub: '  Free Agent  ' });
        const team = makeTeam();
        const agreedTerms = { ...terms, length: 4, role: 'key-player' as const };
        const eligibility = getFreeAgentEligibility({
            player,
            squadPlayers: team.players,
            transferWindowOpen: false,
        });

        expect(isFreeAgent(player)).toBe(true);
        expect(eligibility.eligible).toBe(true);
        expect(eligibility.allowedOutsideTransferWindow).toBe(true);

        const result = signFreeAgent({
            team,
            market: [player],
            player,
            terms: agreedTerms,
            negotiationAccepted: true,
            weeklyWageBudget: 100_000,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.costs.sellingClubFee).toBe(0);
        expect(result.team.balance).toBe(team.balance - agreedTerms.signingBonus);
        expect(result.team.transferBudget).toBe(team.transferBudget! - agreedTerms.signingBonus);
        expect(result.acceptedTerms).toMatchObject({ length: 4, role: 'key-player' });
        expect(result.player).toMatchObject({ contractExpires: 4, freeAgencyRole: 'key-player', isStarter: false });
    });

    it('rejects accepted terms the club cannot fund as a signing bonus or weekly wage', () => {
        const player = makePlayer();

        const signOnFailure = signFreeAgent({
            team: makeTeam({ balance: 10_000, transferBudget: 50_000 }),
            market: [player],
            player,
            terms,
            negotiationAccepted: true,
            weeklyWageBudget: 100_000,
        });
        expect(signOnFailure).toMatchObject({ ok: false, reason: 'insufficient-signing-budget' });

        const wageFailure = signFreeAgent({
            team: makeTeam(),
            market: [player],
            player,
            terms,
            negotiationAccepted: true,
            weeklyWageBudget: 25_000,
        });
        expect(wageFailure).toMatchObject({ ok: false, reason: 'insufficient-wage-budget' });
    });

    it('does not commit a rejected negotiation or exceed the squad cap', () => {
        const player = makePlayer();
        const team = makeTeam();
        const rejected = signFreeAgent({
            team,
            market: [player],
            player,
            terms,
            negotiationAccepted: false,
            weeklyWageBudget: 100_000,
        });
        expect(rejected).toMatchObject({ ok: false, reason: 'terms-not-accepted' });

        const squadFull = getFreeAgentEligibility({
            player,
            squadPlayers: team.players,
            transferWindowOpen: false,
            maxSquadSize: 1,
        });
        expect(squadFull).toMatchObject({ eligible: false, reason: 'squad-full' });
    });

    it('returns actual released players to the free-agent market once without inventing replacements', () => {
        const released = toFreeAgent(makePlayer({ currentClub: 'Test FC', contractExpires: 0, isStarter: true }));
        const firstMarket = mergeFreeAgentsIntoMarket([], [released]);
        const secondMarket = mergeFreeAgentsIntoMarket(firstMarket, [released]);

        expect(firstMarket).toHaveLength(1);
        expect(firstMarket[0]).toMatchObject({
            name: released.name,
            currentClub: 'Free Agent',
            contractExpires: 0,
            isStarter: false,
        });
        expect(secondMarket).toHaveLength(1);
    });

    it('enforces an accepted contract only once and removes the signed player from the market', () => {
        const player = makePlayer();
        const team = makeTeam();
        const first = signFreeAgent({
            team,
            market: [player],
            player,
            terms,
            negotiationAccepted: true,
            weeklyWageBudget: 100_000,
        });

        expect(first.ok).toBe(true);
        if (!first.ok) return;
        expect(first.market).toEqual([]);
        expect(first.team.players).toHaveLength(team.players.length + 1);
        expect(first.team.players.at(-1)).toMatchObject({
            name: player.name,
            currentClub: team.name,
            wage: terms.wage,
            contractExpires: terms.length,
            isStarter: false,
            contractIncentives: {
                performanceBonus: terms.performanceBonus,
                bonusType: terms.bonusType,
            },
        });
        expect(first.team.weeklyWageBill).toBe(30_000);

        const duplicate = signFreeAgent({
            team: first.team,
            market: first.market,
            player,
            terms,
            negotiationAccepted: true,
            weeklyWageBudget: 100_000,
        });
        expect(duplicate).toMatchObject({ ok: false, reason: 'player-already-signed' });
    });

    it('normalizes missing and malformed seasonal statistics before a free agent joins the squad', () => {
        const malformedStats = {
            appearances: 2.8,
            goals: -3,
            assists: Number.NaN,
            cleanSheets: 1.9,
            yellowCards: Number.POSITIVE_INFINITY,
            redCards: -1,
            averageRating: 7.555,
            ratingSum: Number.NaN,
        } as PlayerStats;
        const player = makePlayer({ stats: malformedStats });
        const result = signFreeAgent({
            team: makeTeam(),
            market: [player],
            player,
            terms,
            negotiationAccepted: true,
            weeklyWageBudget: 100_000,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.team.players.at(-1)?.stats).toEqual({
            appearances: 2,
            goals: 0,
            assists: 0,
            cleanSheets: 1,
            yellowCards: 0,
            redCards: 0,
            averageRating: 7.56,
            ratingSum: 15.11,
        });
    });
});
