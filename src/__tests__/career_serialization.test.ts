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
});
