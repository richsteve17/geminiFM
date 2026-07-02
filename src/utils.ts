
import type { Fixture, Team, Player, Formation, PlayerPosition } from './types';

// --- TACTICAL ENGINE CONSTANTS ---

export const FORMATION_SLOTS: Record<Formation, PlayerPosition[]> = {
    '4-4-2': ['GK', 'LB', 'CB', 'CB', 'RB', 'LM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    '4-3-3': ['GK', 'LB', 'CB', 'CB', 'RB', 'DM', 'CM', 'AM', 'LW', 'ST', 'RW'],
    '5-3-2': ['GK', 'LWB', 'CB', 'CB', 'CB', 'RWB', 'CM', 'CM', 'CM', 'ST', 'ST'],
    '3-5-2': ['GK', 'CB', 'CB', 'CB', 'LM', 'CM', 'CM', 'CM', 'RM', 'ST', 'ST'],
    '4-2-3-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'DM', 'DM', 'AM', 'LW', 'RW', 'ST'],
    '4-5-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'DM', 'CM', 'CM', 'LM', 'RM', 'ST']
};

const ROLE_COMPATIBILITY: Record<string, string[]> = {
    'GK': ['GK'],
    'CB': ['CB', 'DM'],
    'LB': ['LB', 'LWB', 'CB'],
    'RB': ['RB', 'RWB', 'CB'],
    'LWB': ['LWB', 'LB', 'LM', 'LW'],
    'RWB': ['RWB', 'RB', 'RM', 'RW'],
    'DM': ['DM', 'CM', 'CB'],
    'CM': ['CM', 'DM', 'AM'],
    'AM': ['AM', 'CM', 'ST', 'LW', 'RW', 'CF'],
    'LM': ['LM', 'LW', 'LWB', 'CM'],
    'RM': ['RM', 'RW', 'RWB', 'CM'],
    'LW': ['LW', 'LM', 'ST', 'AM'],
    'RW': ['RW', 'RM', 'ST', 'AM'],
    'ST': ['ST', 'CF', 'LW', 'RW'],
    'CF': ['CF', 'ST', 'AM']
};

export interface TacticalAssignment {
    slotIndex: number;
    formationRole: PlayerPosition;
    player: Player;
    isOutOfPosition: boolean;
    penaltySeverity: 'none' | 'low' | 'high';
    analysis: string | null;
}

export interface TacticalAnalysis {
    score: number; // 0-100
    assignments: TacticalAssignment[];
    feedback: string[];
}

export const analyzeTactics = (starters: Player[], formation: Formation): TacticalAnalysis => {
    // We assume the starters array is ALREADY sorted to match the formation slots
    // The UI handles the swapping to ensure index 0 is GK, index 1 is LB, etc.
    const slots = FORMATION_SLOTS[formation] || FORMATION_SLOTS['4-4-2'];
    const assignments: TacticalAssignment[] = [];
    const feedback: string[] = [];
    let efficiencyScore = 100;

    // We only analyze up to the number of starters provided (usually 11)
    for (let i = 0; i < Math.min(slots.length, starters.length); i++) {
        const role = slots[i];
        const player = starters[i];
        
        let severity: 'none' | 'low' | 'high' = 'none';
        let analysis: string | null = null;

        // 1. Perfect Match
        if (player.position === role) {
            severity = 'none';
        }
        // 2. Compatible Match (e.g. RB playing RWB)
        else if (ROLE_COMPATIBILITY[role]?.includes(player.position)) {
            severity = 'low';
            analysis = `Adapting ${player.position} to ${role}`;
            efficiencyScore -= 2; // Small penalty
        }
        // 3. Incompatible
        else {
            severity = 'high';
            analysis = `Lost at ${role}`;
            efficiencyScore -= 15; // Heavy penalty
            feedback.push(`⚠️ ${player.name} (${player.position}) is out of position at ${role}.`);
        }

        // Special Check: GK
        if (role === 'GK' && player.position !== 'GK') {
            efficiencyScore -= 50; // massive penalty
            feedback.push(`CRITICAL: You need a Goalkeeper in the goal!`);
        }

        assignments.push({
            slotIndex: i,
            formationRole: role,
            player: player,
            isOutOfPosition: severity !== 'none',
            penaltySeverity: severity,
            analysis
        });
    }

    // Check for serious chemistry rifts or bad chemistry between any two starters
    const feudWarnings = new Set<string>();
    for (let i = 0; i < starters.length; i++) {
        const pA = starters[i];
        for (let j = i + 1; j < starters.length; j++) {
            const pB = starters[j];
            const pAHasRiftWithB = (pA.effects || []).some(e => 
                (e.type === 'InternationalRift' && e.severity === 'serious' && e.with === pB.name) ||
                (e.type === 'BadChemistry' && e.with === pB.name)
            );
            const pBHasRiftWithA = (pB.effects || []).some(e => 
                (e.type === 'InternationalRift' && e.severity === 'serious' && e.with === pA.name) ||
                (e.type === 'BadChemistry' && e.with === pA.name)
            );

            if (pAHasRiftWithB || pBHasRiftWithA) {
                const warningKey = [pA.name, pB.name].sort().join(" vs ");
                if (!feudWarnings.has(warningKey)) {
                    feudWarnings.add(warningKey);
                    efficiencyScore -= 30;
                    feedback.push(`⚠️ Feud Alert: ${pA.name} and ${pB.name} have a serious rift and refuse to cooperate on the pitch!`);
                }
            }

            const pAHasBondWithB = (pA.effects || []).some(e => e.type === 'TeammateBond' && e.with === pB.name);
            const pBHasBondWithA = (pB.effects || []).some(e => e.type === 'TeammateBond' && e.with === pA.name);
            if (pAHasBondWithB || pBHasBondWithA) {
                const bondKey = [pA.name, pB.name].sort().join(" bond ");
                if (!feudWarnings.has(bondKey)) {
                    feudWarnings.add(bondKey);
                    efficiencyScore += 5;
                }
            }
        }
    }

    // Check for unavailable players (Injured, Suspended, SentOff) in the starting lineup
    starters.forEach(p => {
        if (p.status.type === 'Injured') {
            efficiencyScore -= 20;
            feedback.push(`⚠️ Selection Error: ${p.name} is injured and cannot take the pitch!`);
        } else if (p.status.type === 'Suspended') {
            efficiencyScore -= 20;
            feedback.push(`⚠️ Selection Error: ${p.name} is suspended and cannot take the pitch!`);
        } else if (p.status.type === 'SentOff') {
            efficiencyScore -= 20;
            feedback.push(`⚠️ Selection Error: ${p.name} has been sent off!`);
        }
    });

    // General Balance Check
    if (efficiencyScore < 50) feedback.push("The team looks confused by this shape.");
    else if (efficiencyScore < 80) feedback.push("Some square pegs in round holes.");
    else feedback.push("The tactical balance looks solid.");

    return {
        score: Math.max(0, efficiencyScore),
        assignments: assignments, // Order is preserved
        feedback
    };
};

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
export const simulateQuickMatch = (homeTeam: Team, awayTeam: Team): { homeGoals: number, awayGoals: number } => {
    const homeRating = homeTeam.players.length ? homeTeam.players.reduce((sum, p) => sum + p.rating, 0) / homeTeam.players.length : 70;
    const awayRating = awayTeam.players.length ? awayTeam.players.reduce((sum, p) => sum + p.rating, 0) / awayTeam.players.length : 70;
    const homeAdvantage = 3;
    const ratingDiff = (homeRating + homeAdvantage) - awayRating;
    let homeGoals = 0;
    let awayGoals = 0;
    const baseChance = 0.25; 
    for(let i=0; i<5; i++) {
        // This is the specific logic requested
        if (Math.random() < baseChance + (ratingDiff * 0.02)) homeGoals++;
        if (Math.random() < baseChance - (ratingDiff * 0.02)) awayGoals++;
    }
    return { homeGoals, awayGoals };
};

export const calculatePlayerDevelopment = (player: Player, matchPerformance: number = 0): Player => {
    let { rating, age, potential, growthRate, form } = player;

    if (potential === undefined) {
        potential = Math.min(99, rating + Math.floor(Math.random() * 10) + 5);
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

    // Apply development/decline
    rating += potentialRatingChange;

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
            const potential = p.potential !== undefined ? p.potential : Math.min(99, p.rating + Math.floor(Math.random() * 10) + 5);
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
            players
        };
    }
    return updatedTeams;
};
