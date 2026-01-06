
import type { Team, Player, Formation, PlayerPersonality, PlayerPosition } from './types';
import { TEAMS } from './constants';
import { generateName } from './utils';

const FORMATIONS: Formation[] = ['4-3-3', '4-4-2', '5-3-2', '3-5-2'];

// Helper to generate a generic player
// Fix: Use PlayerPosition type for the position parameter to ensure compatibility with Player interface
const generateEuroPlayer = (nationality: string, position: PlayerPosition, rating: number, isStarter: boolean): Player => {
    return {
        name: generateName(nationality),
        nationality,
        rating,
        position,
        age: Math.floor(Math.random() * 10) + 20,
        personality: 'Ambitious',
        wage: rating * 3000,
        status: { type: 'Available' },
        effects: [],
        contractExpires: 3,
        isStarter,
        // Added condition to satisfy Player interface
        condition: 100
    };
};

const createEuroTeam = (name: string, flag: string, prestige: number): Team => {
    const formation = FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)];
    let defCount = 4, midCount = 4, fwdCount = 2;
    if (formation === '4-3-3') { defCount = 4; midCount = 3; fwdCount = 3; }
    if (formation === '5-3-2') { defCount = 5; midCount = 3; fwdCount = 2; }
    if (formation === '3-5-2') { defCount = 3; midCount = 5; fwdCount = 2; }

    const starters = [
        generateEuroPlayer(flag, 'GK', prestige - 2, true),
        // Fix: Use valid PlayerPosition values like 'CB', 'CM', 'ST'
        ...Array.from({ length: defCount }, () => generateEuroPlayer(flag, 'CB', prestige - 3, true)),
        ...Array.from({ length: midCount }, () => generateEuroPlayer(flag, 'CM', prestige - 3, true)),
        ...Array.from({ length: fwdCount }, () => generateEuroPlayer(flag, 'ST', prestige - 1, true)),
    ];

    const bench = [
        generateEuroPlayer(flag, 'GK', prestige - 6, false),
        // Fix: Use valid PlayerPosition values for the bench
        ...Array.from({ length: 2 }, () => generateEuroPlayer(flag, 'CB', prestige - 6, false)),
        ...Array.from({ length: 2 }, () => generateEuroPlayer(flag, 'CM', prestige - 6, false)),
        ...Array.from({ length: 2 }, () => generateEuroPlayer(flag, 'ST', prestige - 6, false)),
    ];

    return {
        name,
        league: 'Champions League',
        players: [...starters, ...bench],
        tactic: { formation, mentality: 'Balanced' },
        prestige,
        chairmanPersonality: 'Traditionalist',
        // Added balance to satisfy Team interface
        balance: 0
    };
};

// Returns a list of team names participating, and a map of any NEW teams created (fillers)
export const getChampionsLeagueParticipants = (existingTeams: Record<string, Team>): { participants: string[], newTeams: Record<string, Team> } => {
    const participants: string[] = [];
    const newTeams: Record<string, Team> = {};

    // 1. Pull Top Teams from existing Leagues
    const eliteTeams = Object.values(existingTeams)
        .filter(t => t.prestige >= 79) // High prestige threshold for auto-qualification
        .sort((a,b) => b.prestige - a.prestige);
    
    eliteTeams.forEach(t => participants.push(t.name));

    // 2. Generate "Rest of Europe" giants to fill up to 36
    const potentialGiants = [
        createEuroTeam('Ajax Amsterdam', '🇳🇱', 84),
        createEuroTeam('PSV Eindhoven', '🇳🇱', 82),
        createEuroTeam('Benfica Eagles', '🇵🇹', 85),
        createEuroTeam('Porto Dragons', '🇵🇹', 84),
        createEuroTeam('Sporting Lions', '🇵🇹', 83),
        createEuroTeam('Celtic Green', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 78),
        createEuroTeam('Rangers Blue', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 77),
        createEuroTeam('Shakhtar Miners', '🇺🇦', 79),
        createEuroTeam('Salzburg Red', '🇦🇹', 78),
        createEuroTeam('Galatasaray Lions', '🇹🇷', 80),
        createEuroTeam('Fenerbahce Canaries', '🇹🇷', 79),
        createEuroTeam('Olympiacos', '🇬🇷', 77),
        createEuroTeam('Club Brugge', '🇧🇪', 78),
        createEuroTeam('Red Star', '🇷🇸', 76),
        createEuroTeam('Dinamo Zagreb', '🇭🇷', 77),
        createEuroTeam('Copenhagen FC', '🇩🇰', 76),
        createEuroTeam('Sparta Prague', '🇨🇿', 76),
        createEuroTeam('Young Boys', '🇨🇭', 75),
    ];

    let i = 0;
    while(participants.length < 36 && i < potentialGiants.length) {
        const team = potentialGiants[i];
        if (!existingTeams[team.name]) {
            newTeams[team.name] = team;
            participants.push(team.name);
        }
        i++;
    }

    // Safety filler
    let fillerCount = 1;
    while(participants.length < 36) {
        const filler = createEuroTeam(`FC Europe ${fillerCount}`, '🇪🇺', 75);
        newTeams[filler.name] = filler;
        participants.push(filler.name);
        fillerCount++;
    }

    // Trim to exactly 36 (if elites > 36, we cut the lowest prestige elites, strictly speaking, but here we just slice)
    // Realistically with prestige 79, we won't have too many.
    return { 
        participants: participants.slice(0, 36), 
        newTeams 
    };
};