import { describe, expect, it } from 'vitest';
import { serializeCareerSave } from '../engine/careerSerialization';
describe('national source-pool save compaction', () => {
    it('removes duplicate pools but keeps selected players and actual goals and relationship facts', () => {
        const teams: any = { England: { name: 'England', league: 'International', nationalSquadPool: [{ huge: true }], players: [{ name: 'J. Bellingham', externalId: 'espn:291281', stats: { goals: 3 }, effects: [{ relationshipId: 'r1' }], nationalRosterFacts: { occurrences: ['source'] }, gameDerived: {} }] } };
        const input = { teams, prologueArchive: { teams, fixtures: [{ id: 'final', events: [{ player: 'J. Bellingham' }] }] }, relationshipIncidents: [{ id: 'r1' }] };
        const saved = JSON.parse(serializeCareerSave(input));
        expect(saved.teams.England.nationalSquadPool).toBeUndefined();
        expect(saved.teams.England.players[0].nationalRosterFacts).toBeUndefined();
        expect(saved.teams.England.players[0].stats.goals).toBe(3);
        expect(saved.teams.England.players[0].externalId).toBe('espn:291281');
        expect(saved.prologueArchive.fixtures[0].events[0].player).toBe('J. Bellingham');
        expect(teams.England.nationalSquadPool).toHaveLength(1);
    });
    it('omits duplicate club evidence but retains every canonical career field and derived-data flag', () => {
        const player: any = {
            name: 'Real sourced player', externalId: 'espn:123', currentClub: 'Career owner', age: 28,
            wage: 10000, contractExpires: 4, squadNumber: 7, stats: { goals: 12 }, history: [{ year: 1, goals: 3 }],
            effects: [{ relationshipId: 'r1', type: 'Rift' }], gameDerived: { ageFallback: true },
            clubRosterFacts: { sourceOccurrences: [{ statistics: { games: 20 } }] },
            clubRosterProvenance: { snapshotDate: '2026-11-07', age: 'game-fallback' },
        };
        const input = { teams: { Club: { name: 'Club', league: 'MLS', balance: 12345, players: [player], clubRosterSource: { snapshotDate: '2026-11-07' } } }, transferMarket: [player], relationshipIncidents: [{ id: 'r1' }] };
        const saved = JSON.parse(serializeCareerSave(input));
        expect(saved.teams.Club.players[0].clubRosterFacts).toBeUndefined();
        expect(saved.transferMarket[0].clubRosterFacts).toBeUndefined();
        expect(saved.teams.Club.players[0].stats.goals).toBe(12);
        expect(saved.teams.Club.players[0].history).toEqual(player.history);
        expect(saved.teams.Club.players[0].effects).toEqual(player.effects);
        expect(saved.teams.Club.players[0].currentClub).toBe('Career owner');
        expect(saved.teams.Club.players[0].gameDerived.ageFallback).toBe(true);
        expect(saved.teams.Club.players[0].clubRosterProvenance).toEqual(player.clubRosterProvenance);
        expect(saved.teams.Club.balance).toBe(12345);
        expect(saved.teams.Club.clubRosterSource.snapshotDate).toBe('2026-11-07');
        expect(saved.relationshipIncidents).toEqual(input.relationshipIncidents);
        expect(player.clubRosterFacts).toBeDefined();
    });
});
