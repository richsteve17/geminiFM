import { describe, it, expect } from 'vitest';
import {
    generateWorldCupStructure, generateEurosStructure, generateExpandedWorldCupStructure,
    NATIONAL_TEAMS, simulateKnockoutQuickMatch,
} from '../international';
import {
    NATIONAL_ROSTER_CATALOG, NATIONAL_ROSTER_SNAPSHOT, getNationalSquadPool,
    createNationalRosterTeam, hydrateNationalTeamsFromCareer, linkNationalRosterIdentitiesToClubTeams,
    resolveNationalPlayerIdentity, selectNationalSquad, selectNationalStartingXI,
    getRawNationalSquadPool,
    type NationalRosterPlayer,
} from '../engine/nationalRosters';
import { TEAMS } from '../constants';
import type { Player, Team, Formation } from '../types';

const ids = (players: Player[]) => players.map(p => (p as NationalRosterPlayer).externalId);

describe('Source-backed international game rosters', () => {
    it('has a dated 64-country catalog resolved to distinct national source IDs', () => {
        expect(NATIONAL_ROSTER_SNAPSHOT.snapshotDate).toBe('2026-11-07');
        expect(NATIONAL_ROSTER_CATALOG).toHaveLength(64);
        expect(new Set(NATIONAL_ROSTER_CATALOG.map(n => n.countryCode)).size).toBe(64);
        expect(new Set(NATIONAL_ROSTER_CATALOG.map(n => n.sourceTeamId)).size).toBe(64);
        expect(NATIONAL_ROSTER_SNAPSHOT.coverage.nationsWithRoster).toBe(64);
        for (const nation of NATIONAL_ROSTER_CATALOG) {
            expect(nation.sourceTeamId).toMatch(/^\d+$/);
            expect(nation.players.length).toBeGreaterThanOrEqual(11);
            expect(new Set(nation.players.map(p => p.externalId)).size).toBe(nation.players.length);
            for (const athlete of nation.players) {
                expect(athlete.externalId).toBe(`espn:${athlete.sourceAthleteId}`);
                expect(athlete.name.length).toBeGreaterThan(1);
                if (athlete.sourcePosition) expect(athlete.sourcePosition.abbreviation).toBeTruthy();
                expect(athlete.sourceOccurrences.length).toBeGreaterThan(0);
                expect(athlete.sourceOccurrences[0].url).toContain(`/teams/${nation.sourceTeamId}/roster`);
            }
        }
    });

    for (const [label, factory, count, groups] of [
        ['world game', generateWorldCupStructure, 48, 12],
        ['expanded world game', generateExpandedWorldCupStructure, 64, 16],
        ['Euro game', generateEurosStructure, 24, 6],
    ] as const) {
        it(`fills ${label} with ${count} unique actual countries and no clone suffixes`, () => {
            const teams = Object.values(factory());
            expect(teams).toHaveLength(count);
            expect(new Set(teams.map(t => t.countryCode)).size).toBe(count);
            expect(new Set(teams.map(t => t.sourceTeamId)).size).toBe(count);
            expect(new Set(teams.map(t => t.group)).size).toBe(groups);
            for (const team of teams) {
                expect(team.name).not.toMatch(/\([A-P]\)/);
                expect(teams.filter(t => t.group === team.group)).toHaveLength(4);
                expect(team.players).toHaveLength(Math.min(26, team.nationalSquadPool.length));
                expect(team.players.filter(p => p.isStarter)).toHaveLength(11);
                expect(team.players.every(p => p.nationality === team.flag)).toBe(true);
                expect(team.nationalRosterSource.officialFinalSelection).toBe(label === 'world game');
                expect(ids(team.players).every(id => ids(team.nationalSquadPool).includes(id))).toBe(true);
                if (team.nationalSquadPool.filter(p => p.position === 'GK').length >= 3) {
                    expect(team.players.filter(p => p.position === 'GK')).toHaveLength(3);
                }
                // Exact factual roles can leave a source pool without a particular reserve family.
                // Neither observed nor approved selections may manufacture a replacement player/role.
                expect(team.players.every(player => team.nationalSquadPool.some(source => source.externalId === player.externalId && source.position === player.position))).toBe(true);
            }
        });
    }

    it('exposes all 48 actual teams to the existing national-team picker', () => {
        expect(NATIONAL_TEAMS).toHaveLength(48);
        expect(NATIONAL_TEAMS.find(t => t.name === 'Belgium')?.players.some(p => p.name === 'Thibaut Courtois')).toBe(true);
        const france = NATIONAL_TEAMS.find(t => t.name === 'France')!;
        expect(france.players.some(p => p.name === 'Kylian Mbappe')).toBe(true);
        expect(france.players.some(p => p.name === 'Aurelien Tchouameni')).toBe(true);
        expect(NATIONAL_TEAMS.find(t => t.name === 'England')?.players.some(p => p.name === 'Jude Bellingham')).toBe(true);
    });

    it('keeps source pool and manager 26 separate and deterministically fills supported formations', () => {
        const pool = getNationalSquadPool('ENG');
        expect(pool.length).toBeGreaterThanOrEqual(26);
        const original = JSON.stringify(pool);
        for (const formation of ['4-4-2', '4-3-3', '5-3-2', '3-5-2', '4-2-3-1', '4-5-1'] as Formation[]) {
            const squad = selectNationalSquad(pool, 26, formation);
            expect(squad).toHaveLength(26);
            expect(squad.filter(p => p.isStarter)).toHaveLength(11);
            expect(squad.filter(p => p.isStarter && p.position === 'GK')).toHaveLength(1);
            expect(squad.filter(p => p.position === 'GK')).toHaveLength(3);
            expect(selectNationalSquad(pool, 26, formation)).toEqual(squad);
        }
        expect(JSON.stringify(pool)).toBe(original);
    });

    it('retains the Peru source record with an unknown position without inventing a playable role', () => {
        expect(getRawNationalSquadPool('PER').some(p => p.externalId === 'espn:5330850' && !p.sourcePosition)).toBe(true);
        expect(getNationalSquadPool('PER').some(p => p.externalId === 'espn:5330850')).toBe(false);
        expect(createNationalRosterTeam('PER').rosterWarnings.some(w => w.includes('espn:5330850'))).toBe(true);
    });

    it('never fabricates a player to complete a short pool, and excludes unavailable players from the XI', () => {
        const short = getNationalSquadPool('ENG').slice(0, 15);
        short[0].status = { type: 'Injured', weeks: 3 };
        const selected = selectNationalSquad(short);
        expect(selected).toHaveLength(15);
        expect(ids(selected).every(id => ids(short).includes(id))).toBe(true);
        expect(selected.find(p => p.externalId === short[0].externalId)?.isStarter).toBe(false);
        expect(selectNationalStartingXI(short).every(p => p.status.type === 'Available')).toBe(true);
    });

    it('returns isolated copies rather than mutable shared template rosters', () => {
        const first = generateWorldCupStructure();
        first.England.players[0].name = 'Changed only in this game';
        first.England.nationalSquadPool[0].nationalRosterFacts.name = 'Changed fact';
        expect(generateWorldCupStructure().England.players[0].name).not.toBe('Changed only in this game');
        expect(getNationalSquadPool('ENG')[0].nationalRosterFacts.name).not.toBe('Changed fact');
    });
});

