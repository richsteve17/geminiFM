
import type { Fixture, Team, Player, Formation, PlayerPosition } from './types';
import { simulateDeterministicQuickMatch } from './engine/matchEngine';

export { FORMATION_SLOTS, analyzeTactics } from './engine/tactics';
export type { TacticalAssignment, TacticalAnalysis } from './engine/tactics';

const NAMES_BY_NATION: Record<string, { first: string[], last: string[] }> = {
    'EN': {
        first: ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Harry", "Jack", "Oliver", "George", "Charlie", "Jacob", "Alfie", "Freddie", "Oscar", "Arthur"],
        last: ["Smith", "Jones", "Williams", "Taylor", "Brown", "Davies", "Evans", "Wilson", "Thomas", "Roberts", "Johnson", "Lewis", "Walker", "Robinson", "Wood", "Thompson", "Wright", "White", "Watson", "Edwards"]
    },
    'US': {
        first: ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Liam", "Noah", "Oliver", "Elijah", "Lucas", "Mason", "Logan", "Ethan", "Jacob", "Leo"],
        last: ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"]
    },
    'ES': {
        first: ["Antonio", "Jose", "Manuel", "Francisco", "David", "Juan", "Javier", "Daniel", "Carlos", "Jesus", "Alejandro", "Miguel", "Rafael", "Pedro", "Angel", "Pablo", "Sergio", "Fernando", "Luis", "Jorge", "Alvaro", "Adrian", "Diego", "Enrique", "Iker", "Ignacio", "Joaquin", "Mateo", "Raul", "Vicente"],
        last: ["Garcia", "Rodriguez", "Gonzalez", "Fernandez", "Lopez", "Martinez", "Sanchez", "Perez", "Gomez", "Martin", "Jimenez", "Ruiz", "Hernandez", "Diaz", "Moreno", "Muñoz", "Alvarez", "Romero", "Alonso", "Gutierrez", "Navarro", "Torres", "Dominguez", "Gil", "Vazquez", "Serrano", "Blanco", "Molina", "Morales", "Suarez"]
    },
    'IT': {
        first: ["Alessandro", "Lorenzo", "Mattia", "Francesco", "Andrea", "Leonardo", "Matteo", "Gabriele", "Riccardo", "Tommaso", "Giuseppe", "Antonio", "Giovanni", "Roberto", "Salvatore", "Luigi", "Mario", "Vincenzo", "Federico", "Marco", "Luca", "Filippo", "Davide", "Christian", "Edoardo", "Simone", "Pietro", "Domenico", "Giorgio", "Enzo"],
        last: ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Gallo", "Conti", "De Luca", "Mancini", "Costa", "Giordano", "Rizzo", "Lombardi", "Moretti", "Barbieri", "Fontana", "Santoro", "Mariani", "Rinaldi", "Caruso", "Ferrara", "Galli", "Martini", "Leone"]
    },
    'DE': {
        first: ["Maximilian", "Alexander", "Paul", "Elias", "Luis", "Felix", "Leon", "Lukas", "Niklas", "Tim", "Jan", "Jonas", "Finn", "Ben", "Luca", "David", "Philipp", "Simon", "Julian", "Moritz", "Jakob", "Noah", "Florian", "Fabian", "Hannes", "Karl", "Otto", "Stefan", "Tobias", "Werner"],
        last: ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Schäfer", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schröder", "Neumann", "Schwarz", "Zimmermann", "Braun", "Hofmann", "Krüger", "Hartmann", "Lange", "Schmitt", "Werner", "Schmitz", "Krause", "Meier"]
    },
    'FR': {
        first: ["Jean", "Michel", "Pierre", "Philippe", "Alain", "Nicolas", "Christophe", "Patrick", "Christian", "Stéphane", "Sébastien", "Frédéric", "Laurent", "Julien", "Olivier", "Eric", "David", "Thomas", "Thierry", "Vincent", "Benoit", "Guillaume", "Mathieu", "Romain", "Antoine", "Lucas", "Hugo", "Enzo", "Gerard", "Thibault"],
        last: ["Martin", "Bernard", "Thomas", "Petit", "Robert", "Richard", "Durand", "Dubois", "Moreau", "Laurent", "Simon", "Michel", "Lefebvre", "Leroy", "Roux", "David", "Bertrand", "Morel", "Fournier", "Girard", "Bonnet", "Dupont", "Lambert", "Fontaine", "Rousseau", "Vincent", "Muller", "Lefevre", "Faure", "Andre"]
    },
};

