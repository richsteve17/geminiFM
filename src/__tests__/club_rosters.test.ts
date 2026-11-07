import { describe, expect, it, vi } from 'vitest';
import { TEAMS } from '../constants';
import type { Player, Team } from '../types';
import {
    CLUB_ROSTER_CATALOG, CLUB_ROSTER_GAME_DERIVATION_VERSION, CLUB_ROSTER_SNAPSHOT, CLUB_ROSTER_SNAPSHOT_DATE,
    CLUB_ROSTER_NEUTRAL_PRESET,
    createCurrentFreeAgentMarket, getClubRosterAge, getClubRosterCoverage, getClubRosterSource,
    getCurrentClubTeams, getRawClubRoster, type ClubRosterRecord, type ClubRosterSnapshot, type ClubSourceAthlete,
} from '../engine/clubRosters';
import { getAuthoritativeWorldCupPlayer } from '../engine/rosterIdentity';
import { getNationalSquadPool, NATIONAL_ROSTER_CATALOG } from '../engine/nationalRosters';

// Deliberately synthetic isolated fixtures. They never enter the shipped source snapshot.
function athlete(id: string, position = 'M', overrides: Partial<ClubSourceAthlete> = {}): ClubSourceAthlete {
    return { externalId: `espn:${id}`, sourceAthleteId: id, name: `Source Athlete ${id}`,
        fullName: `Source Athlete ${id}`, shortName: `S. Athlete ${id}`, firstName: 'Source', lastName: `Athlete ${id}`,
        sourcePosition: { abbreviation: position }, dateOfBirth: '2000-11-08T00:00:00Z', age: 99,
        citizenship: 'France', citizenshipCountry: { abbreviation: 'FRA' }, jersey: '17',
        sourceOccurrences: [{ url: 'https://example.test/current-roster', competition: 'fixture' }], ...overrides };
}
function record(name = 'Fixture Club', players = [athlete('900001')], overrides: Partial<ClubRosterRecord> = {}): ClubRosterRecord {
    return { gameName: name, gameLeague: 'Premier League', sourceTeamId: '100', sourceName: name,
        sourceLeagueCode: 'eng.1', sources: [{ provider: 'fixture', url: 'https://example.test/roster', retrievedAt: '2026-11-07T00:00:00Z' }],
        players, warnings: [], coverage: 'fixture-current', ...overrides };
}
function snapshot(teams: ClubRosterRecord[]): ClubRosterSnapshot {
    return { snapshotDate: '2026-11-07', teams, coverage: { catalogClubs: teams.length } };
}
function seedPlayer(overrides: Partial<Player> = {}): Player {
    return { name: 'Stale Seed Person', position: 'CB', rating: 82, age: 40, nationality: '🇫🇷', personality: 'Loyal',
        wage: 15000, status: { type: 'Available' }, effects: [], contractExpires: 5, isStarter: true, condition: 100, ...overrides };
}
function seed(name = 'Fixture Club', players: Player[] = [seedPlayer()]): Team {
    return { name, league: 'Premier League', players, tactic: { formation: '4-3-3', mentality: 'Balanced' }, prestige: 80,
        chairmanPersonality: 'Moneyball Advocate', balance: 123456789, transferBudget: 1234, weeklyWageBill: 999,
        objectives: ['Finish Top 4'], activePromises: [], colors: { primary: '#123456', secondary: '#abcdef', text: '#fff' } };
}

 describe('Current sourced club roster hydration', () => {
    it('replaces stale membership with every real sourced playable athlete and retains a bench larger than 25', () => {
        const people = Array.from({ length: 34 }, (_, i) => athlete(String(900100 + i), i < 3 ? 'G' : i < 14 ? 'D' : i < 25 ? 'M' : 'F'));
        const input = { Fixture: seed() };
        const source = snapshot([record('Fixture Club', people)]);
        const before = JSON.stringify({ input, source });
        const fresh = getCurrentClubTeams(input, source).Fixture;
        expect(fresh.players).toHaveLength(34);
        expect(new Set(fresh.players.map(p => p.externalId))).toEqual(new Set(people.map(p => p.externalId)));
        expect(fresh.players.some(p => p.name === 'Stale Seed Person')).toBe(false);
        expect(fresh.players.filter(p => p.isStarter)).toHaveLength(11);
        expect(fresh.players.slice(0, 11).every(p => p.isStarter)).toBe(true);
        expect(fresh.players.filter(p => p.isStarter && p.position === 'GK')).toHaveLength(1);
        expect(fresh.players.filter(p => !p.isStarter)).toHaveLength(23);
        expect(fresh.clubRosterSource.completePlayableMembership).toBe(true);
        expect(JSON.stringify({ input, source })).toBe(before);
    });

    it('updates source identity, DOB age, shirt and citizenship rather than copying stale club/age/name', () => {
        const source = athlete('900001', 'M');
        const old = seedPlayer({ externalId: source.externalId, name: 'Old Abbreviation', position: 'AM', age: 38,
            currentClub: 'Old Club', rating: 91, potential: 95, wage: 81000, contractExpires: 4, personality: 'Ambitious', stamina: 90,
            stats: { appearances: 99, goals: 7, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0, averageRating: 8, ratingSum: 792 },
            history: [{ year: 2025, teamName: 'Old Club', appearances: 99, goals: 7, cleanSheets: 0, averageRating: 8 }] });
        const teams = { Old: seed('Old Club', [old]), Current: seed('Fixture Club', []) };
        const fresh = getCurrentClubTeams(teams, snapshot([record()])).Current;
        const person = fresh.players[0];
        expect(person.externalId).toBe(source.externalId);
        expect(person.name).toBe('Source Athlete 900001');
        expect(person.currentClub).toBe('Fixture Club');
        expect(person.age).toBe(25);
        expect(person.clubRosterProvenance.age).toBe('date-of-birth');
        expect(person.dateOfBirth).toBe(source.dateOfBirth);
        expect(person.squadNumber).toBe(17);
        expect(person.nationality).toBe('🇫🇷');
        expect(person.rating).toBe(91);
        expect(person.position).toBe('AM');
        expect(person.wage).toBe(81000);
        expect(person.personality).toBe('Ambitious');
        expect(person.contractExpires).toBe(4);
        expect(person.stats).toBeUndefined();
        expect(person.history).toBeUndefined();
        expect(person.gameDerived.preservedPriorFields).toContain('rating');
        expect(person.gameDerived.position).toBe(true);
        expect(fresh.weeklyWageBill).toBe(81000);
    });

    it('does not mistake different country flags for matching nationality in abbreviated prior lookup', () => {
        const person = athlete('900005', 'D', { shortName: 'Same Initial' });
        const old = seedPlayer({ name: 'Same Initial', nationality: '🇩🇪', rating: 99 });
        const fresh = getCurrentClubTeams({ Fixture: seed('Fixture Club', [old]) }, snapshot([record('Fixture Club', [person])])).Fixture;
        expect(fresh.players[0].rating).not.toBe(99);
        expect(fresh.players[0].gameDerived.preservedPriorFields).toEqual([]);
    });

    it('preserves only unambiguous same-identity priors and never assigns one ambiguous short name to two athletes', () => {
        const people = [athlete('900006', 'M', { shortName: 'S. Shared' }), athlete('900007', 'M', { shortName: 'S. Shared' })];
        const old = seedPlayer({ name: 'S. Shared', rating: 99 });
        const fresh = getCurrentClubTeams({ Fixture: seed('Fixture Club', [old]) }, snapshot([record('Fixture Club', people)])).Fixture;
        expect(fresh.players.every(p => p.rating !== 99 && !p.gameDerived.preservedPriorFields.length)).toBe(true);
        const sameIdTwice = getCurrentClubTeams({ A: seed('Fixture Club', [seedPlayer({ externalId: people[0].externalId, rating: 99 })]), B: seed('Old Club', [seedPlayer({ externalId: people[0].externalId, rating: 98 })]) }, snapshot([record('Fixture Club', people)])).A;
        expect(sameIdTwice.players[0].gameDerived.preservedPriorFields).toEqual([]);
    });

    it('prefers supplied exact national roles over wrong broad source roles or stale priors', () => {
        const source = athlete('291281', 'F', { name: 'Jude Bellingham', fullName: 'Jude Bellingham', citizenship: 'England', citizenshipCountry: { abbreviation: 'ENG' } });
        const supplied = getAuthoritativeWorldCupPlayer({ name: source.name, externalId: source.externalId })!;
        const expected = supplied.position === 'CAM' ? 'AM' : supplied.position === 'CDM' ? 'DM' : supplied.position;
        const fresh = getCurrentClubTeams({ Fixture: seed('Fixture Club', [seedPlayer({ externalId: source.externalId, position: 'ST' })]) }, snapshot([record('Fixture Club', [source])])).Fixture;
        expect(fresh.players[0].position).toBe(expected);
        expect(fresh.players[0].datasetPlayerId).toBe(supplied.datasetPlayerId);
        expect(fresh.players[0].nationalTeamCode).toBe(supplied.countryCode);
        expect(fresh.players[0].gameDerived.position).toBe(false);
        expect(fresh.players[0].clubRosterProvenance.position).toBe('authoritative-national-role');
    });

    it('fills missing club DOB only from the same verified provider ID and calculates age anew', () => {
        const source = athlete('134283', 'G', { name: 'Thibaut Courtois', fullName: 'Thibaut Courtois', dateOfBirth: null, age: null,
            citizenship: 'Belgium', citizenshipCountry: { abbreviation: 'BEL' } });
        const fresh = getCurrentClubTeams({ Fixture: seed() }, snapshot([record('Fixture Club', [source])])).Fixture.players[0];
        expect(fresh.dateOfBirth?.slice(0, 10)).toBe('1992-05-11');
        expect(fresh.age).toBe(34);
        expect(fresh.gameDerived.ageFallback).toBe(false);
        expect(fresh.clubRosterProvenance.dateOfBirth).toBe('verified-identity-source');
        expect(fresh.clubRosterFacts.dateOfBirth).toBeNull();
        expect(fresh.clubRosterFacts.age).toBeNull();
    });

    it('keeps all unknown-role evidence and explicitly excludes unusable roles without inventing players', () => {
        const unknown = athlete('900008', '', { sourcePosition: null });
        const source = snapshot([record('Fixture Club', [athlete('900001'), unknown])]);
        const fresh = getCurrentClubTeams({ Fixture: seed() }, source).Fixture;
        expect(fresh.players).toHaveLength(1);
        expect(fresh.unresolvedRosterPlayers).toContainEqual(expect.objectContaining({ externalId: unknown.externalId, kind: 'unknown-position' }));
        expect(fresh.clubRosterSource.status).toBe('partial');
        expect(fresh.clubRosterSource.sourcePlayerCount).toBe(2);
        expect(getRawClubRoster('Fixture Club', source)!.players).toHaveLength(2);
    });

    it('makes broad role and unavailable age game derivation explicit but never invents citizenship', () => {
        const unknownFacts = athlete('900009', 'D', { age: null, dateOfBirth: null, citizenship: null, citizenshipCountry: null, jersey: 'not supplied' });
        const fresh = getCurrentClubTeams({ Fixture: seed() }, snapshot([record('Fixture Club', [unknownFacts])])).Fixture;
        expect(fresh.players[0].gameDerived).toMatchObject({ version: CLUB_ROSTER_GAME_DERIVATION_VERSION, position: true, ageFallback: true, rating: true, personality: true, wage: true, contract: true });
        expect(fresh.players[0].age).toBe(25);
        expect(fresh.players[0].nationality).toBe('Unknown');
        expect(fresh.players[0].squadNumber).toBeUndefined();
        expect(fresh.rosterWarnings.some(w => w.includes('lack citizenship'))).toBe(true);
        const goalkeeper = getCurrentClubTeams({ Fixture: seed() }, snapshot([record('Fixture Club', [athlete('900010', 'G')])])).Fixture.players[0];
        expect(goalkeeper.position).toBe('GK');
        expect(goalkeeper.gameDerived.position).toBe(false);
    });

    it('returns explicit gaps, not stale seed players marked current', () => {
        const input = { Missing: seed('Missing Club'), Empty: seed('Empty Club') };
        const fresh = getCurrentClubTeams(input, snapshot([record('Empty Club', [])]));
        for (const club of Object.values(fresh)) {
            expect(club.players).toEqual([]);
            expect(club.clubRosterSource.status).toBe('missing');
            expect(club.clubRosterSource.completePlayableMembership).toBe(false);
            expect(club.weeklyWageBill).toBe(0);
        }
        expect(Object.keys(fresh)).toEqual(['Empty']);
        expect(getClubRosterCoverage(fresh).missingClubs).toEqual(['Empty Club']);
        expect(input.Missing.players).toHaveLength(1);
        expect(getClubRosterSource(input.Missing)).toBeUndefined();
    });

    it('preserves seed key/economy/theme/objectives while correcting league from the catalog', () => {
        const template = seed();
        const fresh = getCurrentClubTeams({ Fixture: template }, snapshot([record('Fixture Club', undefined, { gameLeague: 'Championship', sourceLeagueCode: 'eng.2' })])).Fixture;
        expect(fresh.balance).toBe(template.balance);
        expect(fresh.prestige).toBe(template.prestige);
        expect(fresh.objectives).toEqual(template.objectives);
        expect(fresh.colors).toEqual(template.colors);
        expect(fresh.transferBudget).toBe(template.transferBudget);
        expect(fresh.league).toBe('Championship');
        expect(template.league).toBe('Premier League');
        expect(fresh.clubRosterSource.gameDerivedClub).toMatchObject({ preset: 'existing-game-seed', economics: true, prestige: true, colors: 'existing-game-theme' });
        expect(fresh.clubRosterSource.sourceLeagueCode).toBe('eng.2');
        expect(fresh.weeklyWageBill).toBe(fresh.players.reduce((sum, p) => sum + p.wage, 0));
    });

    it('introduces all source catalog clubs without seeds using labeled neutral game presets', () => {
        const source = snapshot([record('New Club')]);
        const fresh = getCurrentClubTeams({}, source)['New Club'];
        expect(fresh.players.map(player => player.externalId)).toEqual(['espn:900001']);
        expect(fresh.balance).toBe(CLUB_ROSTER_NEUTRAL_PRESET.balance);
        expect(fresh.prestige).toBe(CLUB_ROSTER_NEUTRAL_PRESET.prestige);
        expect(fresh.colors).toEqual(CLUB_ROSTER_NEUTRAL_PRESET.colors);
        expect(fresh.clubRosterSource.gameDerivedClub).toMatchObject({ preset: 'neutral-game-preset', economics: true, prestige: true, colors: 'neutral-ui-palette' });
        expect(fresh.rosterWarnings.some(warning => warning.includes('not observed club facts or an authentic kit'))).toBe(true);
    });

    it('matches previously sourced seed attributes by observed ID despite changed display names', () => {
        const old = getCurrentClubTeams({ OldKey: seed('Fixture Club') }, snapshot([record()])).OldKey;
        const fresh = getCurrentClubTeams({ OldKey: old }, snapshot([record('Renamed Club')]));
        expect(Object.keys(fresh)).toEqual(['OldKey']);
        expect(fresh.OldKey.name).toBe('Renamed Club');
        expect(fresh.OldKey.balance).toBe(old.balance);
    });

    it('makes selection and economics repeatable without using Math.random, clock or source order', () => {
        const people = Array.from({ length: 30 }, (_, i) => athlete(String(900100 + i), i < 3 ? 'G' : i < 13 ? 'D' : i < 23 ? 'M' : 'F'));
        const input = { Fixture: seed('Fixture Club', []) };
        const source = snapshot([record('Fixture Club', people)]);
        const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Untracked random generation'); });
        try {
            const first = getCurrentClubTeams(input, source).Fixture;
            const second = getCurrentClubTeams(input, source).Fixture;
            expect(second).toEqual(first);
            const reversed = getCurrentClubTeams(input, snapshot([record('Fixture Club', [...people].reverse())])).Fixture;
            const byId = (players: Player[]) => Object.fromEntries(players.map(p => [p.externalId!, { rating: p.rating, wage: p.wage, position: p.position, personality: p.personality, contractExpires: p.contractExpires }]));
            expect(byId(reversed.players)).toEqual(byId(first.players));
            expect(reversed.players.filter(p => p.isStarter).map(p => p.externalId)).toEqual(first.players.filter(p => p.isStarter).map(p => p.externalId));
            expect(reversed.weeklyWageBill).toBe(first.weeklyWageBill);
        } finally { random.mockRestore(); }
    });

    it('clones nested source metadata, snapshots, unrelated national teams and seed arrays', () => {
        const source = snapshot([record()]);
        const national = { ...seed('National'), league: 'International' as const };
        const input = { Fixture: seed(), National: national };
        const before = JSON.stringify({ source, input });
        const first = getCurrentClubTeams(input, source);
        first.Fixture.players[0].clubRosterFacts.sourceOccurrences[0].url = 'Changed';
        first.Fixture.clubRosterSource.sources[0].url = 'Changed';
        first.Fixture.colors!.primary = 'Changed';
        first.National.players[0].age = 999;
        expect(JSON.stringify({ source, input })).toBe(before);
        expect(getCurrentClubTeams(input, source).Fixture.players[0].clubRosterFacts.sourceOccurrences[0].url).not.toBe('Changed');
        const meta = getClubRosterSource(getCurrentClubTeams(input, source).Fixture)!;
        meta.sources[0].url = 'Accessor mutation';
        expect(source.teams[0].sources[0].url).not.toBe('Accessor mutation');
    });

    it('normalizes unsupported legacy formations explicitly, without changing seed tactics', () => {
        const old = seed(); old.tactic.formation = '3-4-3' as Team['tactic']['formation'];
        const fresh = getCurrentClubTeams({ Fixture: old }, snapshot([record()])).Fixture;
        expect(fresh.tactic.formation).toBe('4-3-3');
        expect(old.tactic.formation).toBe('3-4-3');
        expect(fresh.rosterWarnings.some(w => w.includes('Unsupported seed formation'))).toBe(true);
    });
});

