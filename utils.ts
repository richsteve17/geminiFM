import type { Fixture } from './types';

export const generateFixtures = (teamNames: string[]): Fixture[] => {
    const fixtures: Fixture[] = [];
    const teams = [...teamNames];

    if (teams.length % 2 !== 0) {
        teams.push('dummy'); // Add a dummy team for odd numbers to make scheduling easier
    }

    const numTeams = teams.length;
    const rounds = numTeams - 1;
    const matchesPerRound = numTeams / 2;

    for (let round = 0; round < rounds; round++) {
        for (let match = 0; match < matchesPerRound; match++) {
            const home = teams[match];
            const away = teams[numTeams - 1 - match];

            if (home !== 'dummy' && away !== 'dummy') {
                fixtures.push({ homeTeam: home, awayTeam: away });
            }
        }

        // Rotate teams for the next round
        const lastTeam = teams.pop();
        if (lastTeam) {
            teams.splice(1, 0, lastTeam);
        }
    }
    
    // Generate return fixtures
    const returnFixtures = fixtures.map(fixture => ({
        homeTeam: fixture.awayTeam,
        awayTeam: fixture.homeTeam
    }));

    return [...fixtures, ...returnFixtures];
};
