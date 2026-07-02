import { describe, it, expect } from 'vitest';
import type { Player, Team } from '../types';

describe('Infinite Career Progression & Season Transitions', () => {

    const createDummyPlayer = (name: string, age: number, contractExpires: number): Player => ({
        name,
        position: 'ST',
        rating: 80,
        age,
        nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
        potential: 85,
        growthRate: 0.3,
        form: 60,
        personality: 'Professional',
        wage: 15000,
        status: { type: 'Available' },
        effects: [],
        contractExpires,
        isStarter: true,
        condition: 100
    });

    describe('Player Aging & Contract Decay', () => {
        it('should increment player age and decrement contract years at end of season', () => {
            let players: Player[] = [
                createDummyPlayer('Young ST', 20, 3),
                createDummyPlayer('Star Mid', 25, 5)
            ];

            // Simulate end of season updates
            players = players.map(p => {
                const remainingContracts = p.contractExpires - 1;
                p.contractExpires = remainingContracts;
                p.age = p.age + 1;
                return p;
            });

            expect(players[0].age).toBe(21);
            expect(players[0].contractExpires).toBe(2);

            expect(players[1].age).toBe(26);
            expect(players[1].contractExpires).toBe(4);
        });

        it('should release player on free transfer if contract expires (reaches 0)', () => {
            let players: Player[] = [
                createDummyPlayer('Leaving ST', 28, 1),
                createDummyPlayer('Staying GK', 24, 2)
            ];

            const departures: string[] = [];

            // Filter out players whose contracts reach 0
            players = players.filter(p => {
                const remainingContracts = p.contractExpires - 1;
                if (remainingContracts <= 0) {
                    departures.push(`Free Agent: ${p.name} leaves.`);
                    return false;
                }
                p.contractExpires = remainingContracts;
                p.age = p.age + 1;
                return true;
            });

            expect(players.length).toBe(1);
            expect(players[0].name).toBe('Staying GK');
            expect(players[0].contractExpires).toBe(1);
            expect(departures.length).toBe(1);
            expect(departures[0]).toContain('Free Agent: Leaving ST leaves');
        });

        it('should archive current season stats to history before clearing them at end of season', () => {
            const player = createDummyPlayer('Star Striker', 25, 3);
            player.stats = {
                appearances: 35,
                goals: 28,
                assists: 10,
                cleanSheets: 0,
                yellowCards: 2,
                redCards: 0,
                averageRating: 7.85,
                ratingSum: 274.75
            };

            const currentYear = 1;
            const teamName = 'Liverpool';

            const history = player.history ? [...player.history] : [];
            if (player.stats && player.stats.appearances > 0) {
                history.push({
                    year: currentYear,
                    teamName: teamName,
                    appearances: player.stats.appearances,
                    goals: player.stats.goals,
                    cleanSheets: player.stats.cleanSheets,
                    averageRating: player.stats.averageRating
                });
                player.history = history;
            }
            player.stats = undefined;

            expect(player.stats).toBeUndefined();
            expect(player.history).toBeDefined();
            expect(player.history!.length).toBe(1);
            expect(player.history![0]).toEqual({
                year: 1,
                teamName: 'Liverpool',
                appearances: 35,
                goals: 28,
                cleanSheets: 0,
                averageRating: 7.85
            });
        });
    });

    describe('Player Retirement Calculations', () => {
        it('should retire veteran players based on realistic age odds', () => {
            const players: Player[] = [
                createDummyPlayer('Veteran 35', 34, 2), // Will turn 35
                createDummyPlayer('Veteran 38', 37, 2)  // Will turn 38
            ];

            const runRetirementCheck = (p: Player, randomVal: number): boolean => {
                p.age = p.age + 1;
                if (p.age >= 35) {
                    const retireChance = p.age === 35 ? 0.20 : p.age === 36 ? 0.40 : p.age === 37 ? 0.60 : 0.80;
                    if (randomVal < retireChance) {
                        return false; // Retired
                    }
                }
                return true;
            };

            // Test 35 y/o with random check: 0.10 (should retire) and 0.30 (should stay)
            const p35Retires = runRetirementCheck({ ...players[0] }, 0.10);
            const p35Stays = runRetirementCheck({ ...players[0] }, 0.30);
            expect(p35Retires).toBe(false);
            expect(p35Stays).toBe(true);

            // Test 38 y/o with random check: 0.70 (should retire) and 0.90 (should stay)
            const p38Retires = runRetirementCheck({ ...players[1] }, 0.70);
            const p38Stays = runRetirementCheck({ ...players[1] }, 0.90);
            expect(p38Retires).toBe(false);
            expect(p38Stays).toBe(true);
        });
    });

    describe('Infinite Cycle Modulo Checks', () => {
        it('should correctly schedule Euros every 4 years starting Year 2', () => {
            const isEurosYear = (year: number) => year % 4 === 2;

            expect(isEurosYear(2)).toBe(true);
            expect(isEurosYear(6)).toBe(true);
            expect(isEurosYear(10)).toBe(true);
            expect(isEurosYear(14)).toBe(true);

            expect(isEurosYear(1)).toBe(false);
            expect(isEurosYear(3)).toBe(false);
            expect(isEurosYear(4)).toBe(false);
            expect(isEurosYear(5)).toBe(false);
        });

        it('should correctly schedule World Cup every 4 years starting Year 5', () => {
            const isWorldCupYear = (year: number) => year % 4 === 1 && year > 1;

            expect(isWorldCupYear(5)).toBe(true);
            expect(isWorldCupYear(9)).toBe(true);
            expect(isWorldCupYear(13)).toBe(true);
            expect(isWorldCupYear(17)).toBe(true);

            expect(isWorldCupYear(1)).toBe(false); // Year 1 is tutorial World Cup (run separately, not in background)
            expect(isWorldCupYear(2)).toBe(false);
            expect(isWorldCupYear(6)).toBe(false);
        });
    });

    describe('Live In-Match Fatigue & Subs Decay Logic', () => {
        it('should decay starters condition dynamically based on stamina rating', () => {
            const p = createDummyPlayer('Star Mid', 25, 3);
            p.condition = 100;
            p.stamina = 80;
            p.isStarter = true;

            const staminaVal = p.stamina;
            const decayRate = (100 - staminaVal) * 0.005 + 0.12; // (20 * 0.005) + 0.12 = 0.22

            // Simulate 45 minutes of play
            for (let min = 1; min <= 45; min++) {
                if (p.isStarter) {
                    p.condition = Math.max(30, Math.round((p.condition - decayRate) * 100) / 100);
                }
            }

            // 100 - (45 * 0.22) = 90.1
            expect(p.condition).toBe(90.1);
        });

        it('should cease condition decay for subbed-out players and begin it for subbed-in players with custom stamina', () => {
            const starter = createDummyPlayer('Tired ST', 27, 3);
            starter.condition = 85;
            starter.stamina = 90; // high stamina
            starter.isStarter = true;

            const benchPlayer = createDummyPlayer('Fresh ST', 20, 4);
            benchPlayer.condition = 100;
            benchPlayer.stamina = 70; // lower stamina
            benchPlayer.isStarter = false;

            // Make substitution: swap starter status
            starter.isStarter = false;
            benchPlayer.isStarter = true;

            // Simulate next 15 minutes of play
            for (let min = 1; min <= 15; min++) {
                if (starter.isStarter) {
                    const dec = (100 - (starter.stamina || 75)) * 0.005 + 0.12;
                    starter.condition = Math.max(30, Math.round((starter.condition - dec) * 100) / 100);
                }
                if (benchPlayer.isStarter) {
                    const dec = (100 - (benchPlayer.stamina || 75)) * 0.005 + 0.12;
                    benchPlayer.condition = Math.max(30, Math.round((benchPlayer.condition - dec) * 100) / 100);
                }
            }

            // Tired ST stays at 85%
            expect(starter.condition).toBe(85);
            // Fresh ST has stamina 70 => decayRate = 30 * 0.005 + 0.12 = 0.27
            // 100 - (15 * 0.27) = 100 - 4.05 = 95.95
            expect(benchPlayer.condition).toBe(95.95);
        });
    });
});
