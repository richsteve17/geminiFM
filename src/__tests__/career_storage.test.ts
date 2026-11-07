import { describe, expect, it } from 'vitest';
import { encodeCareerSave, decodeCareerSave, readCareerSaveMetadata, preserveCareerBackup } from '../engine/careerStorage';

const career = {
    version: 3, userTeamName: 'Liverpool', currentWeek: 6, currentYear: 2,
    teams: { Liverpool: { name: 'Liverpool', league: 'Premier League', balance: 1234, players: [{ name: 'Player', externalId: 'espn:1', age: 28, wage: 5000, stats: { goals: 3 }, effects: [{ relationshipId: 'r1' }], clubRosterFacts: { huge: 'source'.repeat(1000) }, gameDerived: { ageFallback: true } }] } },
    relationshipIncidents: [{ id: 'r1', strength: 80 }], tutorialCompletion: { finish: 'Winner' },
};
describe('bounded backward-compatible browser career storage', () => {
    it('roundtrips the actual timeline and reads the homepage preview without raw source copies', () => {
        const encoded = encodeCareerSave(career);
        const restored = decodeCareerSave(encoded);
        expect(restored.teams.Liverpool.balance).toBe(1234);
        expect(restored.teams.Liverpool.players[0].stats.goals).toBe(3);
        expect(restored.teams.Liverpool.players[0].gameDerived.ageFallback).toBe(true);
        expect(restored.teams.Liverpool.players[0].clubRosterFacts).toBeUndefined();
        expect(restored.relationshipIncidents).toEqual(career.relationshipIncidents);
        expect(restored.tutorialCompletion).toEqual(career.tutorialCompletion);
        expect(readCareerSaveMetadata(encoded)).toEqual({ teamName: 'Liverpool', week: 6, year: 2 });
        expect(encoded.length).toBeLessThan(JSON.stringify(career).length);
        expect(career.teams.Liverpool.players[0].clubRosterFacts).toBeDefined();
    });
    it('reads existing uncompressed careers and unemployed starts', () => {
        expect(decodeCareerSave(JSON.stringify(career))).toEqual(career);
        expect(readCareerSaveMetadata(JSON.stringify({ ...career, userTeamName: null }))).toEqual({ teamName: 'Unemployed', week: 6, year: 2 });
    });
    it('does not require duplicate backup quota to restore the valid primary save', () => {
        const raw = JSON.stringify(career);
        const fullStorage = { setItem: () => { throw new Error('QuotaExceededError'); } };
        expect(preserveCareerBackup(fullStorage, raw)).toBe(false);
        expect(decodeCareerSave(raw)).toEqual(career);
        const writes: Array<[string, string]> = [];
        expect(preserveCareerBackup({ setItem: (key, value) => { writes.push([key, value]); } }, raw)).toBe(true);
        expect(writes).toEqual([['gfm_save_v1_backup', raw]]);
    });
    it('rejects corrupt data and unknown encodings before game state is applied', () => {
        const envelope = JSON.parse(encodeCareerSave(career));
        expect(() => decodeCareerSave(JSON.stringify({ ...envelope, encoding: 'future-v99' }))).toThrow('Unsupported save encoding');
        expect(() => decodeCareerSave(JSON.stringify({ ...envelope, payload: 'not-base64' }))).toThrow();
        expect(() => decodeCareerSave(JSON.stringify({ ...envelope, uncompressedBytes: envelope.uncompressedBytes + 1 }))).toThrow('size');
        expect(() => decodeCareerSave(JSON.stringify({ ...envelope, uncompressedBytes: 33 * 1024 * 1024 }))).toThrow('header');
        expect(() => decodeCareerSave('null')).toThrow('career record');
    });
});
