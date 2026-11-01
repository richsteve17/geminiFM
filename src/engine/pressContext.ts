import type { Fixture, LeagueTableEntry, MatchState, Team } from '../types';
import type { PressConferenceContext, PressRecentResult } from './pressConference';
import { getRivalry } from './footballCulture';
export function buildPressContext(fixture: Fixture, state: MatchState, team: Team, opponent: Team | undefined, table: LeagueTableEntry[], fixtures: Fixture[]): PressConferenceContext {
    const userWasHome = fixture.homeTeam === team.name;
    const userGoals = userWasHome ? state.homeScore : state.awayScore;
    const opponentGoals = userWasHome ? state.awayScore : state.homeScore;
    const competitionTable = table.filter(row => row.league === fixture.league).sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.teamName.localeCompare(b.teamName));
    const index = competitionTable.findIndex(row => row.teamName === team.name);
    const recentResults: PressRecentResult[] = fixtures.filter(f => f.id !== fixture.id && f.played && f.score && (f.homeTeam === team.name || f.awayTeam === team.name))
        .sort((a, b) => b.week - a.week).slice(0, 5).flatMap(f => {
            const match = f.score?.match(/^(\d+)\s*-\s*(\d+)/);
            if (!match) return [];
            const home = f.homeTeam === team.name, mine = Number(match[home ? 1 : 2]), theirs = Number(match[home ? 2 : 1]);
            return [{ opponent: home ? f.awayTeam : f.homeTeam, score: `${mine}-${theirs}`, result: mine > theirs ? 'won' as const : mine < theirs ? 'lost' as const : 'drew' as const, competition: f.league }];
        });
    const derby = getRivalry(fixture.homeTeam, fixture.awayTeam);
    return {
        sessionId: `press-${fixture.id}-${state.sessionId || state.simulationSeed || 'final'}`,
        fixture: { fixtureId: fixture.id, competition: fixture.league, stage: fixture.stage, week: fixture.week, homeTeam: fixture.homeTeam, awayTeam: fixture.awayTeam, userTeam: team.name, userWasHome, userGoals, opponentGoals, result: userGoals > opponentGoals ? 'won' : userGoals < opponentGoals ? 'lost' : 'drew' },
        formation: team.tactic.formation, mentality: team.tactic.mentality, tacticalSummary: state.tacticalAnalysis,
        events: state.events.map(({ minute, type, teamName, player, description, scoreAfter }) => ({ minute, type, teamName, player, description, scoreAfter })),
        table: index >= 0 ? { position: index + 1, teamCount: competitionTable.length, points: competitionTable[index].points } : undefined,
        recentResults, activePromises: team.activePromises || [],
        validPlayerNames: [...new Set([...team.players, ...(opponent?.players || [])].map(player => player.name))],
        derby: derby ? { name: derby.name, scrutiny: 'Documented derby rivalry magnifies discipline, identity, result and tactical scrutiny.' } : undefined,
    };
}
