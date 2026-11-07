import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Fixture, LeagueTier, Player, Team } from '../types';
import { generateFixtures } from '../utils';
import { CL_RESERVED_WEEKS, MLS_CONFERENCES, MLS_PLAYOFF_ID, createSeasonTable, domesticSlotToWeek, generateDomesticFixtures, generateMLSPlayoffFixtures, getDomesticSeasonLength, getFixtureWinner, getMLSConference, getMLSPlayoffMatchRules, getMLSSeasonHonors, getMLSStandings, isMLSPlayoffFixture, resolveMLSPlayoffMatch } from '../engine/domesticSeason';

const player = (name: string, position: Player['position']): Player => ({ name, position, rating: 75, age: 25, nationality: 'USA', wage: 1000, personality: 'Professional', status: { type: 'Available' }, effects: [], contractExpires: 3, isStarter: true, condition: 100 });
const team = (name: string, league: LeagueTier = 'MLS'): Team => ({ name, league, players: [player(`${name} keeper`, 'GK'), player(`${name} striker`, 'ST')], tactic: { formation: '4-4-2', mentality: 'Balanced' }, prestige: 60, chairmanPersonality: 'Traditionalist', balance: 100000, objectives: [], activePromises: [] });
const mlsTeams = () => [...MLS_CONFERENCES.Eastern, ...MLS_CONFERENCES.Western].map(n => team(n));
const playedRegular = (teams: Team[]) => generateDomesticFixtures(teams).map(f => ({ ...f, played: true, score: '0-0' }));
const finished = (f: Fixture, winner = f.homeTeam) => ({ ...f, played: true, score: winner === f.homeTeam ? '1-0' : '0-1' });
const noDoubleBooking = (fixtures: Fixture[]) => {
    const used = new Set<string>();
    for (const f of fixtures) for (const name of [f.homeTeam, f.awayTeam]) {
        const key = `${f.week}|${name}`; expect(used.has(key)).toBe(false); used.add(key);
    }
};

describe('domestic fixture contracts', () => {
    it.each([['Premier League', 20, 38], ['Championship', 24, 46], ['La Liga', 20, 38], ['Serie A', 20, 38], ['Bundesliga', 18, 34], ['Ligue 1', 18, 34]] as const)('creates a complete %s home-away calendar', (league, n, weeks) => {
        const teams = Array.from({ length: n }, (_, i) => team(`${league} ${i}`, league));
        const before = structuredClone(teams), fixtures = generateDomesticFixtures(teams);
        expect(teams).toEqual(before); expect(fixtures).toHaveLength(n * (n - 1));
        expect(getDomesticSeasonLength(fixtures)).toBe(weeks);
        expect(new Set(fixtures.map(f => f.id)).size).toBe(fixtures.length);
        noDoubleBooking(fixtures);
        for (const t of teams) {
            expect(fixtures.filter(f => f.homeTeam === t.name)).toHaveLength(n - 1);
            expect(fixtures.filter(f => f.awayTeam === t.name)).toHaveLength(n - 1);
            for (const other of teams.filter(other => other.name !== t.name)) expect(fixtures.filter(f => f.homeTeam === t.name && f.awayTeam === other.name)).toHaveLength(1);
        }
        expect(generateFixtures(teams)).toEqual(fixtures);
    });
    it('handles odd team counts with byes, including a real club named dummy', () => {
        const fixtures = generateDomesticFixtures(['dummy', 'B', 'C', 'D', 'E'].map(n => team(n, 'Premier League')));
        expect(fixtures).toHaveLength(20); expect(getDomesticSeasonLength(fixtures)).toBe(10); noDoubleBooking(fixtures);
        expect(fixtures.filter(f => f.homeTeam === 'dummy' || f.awayTeam === 'dummy')).toHaveLength(8);
    });
    it('excludes international and Champions League teams from domestic leagues', () => {
        expect(generateDomesticFixtures([team('England', 'International'), team('Europe only', 'Champions League')])).toEqual([]);
        expect(getDomesticSeasonLength([])).toBe(0);
    });
    it('skips actual reserved game weeks rather than applying incorrect ordinal thresholds', () => {
        const mapped = Array.from({ length: 46 }, (_, i) => domesticSlotToWeek(i + 1));
        expect(mapped).toEqual(Array.from({ length: 54 }, (_, i) => i + 1).filter(w => !(CL_RESERVED_WEEKS as readonly number[]).includes(w)));
        expect(domesticSlotToWeek(8)).toBe(10); expect(mapped.at(-1)).toBe(54);
    });
    it('creates separate composite table rows for European participants', () => {
        const a = team('A', 'Premier League'), b = team('B', 'Champions League');
        const rows = createSeasonTable({ A: a, B: b }, ['A', 'B']);
        expect(rows.map(r => `${r.league}|${r.teamName}`)).toEqual(['Premier League|A', 'Champions League|A', 'Champions League|B']);
    });
});

