import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import base from '../data/sources/worldCup2026Squads.base.json';
import supplied from '../data/worldCup2026Squads.json';
import clubSnapshot from '../data/clubRosterSnapshot.json';
import { generateWorldCupStructure, generateExpandedWorldCupStructure, NATIONAL_TEAMS, WORLD_CUP_GAME_COUNTRY_CODES } from '../international';
import {
    AUTHORITATIVE_WORLD_CUP_DATA, WORLD_CUP_COUNTRY_CATALOG, authoritativeWorldCupPosition,
    getAuthoritativeWorldCupPlayer, resolveRosterAthlete,
} from '../engine/rosterIdentity';
import {
    createNationalRosterTeam, getNationalSquadPool, getWorldCup2026Squad,
    hydrateNationalTeamsFromCareer, linkNationalRosterIdentitiesToClubTeams,
    NATIONAL_GAME_CATALOG, NATIONAL_ROSTER_CATALOG, type NationalRosterPlayer,
} from '../engine/nationalRosters';
import { compactNationalTeams } from '../engine/careerSerialization';
import type { Team } from '../types';

const stableId = (player: NationalRosterPlayer) => player.datasetPlayerId || player.externalId;
const clubFor = (player: NationalRosterPlayer, name = 'Actual Career Owner'): Team => ({
    ...createNationalRosterTeam(player.nationalCountryCode), name, league: 'Premier League', players: [player],
});

describe('Immutable user-approved WC2026 football inputs', () => {
    it('keeps both corrected uploads byte-for-byte, without adding game metadata', () => {
        const hash = (path: string) => createHash('sha256').update(readFileSync(new URL(path, import.meta.url))).digest('hex');
        expect(hash('../data/worldCup2026Squads.json')).toBe('868a4b022cd7942ac9500eceaea125b3663ee6e2512d21d4b9299d011e1e81b3');
        expect(hash('../data/sources/worldCup2026Squads.base.json')).toBe('2dd1835a574dce5405e554db8c8b3d3d3342abc2881de411a519163ccd637992');
        expect(Object.keys(supplied.squads)).toHaveLength(48);
        expect(Object.values(supplied.squads).reduce((sum, squad) => sum + squad.players.length, 0)).toBe(1244);
        for (const [country, squad] of Object.entries(supplied.squads)) {
            expect(squad.players.map(({ name, club }) => ({ name, club }))).toEqual(base.squads[country as keyof typeof base.squads].players);
        }
    });

    it('uses exactly the supplied countries, squad order and 12 groups for the tutorial and picker', () => {
        const teams = Object.values(generateWorldCupStructure());
        expect(teams.map(team => team.name)).toEqual(Object.keys(supplied.squads));
        expect(NATIONAL_TEAMS.map(team => team.name)).toEqual(Object.keys(supplied.squads));
        expect(teams.map(team => team.countryCode)).toEqual(WORLD_CUP_GAME_COUNTRY_CODES);
        expect(new Set(teams.map(team => team.group)).size).toBe(12);
        for (const group of new Set(teams.map(team => team.group))) expect(teams.filter(team => team.group === group)).toHaveLength(4);
        expect(teams.reduce((sum, team) => sum + team.players.length, 0)).toBe(1244);
        expect(teams.some(team => team.name === 'Italy')).toBe(false);
        expect(teams.some(team => team.name === 'Jordan')).toBe(true);
    });

    it('keeps every supplied football row and exact role with only CDM/DM and CAM/AM vocabulary translation', () => {
        const teams = generateWorldCupStructure();
        for (const [country, squad] of Object.entries(supplied.squads)) {
            const team = teams[country];
            expect(team.players.map(player => player.name)).toEqual(squad.players.map(player => player.name));
            expect(team.players.map(player => player.currentClub)).toEqual(squad.players.map(player => player.club));
            expect(team.players.map(player => player.position)).toEqual(squad.players.map(player => authoritativeWorldCupPosition(player.position)));
            expect(team.players).toHaveLength(squad.players.length);
            for (const [index, player] of team.players.entries()) {
                expect(player.authoritativeWorldCupFacts).toMatchObject(squad.players[index]);
                expect(player.gameDerived.position).toBe(false);
                expect(player.gameDerived).toMatchObject({ rating: true, wage: true, personality: true });
            }
            expect(team.nationalRosterSource).toMatchObject({
                kind: 'authoritative-tournament-squad', officialFinalSelection: true,
                selectionAuthority: 'user-approved-WC2026', suppliedSquadSize: squad.players.length,
                dataset: 'src/data/worldCup2026Squads.json',
            });
            expect(team.nationalRosterSource.observedPool?.kind).toBe('source-squad-pool');
        }
    });

    it('preserves both corrected final rows and short selections, never padding to 26', () => {
        const teams = generateWorldCupStructure();
        expect(teams.Jordan.players.at(-1)).toMatchObject({ name: 'Ibrahim Sabra', currentClub: 'Lokomotiva Zagreb', position: 'ST' });
        expect(teams.Panama.players.find(player => player.name === 'Tomas Rodriguez')).toMatchObject({ currentClub: 'Deportivo Saprissa', position: 'ST' });
        expect(teams.Colombia.players).toHaveLength(23);
        expect(teams['South Korea'].players).toHaveLength(25);
        expect(teams.Colombia.rosterWarnings.some(warning => warning.includes('without padding'))).toBe(true);
    });

    it('adds nine supplied countries without replacing the 64-country observed pool or expanding the legacy format to 73', () => {
        expect(NATIONAL_ROSTER_CATALOG).toHaveLength(64);
        expect(NATIONAL_GAME_CATALOG).toHaveLength(73);
        const additions = NATIONAL_GAME_CATALOG.filter(nation => !NATIONAL_ROSTER_CATALOG.includes(nation));
        expect(additions.map(nation => nation.name).sort()).toEqual(['Bosnia', 'Cape Verde', 'Curacao', 'DR Congo', 'Haiti', 'Iraq', 'Jordan', 'Qatar', 'Uzbekistan']);
        for (const nation of additions) expect(createNationalRosterTeam(nation.countryCode).players).toHaveLength(26);
        const expanded = Object.values(generateExpandedWorldCupStructure());
        expect(expanded).toHaveLength(64);
        expect(new Set(expanded.map(team => team.group)).size).toBe(16);
        expect(expanded.map(team => team.countryCode)).toEqual(NATIONAL_ROSTER_CATALOG.map(nation => nation.countryCode));
        expect(expanded.every(team => !team.nationalRosterSource.officialFinalSelection)).toBe(true);
    });

    it('retains non-selected observed players for other international games, not for tutorial membership', () => {
        expect(getNationalSquadPool('ENG').some(player => player.name === 'Jason Steele')).toBe(true);
        expect(getWorldCup2026Squad('ENG').some(player => player.name === 'Jason Steele')).toBe(false);
        expect(createNationalRosterTeam('ENG', undefined, 'source-pool').nationalRosterSource.kind).toBe('source-squad-pool');
        expect(AUTHORITATIVE_WORLD_CUP_DATA).toEqual(supplied);
    });
});

