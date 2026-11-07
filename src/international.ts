import type { NationalTeam, Team, LeagueTableEntry, Fixture, TournamentStage, MatchState, MatchPenalty } from './types';
import { hashSeed, simulateDeterministicQuickMatch, simulateDeterministicSegment, simulateDeterministicShootout } from './engine/matchEngine';
import { createNationalRosterTeam, createNationalTeamTemplate, NATIONAL_ROSTER_CATALOG, type NationalRosterTeam } from './engine/nationalRosters';

export { hydrateNationalTeamsFromCareer, linkNationalRosterIdentitiesToClubTeams, getNationalSquadPool, getRawNationalSquadPool, selectNationalSquad, selectNationalStartingXI, NATIONAL_ROSTER_SNAPSHOT_DATE } from './engine/nationalRosters';

// These are explicit GAME participants. Neither format nor catalog claims real qualification.
// Existing 16 base nations + 15 European extras + the first 17 global extras = 48 unique countries.
export const WORLD_CUP_GAME_COUNTRY_CODES = [
    'ENG', 'FRA', 'BRA', 'ARG', 'ESP', 'GER', 'POR', 'NED', 'ITA', 'USA', 'JPN', 'MAR', 'BEL', 'CRO', 'URU', 'COL',
    'DEN', 'SUI', 'AUT', 'TUR', 'POL', 'HUN', 'SCO', 'CZE', 'SRB', 'ROU', 'SVK', 'SVN', 'GEO', 'UKR', 'ALB',
    'SEN', 'KOR', 'AUS', 'MEX', 'CAN', 'NGA', 'EGY', 'CMR', 'ALG', 'CIV', 'GHA', 'KSA', 'IRN', 'CHI', 'PER', 'ECU', 'CRC',
] as const;
export const EURO_GAME_COUNTRY_CODES = [
    'ENG', 'FRA', 'ESP', 'GER', 'POR', 'NED', 'ITA', 'BEL', 'CRO',
    'DEN', 'SUI', 'AUT', 'TUR', 'POL', 'HUN', 'SCO', 'CZE', 'SRB', 'ROU', 'SVK', 'SVN', 'GEO', 'UKR', 'ALB',
] as const;

// All 48 selectable teams have actual sourced identities, a full source pool and manager-selected roster.
export const NATIONAL_TEAMS: NationalTeam[] = WORLD_CUP_GAME_COUNTRY_CODES.map(createNationalTeamTemplate);
export const EXTRA_EUROPEAN_TEAMS = NATIONAL_ROSTER_CATALOG.filter(n => n.catalogTier === 'european')
    .map(n => ({ name: n.name, flag: n.flag, code: n.countryCode, prestige: n.prestige }));
export const EXTRA_GLOBAL_TEAMS = NATIONAL_ROSTER_CATALOG.filter(n => n.catalogTier === 'global')
    .map(n => ({ name: n.name, flag: n.flag, code: n.countryCode, prestige: n.prestige }));

function createTournament(codes: readonly string[], groupCount: number): Record<string, NationalRosterTeam> {
    if (codes.length !== groupCount * 4 || new Set(codes).size !== codes.length) {
        throw new Error('National game format requires four distinct real countries per group.');
    }
    const teams: Record<string, NationalRosterTeam> = {};
    codes.forEach((code, index) => {
        const team = createNationalRosterTeam(code, String.fromCharCode(65 + Math.floor(index / 4)));
        if (teams[team.name]) throw new Error(`Duplicate national country: ${team.name}`);
        teams[team.name] = team;
    });
    return teams;
}

export const generateWorldCupStructure = (): Record<string, NationalRosterTeam> => createTournament(WORLD_CUP_GAME_COUNTRY_CODES, 12);
export const generateEurosStructure = (): Record<string, NationalRosterTeam> => createTournament(EURO_GAME_COUNTRY_CODES, 6);
export const generateExpandedWorldCupStructure = (): Record<string, NationalRosterTeam> =>
    createTournament(NATIONAL_ROSTER_CATALOG.map(n => n.countryCode), 16);

