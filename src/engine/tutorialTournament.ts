import type { Fixture, LeagueTableEntry, Team, TournamentStage } from '../types';
import { extractAdvancingTeams, generateSeededKnockoutRound, simulateKnockoutQuickMatch, sortQualifiedTeams } from '../international';
function winner(f: Fixture): string | undefined {
    if (!f.played || !f.score) return;
    const [home, away] = f.score.split('-').map(Number);
    if (!Number.isFinite(home) || !Number.isFinite(away)) return;
    return home > away ? f.homeTeam : away > home ? f.awayTeam : f.penaltyWinner === 'home' ? f.homeTeam : f.penaltyWinner === 'away' ? f.awayTeam : undefined;
}
/** Elimination ends the manager tutorial, not the rest of the international tournament's factual ledger. */
export function completeTutorialTournament(teams: Record<string, Team>, observed: Fixture[]) {
    const fixtures = observed.map(f => ({ ...f }));
    const final = fixtures.find(f => f.stage === 'Final' && f.played);
    if (final) return { fixtures, champion: winner(final) };
    const groups = [...new Set(Object.values(teams).map(t => t.group).filter(Boolean))] as string[];
    if (groups.length !== 12 || groups.some(g => fixtures.filter(f => f.stage === 'Group Stage' && teams[f.homeTeam]?.group === g && f.played).length < 6)) return { fixtures, champion: undefined };
    const rows: LeagueTableEntry[] = Object.values(teams).map(t => ({ teamName: t.name, league: 'International', group: t.group, played: 0, won: 0, drawn: 0, lost: 0, points: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0 }));
    for (const f of fixtures.filter(f => f.stage === 'Group Stage' && f.played && f.score)) {
        const [home, away] = f.score!.split('-').map(Number);
        for (const [name, gf, ga] of [[f.homeTeam, home, away], [f.awayTeam, away, home]] as [string, number, number][]) {
            const row = rows.find(r => r.teamName === name); if (!row) continue;
            row.played++; row.goalsFor += gf; row.goalsAgainst += ga; row.goalDifference = row.goalsFor - row.goalsAgainst;
            if (gf > ga) { row.won++; row.points += 3; } else if (gf === ga) { row.drawn++; row.points++; } else row.lost++;
        }
    }
    const advancing = extractAdvancingTeams(rows, groups, 8);
    let qualified = sortQualifiedTeams(rows, [...advancing.top2, ...advancing.bestThird]);
    const rounds: [number, TournamentStage][] = [[4, 'Round of 32'], [5, 'Round of 16'], [6, 'Quarter Final'], [7, 'Semi Final'], [8, 'Final']];
    for (const [week, stage] of rounds) {
        const known = fixtures.filter(f => f.stage === stage);
        const round = known.length ? known : generateSeededKnockoutRound(qualified, week, stage);
        const winners: string[] = [];
        for (const original of round) {
            let fixture = original;
            if (!fixture.played) {
                const home = teams[fixture.homeTeam], away = teams[fixture.awayTeam];
                if (!home || !away) return { fixtures, champion: undefined };
                const result = simulateKnockoutQuickMatch(home, away, fixture.id);
                fixture = { ...fixture, played: true, score: `${result.homeGoals}-${result.awayGoals}`, penaltyWinner: result.penaltyWinner, penalties: result.penalties, events: result.events, participantNames: result.participantNames, goalkeeperNames: result.goalkeeperNames };
                const index = fixtures.findIndex(f => f.id === fixture.id); if (index < 0) fixtures.push(fixture); else fixtures[index] = fixture;
            }
            const nation = winner(fixture); if (nation) winners.push(nation);
        }
        qualified = winners;
    }
    return { fixtures: fixtures.sort((a, b) => a.week - b.week), champion: qualified[0] };
}