describe('Cross-club ownership integrity', () => {
    it('uses an explicit source club reference for duplicate IDs, never the roster index or currentClub label', () => {
        const person = athlete('900011', 'D', { currentClub: 'Club B', clubReference: { id: '100' } });
        const data = snapshot([record('Club A', [person]), record('Club B', [person], { sourceTeamId: '200' })]);
        const fresh = getCurrentClubTeams({ A: seed('Club A'), B: seed('Club B') }, data);
        expect(fresh.A.players.map(p => p.externalId)).toEqual([person.externalId]);
        expect(fresh.A.players[0].clubRosterProvenance.ownership).toBe('source-owner-reference');
        expect(fresh.B.players).toHaveLength(0);
        expect(fresh.B.unresolvedRosterPlayers[0].reason).toContain('Verified current owner is Club A');
    });

    it('uses supplied user club association for duplicated source identities', () => {
        const person = athlete('291281', 'M', { name: 'Jude Bellingham', fullName: 'Jude Bellingham', citizenship: 'England', citizenshipCountry: { abbreviation: 'ENG' } });
        const supplied = getAuthoritativeWorldCupPlayer({ name: person.name, externalId: person.externalId })!;
        const source = snapshot([record(supplied.club, [person]), record('Other Club', [person], { sourceTeamId: '200' })]);
        const fresh = getCurrentClubTeams({ Owner: seed(supplied.club), Other: seed('Other Club') }, source);
        expect(fresh.Owner.players).toHaveLength(1);
        expect(fresh.Owner.players[0].clubRosterProvenance.ownership).toBe('authoritative-club');
        expect(fresh.Other.players).toHaveLength(0);
    });

    it('quarantines unresolved duplicates in both clubs instead of inventing an owner', () => {
        const person = athlete('900012', 'M', { currentClub: 'Club A' });
        const source = snapshot([record('Club A', [person]), record('Club B', [person], { sourceTeamId: '200' })]);
        const fresh = getCurrentClubTeams({ A: seed('Club A'), B: seed('Club B') }, source);
        expect(fresh.A.players).toEqual([]);
        expect(fresh.B.players).toEqual([]);
        expect(fresh.A.unresolvedRosterPlayers[0]).toMatchObject({ externalId: person.externalId, kind: 'ownership-conflict', candidateClubs: ['Club A', 'Club B'] });
        expect(getRawClubRoster('Club A', source)!.players).toHaveLength(1);
    });

    it('does not choose between conflicting owner references and does not retain duplicate copies inside one club', () => {
        const a = athlete('900013', 'D', { clubReference: { id: '100' } });
        const b = { ...a, clubReference: { id: '200' } };
        const fresh = getCurrentClubTeams({ A: seed('Club A'), B: seed('Club B') }, snapshot([record('Club A', [a]), record('Club B', [b], { sourceTeamId: '200' })]));
        expect(fresh.A.players).toEqual([]);
        expect(fresh.B.players).toEqual([]);
        const duplicate = getCurrentClubTeams({ Fixture: seed() }, snapshot([record('Fixture Club', [a, a])])).Fixture;
        expect(duplicate.players).toHaveLength(1);
        expect(duplicate.unresolvedRosterPlayers[0].kind).toBe('duplicate-entry');
    });
});

