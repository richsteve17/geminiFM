import { describe, expect, it, vi } from 'vitest';
import { TEAMS } from '../constants';
import { getChampionsLeagueParticipants } from '../europe';
import { getCurrentClubTeams, getClubRosterSource } from '../engine/clubRosters';

describe('Source-backed simulated European qualification', () => {
    it('selects exactly 36 existing sourced European top-division clubs without generated squads', () => {
        const clubs = getCurrentClubTeams(TEAMS);
        const before = JSON.stringify(clubs);
        const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Generated roster forbidden'); });
        try {
            const result = getChampionsLeagueParticipants(clubs);
            expect(result.participants).toHaveLength(36);
            expect(new Set(result.participants).size).toBe(36);
            expect(result.newTeams).toEqual({});
            expect(getChampionsLeagueParticipants(clubs)).toEqual(result);
            expect(getChampionsLeagueParticipants(Object.fromEntries(Object.entries(clubs).reverse()))).toEqual(result);
            for (const name of result.participants) {
                const team = clubs[name];
                expect(team).toBeDefined();
                expect(['Premier League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue 1']).toContain(team.league);
                expect(['eng.1', 'esp.1', 'ita.1', 'ger.1', 'fra.1']).toContain(getClubRosterSource(team)?.sourceLeagueCode);
                expect(team.players.length).toBeGreaterThanOrEqual(11);
                expect(name).not.toMatch(/FC Europe/);
            }
            expect(JSON.stringify(clubs)).toBe(before);
        } finally { random.mockRestore(); }
    });

    it('never fills short coverage or admits rich MLS/Championship/unsourced clubs', () => {
        const clubs = getCurrentClubTeams(TEAMS);
        const candidates = {
            Arsenal: clubs.Arsenal,
            MLS: { ...clubs['Inter Miami'], prestige: 999 },
            Championship: { ...clubs['West Ham'], prestige: 999 },
            Unsourced: { ...TEAMS['Real Madrid'], prestige: 999 },
            WrongLeague: { ...clubs['FC Barcelona'], league: 'International' as const, prestige: 999 },
            Missing: { ...clubs.Chelsea, clubRosterSource: { ...clubs.Chelsea.clubRosterSource, status: 'missing' as const } },
        };
        expect(getChampionsLeagueParticipants(candidates)).toEqual({ participants: ['Arsenal'], newTeams: {} });
    });
});