describe('MLS 2026 regular season', () => {
    it('has 510 matches, 34 per club, 17 home/away, 28 intraconference and six distinct cross-conference opponents', () => {
        const teams = mlsTeams(), fixtures = generateDomesticFixtures(teams);
        expect(fixtures).toHaveLength(510); expect(getDomesticSeasonLength(fixtures)).toBe(36); noDoubleBooking(fixtures);
        expect(fixtures.every(f => !f.isKnockout && !isMLSPlayoffFixture(f))).toBe(true);
        for (const t of teams) {
            const games = fixtures.filter(f => f.homeTeam === t.name || f.awayTeam === t.name);
            expect(games).toHaveLength(34); expect(games.filter(f => f.homeTeam === t.name)).toHaveLength(17);
            const opponents = games.map(f => f.homeTeam === t.name ? f.awayTeam : f.homeTeam);
            const own = getMLSConference(t), cross = opponents.filter(n => getMLSConference(n) !== own);
            expect(cross).toHaveLength(6); expect(new Set(cross).size).toBe(6);
            for (const other of teams.filter(o => getMLSConference(o) === own && o.name !== t.name)) {
                expect(games.filter(f => f.homeTeam === t.name && f.awayTeam === other.name)).toHaveLength(1);
                expect(games.filter(f => f.awayTeam === t.name && f.homeTeam === other.name)).toHaveLength(1);
            }
        }
        expect(generateDomesticFixtures([...teams].reverse())).toEqual(fixtures);
    });
    it('supports legacy club aliases without silently accepting unknown or incomplete memberships', () => {
        expect(getMLSConference('NY Red Bulls')).toBe('Eastern'); expect(getMLSConference('LAFC')).toBe('Western');
        expect(getMLSConference('Inter Miami')).toBe('Eastern'); expect(getMLSConference('Seattle Sounders')).toBe('Western');
        expect(() => generateDomesticFixtures(mlsTeams().slice(0, 29))).toThrow(/30 distinct clubs/);
        expect(() => generateDomesticFixtures([...mlsTeams().slice(0, 29), team('Unknown FC')])).toThrow(/Unknown MLS/);
    });
    it('uses wins before goal difference, then goals and discipline, excluding playoffs', () => {
        const teams = [team('Atlanta United'), team('Charlotte FC'), team('Chicago Fire FC')];
        const game = (id: string, homeTeam: string, awayTeam: string, score: string): Fixture => ({ id, week: 1, league: 'MLS', homeTeam, awayTeam, played: true, score });
        const games = [game('1', teams[0].name, 'Opponent', '1-0'), game('2', teams[0].name, 'Opponent', '0-5'), ...[3, 4, 5].map(i => game(`${i}`, teams[1].name, 'Opponent', '4-4'))];
        expect(getMLSStandings(teams, games)[0].teamName).toBe(teams[0].name);
        const ties = [game('a', teams[0].name, 'Opponent', '1-1'), game('b', teams[1].name, 'Opponent', '1-1')];
        const rows = getMLSStandings(teams.slice(0, 2), [...ties, { ...game('ko', teams[0].name, teams[1].name, '20-0'), isKnockout: true, tournamentId: MLS_PLAYOFF_ID }], { disciplinaryPoints: { [teams[0].name]: 10, [teams[1].name]: 2 } });
        expect(rows[0].teamName).toBe(teams[1].name); expect(rows.every(r => r.played === 1)).toBe(true);
    });
});

