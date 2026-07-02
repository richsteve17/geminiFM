import { describe, it, expect } from 'vitest';
import { 
    generateEurosStructure, 
    generateExpandedWorldCupStructure, 
    getGroupStandings, 
    extractAdvancingTeams, 
    generateSeededKnockoutRound, 
    simulateKnockoutQuickMatch,
    EXTRA_EUROPEAN_TEAMS,
    EXTRA_GLOBAL_TEAMS
} from '../international';
import type { LeagueTableEntry } from '../types';

describe('Tournament & Match Engine Extensions Tests', () => {
    
    describe('UEFA Euros Tournament Structure', () => {
        it('should generate 24 national teams in groups A-F', () => {
            const structure = generateEurosStructure();
            const teams = Object.values(structure);
            
            expect(teams.length).toBe(24);
            
            const groups = new Set<string>();
            teams.forEach(team => {
                expect(team.group).toBeDefined();
                expect(['A', 'B', 'C', 'D', 'E', 'F']).toContain(team.group);
                groups.add(team.group!);
            });
            
            expect(groups.size).toBe(6);
            
            // Check that each group has exactly 4 teams
            groups.forEach(g => {
                const groupTeams = teams.filter(t => t.group === g);
                expect(groupTeams.length).toBe(4);
            });
        });
    });

    describe('World Cup 64-Team Expansion Structure', () => {
        it('should generate 64 national teams in groups A-P', () => {
            const structure = generateExpandedWorldCupStructure();
            const teams = Object.values(structure);
            
            expect(teams.length).toBe(64);
            
            const groups = new Set<string>();
            teams.forEach(team => {
                expect(team.group).toBeDefined();
                expect(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P']).toContain(team.group);
                groups.add(team.group!);
            });
            
            expect(groups.size).toBe(16);
            
            // Check that each group has exactly 4 teams
            groups.forEach(g => {
                const groupTeams = teams.filter(t => t.group === g);
                expect(groupTeams.length).toBe(4);
            });
        });
    });

    describe('Group Standings & Advancement Helpers', () => {
        const dummyTable: LeagueTableEntry[] = [
            // Group A
            { teamName: 'Germany', league: 'International', played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 6, goalsAgainst: 1, goalDifference: 5, points: 9, group: 'A' },
            { teamName: 'Switzerland', league: 'International', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 3, goalsAgainst: 3, goalDifference: 0, points: 4, group: 'A' },
            { teamName: 'Hungary', league: 'International', played: 3, won: 1, drawn: 0, lost: 2, goalsFor: 2, goalsAgainst: 4, goalDifference: -2, points: 3, group: 'A' },
            { teamName: 'Scotland', league: 'International', played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 1, goalsAgainst: 4, goalDifference: -3, points: 1, group: 'A' },
            
            // Group B
            { teamName: 'Spain', league: 'International', played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 5, goalsAgainst: 0, goalDifference: 5, points: 7, group: 'B' },
            { teamName: 'Italy', league: 'International', played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 3, goalsAgainst: 3, goalDifference: 0, points: 4, group: 'B' },
            { teamName: 'Croatia', league: 'International', played: 3, won: 0, drawn: 2, lost: 1, goalsFor: 3, goalsAgainst: 5, goalDifference: -2, points: 2, group: 'B' },
            { teamName: 'Albania', league: 'International', played: 3, won: 0, drawn: 1, lost: 2, goalsFor: 1, goalsAgainst: 4, goalDifference: -3, points: 1, group: 'B' },
        ];

        it('should correctly calculate group standings order', () => {
            const standings = getGroupStandings(dummyTable, ['A', 'B']);
            
            expect(standings['A']).toBeDefined();
            expect(standings['A'][0].teamName).toBe('Germany');
            expect(standings['A'][1].teamName).toBe('Switzerland');
            expect(standings['A'][2].teamName).toBe('Hungary');
            expect(standings['A'][3].teamName).toBe('Scotland');

            expect(standings['B']).toBeDefined();
            expect(standings['B'][0].teamName).toBe('Spain');
            expect(standings['B'][1].teamName).toBe('Italy');
            expect(standings['B'][2].teamName).toBe('Croatia');
            expect(standings['B'][3].teamName).toBe('Albania');
        });

        it('should extract top 2 teams and best third-placed teams', () => {
            const { top2, bestThird } = extractAdvancingTeams(dummyTable, ['A', 'B'], 1);
            
            expect(top2).toContain('Germany');
            expect(top2).toContain('Switzerland');
            expect(top2).toContain('Spain');
            expect(top2).toContain('Italy');
            
            expect(bestThird).toContain('Hungary');
            expect(bestThird).not.toContain('Croatia'); // Croatia has 2 points, Hungary has 3
        });
    });

    describe('Knockout Fixtures Seeding', () => {
        it('should generate seeded knockout fixtures correctly', () => {
            const sortedTeams = ['Germany', 'Spain', 'France', 'England', 'Italy', 'Portugal', 'Netherlands', 'Belgium'];
            const fixtures = generateSeededKnockoutRound(sortedTeams, 4, 'Round of 16');
            
            expect(fixtures.length).toBe(4);
            expect(fixtures[0].homeTeam).toBe('Germany');
            expect(fixtures[0].awayTeam).toBe('Belgium'); // Seed 1 vs Seed 8
            
            expect(fixtures[1].homeTeam).toBe('Spain');
            expect(fixtures[1].awayTeam).toBe('Netherlands'); // Seed 2 vs Seed 7
            
            expect(fixtures[2].homeTeam).toBe('France');
            expect(fixtures[2].awayTeam).toBe('Portugal'); // Seed 3 vs Seed 6

            expect(fixtures[3].homeTeam).toBe('England');
            expect(fixtures[3].awayTeam).toBe('Italy'); // Seed 4 vs Seed 5
        });
    });

    describe('Knockout Quick Match Simulation', () => {
        it('should resolve draws using penalty shootouts', () => {
            const euros = generateEurosStructure();
            const denmark = euros['Denmark'];
            const switzerland = euros['Switzerland'];
            
            // Force a scenario where simulateKnockoutQuickMatch gets called
            // We run it 20 times to ensure we hit a draw and verify penalty resolution
            let shootoutFound = false;
            for (let i = 0; i < 20; i++) {
                const result = simulateKnockoutQuickMatch(denmark, switzerland);
                if (result.homeGoals === result.awayGoals) {
                    shootoutFound = true;
                    expect(result.penaltyWinner).toBeDefined();
                    expect(['home', 'away']).toContain(result.penaltyWinner);
                    expect(result.penaltyScore).toBeDefined();
                    expect(result.penaltyScore).toMatch(/^\d+-\d+$/);
                }
            }
            // Draw matches are common enough that 20 simulations should yield at least one draw
            expect(shootoutFound).toBe(true);
        });
    });
});
