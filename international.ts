
import type { NationalTeam, Team, Player, PlayerPosition, PlayerPersonality, Formation } from './types';
import { generateName } from './utils';

const getNationalPlayer = (nationality: string, name: string, rating: number, position: PlayerPosition, personality: PlayerPersonality = 'Ambitious', isStarter: boolean = true): Player => ({
    name, nationality, rating, position, age: 24 + Math.floor(Math.random() * 8), personality, wage: 50000, 
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
];

export const generateWorldCupStructure = (): Record<string, Team> => {
    const teams: Record<string, Team> = {};
    const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    
    // In a real 48 team WC, we'd need 48 unique teams. 
    // For now, let's fill the groups by duplicating our major teams with 'B' or 'Sub' variants if needed, 
    // or just creating generic filler squads to ensure the user sees a full 12 groups.
    
    let teamCounter = 0;
    groups.forEach(group => {
        for (let i = 0; i < 4; i++) {
            const template = NATIONAL_TEAMS[teamCounter % NATIONAL_TEAMS.length];
            const name = i === 0 ? template.name : `${template.name} (${group}${i})`;
            teams[name] = { 
                name, 
                league: 'International', 
                balance: 0, 
                group, 
                chairmanPersonality: 'Football Federation',
                prestige: template.prestige,
                players: generateSquad(template.players[0].nationality, template.prestige - 5),
                tactic: template.tactic
            };
            teamCounter++;
        }
    });
    return teams;
};
