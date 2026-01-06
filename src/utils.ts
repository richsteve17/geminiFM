
import type { Fixture, Team } from './types';

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
    if (['🇪🇸', '🇦🇷', '🇨🇴', '🇲🇽', '🇺🇾'].includes(nationalityCode)) code = 'ES';
    else if (['🇮🇹'].includes(nationalityCode)) code = 'IT';
    else if (['🇩🇪', '🇦🇹', '🇨🇭'].includes(nationalityCode)) code = 'DE';
    else if (['🇫🇷', '🇧🇪', '🇨🇮', '🇸🇳', '🇩🇿'].includes(nationalityCode)) code = 'FR';
    else if (['🇺🇸', '🇨🇦'].includes(nationalityCode)) code = 'US';
    else if (['🏴󠁧󠁢󠁥󠁮󠁧󠁿', '🇦🇺', '🇮🇪', '🏴󠁧󠁢󠁳󠁣󠁴󠁿', '🏴󠁧󠁢󠁷󠁬󠁳󠁿'].includes(nationalityCode)) code = 'EN';

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

export const simulateQuickMatch = (homeTeam: Team, awayTeam: Team): { homeGoals: number, awayGoals: number } => {
    const homeRating = homeTeam.players.length ? homeTeam.players.reduce((sum, p) => sum + p.rating, 0) / homeTeam.players.length : 70;
    const awayRating = awayTeam.players.length ? awayTeam.players.reduce((sum, p) => sum + p.rating, 0) / awayTeam.players.length : 70;
    const homeAdvantage = 3;
    const ratingDiff = (homeRating + homeAdvantage) - awayRating;
    let homeGoals = 0;
    let awayGoals = 0;
    const baseChance = 0.25; 
    for(let i=0; i<5; i++) {
        if (Math.random() < baseChance + (ratingDiff * 0.02)) homeGoals++;
        if (Math.random() < baseChance - (ratingDiff * 0.02)) awayGoals++;
    }
    return { homeGoals, awayGoals };
};