export const getGroupStandings = (table: LeagueTableEntry[], groups: string[]): Record<string, LeagueTableEntry[]> => {
    const standings: Record<string, LeagueTableEntry[]> = {};
    groups.forEach(g => {
        const groupTeams = table.filter(t => t.group === g);
        groupTeams.sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
        });
        standings[g] = groupTeams;
    });
    return standings;
};

export const extractAdvancingTeams = (
    table: LeagueTableEntry[],
    groups: string[],
    numBestThird: number
): { top2: string[], bestThird: string[] } => {
    const standings = getGroupStandings(table, groups);
    const top2: string[] = [];
    const thirdPlaced: LeagueTableEntry[] = [];
    groups.forEach(g => {
        const sorted = standings[g];
        if (sorted[0]) top2.push(sorted[0].teamName);
        if (sorted[1]) top2.push(sorted[1].teamName);
        if (sorted[2]) thirdPlaced.push(sorted[2]);
    });
    thirdPlaced.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
    });
    const bestThird = thirdPlaced.slice(0, numBestThird).map(t => t.teamName);
    return { top2, bestThird };
};

export const generateSeededKnockoutRound = (
    sortedTeams: string[],
    week: number,
    stage: TournamentStage
): Fixture[] => {
    const fixtures: Fixture[] = [];
    const len = sortedTeams.length;
    for (let i = 0; i < len / 2; i++) {
        fixtures.push({
            id: `ko_${stage}_${week}_${i}`,
            week,
            league: 'International',
            homeTeam: sortedTeams[i],
            awayTeam: sortedTeams[len - 1 - i],
            played: false,
            stage,
            isKnockout: true
        });
    }
    return fixtures;
};

export const sortQualifiedTeams = (
    table: LeagueTableEntry[],
    teamNames: string[]
): string[] => {
    const filtered = table.filter(t => teamNames.includes(t.teamName));
    filtered.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
    });
    return filtered.map(t => t.teamName);
};

export const simulateKnockoutQuickMatch = (homeTeam: Team, awayTeam: Team, fixtureKey = ''): ReturnType<typeof simulateDeterministicQuickMatch> & { wentToExtraTime?: boolean; penaltyWinner?: 'home' | 'away'; penaltyScore?: string; penalties?: MatchPenalty[] } => {
    const regulation = simulateDeterministicQuickMatch(homeTeam, awayTeam, fixtureKey);
    if (regulation.homeGoals !== regulation.awayGoals) return regulation;
    const state: MatchState = {
        currentMinute: 90, homeScore: regulation.homeGoals, awayScore: regulation.awayGoals,
        events: regulation.events, isFinished: false, subsUsed: { home: 0, away: 0 },
        momentum: regulation.events.at(-1)?.momentumAfter ?? 0, tacticalAnalysis: '',
        simulationSeed: hashSeed(`${fixtureKey}|${homeTeam.name}|${awayTeam.name}`),
    };
    // Resolve actual 91–120 minute events; do not add synthetic goals without scorers.
    const extraTime = simulateDeterministicSegment(homeTeam, awayTeam, state, 120, { userTeamName: null });
    const result = {
        ...regulation,
        homeGoals: regulation.homeGoals + extraTime.homeScoreAdded,
        awayGoals: regulation.awayGoals + extraTime.awayScoreAdded,
        events: [...regulation.events, ...extraTime.events],
        wentToExtraTime: true,
    };
    if (result.homeGoals !== result.awayGoals) return result;
    const { homePenalties, awayPenalties, penaltyWinner, penalties } = simulateDeterministicShootout(homeTeam, awayTeam, fixtureKey);
    // Shootout outcome is separate from match-goal/scorer facts and appearance statistics.
    return { ...result, penaltyWinner, penalties, penaltyScore: `${homePenalties}-${awayPenalties}` };
};
