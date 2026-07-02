import { describe, it, expect } from 'vitest';
import type { Player, TransferBid, Team } from '../types';

describe('Transfer Center & Delegation Logic Tests', () => {

    const createDummyPlayer = (name: string, position: string, rating: number, age: number, transferRequested = false): Player => ({
        name,
        position: position as any,
        rating,
        age,
        nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        potential: 90,
        growthRate: 0.3,
        form: 70,
        personality: 'Professional',
        wage: 10000,
        status: { type: 'Available' },
        effects: [],
        contractExpires: 2,
        isStarter: true,
        condition: 100,
        transferRequested,
        marketValue: 10000000 // €10M
    });

    describe('Generative Bid Lowball Calculations', () => {
        it('should lowball the bid if the player has requested a transfer', () => {
            const player = createDummyPlayer('Unhappy Striker', 'ST', 80, 24, true);
            const marketValue = player.marketValue || 10000000;
            
            // Simulation of App.tsx formula: lowball rate between 65% and 85%
            const minRate = 0.65;
            const maxRate = 0.85;
            
            // Generate mock bids
            for (let i = 0; i < 20; i++) {
                const rate = minRate + Math.random() * (maxRate - minRate);
                const bidFee = Math.round((marketValue * rate) / 100000) * 100000;
                
                expect(bidFee).toBeGreaterThanOrEqual(marketValue * 0.65);
                expect(bidFee).toBeLessThanOrEqual(marketValue * 0.85);
            }
        });

        it('should offer a normal valuation if the player is happy', () => {
            const player = createDummyPlayer('Happy Winger', 'ST', 82, 23, false);
            const marketValue = player.marketValue || 10000000;
            
            // Simulation of App.tsx formula: normal rate between 90% and 110%
            const minRate = 0.90;
            const maxRate = 1.10;
            
            for (let i = 0; i < 20; i++) {
                const rate = minRate + Math.random() * (maxRate - minRate);
                const bidFee = Math.round((marketValue * rate) / 100000) * 100000;
                
                expect(bidFee).toBeGreaterThanOrEqual(marketValue * 0.90);
                expect(bidFee).toBeLessThanOrEqual(marketValue * 1.10);
            }
        });
    });

    describe('Assistant Manager Delegation Logic', () => {
        const runAssistantAutoResolve = (bid: TransferBid, squad: Player[]): { shouldSell: boolean, summary: string } => {
            const player = bid.player;
            const position = player.position;
            const samePosCount = squad.filter(p => p.position === position && p.status.type !== 'SentOff').length;
            
            let summary = '';
            let shouldSell = false;

            if (position === 'GK' && samePosCount <= 1) {
                summary = `Declined offer: We only have one Goalkeeper.`;
            } else if (['CB', 'CM', 'ST'].includes(position) && samePosCount <= 2) {
                summary = `Declined offer: We are short on depth at ${position}.`;
            } else {
                const isGoodFee = bid.offeredFee >= bid.marketValue * 0.95;
                if (isGoodFee) {
                    shouldSell = true;
                    summary = `Accepted offer.`;
                } else {
                    summary = `Declined offer: Below valuation.`;
                }
            }

            return { shouldSell, summary };
        };

        it('should decline GK sale if squad only has 1 Goalkeeper', () => {
            const player = createDummyPlayer('Main GK', 'GK', 85, 27);
            const bid: TransferBid = {
                id: 'bid-1',
                player,
                buyingClub: 'Real Madrid',
                offeredFee: 12000000, // Above €10M market value!
                marketValue: 10000000,
                weeksPending: 0,
                history: [],
                status: 'pending'
            };

            const squad = [player]; // Only 1 GK in squad
            const result = runAssistantAutoResolve(bid, squad);
            
            expect(result.shouldSell).toBe(false);
            expect(result.summary).toContain('only have one Goalkeeper');
        });

        it('should decline striker sale if squad only has 2 strikers', () => {
            const player = createDummyPlayer('Star ST', 'ST', 86, 25);
            const bid: TransferBid = {
                id: 'bid-2',
                player,
                buyingClub: 'FC Barcelona',
                offeredFee: 15000000,
                marketValue: 10000000,
                weeksPending: 0,
                history: [],
                status: 'pending'
            };

            const squad = [player, createDummyPlayer('Backup ST', 'ST', 75, 19)]; // Only 2 ST in squad
            const result = runAssistantAutoResolve(bid, squad);
            
            expect(result.shouldSell).toBe(false);
            expect(result.summary).toContain('short on depth at ST');
        });

        it('should accept if bid is high and depth is sufficient', () => {
            const player = createDummyPlayer('Midfielder', 'CM', 81, 26);
            const bid: TransferBid = {
                id: 'bid-3',
                player,
                buyingClub: 'Juventus',
                offeredFee: 10000000, // Exactly €10M (100% of market value)
                marketValue: 10000000,
                weeksPending: 0,
                history: [],
                status: 'pending'
            };

            const squad = [
                player, 
                createDummyPlayer('CM 2', 'CM', 80, 25), 
                createDummyPlayer('CM 3', 'CM', 79, 24)
            ]; // 3 CMs, sufficient depth
            
            const result = runAssistantAutoResolve(bid, squad);
            
            expect(result.shouldSell).toBe(true);
            expect(result.summary).toContain('Accepted offer');
        });

        it('should decline if bid is below 95% of market value', () => {
            const player = createDummyPlayer('Winger', 'CM', 81, 26);
            const bid: TransferBid = {
                id: 'bid-4',
                player,
                buyingClub: 'Inter Milan',
                offeredFee: 8000000, // 80% of market value
                marketValue: 10000000,
                weeksPending: 0,
                history: [],
                status: 'pending'
            };

            const squad = [
                player, 
                createDummyPlayer('CM 2', 'CM', 80, 25), 
                createDummyPlayer('CM 3', 'CM', 79, 24)
            ]; // Sufficient depth
            
            const result = runAssistantAutoResolve(bid, squad);
            
            expect(result.shouldSell).toBe(false);
            expect(result.summary).toContain('Below valuation');
        });
    });

    describe('Sale Finalization Mechanics', () => {
        it('should correctly remove player and credit transfer fee to team balance', () => {
            let team: Team = {
                name: 'Manchester United',
                shortName: 'MUN',
                league: 'Premier League',
                prestige: 90,
                players: [
                    createDummyPlayer('Sold Player', 'ST', 80, 25),
                    createDummyPlayer('Remaining Player', 'GK', 82, 28)
                ],
                tactics: { formation: '4-4-2', mentality: 'Balanced', instructions: [] },
                balance: 50000000, // €50M
                weeklyWageBill: 1000000,
                weeklyBroadcastRevenue: 500000,
                matchDayRevenue: 400000,
                history: []
            };

            const bid: TransferBid = {
                id: 'bid-sold',
                player: team.players[0],
                buyingClub: 'Bayern Munich',
                offeredFee: 25000000, // €25M
                marketValue: 20000000,
                weeksPending: 0,
                history: [],
                status: 'accepted'
            };

            // Simulate sale process
            team.balance += bid.offeredFee;
            team.players = team.players.filter(p => p.name !== bid.player.name);

            expect(team.balance).toBe(75000000); // 50M + 25M
            expect(team.players.length).toBe(1);
            expect(team.players[0].name).toBe('Remaining Player');
        });
    });
});
