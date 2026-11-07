import type { Fixture, LeagueTableEntry, LeagueTier, MatchState, Team, TournamentStage } from '../types';
import { hashSeed, simulateDeterministicQuickMatch, simulateDeterministicSegment, simulateDeterministicShootout } from './matchEngine';

export const CL_RESERVED_WEEKS = [5, 9, 13, 17, 21, 25, 29, 33] as const;
export const MLS_PLAYOFF_ID = 'mls-playoffs-2026-format';
export const MLS_SCHEDULE_PROVENANCE = 'Synthetic game-week schedule using official 2026 format; not official opponents or fixture dates.';
export type MLSConference = 'Eastern' | 'Western';
export const MLS_CONFERENCES: Record<MLSConference, readonly string[]> = {
    Eastern: ['Atlanta United', 'Charlotte FC', 'Chicago Fire FC', 'FC Cincinnati', 'Columbus Crew', 'D.C. United', 'Inter Miami CF', 'CF Montréal', 'Nashville SC', 'New England Revolution', 'New York City FC', 'Orlando City SC', 'Philadelphia Union', 'Red Bull New York', 'Toronto FC'],
    Western: ['Austin FC', 'Colorado Rapids', 'FC Dallas', 'Houston Dynamo FC', 'Los Angeles Football Club', 'LA Galaxy', 'Minnesota United FC', 'Portland Timbers', 'Real Salt Lake', 'St. Louis CITY SC', 'San Diego FC', 'San Jose Earthquakes', 'Seattle Sounders FC', 'Sporting Kansas City', 'Vancouver Whitecaps FC'],
};
const normalize = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const aliases: Record<string, string> = {
    'Inter Miami': 'Inter Miami CF', NYCFC: 'New York City FC', 'Chicago Fire': 'Chicago Fire FC',
    'NY Red Bulls': 'Red Bull New York', 'New York Red Bulls': 'Red Bull New York', 'New York RB': 'Red Bull New York',
    LAFC: 'Los Angeles Football Club', 'Los Angeles FC': 'Los Angeles Football Club', 'Seattle Sounders': 'Seattle Sounders FC',
    'Houston Dynamo': 'Houston Dynamo FC', 'Minnesota United': 'Minnesota United FC', 'Vancouver Whitecaps': 'Vancouver Whitecaps FC',
    'St Louis City': 'St. Louis CITY SC', 'St. Louis City SC': 'St. Louis CITY SC', 'CF Montreal': 'CF Montréal', 'Montreal Impact': 'CF Montréal',
    'Orlando City': 'Orlando City SC', 'DC United': 'D.C. United',
};
const canonical = (name: string) => normalize(Object.entries(aliases).find(([alias]) => normalize(alias) === normalize(name))?.[1] ?? name);
export function getMLSConference(team: Team | string): MLSConference | undefined {
    const key = canonical(typeof team === 'string' ? team : team.name);
    return (Object.keys(MLS_CONFERENCES) as MLSConference[]).find(c => MLS_CONFERENCES[c].some(n => normalize(n) === key));
}
function conferenceTeams(teams: Team[]): Record<MLSConference, Team[]> {
    const result: Record<MLSConference, Team[]> = { Eastern: [], Western: [] };
    for (const team of teams.filter(t => t.league === 'MLS')) {
        const conference = getMLSConference(team);
        if (!conference) throw new Error(`Unknown MLS 2026 conference membership: ${team.name}`);
        result[conference].push(team);
    }
    for (const c of ['Eastern', 'Western'] as const) {
        result[c].sort((a, b) => canonical(a.name).localeCompare(canonical(b.name)));
        if (result[c].length !== 15 || new Set(result[c].map(t => canonical(t.name))).size !== 15) throw new Error('MLS 2026 scheduling requires all 30 distinct clubs, 15 in each conference.');
    }
    return result;
}
function roundRobin(names: string[], league: LeagueTier): Fixture[] {
    if (names.length < 2) return [];
    const ring: Array<string | null> = [...names];
    if (ring.length % 2) ring.push(null);
    const rounds = ring.length - 1, fixtures: Fixture[] = [];
    for (let r = 0; r < rounds; r++) {
        for (let i = 0; i < ring.length / 2; i++) {
            const a = ring[i], b = ring[ring.length - 1 - i];
            if (a === null || b === null) continue;
            const [home, away] = (r + i) % 2 ? [b, a] : [a, b];
            for (const [week, h, v] of [[r + 1, home, away], [r + 1 + rounds, away, home]] as const) {
                fixtures.push({ id: `${league}-${week}-${h}-${v}`, league, week, homeTeam: h, awayTeam: v, played: false });
            }
        }
        ring.splice(1, 0, ring.pop()!);
    }
    return fixtures;
}
/** New/next seasons only. No provider calls, mutation, calendar dates or invented division movement. */
export function generateDomesticFixtures(teams: Team[]): Fixture[] {
    const fixtures: Fixture[] = [];
    for (const league of new Set(teams.map(t => t.league))) {
        if (league === 'International' || league === 'Champions League') continue;
        const members = teams.filter(t => t.league === league);
        if (new Set(members.map(t => t.name)).size !== members.length) throw new Error(`Duplicate team names in ${league}`);
        if (league !== 'MLS') { fixtures.push(...roundRobin(members.map(t => t.name), league)); continue; }
        const conferences = conferenceTeams(members);
        for (const c of ['Eastern', 'Western'] as const) fixtures.push(...roundRobin(conferences[c].map(t => t.name), 'MLS'));
        // Two 15-team conference round robins take 30 slots (two byes per club).
        // Six bipartite perfect matchings add six distinct opponents and 3 home/3 away.
        for (let r = 0; r < 6; r++) for (let i = 0; i < 15; i++) {
            const east = conferences.Eastern[i].name, west = conferences.Western[(i + r) % 15].name;
            const [homeTeam, awayTeam] = r % 2 ? [west, east] : [east, west];
            fixtures.push({ id: `MLS-cross-${r}-${homeTeam}-${awayTeam}`, league: 'MLS', week: 31 + r, homeTeam, awayTeam, played: false });
        }
    }
    return fixtures.sort((a, b) => a.week - b.week || a.id.localeCompare(b.id));
}
export const getDomesticSeasonLength = (fixtures: Fixture[]) => Math.max(0, ...fixtures.filter(f => f.league !== 'International' && f.league !== 'Champions League').map(f => f.week));
/** Map an ordinal slot to a real game week by skipping the reserved European slots. */
export function domesticSlotToWeek(slot: number): number {
    let week = slot;
    for (const reserved of CL_RESERVED_WEEKS) if (week >= reserved) week++;
    return week;
}
export const isMLSPlayoffFixture = (fixture: Fixture) => fixture.league === 'MLS' && fixture.tournamentId === MLS_PLAYOFF_ID;
export function getMLSPlayoffMatchRules(fixture: Fixture) {
    if (!isMLSPlayoffFixture(fixture)) return undefined;
    const directPenalties = fixture.stage === 'Play-offs' || fixture.stage === 'Round of 16';
    return { label: fixture.stage === 'Play-offs' ? 'MLS Wild Card' : fixture.stage === 'Round of 16' ? 'MLS Round One Best-of-3' : fixture.stage === 'Quarter Final' ? 'MLS Conference Semifinal' : fixture.stage === 'Semi Final' ? 'MLS Conference Final' : 'MLS Cup', extraTime: !directPenalties, aggregate: false, winsRequired: fixture.stage === 'Round of 16' ? 2 : 1 };
}
export function resolveMLSPlayoffMatch(fixture: Fixture, home: Team, away: Team) {
    const rules = getMLSPlayoffMatchRules(fixture);
    if (!rules) throw new Error('Not an MLS postseason fixture');
    let result = simulateDeterministicQuickMatch(home, away, fixture.id);
    if (result.homeGoals === result.awayGoals && rules.extraTime) {
        const state: MatchState = { currentMinute: 90, homeScore: result.homeGoals, awayScore: result.awayGoals, events: result.events, isFinished: false, subsUsed: { home: 0, away: 0 }, momentum: result.events.at(-1)?.momentumAfter ?? 0, tacticalAnalysis: '', simulationSeed: hashSeed(`${fixture.id}|${home.name}|${away.name}`) };
        const extra = simulateDeterministicSegment(home, away, state, 120, { userTeamName: null });
        result = { ...result, homeGoals: result.homeGoals + extra.homeScoreAdded, awayGoals: result.awayGoals + extra.awayScoreAdded, events: [...result.events, ...extra.events] };
    }
    const shootout = result.homeGoals === result.awayGoals ? simulateDeterministicShootout(home, away, fixture.id) : undefined;
    return { ...fixture, played: true, score: `${result.homeGoals}-${result.awayGoals}`, events: result.events, participantNames: result.participantNames, goalkeeperNames: result.goalkeeperNames, penaltyWinner: shootout?.penaltyWinner, penalties: shootout?.penalties };
}
export function getFixtureWinner(f: Fixture): string | undefined {
    if (!f.played || !f.score) return undefined;
    const match = f.score.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!match) return undefined;
    const [, h, a] = match;
    return +h > +a ? f.homeTeam : +a > +h ? f.awayTeam : f.penaltyWinner === 'home' ? f.homeTeam : f.penaltyWinner === 'away' ? f.awayTeam : undefined;
}
export interface MLSStanding extends LeagueTableEntry {
    conference: MLSConference;
    awayGoalsFor: number; awayGoalsAgainst: number; homeGoalsFor: number; homeGoalsAgainst: number;
    disciplinaryPointsPerMatch: number;
}
export interface MLSStandingsOptions {
    /** Supply an authoritative full foul/card/staff ledger; absent data is neutral, not claimed official. */
    disciplinaryPoints?: Record<string, number>;
    /** Use only when matches were actually cancelled, not just unplayed. */
    cancelledMatches?: boolean;
    drawSeed?: string;
}
export function getMLSStandings(teams: Team[], fixtures: Fixture[], options: MLSStandingsOptions = {}): MLSStanding[] {
    const rows: MLSStanding[] = teams.filter(t => t.league === 'MLS').map(t => ({ teamName: t.name, league: 'MLS', conference: getMLSConference(t)!, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0, awayGoalsFor: 0, awayGoalsAgainst: 0, homeGoalsFor: 0, homeGoalsAgainst: 0, disciplinaryPointsPerMatch: 0 }));
    for (const f of fixtures.filter(f => f.league === 'MLS' && !f.isKnockout && !isMLSPlayoffFixture(f) && f.played)) {
        const match = f.score?.match(/^(\d+)\s*-\s*(\d+)$/);
        if (!match) continue;
        const home = +match[1], away = +match[2];
        for (const [name, gf, ga, side] of [[f.homeTeam, home, away, 'home'], [f.awayTeam, away, home, 'away']] as const) {
            const row = rows.find(r => r.teamName === name); if (!row) continue;
            row.played++; row.goalsFor += gf; row.goalsAgainst += ga; row.goalDifference = row.goalsFor - row.goalsAgainst;
            if (gf > ga) { row.won++; row.points += 3; } else if (gf === ga) { row.drawn++; row.points++; } else row.lost++;
            if (side === 'home') { row.homeGoalsFor += gf; row.homeGoalsAgainst += ga; } else { row.awayGoalsFor += gf; row.awayGoalsAgainst += ga; }
        }
    }
    for (const row of rows) row.disciplinaryPointsPerMatch = (options.disciplinaryPoints?.[row.teamName] ?? 0) / Math.max(1, row.played);
    const rate = (r: MLSStanding, value: number) => value / (options.cancelledMatches ? Math.max(1, r.played) : 1);
    const keys = (r: MLSStanding) => [rate(r, r.points), rate(r, r.won), rate(r, r.goalDifference), rate(r, r.goalsFor), -r.disciplinaryPointsPerMatch, rate(r, r.awayGoalsFor - r.awayGoalsAgainst), rate(r, r.awayGoalsFor), rate(r, r.homeGoalsFor - r.homeGoalsAgainst), rate(r, r.homeGoalsFor), hashSeed(`${options.drawSeed ?? 'MLS-2026-lots'}|${r.teamName}`)];
    return rows.sort((a, b) => { const ak = keys(a), bk = keys(b); for (let i = 0; i < ak.length; i++) if (ak[i] !== bk[i]) return bk[i] - ak[i]; return a.teamName.localeCompare(b.teamName); });
}
/** Stateless, save-compatible progression: returns ONLY missing next fixtures; never changes results. */
export function generateMLSPlayoffFixtures(teams: Team[], fixtures: Fixture[], nextWeek: number): Fixture[] {
    const mls = teams.filter(t => t.league === 'MLS');
    if (mls.length !== 30) return []; // Preserve incomplete legacy careers; never invent memberships.
    conferenceTeams(mls);
    const regular = fixtures.filter(f => f.league === 'MLS' && !f.isKnockout && !isMLSPlayoffFixture(f));
    if (!regular.length || regular.some(f => !f.played)) return [];
    const standings = getMLSStandings(mls, regular);
    if (standings.some(r => r.played !== 34)) return [];
    const seeded = { Eastern: standings.filter(r => r.conference === 'Eastern'), Western: standings.filter(r => r.conference === 'Western') };
    const existing = fixtures.filter(isMLSPlayoffFixture), additions: Fixture[] = [];
    const add = (id: string, stage: TournamentStage, homeTeam: string, awayTeam: string) => {
        if (!fixtures.some(f => f.id === id)) additions.push({ id, week: nextWeek, league: 'MLS', homeTeam, awayTeam, played: false, stage, isKnockout: true, tournamentId: MLS_PLAYOFF_ID });
    };
    const pair = (id: string, stage: TournamentStage, a: string, b: string, c: MLSConference) => {
        const rank = (n: string) => seeded[c].findIndex(r => r.teamName === n);
        const [home, away] = rank(a) < rank(b) ? [a, b] : [b, a]; add(id, stage, home, away);
    };
    for (const c of ['Eastern', 'Western'] as const) {
        const names = seeded[c].map(r => r.teamName), prefix = `MLS-${c}`;
        const wcId = `${prefix}-wild-card`, wc = existing.find(f => f.id === wcId);
        if (!wc) { add(wcId, 'Play-offs', names[7], names[8]); continue; }
        const wcWinner = getFixtureWinner(wc); if (!wcWinner) continue;
        const opponents = [[names[0], wcWinner], [names[1], names[6]], [names[2], names[5]], [names[3], names[4]]];
        const winners: string[] = [];
        opponents.forEach(([high, low], index) => {
            const games = existing.filter(f => f.id.startsWith(`${prefix}-round-one-${index}-game-`)).sort((a, b) => a.week - b.week);
            const counts = new Map<string, number>();
            for (const game of games) { const winner = getFixtureWinner(game); if (winner) counts.set(winner, (counts.get(winner) ?? 0) + 1); }
            const won = [high, low].find(n => (counts.get(n) ?? 0) >= 2);
            if (won) { winners[index] = won; return; }
            if (games.some(f => !getFixtureWinner(f))) return;
            const game = games.length + 1;
            if (game <= 3) add(`${prefix}-round-one-${index}-game-${game}`, 'Round of 16', game === 2 ? low : high, game === 2 ? high : low);
        });
        if ([0, 1, 2, 3].some(i => !winners[i])) continue;
        const semiIds = [`${prefix}-semi-0`, `${prefix}-semi-1`];
        pair(semiIds[0], 'Quarter Final', winners[0], winners[3], c);
        pair(semiIds[1], 'Quarter Final', winners[1], winners[2], c);
        const semis = semiIds.map(id => existing.find(f => f.id === id));
        const semiWinners = semis.map(f => f && getFixtureWinner(f));
        if (semiWinners.every(Boolean)) pair(`${prefix}-final`, 'Semi Final', semiWinners[0]!, semiWinners[1]!, c);
    }
    const champions = (['Eastern', 'Western'] as const).map(c => existing.find(f => f.id === `MLS-${c}-final`)).map(f => f && getFixtureWinner(f));
    if (champions.every(Boolean)) {
        const [a, b] = champions as string[];
        const [home, away] = standings.findIndex(r => r.teamName === a) < standings.findIndex(r => r.teamName === b) ? [a, b] : [b, a];
        add('MLS-cup-final', 'Final', home, away);
    }
    return additions;
}
export function getMLSSeasonHonors(teams: Team[], fixtures: Fixture[], teamName: string): string[] {
    const honors: string[] = [];
    const standings = getMLSStandings(teams, fixtures);
    if (standings[0]?.teamName === teamName && standings.every(r => r.played === 34)) honors.push('MLS Supporters’ Shield');
    const cup = fixtures.find(f => isMLSPlayoffFixture(f) && f.id === 'MLS-cup-final');
    if (cup && getFixtureWinner(cup) === teamName) honors.push('MLS Cup Champion');
    return honors;
}
export function createSeasonTable(teams: Record<string, Team>, clParticipants: string[]): LeagueTableEntry[] {
    const rows = Object.values(teams).filter(t => t.league !== 'International' && t.league !== 'Champions League').map(t => ({ teamName: t.name, league: t.league }));
    rows.push(...clParticipants.map(teamName => ({ teamName, league: 'Champions League' as const })));
    return rows.map(row => ({ ...row, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }));
}
