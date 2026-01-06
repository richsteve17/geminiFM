
import type { NationalTeam, Team, Player, PlayerPosition, PlayerPersonality, Formation, PlayerEffect } from './types';
import { generateName } from './utils';

// Helper to generate a realistic national player with random flair
const getNationalPlayer = (nationalityCode: string, flag: string, rating: number, position: PlayerPosition, personality: PlayerPersonality = 'Ambitious', isStarter: boolean = true): Player => {
    // 10% chance of starting with high morale (Winner/FiredUp)
    // 5% chance of starting with negative morale/chemistry
    const effects: PlayerEffect[] = [];
    const rand = Math.random();
    if (rand > 0.9) {
        effects.push({ type: 'PostTournamentMorale', morale: 'FiredUp', message: 'Ready for the World Cup', until: 5 });
    } else if (rand < 0.05) {
        effects.push({ type: 'PostTournamentMorale', morale: 'Disappointed', message: 'Club season fatigue', until: 2 });
    }

    return {
        name: generateName(nationalityCode),
        nationality: flag, 
        rating: Math.round(rating), 
        position, 
        age: 20 + Math.floor(Math.random() * 14), 
        personality, 
        wage: 50000, 
        status: { type: 'Available' }, 
        effects, 
        contractExpires: 3, 
        isStarter, 
        condition: 100
    };
};

const generateSquad = (flag: string, rating: number, countryCode: string): Player[] => {
    // Generate valid names based on country code
    return [
        getNationalPlayer(countryCode, flag, rating + 1, 'GK'),
        getNationalPlayer(countryCode, flag, rating, 'CB'),
        getNationalPlayer(countryCode, flag, rating - 1, 'CB'),
        getNationalPlayer(countryCode, flag, rating - 1, 'LB'),
        getNationalPlayer(countryCode, flag, rating - 1, 'RB'),
        getNationalPlayer(countryCode, flag, rating, 'DM'),
        getNationalPlayer(countryCode, flag, rating + 2, 'CM'),
        getNationalPlayer(countryCode, flag, rating + 1, 'AM'),
        getNationalPlayer(countryCode, flag, rating + 1, 'LW'),
        getNationalPlayer(countryCode, flag, rating + 2, 'ST'),
        getNationalPlayer(countryCode, flag, rating + 1, 'RW'),
        // Bench (7 players minimum)
        getNationalPlayer(countryCode, flag, rating - 5, 'GK', 'Professional', false),
        getNationalPlayer(countryCode, flag, rating - 4, 'CB', 'Professional', false),
        getNationalPlayer(countryCode, flag, rating - 3, 'CM', 'Young Prospect', false),
        getNationalPlayer(countryCode, flag, rating - 2, 'ST', 'Ambitious', false),
        getNationalPlayer(countryCode, flag, rating - 4, 'LB', 'Loyal', false),
        getNationalPlayer(countryCode, flag, rating - 3, 'AM', 'Young Prospect', false),
        getNationalPlayer(countryCode, flag, rating - 2, 'RW', 'Professional', false),
        getNationalPlayer(countryCode, flag, rating - 6, 'CB', 'Young Prospect', false),
        getNationalPlayer(countryCode, flag, rating - 4, 'CM', 'Professional', false),
        getNationalPlayer(countryCode, flag, rating - 5, 'ST', 'Professional', false),
    ];
};