export const generateName = (nationalityCode: string): string => {
    let code = 'EN';
    const input = nationalityCode.toUpperCase();

    if (['🇪🇸', '🇦🇷', '🇨🇴', '🇲🇽', '🇺🇾', 'ES', 'ARG', 'COL', 'MEX', 'URU'].includes(input)) code = 'ES';
    else if (['🇮🇹', 'IT', 'ITA'].includes(input)) code = 'IT';
    else if (['🇩🇪', '🇦🇹', '🇨🇭', 'DE', 'GER', 'AUT', 'SUI'].includes(input)) code = 'DE';
    else if (['🇫🇷', '🇧🇪', '🇨🇮', '🇸🇳', '🇩🇿', 'FR', 'FRA', 'BEL', 'CIV', 'SEN', 'ALG'].includes(input)) code = 'FR';
    else if (['🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇺🇸', '🇨🇦', '🇦🇺', '🇮🇪', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'EN', 'UK', 'ENG', 'USA', 'CAN', 'AUS', 'IRL', 'SCO', 'WAL'].includes(input)) code = 'EN';

    const list = NAMES_BY_NATION[code] || NAMES_BY_NATION['EN'];
    const first = list.first[Math.floor(Math.random() * list.first.length)];
    const last = list.last[Math.floor(Math.random() * list.last.length)];
    
    return `${first.charAt(0)}. ${last}`;
};

export const generateFixtures = (teams: Team[]): Fixture[] => {
    const fixtures: Fixture[] = [];
    const leagues = Array.from(new Set(teams.map(t => t.league)));

    leagues.forEach(league => {
        const leagueTeams = teams.filter(t => t.league === league).map(t => t.name);
        if (leagueTeams.length < 2) return;
        
        if (leagueTeams.length % 2 !== 0) {
            leagueTeams.push('dummy');
        }

        const numTeams = leagueTeams.length;
        const rounds = numTeams - 1;
        const matchesPerRound = numTeams / 2;
        let roundTeams = [...leagueTeams];

        for (let round = 0; round < rounds; round++) {
            for (let match = 0; match < matchesPerRound; match++) {
                const home = roundTeams[match];
                const away = roundTeams[numTeams - 1 - match];

                if (home !== 'dummy' && away !== 'dummy') {
                    fixtures.push({ 
                        id: `${league}-${round}-${home}-${away}`,
                        week: round + 1,
                        league: league as any,
                        homeTeam: home, 
                        awayTeam: away,
                        played: false
                    });
                    fixtures.push({
                        id: `${league}-${round+rounds}-${away}-${home}`,
                        week: round + 1 + rounds,
                        league: league as any,
                        homeTeam: away,
                        awayTeam: home,
                        played: false
                    });
                }
            }
            const lastTeam = roundTeams.pop();
            if (lastTeam) {
                roundTeams.splice(1, 0, lastTeam);
            }
        }
    });

    return fixtures.sort((a, b) => a.week - b.week);
};

export const generateSwissFixtures = (teams: Team[]): Fixture[] => {
    const teamNames = teams.map(t => t.name);
    const n = teamNames.length;
    const rounds = n - 1;
    const matchesPerRound = n / 2;
    const allRounds: {home: string, away: string}[][] = [];
    let roundTeams = [...teamNames];

    for (let r = 0; r < rounds; r++) {
        const roundFixtures: {home: string, away: string}[] = [];
        for (let i = 0; i < matchesPerRound; i++) {
            roundFixtures.push({ home: roundTeams[i], away: roundTeams[n - 1 - i] });
        }
        allRounds.push(roundFixtures);
        const last = roundTeams.pop();
        if (last) roundTeams.splice(1, 0, last);
    }

    const shuffledRounds = allRounds.sort(() => 0.5 - Math.random());
    const selectedRounds = shuffledRounds.slice(0, 8);
    const fixtures: Fixture[] = [];

    selectedRounds.forEach((roundMatches, index) => {
        const week = index + 1;
        roundMatches.forEach(match => {
            const isSwap = index % 2 !== 0;
            fixtures.push({
                id: `ucl-w${week}-${match.home}-${match.away}`,
                week: week,
                league: 'Champions League',
                homeTeam: isSwap ? match.away : match.home,
                awayTeam: isSwap ? match.home : match.away,
                played: false,
                stage: 'League Phase'
            });
        });
    });

    return fixtures;
};

