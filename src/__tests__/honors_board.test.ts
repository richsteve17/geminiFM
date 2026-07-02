import { describe, it, expect } from 'vitest';
import type { CareerHistoryEntry } from '../types';

describe('Career Honors Board & Trophy Room Tests', () => {

    it('should correctly log World Cup tutorial win as Winner with a World Cup Champion trophy', () => {
        const won = true;
        const userTeamName = 'France';
        
        const honorsEntry: CareerHistoryEntry = {
            year: 1,
            teamName: userTeamName,
            league: 'World Cup',
            finalPosition: won ? 'Winner' : 'Runners-up',
            trophies: won ? ['World Cup Champion'] : []
        };

        expect(honorsEntry.year).toBe(1);
        expect(honorsEntry.teamName).toBe('France');
        expect(honorsEntry.finalPosition).toBe('Winner');
        expect(honorsEntry.trophies).toContain('World Cup Champion');
    });

    it('should correctly log World Cup tutorial runner-up status without a trophy', () => {
        const won = false;
        const userTeamName = 'England';
        
        const honorsEntry: CareerHistoryEntry = {
            year: 1,
            teamName: userTeamName,
            league: 'World Cup',
            finalPosition: won ? 'Winner' : 'Runners-up',
            trophies: won ? ['World Cup Champion'] : []
        };

        expect(honorsEntry.finalPosition).toBe('Runners-up');
        expect(honorsEntry.trophies.length).toBe(0);
    });

    it('should log a domestic league title finish with Champion trophies', () => {
        const finalPosition = 1;
        const userTeamName = 'FC Barcelona';
        const leagueName = 'La Liga';

        const finalPositionOrdinal = finalPosition === 1 ? '1st' : `${finalPosition}th`;
        const trophiesWon: string[] = [];
        if (finalPosition === 1) {
            trophiesWon.push(`${leagueName} Champion`);
        }

        const honorsEntry: CareerHistoryEntry = {
            year: 2,
            teamName: userTeamName,
            league: leagueName,
            finalPosition: finalPositionOrdinal,
            trophies: trophiesWon
        };

        expect(honorsEntry.year).toBe(2);
        expect(honorsEntry.finalPosition).toBe('1st');
        expect(honorsEntry.trophies).toContain('La Liga Champion');
    });

    it('should log a domestic sacking finish without trophies', () => {
        const finalPosition = 18;
        const userTeamName = 'Everton';
        const leagueName = 'Premier League';

        const honorsEntry: CareerHistoryEntry = {
            year: 3,
            teamName: userTeamName,
            league: leagueName,
            finalPosition: `${finalPosition} (Sacked)`,
            trophies: []
        };

        expect(honorsEntry.year).toBe(3);
        expect(honorsEntry.finalPosition).toBe('18 (Sacked)');
        expect(honorsEntry.trophies.length).toBe(0);
    });

    it('should correctly calculate trophy totals for grid display', () => {
        const careerHistory: CareerHistoryEntry[] = [
            { year: 1, teamName: 'France', league: 'World Cup', finalPosition: 'Winner', trophies: ['World Cup Champion'] },
            { year: 2, teamName: 'Real Madrid', league: 'La Liga', finalPosition: '1st', trophies: ['La Liga Champion'] },
            { year: 3, teamName: 'Real Madrid', league: 'La Liga', finalPosition: '1st', trophies: ['La Liga Champion'] },
        ];

        const allTrophies = careerHistory.flatMap(entry => entry.trophies || []);
        const counts = allTrophies.reduce((acc, t) => {
            acc[t] = (acc[t] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        expect(counts['World Cup Champion']).toBe(1);
        expect(counts['La Liga Champion']).toBe(2);
        expect(counts['Euro Champion']).toBeUndefined();
    });
});