describe('MLS conference playoffs', () => {
    it('qualifies only conference seeds 8/9 for wild cards, seeds 1-7 await Round One; pending results never advance', () => {
        const teams = mlsTeams(), regular = playedRegular(teams), seeds = getMLSStandings(teams, regular);
        expect(generateMLSPlayoffFixtures(teams, generateDomesticFixtures(teams), 37)).toEqual([]);
        const wilds = generateMLSPlayoffFixtures(teams, regular, 37); expect(wilds).toHaveLength(2);
        for (const f of wilds) {
            const conference = getMLSConference(f.homeTeam), confSeeds = seeds.filter(s => s.conference === conference);
            expect([f.homeTeam, f.awayTeam]).toEqual([confSeeds[7].teamName, confSeeds[8].teamName]);
            expect(getMLSPlayoffMatchRules(f)).toMatchObject({ label: 'MLS Wild Card', extraTime: false, aggregate: false });
        }
        expect(generateMLSPlayoffFixtures(teams, [...regular, ...wilds], 38)).toEqual([]);
        expect(generateMLSPlayoffFixtures(teams.slice(0, 12), regular, 37)).toEqual([]);
        expect(getFixtureWinner({ ...wilds[0], played: true, score: '0-0' })).toBeUndefined();
    });
    it('progresses best-of-three by match wins, with home-away-home and conditional game three, then fixed brackets and Cup hosting', () => {
        const teams = mlsTeams(), ledger = playedRegular(teams), seeds = getMLSStandings(teams, ledger);
        const wilds = generateMLSPlayoffFixtures(teams, ledger, 37).map(f => finished(f, f.awayTeam)); ledger.push(...wilds);
        const first = generateMLSPlayoffFixtures(teams, ledger, 38); expect(first).toHaveLength(8);
        for (const c of ['Eastern', 'Western'] as const) {
            const n = seeds.filter(s => s.conference === c).map(s => s.teamName), games = first.filter(f => getMLSConference(f.homeTeam) === c);
            expect(games.map(f => [f.homeTeam, f.awayTeam])).toEqual([[n[0], n[8]], [n[1], n[6]], [n[2], n[5]], [n[3], n[4]]]);
        }
        ledger.push(...first.map(f => finished(f)));
        const second = generateMLSPlayoffFixtures(teams, ledger, 39); expect(second).toHaveLength(8);
        expect(second[0].homeTeam).toBe(first[0].awayTeam); expect(second[0].awayTeam).toBe(first[0].homeTeam);
        // One split series needs game three; the seven swept series must not get one.
        ledger.push(...second.map((f, i) => finished(f, i === 0 ? f.homeTeam : f.awayTeam)));
        const next = generateMLSPlayoffFixtures(teams, ledger, 40);
        const third = next.filter(f => f.stage === 'Round of 16'); expect(third).toHaveLength(1);
        expect(third[0].homeTeam).toBe(first[0].homeTeam);
        ledger.push(...next.map(f => finished(f)));
        for (let week = 41; week < 47; week++) {
            const added = generateMLSPlayoffFixtures(teams, ledger, week);
            ledger.push(...added.map(f => finished(f)));
        }
        const playoffs = ledger.filter(isMLSPlayoffFixture); noDoubleBooking(playoffs);
        expect(playoffs.filter(f => f.stage === 'Quarter Final')).toHaveLength(4);
        const eastSemi = playoffs.find(f => f.id === 'MLS-Eastern-semi-0')!;
        expect([eastSemi.homeTeam, eastSemi.awayTeam]).toEqual([first[0].homeTeam, first[3].homeTeam]);
        const cup = playoffs.find(f => f.id === 'MLS-cup-final')!;
        expect(cup).toBeDefined(); expect(getMLSPlayoffMatchRules(cup)).toMatchObject({ label: 'MLS Cup', extraTime: true });
        expect(seeds.findIndex(r => r.teamName === cup.homeTeam)).toBeLessThan(seeds.findIndex(r => r.teamName === cup.awayTeam));
        expect(generateMLSPlayoffFixtures(teams, ledger, 47)).toEqual([]);
        expect(new Set(ledger.map(f => f.id)).size).toBe(ledger.length);
        expect(getMLSSeasonHonors(teams, ledger, cup.homeTeam)).toContain('MLS Cup Champion');
        expect(getMLSSeasonHonors(teams, ledger, seeds[0].teamName)).toContain('MLS Supporters’ Shield');
        expect(getMLSSeasonHonors(teams, ledger, seeds[0].teamName)).not.toContain('MLS Champion');
    });
    it('reuses deterministic recorded shootouts at 90 for early stages and genuine extra-time events in later rounds', () => {
        const teams = mlsTeams(), home = teams[0], away = teams[1];
        const fixture = (id: string, stage: Fixture['stage']): Fixture => ({ id, week: 37, league: 'MLS', homeTeam: home.name, awayTeam: away.name, played: false, stage, isKnockout: true, tournamentId: MLS_PLAYOFF_ID });
        const wildResults = Array.from({ length: 50 }, (_, i) => resolveMLSPlayoffMatch(fixture(`wild-${i}`, 'Play-offs'), home, away));
        const tied = wildResults.find(f => f.penaltyWinner)!; expect(tied).toBeDefined();
        expect(tied.events!.every(e => e.minute <= 90)).toBe(true); expect(tied.penalties!.length).toBeGreaterThan(0);
        expect(resolveMLSPlayoffMatch(fixture(tied.id, 'Play-offs'), home, away)).toEqual(tied);
        const late = Array.from({ length: 50 }, (_, i) => resolveMLSPlayoffMatch(fixture(`cup-${i}`, 'Final'), home, away)).find(f => f.events!.some(e => e.minute > 90))!;
        expect(late).toBeDefined(); expect(getFixtureWinner(late)).toBeDefined();
        const [hg, ag] = late.score!.split('-').map(Number);
        expect(late.events!.filter(e => e.type === 'goal' && e.teamName === home.name)).toHaveLength(hg);
        expect(late.events!.filter(e => e.type === 'goal' && e.teamName === away.name)).toHaveLength(ag);
    });
});

describe('App integration regression guards', () => {
    const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
    it('wires shared construction into new start and rollover without refreshing restored career teams', () => {
        expect(app).toContain('const createClubSeason ='); expect(app).toContain('const season = createClubSeason(activeTeams, fixtures)');
        expect(app).toContain('setLeagueTable(season.table)'); expect(app).toContain('setTeams(parsed.teams)');
        expect(app).toContain('const clubLeague = userTeamName ? activeTeams[userTeamName]?.league : undefined');
    });
    it('guards replay and updates table rows using competition and club identity', () => {
        expect(app).toContain('if (!f.played && f.week === currentWeek');
        expect(app).toContain('t.teamName === name && t.league === currentFixture.league');
        expect(app).toContain('t.teamName === name && t.league === league');
        expect(app).toContain('generateMLSPlayoffFixtures(Object.values(activeTeams), nextFixtures, playoffWeek)');
        expect(app).toContain('getMLSPlayoffMatchRules(currentFixture)?.extraTime === false');
        expect(app).not.toContain('Relegation Disaster:');
    });
});