describe('Shared source identity and supplied role authority', () => {
    it('resolves exact full/published short names across club and national sources to the same provider ID', () => {
        const full = resolveRosterAthlete({ name: 'Aurelien Tchouameni', nationality: 'France', club: 'Real Madrid' });
        const short = resolveRosterAthlete({ name: 'A. Tchouaméni', nationality: '🇫🇷', club: 'Real Madrid' });
        expect(full?.externalId).toBe('espn:265919');
        expect(short?.externalId).toBe(full?.externalId);
        expect(full?.sourceOccurrences.some(occurrence => occurrence.competition === 'esp.1')).toBe(true);
        expect(full?.sourceOccurrences.some(occurrence => occurrence.competition === 'fifa.world')).toBe(true);
        const suppliedPlayer = getAuthoritativeWorldCupPlayer({ name: short!.name, externalId: short!.externalId });
        expect(suppliedPlayer).toMatchObject({ name: 'Aurelien Tchouameni', position: 'CDM', countryCode: 'FRA', resolvedSourceId: 'espn:265919' });
    });

    it('uses the new club-only identity/age for a supplied nation missing from the old national snapshot', () => {
        const source = resolveRosterAthlete({ name: 'A. Khusanov', nationality: 'Uzbekistan', club: 'Manchester City' });
        const player = getWorldCup2026Squad('UZB').find(player => player.name === 'Abdukodir Khusanov')!;
        expect(source?.externalId).toBe('espn:362211');
        expect(player.externalId).toBe(source?.externalId);
        expect(player.age).toBe(source?.age);
        expect(player.gameDerived.ageFallback).toBe(false);
    });

    it('keeps country-scoped same-name players distinct and requires disambiguation without nationality', () => {
        expect(getAuthoritativeWorldCupPlayer({ name: 'Emiliano Martinez' })).toBeUndefined();
        const argentina = getAuthoritativeWorldCupPlayer({ name: 'Emiliano Martinez', nationality: 'Argentina' })!;
        const uruguay = getAuthoritativeWorldCupPlayer({ name: 'Emiliano Martinez', nationality: 'Uruguay' })!;
        expect(argentina).toMatchObject({ countryCode: 'ARG', club: 'Aston Villa', position: 'GK' });
        expect(uruguay).toMatchObject({ countryCode: 'URU', club: 'Palmeiras', position: 'CM' });
        expect(argentina.datasetPlayerId).not.toBe(uruguay.datasetPlayerId);
        expect(argentina.resolvedSourceId).not.toBe(uruguay.resolvedSourceId);
        expect(getAuthoritativeWorldCupPlayer({ name: 'Emiliano Martinez', club: 'Palmeiras' })).toEqual(uruguay);
        expect(resolveRosterAthlete({ name: 'Emiliano Martinez' })).toBeUndefined();
    });

    it('does not invent ESPN IDs or treat missing age as a sourced fact', () => {
        const squad = getWorldCup2026Squad('JOR');
        const player = squad.find(player => !player.authoritativeWorldCupFacts?.resolvedSourceId)!;
        expect(player).toBeDefined();
        expect(player.externalId).toBe(player.datasetPlayerId);
        expect(player.externalId).toMatch(/^wc2026:JOR:/);
        expect(player.nationalRosterFacts.sourceAthleteId).toBeUndefined();
        expect(player.age).toBe(25);
        expect(player.gameDerived.ageFallback).toBe(true);
        expect(getWorldCup2026Squad('JOR').map(stableId)).toEqual(squad.map(stableId));
    });

    it('rejects unsupported fuzzy names and contradictory provider IDs', () => {
        expect(resolveRosterAthlete({ name: 'Definitely Not Jude Bellingham', nationality: 'England' })).toBeUndefined();
        expect(resolveRosterAthlete({ name: 'Jude Bellingham', externalId: 'espn:nonexistent' })).toBeUndefined();
        expect(getAuthoritativeWorldCupPlayer({ name: 'Jude Bellingham', externalId: 'espn:nonexistent' })).toBeUndefined();
        expect(getAuthoritativeWorldCupPlayer({ name: 'Ibrahim Sabra', nationality: 'Jordan' })).toBeDefined();
    });

    it('applies authoritative factual positions to shared club copies without replacing current career ownership', () => {
        const original = getWorldCup2026Squad('ENG').find(player => player.name === 'Jude Bellingham')!;
        const player = { ...original, position: 'CM' as const, age: 30, wage: 300001, currentClub: 'Transferred Owner', effects: [{ type: 'InternationalRift' as const, severity: 'serious' as const, with: 'Other Player', until: 8, message: 'Saved rift' }] };
        const team = clubFor(player, 'Transferred Owner');
        const before = JSON.stringify(team);
        const linked = linkNationalRosterIdentitiesToClubTeams({ club: team }).club.players[0];
        expect(linked.position).toBe('AM');
        expect(linked.age).toBe(30);
        expect(linked.wage).toBe(300001);
        expect(linked.currentClub).toBe('Transferred Owner');
        expect(linked.effects).toEqual(player.effects);
        expect(JSON.stringify(team)).toBe(before);
    });

    it('returns isolated source copies, keeping source and user rows unchanged', () => {
        const before = JSON.stringify(clubSnapshot);
        const source = resolveRosterAthlete({ name: 'Jude Bellingham', nationality: 'England' })!;
        source.age = -1;
        source.sourceOccurrences[0].statistics.appearances = -999;
        expect(resolveRosterAthlete({ name: 'Jude Bellingham', nationality: 'England' })?.age).not.toBe(-1);
        expect(JSON.stringify(clubSnapshot)).toBe(before);
        expect(AUTHORITATIVE_WORLD_CUP_DATA).toEqual(supplied);
    });
});