export const NATIONAL_TEAMS: NationalTeam[] = [
    { name: 'France', countryCode: 'FR', prestige: 94, tactic: { formation: '4-2-3-1', mentality: 'Balanced' }, players: generateSquad('🇫🇷', 89, 'FR') },
    { name: 'Brazil', countryCode: 'IT', prestige: 93, tactic: { formation: '4-3-3', mentality: 'All-Out Attack' }, players: generateSquad('🇧🇷', 88, 'IT') }, // Using IT map for latin names approximation if specific BR list missing
    { name: 'Argentina', countryCode: 'ES', prestige: 92, tactic: { formation: '4-3-3', mentality: 'Attacking' }, players: generateSquad('🇦🇷', 87, 'ES') },
    { name: 'England', countryCode: 'EN', prestige: 91, tactic: { formation: '4-2-3-1', mentality: 'Balanced' }, players: generateSquad('🏴󠁧󠁢󠁥󠁮󠁧󠁿', 88, 'EN') },
    { name: 'Spain', countryCode: 'ES', prestige: 90, tactic: { formation: '4-3-3', mentality: 'Balanced' }, players: generateSquad('🇪🇸', 87, 'ES') },
    { name: 'Italy', countryCode: 'IT', prestige: 88, tactic: { formation: '3-5-2', mentality: 'Balanced' }, players: generateSquad('🇮🇹', 86, 'IT') },
    { name: 'Germany', countryCode: 'DE', prestige: 89, tactic: { formation: '4-2-3-1', mentality: 'Attacking' }, players: generateSquad('🇩🇪', 87, 'DE') },
    { name: 'Portugal', countryCode: 'ES', prestige: 89, tactic: { formation: '4-3-3', mentality: 'Attacking' }, players: generateSquad('🇵🇹', 86, 'ES') },
    { name: 'Netherlands', countryCode: 'DE', prestige: 87, tactic: { formation: '4-3-3', mentality: 'Balanced' }, players: generateSquad('🇳🇱', 85, 'DE') },
    { name: 'USA', countryCode: 'EN', prestige: 80, tactic: { formation: '4-3-3', mentality: 'Attacking' }, players: generateSquad('🇺🇸', 79, 'EN') },
    { name: 'Japan', countryCode: 'EN', prestige: 82, tactic: { formation: '4-2-3-1', mentality: 'Balanced' }, players: generateSquad('🇯🇵', 80, 'EN') },
    { name: 'Morocco', countryCode: 'FR', prestige: 83, tactic: { formation: '4-3-3', mentality: 'Balanced' }, players: generateSquad('🇲🇦', 81, 'FR') },
    { name: 'Belgium', countryCode: 'FR', prestige: 85, tactic: { formation: '3-4-3' as any, mentality: 'Balanced' }, players: generateSquad('🇧🇪', 84, 'FR') },
    { name: 'Croatia', countryCode: 'DE', prestige: 84, tactic: { formation: '4-3-3', mentality: 'Balanced' }, players: generateSquad('🇭🇷', 83, 'DE') },
    { name: 'Uruguay', countryCode: 'ES', prestige: 84, tactic: { formation: '4-2-3-1', mentality: 'Attacking' }, players: generateSquad('🇺🇾', 83, 'ES') },
    { name: 'Colombia', countryCode: 'ES', prestige: 83, tactic: { formation: '4-3-3', mentality: 'Attacking' }, players: generateSquad('🇨🇴', 82, 'ES') },
];

export const generateWorldCupStructure = (): Record<string, Team> => {
    const teams: Record<string, Team> = {};
    const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    
    let teamCounter = 0;
    
    groupLetters.forEach(group => {
        for (let i = 0; i < 4; i++) {
            const template = NATIONAL_TEAMS[teamCounter % NATIONAL_TEAMS.length];
            
            // Critical Fix: Ensure unique name for EVERY team in the 48-team tournament
            // If the name already exists, suffix it.
            let uniqueName = template.name;
            if (teams[uniqueName]) {
                uniqueName = `${template.name} (${group})`;
            }
            
            // Adjust prestige slightly so duplicates aren't identical clones
            const prestigeAdjustment = i * 2; 
            
            teams[uniqueName] = { 
                name: uniqueName, 
                league: 'International', 
                balance: 0, 
                group, 
                chairmanPersonality: 'Football Federation',
                prestige: Math.max(50, template.prestige - prestigeAdjustment), 
                players: generateSquad(template.players[0].nationality, template.prestige - 5 - prestigeAdjustment, template.countryCode),
                tactic: { ...template.tactic },
                objectives: []
            };
            teamCounter++;
        }
    });
    return teams;
};
