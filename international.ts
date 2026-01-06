
import type { NationalTeam, Team, Player, PlayerPosition, PlayerPersonality, Formation } from './types';
import { generateName } from './utils';

const getNationalPlayer = (nationality: string, name: string, rating: number, position: PlayerPosition, personality: PlayerPersonality = 'Ambitious', isStarter: boolean = true): Player => ({
    name, nationality, rating: Math.round(rating), position, age: 24 + Math.floor(Math.random() * 8), personality, wage: 50000, 
    status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter, condition: 100
});

const generateSquad = (nationality: string, rating: number): Player[] => {
    return [
        getNationalPlayer(nationality, 'Star Keeper', rating + 1, 'GK'),
        getNationalPlayer(nationality, 'Elite CB', rating, 'CB'),
        getNationalPlayer(nationality, 'Tough CB', rating - 1, 'CB'),
        getNationalPlayer(nationality, 'Fast LB', rating - 1, 'LB'),
        getNationalPlayer(nationality, 'Skillful RB', rating - 1, 'RB'),
        getNationalPlayer(nationality, 'Anchor DM', rating, 'DM'),
        getNationalPlayer(nationality, 'Playmaker CM', rating + 2, 'CM'),
        getNationalPlayer(nationality, 'Dynamic AM', rating + 1, 'AM'),
        getNationalPlayer(nationality, 'Rapid LW', rating + 1, 'LW'),
        getNationalPlayer(nationality, 'Goal ST', rating + 2, 'ST'),
        getNationalPlayer(nationality, 'Tricky RW', rating + 1, 'RW'),
        // Bench (7 players minimum)
        getNationalPlayer(nationality, 'Sub GK', rating - 5, 'GK', 'Professional', false),
        getNationalPlayer(nationality, 'Sub CB', rating - 4, 'CB', 'Professional', false),
        getNationalPlayer(nationality, 'Sub CM', rating - 3, 'CM', 'Young Prospect', false),
        getNationalPlayer(nationality, 'Sub ST', rating - 2, 'ST', 'Ambitious', false),
        getNationalPlayer(nationality, 'Sub LB', rating - 4, 'LB', 'Loyal', false),
        getNationalPlayer(nationality, 'Sub AM', rating - 3, 'AM', 'Young Prospect', false),
        getNationalPlayer(nationality, 'Sub RW', rating - 2, 'RW', 'Professional', false),
        getNationalPlayer(nationality, 'Youth CB', rating - 6, 'CB', 'Young Prospect', false),
        getNationalPlayer(nationality, 'Utility MID', rating - 4, 'CM', 'Professional', false),
        getNationalPlayer(nationality, 'Backup ST', rating - 5, 'ST', 'Professional', false),
    ];
};

export const NATIONAL_TEAMS: NationalTeam[] = [
    { name: 'France', countryCode: 'FRA', prestige: 94, tactic: { formation: '4-2-3-1', mentality: 'Balanced' }, players: generateSquad('🇫🇷', 89) },
    { name: 'Brazil', countryCode: 'BRA', prestige: 93, tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, players: generateSquad('🇧🇷', 88) },
    { name: 'Argentina', countryCode: 'ARG', prestige: 92, tactic: { formation: '4-3-3', mentality: 'Attacking' }, players: generateSquad('🇦🇷', 87) },
    { name: 'England', countryCode: 'ENG', prestige: 91, tactic: { formation: '4-2-3-1', mentality: 'Balanced' }, players: generateSquad('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 88) },
    { name: 'Spain', countryCode: 'ESP', prestige: 90, tactic: { formation: '4-3-3', mentality: 'Balanced' }, players: generateSquad('🇪🇸', 87) },
    { name: 'Italy', countryCode: 'ITA', prestige: 88, tactic: { formation: '3-5-2', mentality: 'Balanced' }, players: generateSquad('🇮🇹', 86) },
    { name: 'Germany', countryCode: 'GER', prestige: 89, tactic: { formation: '4-2-3-1', mentality: 'Attacking' }, players: generateSquad('🇩🇪', 87) },
    { name: 'Portugal', countryCode: 'POR', prestige: 89, tactic: { formation: '4-3-3', mentality: 'Attacking' }, players: generateSquad('🇵🇹', 86) },
    { name: 'Netherlands', countryCode: 'NED', prestige: 87, tactic: { formation: '4-3-3', mentality: 'Balanced' }, players: generateSquad('🇳🇱', 85) },
    { name: 'USA', countryCode: 'USA', prestige: 80, tactic: { formation: '4-3-3', mentality: 'Attacking' }, players: generateSquad('🇺🇸', 79) },
    { name: 'Japan', countryCode: 'JPN', prestige: 82, tactic: { formation: '4-2-3-1', mentality: 'Balanced' }, players: generateSquad('🇯🇵', 80) },
    { name: 'Morocco', countryCode: 'MAR', prestige: 83, tactic: { formation: '4-3-3', mentality: 'Balanced' }, players: generateSquad('🇲🇦', 81) },
    { name: 'Belgium', countryCode: 'BEL', prestige: 85, tactic: { formation: '3-4-3' as any, mentality: 'Balanced' }, players: generateSquad('🇧🇪', 84) },
    { name: 'Croatia', countryCode: 'CRO', prestige: 84, tactic: { formation: '4-3-3', mentality: 'Balanced' }, players: generateSquad('🇭🇷', 83) },
    { name: 'Uruguay', countryCode: 'URU', prestige: 84, tactic: { formation: '4-2-3-1', mentality: 'Attacking' }, players: generateSquad('🇺🇾', 83) },
    { name: 'Colombia', countryCode: 'COL', prestige: 83, tactic: { formation: '4-3-3', mentality: 'Attacking' }, players: generateSquad('🇨🇴', 82) },
];

export const generateWorldCupStructure = (): Record<string, Team> => {
    const teams: Record<string, Team> = {};
    const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    
    let teamCounter = 0;
    groupLetters.forEach(group => {
        for (let i = 0; i < 4; i++) {
            const template = NATIONAL_TEAMS[teamCounter % NATIONAL_TEAMS.length];
            // Make names unique for the structure
            const suffix = i === 0 ? "" : ` (${group})`; // Use simple suffix to avoid excessively long names
            const name = i === 0 ? template.name : template.name + suffix;
            
            teams[name] = { 
                name, 
                league: 'International', 
                balance: 0, 
                group, 
                chairmanPersonality: 'Football Federation',
                prestige: Math.max(50, template.prestige - (i * 5)), // Vary prestige within group
                players: generateSquad(template.players[0].nationality, template.prestige - 5 - (i * 2)),
                tactic: { ...template.tactic }
            };
            teamCounter++;
        }
    });
    return teams;
};
