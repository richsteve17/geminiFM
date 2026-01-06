
import type { Fixture, Team } from './types';

const NAMES_BY_NATION: Record<string, { first: string[], last: string[] }> = {
    'EN': {
        first: ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Liam", "Noah", "Oliver", "Elijah", "Lucas", "Mason", "Logan", "Ethan", "Jacob", "Leo"],
        last: ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Taylor", "Anderson", "Thomas", "Hernandez", "Moore", "Martin", "Jackson", "Thompson", "White", "Lopez"]
    },
    'ES': {
        first: ["Antonio", "Jose", "Manuel", "Francisco", "David", "Juan", "Javier", "Daniel", "Carlos", "Jesus", "Alejandro", "Miguel", "Rafael", "Pedro", "Angel", "Pablo", "Sergio", "Fernando", "Luis", "Jorge"],
        last: ["Garcia", "Rodriguez", "Gonzalez", "Fernandez", "Lopez", "Martinez", "Sanchez", "Perez", "Gomez", "Martin", "Jimenez", "Ruiz", "Hernandez", "Diaz", "Moreno", "Muñoz", "Alvarez", "Romero", "Alonso", "Gutierrez"]
    },
    'IT': {
        first: ["Alessandro", "Lorenzo", "Mattia", "Francesco", "Andrea", "Leonardo", "Matteo", "Gabriele", "Riccardo", "Tommaso", "Giuseppe", "Antonio", "Giovanni", "Roberto", "Salvatore", "Luigi", "Mario", "Vincenzo", "Federico", "Marco"],
        last: ["Rossi", "Russo", "Ferrari", "Esposito", "Bianchi", "Romano", "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Gallo", "Conti", "De Luca", "Mancini", "Costa", "Giordano", "Rizzo", "Lombardi", "Moretti"]
    },
    'DE': {
        first: ["Maximilian", "Alexander", "Paul", "Elias", "Luis", "Felix", "Leon", "Lukas", "Niklas", "Tim", "Jan", "Jonas", "Finn", "Ben", "Luca", "David", "Philipp", "Simon", "Julian", "Moritz"],
        last: ["Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker", "Schulz", "Hoffmann", "Schäfer", "Koch", "Bauer", "Richter", "Klein", "Wolf", "Schröder", "Neumann", "Schwarz", "Zimmermann"]
    },
    'FR': {
        first: ["Jean", "Michel", "Pierre", "Philippe", "Alain", "Nicolas", "Christophe", "Patrick", "Christian", "Stéphane", "Sébastien", "Frédéric", "Laurent", "Julien", "Olivier", "Eric", "David", "Thomas", "Thierry", "Vincent"],
        last: ["Martin", "Bernard", "Thomas", "Petit", "Robert", "Richard", "Durand", "Dubois", "Moreau", "Laurent", "Simon", "Michel", "Lefebvre", "Leroy", "Roux", "David", "Bertrand", "Morel", "Fournier", "Girard"]
    },
};

export const generateName = (nationalityCode: string): string => {
    // Map emoji flags or codes to our name lists
    let code = 'EN';
    if (['🇪🇸', '🇦🇷', '🇨🇴', '🇲🇽'].includes(nationalityCode)) code = 'ES';
    else if (['🇮🇹'].includes(nationalityCode)) code = 'IT';
    else if (['🇩🇪', '🇦🇹', '🇨🇭'].includes(nationalityCode)) code = 'DE';
    else if (['🇫🇷', '🇧🇪'].includes(nationalityCode)) code = 'FR';
    else if (['🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇺🇸', '🇨🇦', '🇦🇺'].includes(nationalityCode)) code = 'EN';

    const list = NAMES_BY_NATION[code] || NAMES_BY_NATION['EN'];
    const first = list.first[Math.floor(Math.random() * list.first.length)];
    const last = list.last[Math.floor(Math.random() * list.last.length)];
    return `${first.charAt(0)}. ${last}`;
};