describe('Verified national / career identities', () => {
    it('links Courtois, Tchouameni, Mbappe and Jude without changing club abbreviations or career stats', () => {
        const original = JSON.stringify(TEAMS['Real Madrid']);
        const linked = linkNationalRosterIdentitiesToClubTeams({ 'Real Madrid': TEAMS['Real Madrid'] });
        const expected: Record<string, string> = {
            'T. Courtois': 'espn:134283', 'A. Tchouameni': 'espn:265919',
            'K. Mbappé': 'espn:231388', 'J. Bellingham': 'espn:291281',
        };
        for (const [name, externalId] of Object.entries(expected)) {
            const player = linked['Real Madrid'].players.find(p => p.name === name)! as NationalRosterPlayer;
            expect(player.externalId).toBe(externalId);
            expect(player.name).toBe(name);
        }
        expect(JSON.stringify(TEAMS['Real Madrid'])).toBe(original);
    });

    it('does not guess ambiguous initials or link an identically named wrong national', () => {
        const jude = TEAMS['Real Madrid'].players.find(p => p.name === 'J. Bellingham')!;
        expect(resolveNationalPlayerIdentity({ ...jude, position: 'DM' })).toBeUndefined();
        expect(resolveNationalPlayerIdentity({ ...jude, nationality: '🇫🇷' })).toBeUndefined();
        expect(resolveNationalPlayerIdentity({ ...jude, name: 'Invented Random Person' })).toBeUndefined();
    });

    it('hydrates callups from actual transferred career players while retaining names, appearance facts and source ID', () => {
        const player = { ...TEAMS['Real Madrid'].players.find(p => p.name === 'J. Bellingham')!,
            rating: 97, age: 27, stats: { appearances: 18, goals: 7, assists: 5, cleanSheets: 2, yellowCards: 1, redCards: 0, averageRating: 7.9, ratingSum: 142.2 },
            history: [{ year: 2025, teamName: 'Real Madrid', appearances: 40, goals: 18, cleanSheets: 5, averageRating: 8.2 }],
        };
        const club: Team = { ...TEAMS['Real Madrid'], name: 'Current Career Club', players: [player] };
        const nations = { England: createNationalRosterTeam('ENG') };
        const before = JSON.stringify({ nations, club });
        const hydrated = hydrateNationalTeamsFromCareer(nations, { Current: club });
        const callup = hydrated.England.players.find(p => (p as NationalRosterPlayer).externalId === 'espn:291281')! as NationalRosterPlayer;
        expect(callup.name).toBe('J. Bellingham');
        expect(callup.sourceName).toBe('Jude Bellingham');
        expect(callup.currentClub).toBe('Current Career Club');
        expect(callup.rating).toBe(97);
        expect(callup.age).toBe(27);
        expect(callup.stats).toEqual(player.stats);
        expect(callup.history).toEqual(player.history);
        expect(callup.nationalRosterFacts.sourceOccurrences.length).toBeGreaterThan(0);
        expect(JSON.stringify({ nations, club })).toBe(before);
    });
});