describe('Selection-safe current-career hydration and old saves', () => {
    it('hydrates actual transferred ages/contracts/stats/rifts while keeping approved membership and count', () => {
        const nations = generateWorldCupStructure();
        const jude = nations.England.players.find(player => player.name === 'Jude Bellingham')!;
        const actual = {
            ...jude, name: 'J. Bellingham', age: 29, rating: 96, wage: 280001, contractExpires: 7,
            status: { type: 'On International Duty' as const, until: 20 },
            stats: { appearances: 20, goals: 9, assists: 7, cleanSheets: 5, yellowCards: 2, redCards: 0, averageRating: 8, ratingSum: 160 },
            effects: [{ type: 'InternationalRift' as const, severity: 'serious' as const, with: 'K. Mbappe', until: 18, message: 'Existing career rift' }],
        };
        const clubs = { owner: clubFor(actual), unrelated: clubFor({ ...getNationalSquadPool('ENG').find(player => player.name === 'Jason Steele')!, rating: 99 }, 'Unrelated Pool Player Club') };
        const before = JSON.stringify({ nations, clubs });
        const hydrated = hydrateNationalTeamsFromCareer(nations, clubs);
        for (const country of Object.keys(nations)) {
            expect(hydrated[country].players.map(stableId)).toEqual(nations[country].players.map(stableId));
            expect(hydrated[country].nationalRosterSource).toEqual(nations[country].nationalRosterSource);
        }
        const callup = hydrated.England.players.find(player => player.externalId === actual.externalId)!;
        expect(callup).toMatchObject({ name: 'J. Bellingham', sourceName: 'Jude Bellingham', currentClub: 'Actual Career Owner', position: 'AM', age: 29, wage: 280001, contractExpires: 7, rating: 96, status: { type: 'Available' } });
        expect(callup.stats).toEqual(actual.stats);
        expect(callup.effects).toEqual(actual.effects);
        expect(hydrated.England.players.some(player => player.name === 'Jason Steele')).toBe(false);
        expect(JSON.stringify({ nations, clubs })).toBe(before);
    });

    it('links a dataset-scoped player after a career transfer without inventing a source identity', () => {
        const jordan = createNationalRosterTeam('JOR');
        const player = jordan.players.find(player => !player.authoritativeWorldCupFacts?.resolvedSourceId)!;
        const actual = { ...player, age: 28, contractExpires: 6, currentClub: 'Current Career Club' };
        const hydrated = hydrateNationalTeamsFromCareer({ Jordan: jordan }, { owner: clubFor(actual, 'Current Career Club') });
        const callup = hydrated.Jordan.players.find(player => player.datasetPlayerId === actual.datasetPlayerId)!;
        expect(callup.age).toBe(28);
        expect(callup.currentClub).toBe('Current Career Club');
        expect(callup.externalId).toBe(actual.datasetPlayerId);
        expect(callup.authoritativeWorldCupFacts?.club).toBe(player.authoritativeWorldCupFacts?.club);
    });

    it('rehydrates compact official saves without expanding a short roster or dropping approved metadata', () => {
        const nations = { Colombia: createNationalRosterTeam('COL'), 'South Korea': createNationalRosterTeam('KOR') };
        const saved = JSON.parse(JSON.stringify(compactNationalTeams(nations))) as Record<string, Team>;
        const hydrated = hydrateNationalTeamsFromCareer(saved, {});
        expect(hydrated.Colombia.players).toHaveLength(23);
        expect(hydrated['South Korea'].players).toHaveLength(25);
        expect(hydrated.Colombia.nationalRosterSource.officialFinalSelection).toBe(true);
        expect(hydrated.Colombia.players.map(stableId)).toEqual(nations.Colombia.players.map(stableId));
        expect(hydrated.Colombia.players.every(player => player.nationalRosterFacts && player.authoritativeWorldCupFacts)).toBe(true);
    });

    it('does not silently migrate/reselect old source-pool saves or change saved starters', () => {
        const legacy = createNationalRosterTeam('ENG', 'A', 'source-pool');
        legacy.players = legacy.players.slice(0, 14);
        legacy.players[0].isStarter = false;
        legacy.players[0].age = 41;
        const hydrated = hydrateNationalTeamsFromCareer({ England: legacy }, {});
        expect(hydrated.England.players.map(player => player.externalId)).toEqual(legacy.players.map(player => player.externalId));
        expect(hydrated.England.players).toHaveLength(14);
        expect(hydrated.England.players[0].isStarter).toBe(false);
        expect(hydrated.England.players[0].age).toBe(41);
        expect(hydrated.England.nationalRosterSource.officialFinalSelection).toBe(false);
        const noMetadata = JSON.parse(JSON.stringify(legacy));
        delete noMetadata.nationalRosterSource;
        expect(hydrateNationalTeamsFromCareer({ England: noMetadata }, {}).England.players.map(player => player.externalId)).toEqual(legacy.players.map(player => player.externalId));
    });

    it('does not guess ownership when two current clubs carry the same provider identity', () => {
        const nation = createNationalRosterTeam('ENG');
        const player = nation.players.find(player => player.name === 'Jude Bellingham')!;
        const hydrated = hydrateNationalTeamsFromCareer({ England: nation }, { a: clubFor({ ...player, age: 99 }, 'Club A'), b: clubFor({ ...player, age: 88 }, 'Club B') });
        expect(hydrated.England.players.find(candidate => candidate.externalId === player.externalId)?.age).toBe(player.age);
        expect(hydrated.England.rosterWarnings.some(warning => warning.includes('Ambiguous career club identity'))).toBe(true);
    });
});