describe('Source snapshot metadata and age semantics', () => {
    it('computes UTC birthday age before/on/after birth dates, preferring DOB over stale displayed age', () => {
        expect(getClubRosterAge({ dateOfBirth: '2000-11-08T00:00:00Z', age: 40 }, '2026-11-07')).toEqual({ age: 25, source: 'date-of-birth' });
        expect(getClubRosterAge({ dateOfBirth: '2000-11-07T00:00:00Z', age: 40 }, '2026-11-07')).toEqual({ age: 26, source: 'date-of-birth' });
        expect(getClubRosterAge({ dateOfBirth: '2000-11-06T00:00:00Z', age: 40 }, '2026-11-07')).toEqual({ age: 26, source: 'date-of-birth' });
        expect(getClubRosterAge({ DOB: '2000-11-08', age: 40 }, '2026-11-07').age).toBe(25);
        expect(getClubRosterAge({ dateOfBirth: 'invalid', age: 22 })).toEqual({ age: 22, source: 'source-age' });
        expect(getClubRosterAge({ dateOfBirth: '2000-02-31', age: 22 })).toEqual({ age: 22, source: 'source-age' });
        expect(getClubRosterAge({ dateOfBirth: '2000-11-08T23:00:00-08:00', age: 40 }, '2026-11-08').age).toBe(26);
        expect(getClubRosterAge({ dateOfBirth: '2040-11-08', age: null })).toEqual({ age: 25, source: 'game-fallback' });
    });

    it('exposes actual snapshot metadata independently from the edition and never annotates unsourced saves', () => {
        expect(CLUB_ROSTER_SNAPSHOT_DATE).toBe(CLUB_ROSTER_SNAPSHOT.snapshotDate);
        expect(CLUB_ROSTER_SNAPSHOT_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(getClubRosterCoverage().sourceCoverage).toEqual(CLUB_ROSTER_SNAPSHOT.coverage);
        const saved = seed('Saved Club', [seedPlayer({ name: 'Career Acquisition', age: 32, wage: 99111 })]);
        const before = JSON.stringify(saved);
        expect(getClubRosterSource(saved)).toBeUndefined();
        expect(getClubRosterCoverage({ Saved: saved }).missingClubs).toEqual(['Saved Club']);
        expect(JSON.stringify(saved)).toBe(before);
    });

    it('hydrates all catalog clubs from their actual snapshot and never creates duplicate cross-club IDs', () => {
        expect(CLUB_ROSTER_CATALOG).toHaveLength(150);
        const before = JSON.stringify(TEAMS);
        const fresh = getCurrentClubTeams(TEAMS);
        expect(Object.keys(fresh)).toHaveLength(150);
        expect(Object.keys(getCurrentClubTeams({}))).toHaveLength(150);
        expect(Object.values(fresh).reduce<Record<string, number>>((counts, club) => ({ ...counts, [club.league]: (counts[club.league] || 0) + 1 }), {}))
            .toEqual({ 'Premier League': 20, Championship: 24, 'La Liga': 20, 'Serie A': 20, Bundesliga: 18, 'Ligue 1': 18, MLS: 30 });
        for (const name of ['Leicester City', 'Girona', 'Wolfsburg', 'Nantes', 'Reims']) expect(fresh[name]).toBeUndefined();
        expect(fresh.Sunderland.league).toBe('Premier League');
        expect(fresh['West Ham'].league).toBe('Championship');
        expect(fresh.Wolves.league).toBe('Championship');
        expect(fresh['FC Barcelona'].name).toBe('FC Barcelona');
        expect(fresh['NY Red Bulls'].name).toBe('NY Red Bulls');
        expect(getClubRosterCoverage(fresh)).toMatchObject({ requestedClubs: 150, sourcedClubs: 149, partialClubs: 1, missingClubs: [], playablePlayers: 4601 });
        expect(getRawClubRoster('Málaga')!.players.some(p => p.externalId === 'espn:213535')).toBe(true);
        expect(fresh['Málaga'].players.some(p => p.externalId === 'espn:213535')).toBe(false);
        expect(fresh.Lens.players.some(p => p.externalId === 'espn:213535')).toBe(true);
        expect(fresh['Málaga'].unresolvedRosterPlayers).toContainEqual(expect.objectContaining({ externalId: 'espn:213535', kind: 'ownership-conflict' }));
        const nationalPlayers = new Map(NATIONAL_ROSTER_CATALOG.flatMap(n => getNationalSquadPool(n.countryCode)).map(p => [p.externalId, p]));
        const externalIds: string[] = [];
        for (const club of Object.values(fresh)) {
            const raw = getRawClubRoster(club.name)!;
            expect(raw).toBeDefined();
            expect(club.clubRosterSource.status).not.toBe('missing');
            expect(club.players.length).toBeGreaterThanOrEqual(11);
            expect(club.players.filter(p => p.isStarter)).toHaveLength(11);
            expect(club.clubRosterSource.sourcePlayerCount).toBe(raw.players.length);
            expect(club.players.every(p => raw.players.some(a => a.externalId === p.externalId))).toBe(true);
            expect(club.players.every(p => p.clubRosterFacts.name && p.currentClub === club.name)).toBe(true);
            expect(club.weeklyWageBill).toBe(club.players.reduce((sum, p) => sum + p.wage, 0));
            for (const player of club.players) {
                const national = nationalPlayers.get(player.externalId);
                if (national) expect(player.position).toBe(national.position);
            }
            externalIds.push(...club.players.map(p => p.externalId));
        }
        expect(new Set(externalIds).size).toBe(externalIds.length);
        expect(JSON.stringify(TEAMS)).toBe(before);
    });

    it('contains only the two supplied explicitly unattached Jordan players, not unknown clubs or stale transfer targets', () => {
        const market = createCurrentFreeAgentMarket();
        expect(market.map(p => p.name).sort()).toEqual(['Ehsan Haddad', 'Saed Al-Rosan']);
        expect(market.every(p => p.nationality === '🇯🇴' && p.position === 'CB' && p.contractExpires === 0)).toBe(true);
        expect(market.every(p => p.freeAgentSource.suppliedClub === 'unattached' && p.freeAgentSource.suppliedLeague === 'Free Agent')).toBe(true);
        expect(market.every(p => p.externalId && p.datasetPlayerId)).toBe(true);
        expect(createCurrentFreeAgentMarket()).toEqual(market);
    });
});