describe('International knockout fact continuity', () => {
    it('preserves real scorer events, actual participants and extra-time events separately from a shootout', () => {
        const teams = generateEurosStructure();
        const home = teams.Denmark, away = teams.Switzerland;
        const results = Array.from({ length: 256 }, (_, i) => simulateKnockoutQuickMatch(home, away, `roster-knockout-${i}`));
        expect(results.some(r => r.wentToExtraTime)).toBe(true);
        expect(results.some(r => r.penaltyWinner)).toBe(true);
        for (const result of results) {
            expect(result.events.filter(e => e.type === 'goal' && e.teamName === home.name)).toHaveLength(result.homeGoals);
            expect(result.events.filter(e => e.type === 'goal' && e.teamName === away.name)).toHaveLength(result.awayGoals);
            expect(result.participantNames.home).toEqual(home.players.filter(p => p.isStarter).map(p => p.name));
            expect(result.goalkeeperNames.home).toBe(home.players.find(p => p.isStarter && p.position === 'GK')?.name);
            if (result.wentToExtraTime) expect(result.events.some(e => e.minute === 120)).toBe(true);
            for (const goal of result.events.filter(e => e.type === 'goal')) {
                expect(goal.player).toBeTruthy();
                expect([...result.participantNames.home, ...result.participantNames.away]).toContain(goal.player);
            }
            if (result.penaltyWinner) {
                expect(result.homeGoals).toBe(result.awayGoals);
                expect(result.penaltyScore).toMatch(/^\d+-\d+$/);
                expect(result.penalties?.length).toBeGreaterThan(0);
                for (const kick of result.penalties!) {
                    const takers = kick.teamName === home.name ? home : away;
                    const defending = kick.teamName === home.name ? away : home;
                    expect(takers.players.filter(player => player.isStarter).map(player => player.name)).toContain(kick.taker);
                    expect(defending.players.find(player => player.isStarter && player.position === 'GK')?.name).toBe(kick.goalkeeper);
                    expect(kick.shootout).toBe(true);
                }
                const homeScored = result.penalties!.filter(kick => kick.teamName === home.name && kick.outcome === 'scored').length;
                const awayScored = result.penalties!.filter(kick => kick.teamName === away.name && kick.outcome === 'scored').length;
                expect(result.penaltyScore).toBe(`${homeScored}-${awayScored}`);
            }
        }
        expect(simulateKnockoutQuickMatch(home, away, 'stable')).toEqual(simulateKnockoutQuickMatch(home, away, 'stable'));
    });
});
