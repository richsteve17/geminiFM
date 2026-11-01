import { describe, expect, it } from 'vitest';
import { findChantRecording } from '../data/chantAudioCatalog';
describe('club culture and recording selection', () => {
    it('plays the supplied Liverpool anthem on walkout rather than picking a random terrace song', () => {
        expect(findChantRecording({ clubName: 'Liverpool', cueKind: 'kickoff', playbackKey: 'any-fixture' })?.id).toBe('liverpool-ynwa-live');
    });
    it('selects a van Dijk song for van Dijk but never a Firmino song for Wirtz', () => {
        expect(findChantRecording({ clubName: 'Liverpool', cueKind: 'goal', playerName: 'V. van Dijk', playbackKey: 'goal42' })?.id).toBe('liverpool-virgil-van-dijk');
        for (let id = 0; id < 20; id++) expect(findChantRecording({ clubName: 'Liverpool', cueKind: 'goal', playerName: 'F. Wirtz', playbackKey: `goal${id}` })?.id).toBe('liverpool-allez-anfield');
    });
    it('does not replace an unavailable club/cue recording with an unrelated anthem', () => {
        expect(findChantRecording({ clubName: 'Arsenal', cueKind: 'goal', playbackKey: 'g' })).toBeUndefined();
        expect(findChantRecording({ clubName: 'Galatasaray', cueKind: 'kickoff', playbackKey: 'k' })).toBeUndefined();
    });
});