export const generateFixtures = (teams: Team[]): Fixture[] => {
    const fixtures: Fixture[] = [];
    
    // Group by league
    const leagues = Array.from(new Set(teams.map(t => t.league)));

    leagues.forEach(league => {
        const leagueTeams = teams.filter(t => t.league === league).map(t => t.name);
        
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
                    // First half of season
                    fixtures.push({ 
                        id: `${league}-${round}-${home}-${away}`,
                        week: round + 1,
                        league: league as any,
                        homeTeam: home, 
                        awayTeam: away,
                        played: false
                    });
                    
                    // Second half of season (Return fixtures)
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

            // Rotate teams
            const lastTeam = roundTeams.pop();
            if (lastTeam) {
                roundTeams.splice(1, 0, lastTeam);
            }
        }
    });

    return fixtures.sort((a, b) => a.week - b.week);
};

export const generateSwissFixtures = (teams: Team[]): Fixture[] => {
    // A simplified algorithm to guarantee 8 unique matches for 36 teams.
    // We create a single round-robin schedule (35 rounds) and pick 8 rounds from it.
    // Rounds 1-4: Play as scheduled.
    // Rounds 5-8: Play as scheduled but Swap Home/Away to ensure balance.

    const teamNames = teams.map(t => t.name);
    const n = teamNames.length; // 36
    const rounds = 35; // n - 1
    const matchesPerRound = n / 2;
    
    // Generate all rounds
    const allRounds: {home: string, away: string}[][] = [];
    let roundTeams = [...teamNames];

    for (let r = 0; r < rounds; r++) {
        const roundFixtures: {home: string, away: string}[] = [];
        for (let i = 0; i < matchesPerRound; i++) {
            roundFixtures.push({
                home: roundTeams[i],
                away: roundTeams[n - 1 - i]
            });
        }
        allRounds.push(roundFixtures);
        // Rotate
        const last = roundTeams.pop();
        if (last) roundTeams.splice(1, 0, last);
    }

    // Shuffle rounds to ensure randomness in opponents
    const shuffledRounds = allRounds.sort(() => 0.5 - Math.random());
    const selectedRounds = shuffledRounds.slice(0, 8); // Pick 8 rounds

    const fixtures: Fixture[] = [];

    selectedRounds.forEach((roundMatches, index) => {
        const week = index + 1;
        roundMatches.forEach(match => {
            // Weeks 1-4: Normal. Weeks 5-8: Swap Home/Away for variety (though pure round robin already handles home/away balance over 35 games, selecting 8 random ones doesn't guarantee 4H/4A. Swapping manually helps balance).
            // Actually, a simpler heuristic for 4H/4A:
            // If index is even (0, 2, 4, 6) -> Use as is.
            // If index is odd (1, 3, 5, 7) -> Swap.
            
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


// Simple weighted random simulation for background matches
export const simulateQuickMatch = (homeTeam: Team, awayTeam: Team): { homeGoals: number, awayGoals: number } => {
    const homeRating = homeTeam.players.reduce((sum, p) => sum + p.rating, 0) / homeTeam.players.length;
    const awayRating = awayTeam.players.reduce((sum, p) => sum + p.rating, 0) / awayTeam.players.length;
    
    // Home advantage
    const homeAdvantage = 3;
    const ratingDiff = (homeRating + homeAdvantage) - awayRating;
    
    // Base goals
    let homeGoals = 0;
    let awayGoals = 0;

    // Logic: Higher rating diff = more likely to score more
    const baseChance = 0.3; // 30% chance to score per "attempt"
    
    // Simulate 5 "chances" per team, modified by rating
    for(let i=0; i<5; i++) {
        if (Math.random() < baseChance + (ratingDiff * 0.02)) homeGoals++;
        if (Math.random() < baseChance - (ratingDiff * 0.02)) awayGoals++;
    }

    return { homeGoals, awayGoals };
};
