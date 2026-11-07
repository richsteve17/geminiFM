import type { Team } from '../types';
/** Snapshot provenance is bundled with the game; a save records selected players, identities and actual career state. */
export function compactNationalTeams(teams: Record<string, Team>) {
    return Object.fromEntries(Object.entries(teams).map(([key, team]) => {
        if (team.league !== 'International') return [key, team];
        const { nationalSquadPool: _pool, ...rest } = team as Team & { nationalSquadPool?: unknown };
        return [key, { ...rest, players: team.players.map(player => {
            const { nationalRosterFacts: _facts, gameDerived: _derived, ...careerPlayer } = player as typeof player & { nationalRosterFacts?: unknown; gameDerived?: unknown };
            return careerPlayer;
        }) }];
    }));
}
export function serializeCareerSave(value: Record<string, any>): string {
    const result = { ...value, teams: compactNationalTeams(value.teams) };
    for (const key of ['internationalTournament', 'prologueArchive']) {
        if (value[key]?.teams) result[key] = { ...value[key], teams: compactNationalTeams(value[key].teams) };
    }
    return JSON.stringify(result);
}
