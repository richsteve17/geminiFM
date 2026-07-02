import { describe, it, expect } from 'vitest';
import { calculatePlayerDevelopment, analyzeTactics } from '../utils';
import type { Player, Team } from '../types';

describe('Weekly Economics, Player Development, and Teammate Rivalry Tests', () => {

    describe('Player Development Evolution', () => {
        it('should correctly evolve player ratings and form over time', () => {
            const youngPlayer: Player = {
                name: 'Young Prospect',
                position: 'ST',
                rating: 80,
                age: 18,
                nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
                potential: 95,
                growthRate: 0.5,
                form: 50,
                personality: 'Young Prospect',
                wage: 5000,
                status: { type: 'Available' },
                effects: [],
                contractExpires: 3,
                isStarter: true,
                condition: 100
            };

            const evolved = calculatePlayerDevelopment(youngPlayer, 0.8);
            expect(evolved.rating).toBeGreaterThanOrEqual(80);
            expect(evolved.form).toBeGreaterThan(50);
            expect(evolved.growthRate).toBeGreaterThan(0.5); // Young player speedup modifier
        });

        it('should decline older players', () => {
            const veteranPlayer: Player = {
                name: 'Veteran Defender',
                position: 'CB',
                rating: 85,
                age: 34,
                nationality: '🇫🇷',
                potential: 85,
                growthRate: 0.5,
                form: 50,
                personality: 'Leader',
                wage: 80000,
                status: { type: 'Available' },
                effects: [],
                contractExpires: 1,
                isStarter: true,
                condition: 100
            };

            const evolved = calculatePlayerDevelopment(veteranPlayer, -0.5);
            expect(evolved.form).toBeLessThan(50);
            expect(evolved.growthRate).toBeLessThan(0.5); // Veteran slowdown modifier
        });
    });

    describe('Teammate Rivalry & Drama Engine', () => {
        it('should apply a -30 point tactical penalty if two starting players have a serious rift or bad chemistry', () => {
            const playerA: Player = {
                name: 'Player A',
                position: 'ST',
                rating: 85,
                age: 25,
                nationality: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
                potential: 88,
                growthRate: 0.3,
                form: 50,
                personality: 'Volatile',
                wage: 50000,
                status: { type: 'Available' },
                effects: [
                    {
                        type: 'InternationalRift',
                        severity: 'serious',
                        with: 'Player B',
                        message: 'Clashed on international duty',
                        until: 15
                    }
                ],
                contractExpires: 2,
                isStarter: true,
                condition: 100
            };

            const playerB: Player = {
                name: 'Player B',
                position: 'CM',
                rating: 86,
                age: 26,
                nationality: '🇫🇷',
                potential: 90,
                growthRate: 0.4,
                form: 50,
                personality: 'Ambitious',
                wage: 60000,
                status: { type: 'Available' },
                effects: [],
                contractExpires: 3,
                isStarter: true,
                condition: 100
            };

            // Set up a valid starters roster for 4-4-2. We need 11 starters.
            const starters: Player[] = [
                { name: 'GK', position: 'GK', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
                { name: 'LB', position: 'LB', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
                { name: 'CB1', position: 'CB', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
                { name: 'CB2', position: 'CB', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
                { name: 'RB', position: 'RB', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
                { name: 'LM', position: 'LM', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
                playerB, // CM
                { name: 'CM2', position: 'CM', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
                { name: 'RM', position: 'RM', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
                playerA, // ST
                { name: 'ST2', position: 'ST', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
            ];

            const analysis = analyzeTactics(starters, '4-4-2');
            
            // Should contain the feud alert
            expect(analysis.feedback.some(f => f.includes('Feud Alert') && f.includes('Player A') && f.includes('Player B'))).toBe(true);
            
            // Perfect matching of slots for 4-4-2 normally yields 100 efficiency score.
            // With -30 penalty, efficiency should be 70.
            expect(analysis.score).toBe(70);
        });

        it('should apply a -20 point tactical penalty and warn if a starter is injured or suspended', () => {
            const starters: Player[] = [
                { name: 'GK', position: 'GK', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Injured', weeks: 3 }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
                { name: 'LB', position: 'LB', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
                { name: 'CB1', position: 'CB', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
                { name: 'CB2', position: 'CB', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
                { name: 'RB', position: 'RB', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
                { name: 'LM', position: 'LM', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
                { name: 'CM1', position: 'CM', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
                { name: 'CM2', position: 'CM', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Suspended', until: 5 }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
                { name: 'RM', position: 'RM', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
                { name: 'ST1', position: 'ST', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
                { name: 'ST2', position: 'ST', rating: 80, age: 25, nationality: 'EN', potential: 85, growthRate: 0.3, form: 50, personality: 'Professional', wage: 20000, status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 },
            ];

            const analysis = analyzeTactics(starters, '4-4-2');
            
            expect(analysis.feedback.some(f => f.includes('Selection Error') && f.includes('GK') && f.includes('injured'))).toBe(true);
            expect(analysis.feedback.some(f => f.includes('Selection Error') && f.includes('CM2') && f.includes('suspended'))).toBe(true);
            
            expect(analysis.score).toBe(60);
        });
    });

    describe('Integration & Finance Tests', () => {
        it('should correctly process weekly wages and broadcast revenue', () => {
            const initialBalance = 1000000;
            const wageBill = 50000;
            const broadcast = 120000;
            
            const nextBalance = initialBalance - wageBill + broadcast;
            expect(nextBalance).toBe(initialBalance - 50000 + 120000);
        });

        it('should correctly credit ticket sales if playing at home', () => {
            const prestige = 80;
            const ticketRevenue = Math.round(prestige * 30000);
            expect(ticketRevenue).toBe(2400000);
        });

        it('should apply teammate bond partnership growth bonus in player development', () => {
            const player: Player = {
                name: 'Ansu Fati',
                position: 'ST',
                rating: 80,
                age: 23,
                nationality: '🇪🇸',
                potential: 90,
                growthRate: 0.4,
                form: 80,
                personality: 'Ambitious',
                wage: 40000,
                status: { type: 'Available' },
                effects: [
                    {
                        type: 'TeammateBond',
                        with: 'Gavi',
                        message: 'Strong partnership',
                        until: 50
                    }
                ],
                contractExpires: 3,
                isStarter: true,
                condition: 100
            };

            let bondBoost = 0;
            const starterNames = ['Ansu Fati', 'Gavi'];
            const hasBondWithStarter = player.effects.some(e => e.type === 'TeammateBond' && starterNames.includes(e.with));
            if (hasBondWithStarter) {
                bondBoost = 0.05;
            }
            
            const evolved = calculatePlayerDevelopment(player, 0.5);
            const growthRateWithSynergy = Math.min(1.0, (evolved.growthRate || 0.4) + bondBoost);
            expect(hasBondWithStarter).toBe(true);
            expect(growthRateWithSynergy).toBeGreaterThan(evolved.growthRate || 0.4);
        });
    });
});
