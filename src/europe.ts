
import type { Team, Player, Formation, PlayerPersonality, PlayerPosition } from './types';
import { TEAMS } from './constants';
import { generateName } from './utils';
import { getClubRosterSource } from './engine/clubRosters';

const FORMATIONS: Formation[] = ['4-3-3', '4-4-2', '5-3-2', '3-5-2'];

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
        ...Array.from({ length: defCount }, () => generateEuroPlayer(flag, 'CB', prestige - 3, true)),
        ...Array.from({ length: midCount }, () => generateEuroPlayer(flag, 'CM', prestige - 3, true)),
        ...Array.from({ length: fwdCount }, () => generateEuroPlayer(flag, 'ST', prestige - 1, true)),
    ];

    const bench = [
        generateEuroPlayer(flag, 'GK', prestige - 6, false),
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
        balance: 0,
        objectives: [],
        activePromises: []
    };
};

export const getChampionsLeagueParticipants = (existingTeams: Record<string, Team>): { participants: string[], newTeams: Record<string, Team> } => {
    if (Object.values(existingTeams).some(team => getClubRosterSource(team))) {
        // Simulated qualification by modeled game prestige, NOT an official UEFA field.
        // No new teams/players are generated, including when source coverage is short.
        const supported: Partial<Record<Team['league'], string>> = {
            'Premier League': 'eng.1', 'La Liga': 'esp.1', 'Serie A': 'ita.1',
            'Bundesliga': 'ger.1', 'Ligue 1': 'fra.1',
        };
        const eligible = Object.values(existingTeams).filter(team => {
            const source = getClubRosterSource(team);
            return supported[team.league] && source?.sourceLeagueCode === supported[team.league]
                && source.status !== 'missing' && !!source.sourceTeamId && team.players.length >= 11;
        }).sort((a, b) => b.prestige - a.prestige || a.name.localeCompare(b.name));
        return { participants: [...new Set(eligible.map(team => team.name))].slice(0, 36), newTeams: {} };
    }
    // Compatibility path for careers created before source-backed club factories.
    const participants: string[] = [];
    const newTeams: Record<string, Team> = {};

    const eliteTeams = Object.values(existingTeams)
        .filter(t => t.prestige >= 79)
        .sort((a,b) => b.prestige - a.prestige);
    
    eliteTeams.forEach(t => participants.push(t.name));

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

    let fillerCount = 1;
    while(participants.length < 36) {
        const filler = createEuroTeam(`FC Europe ${fillerCount}`, '🇪🇺', 75);
        newTeams[filler.name] = filler;
        participants.push(filler.name);
        fillerCount++;
    }

    return { 
        participants: participants.slice(0, 36), 
        newTeams 
    };
};