// "The Smoking Gun": Deterministic Math Engine
export const simulateQuickMatch = (homeTeam: Team, awayTeam: Team, fixtureKey = '') => {
    return simulateDeterministicQuickMatch(homeTeam, awayTeam, fixtureKey);
};

export const calculatePlayerDevelopment = (player: Player, matchPerformance: number = 0): Player => {
    let { rating, age, potential, growthRate, form } = player;

    if (potential === undefined) {
        const deterministicCeiling = 5 + ((player.name.length * 17 + age * 13 + rating) % 10);
        potential = Math.min(99, rating + deterministicCeiling);
    }
    if (growthRate === undefined) {
        growthRate = player.personality === 'Young Prospect' ? 0.6 : 0.4;
    }
    if (form === undefined) {
        form = 50;
    }

    // Update form based on match performance (simple model)
    form = Math.max(0, Math.min(100, form + (matchPerformance * 10) - 5)); // Performance can be -1 to 1

    // Age-based development/decline
    if (age < 23) {
        growthRate += 0.05; // Young players develop faster
    } else if (age > 30) {
        growthRate -= 0.05; // Older players decline
    }
    growthRate = Math.max(0.1, Math.min(1, growthRate)); // Keep growth rate within reasonable bounds

    // Calculate potential rating change
    const potentialRatingChange = (potential - rating) * (growthRate / 10);
    const relationshipPenalty = Math.min(8, Math.max(0, ...(player.effects || []).map(e => Number((e as any).trainingPenalty) || 0)));

    // Apply development/decline
    // A rift limits positive training gains, including for benched players. It does not cushion decline or bad results.
    rating += potentialRatingChange > 0 ? potentialRatingChange * (1 - relationshipPenalty * 0.07) : potentialRatingChange;

    // Apply form influence (temporary boost/reduction)
    rating += (form - 50) / 100;

    // Ensure rating stays within bounds (e.g., 1-100)
    rating = Math.max(1, Math.min(100, rating));

    return { ...player, rating: Math.round(rating), growthRate, form: Math.round(form) };
};

export const ensureTeamAndPlayerFields = (teams: Record<string, Team>): Record<string, Team> => {
    const updatedTeams: Record<string, Team> = {};
    for (const teamName in teams) {
        const team = teams[teamName];
        
        // computed weeklyWageBill
        const computedWeeklyWageBill = team.players.reduce((sum, p) => sum + (p.wage || 0), 0);
        const weeklyWageBill = team.weeklyWageBill !== undefined ? team.weeklyWageBill : computedWeeklyWageBill;
        
        // weeklyBroadcastRevenue
        let weeklyBroadcastRevenue = team.weeklyBroadcastRevenue;
        if (weeklyBroadcastRevenue === undefined) {
            switch (team.league) {
                case 'Premier League':
                    weeklyBroadcastRevenue = 1500000;
                    break;
                case 'La Liga':
                    weeklyBroadcastRevenue = 1000000;
                    break;
                case 'Serie A':
                    weeklyBroadcastRevenue = 800000;
                    break;
                case 'Bundesliga':
                    weeklyBroadcastRevenue = 900000;
                    break;
                case 'Ligue 1':
                    weeklyBroadcastRevenue = 700000;
                    break;
                case 'Championship':
                    weeklyBroadcastRevenue = 300000;
                    break;
                case 'MLS':
                    weeklyBroadcastRevenue = 200000;
                    break;
                default:
                    weeklyBroadcastRevenue = 100000;
                    break;
            }
        }
        
        // matchDayRevenue
        const matchDayRevenue = team.matchDayRevenue !== undefined ? team.matchDayRevenue : (team.prestige || 1) * 15000;
        
        // players potential, growthRate, form
        const players = team.players.map(p => {
            const deterministicCeiling = 5 + ((p.name.length * 17 + p.age * 13 + p.rating) % 10);
            const potential = p.potential !== undefined ? p.potential : Math.min(99, p.rating + deterministicCeiling);
            const growthRate = p.growthRate !== undefined ? p.growthRate : (p.personality === 'Young Prospect' ? 0.6 : 0.4);
            const form = p.form !== undefined ? p.form : 50;
            return {
                ...p,
                potential,
                growthRate,
                form
            };
        });
        
        updatedTeams[teamName] = {
            ...team,
            weeklyWageBill,
            weeklyBroadcastRevenue,
            matchDayRevenue,
            transferBudget: team.transferBudget ?? Math.max(0, Math.round(team.balance * 0.25)),
            players
        };
    }
    return updatedTeams;
};
