import type { Player, Team } from '../types';

/** Source payloads live in the pinned catalog; saves retain identity, provenance and actual career state. */
function compactRosterPlayer(player: Player): Player {
    const {
        nationalRosterFacts: _nationalFacts,
        clubRosterFacts: _clubFacts,
        ...careerPlayer
    } = player as Player & { nationalRosterFacts?: unknown; clubRosterFacts?: unknown };
    return careerPlayer;
}

/** Historical export name retained for compatibility; compacts both club and national source copies. */
export function compactNationalTeams(teams: Record<string, Team>) {
    return Object.fromEntries(Object.entries(teams).map(([key, team]) => {
        const { nationalSquadPool: _pool, ...careerTeam } = team as Team & { nationalSquadPool?: unknown };
        return [key, { ...careerTeam, players: team.players.map(compactRosterPlayer) }];
    }));
}

export function serializeCareerSave(value: Record<string, any>): string {
    const result: Record<string, any> = { ...value, teams: compactNationalTeams(value.teams) };
    for (const key of ['internationalTournament', 'prologueArchive']) {
        if (value[key]?.teams) result[key] = { ...value[key], teams: compactNationalTeams(value[key].teams) };
    }
    if (Array.isArray(value.transferMarket)) result.transferMarket = value.transferMarket.map(compactRosterPlayer);
    return JSON.stringify(result);
}
