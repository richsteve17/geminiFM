import { describe, expect, it } from 'vitest';
import type { MatchEvent } from '../types';
import { createAtmosphereCueMemory, selectAtmosphereCues, type AtmosphereCueSnapshot } from '../engine/atmosphereCues';
import { findChantRecording } from '../data/chantAudioCatalog';
import { createChantForCue, resetChantSelectionForTests } from '../services/chantService';
import { StadiumAudioDirector } from '../services/audioDirector';

const event = (id: number, minute: number, teamName: string, player: string): MatchEvent => ({
    id,
    minute,
    type: 'goal',
    teamName,
    player,
    description: `GOAL for ${teamName}`,
});

const snapshot = (overrides: Partial<AtmosphereCueSnapshot> = {}): AtmosphereCueSnapshot => ({
    matchId: 'fixture-77',
    homeTeamName: 'Liverpool',
    awayTeamName: 'Chelsea',
    currentMinute: 18,
    momentum: 0,
    events: [],
    isLive: true,
    isFinished: false,
    ...overrides,
});

describe('stadium atmosphere cue selector', () => {
    it('emits every unseen goal in a batched event ledger, not only the final array item', () => {
        const first = selectAtmosphereCues(snapshot({
            events: [
                event(202, 17, 'Chelsea', 'A. Blue'),
                event(101, 11, 'Liverpool', 'R. Red'),
            ],
        }), createAtmosphereCueMemory());

        expect(first.cues.filter(cue => cue.kind === 'goal').map(cue => cue.sourceEventId)).toEqual([101, 202]);
        expect(first.cues.filter(cue => cue.kind === 'goal').map(cue => cue.clubName)).toEqual(['Liverpool', 'Chelsea']);

        const second = selectAtmosphereCues(snapshot({
            currentMinute: 26,
            events: [
                event(202, 17, 'Chelsea', 'A. Blue'),
                event(101, 11, 'Liverpool', 'R. Red'),
                event(303, 25, 'Liverpool', 'R. Red'),
            ],
        }), first.memory);

        expect(second.cues.map(cue => [cue.kind, cue.sourceEventId])).toEqual([['goal', 303]]);
    });

    it('deduplicates kickoff/full-time and cools pressure without suppressing goals', () => {
        const first = selectAtmosphereCues(snapshot({ currentMinute: 24, momentum: 7 }), createAtmosphereCueMemory());
        expect(first.cues.map(cue => cue.kind)).toEqual(['kickoff', 'pressure']);

        const beforeCooldown = selectAtmosphereCues(snapshot({ currentMinute: 30, momentum: 8 }), first.memory);
        expect(beforeCooldown.cues).toEqual([]);

        const afterCooldown = selectAtmosphereCues(snapshot({ currentMinute: 34, momentum: 8 }), first.memory);
        expect(afterCooldown.cues.map(cue => cue.kind)).toEqual(['pressure']);

        const fullTime = selectAtmosphereCues(snapshot({
            currentMinute: 90,
            isLive: false,
            isFinished: true,
            events: [event(400, 81, 'Chelsea', 'A. Blue')],
        }), afterCooldown.memory);
        expect(fullTime.cues.map(cue => cue.kind)).toEqual(['goal', 'fulltime']);
        expect(fullTime.cues[1]).toMatchObject({ kind: 'fulltime', clubName: 'Chelsea' });
        expect(selectAtmosphereCues(snapshot({ currentMinute: 90, isLive: false, isFinished: true, events: [event(400, 81, 'Chelsea', 'A. Blue')] }), fullTime.memory).cues).toEqual([]);
    });
});

describe('recording-backed chants', () => {
    it('selects an actual supplied recording for the matching club and never borrows another club for an unknown club', () => {
        const chelseaKickoff = findChantRecording({
            clubName: 'Chelsea FC',
            cueKind: 'kickoff',
            playbackKey: 'fixture-77:kickoff',
        });
        expect(chelseaKickoff).toMatchObject({
            id: 'chelsea-liquidator-stamford-bridge',
            songbookId: 'the_liquidator',
            source: { sourceId: 'XgiLEStsnz0', recordingType: 'stadium' },
        });
        expect(findChantRecording({ clubName: 'Northbridge FC', cueKind: 'goal', playbackKey: 'x' })).toBeUndefined();
    });

    it('binds a Liverpool match cue to a catalog recording and leaves unknown clubs honestly unmapped', () => {
        resetChantSelectionForTests();
        const liverpool = createChantForCue({
            id: 'fixture-77:goal:event-101',
            kind: 'goal',
            clubName: 'Liverpool',
            opponentName: 'Chelsea',
            side: 'home',
            minute: 11,
            intensity: 'high',
            playerName: 'R. Red',
            sourceEventId: 101,
        });
        expect(liverpool.audioSource).toBe('recorded-terrace');
        expect(liverpool.recording?.clubAliases).toContain('Liverpool');

        const unmapped = createChantForCue({
            id: 'fixture-77:goal:event-999',
            kind: 'goal',
            clubName: 'Northbridge FC',
            opponentName: 'Chelsea',
            side: 'home',
            minute: 77,
            intensity: 'high',
            sourceEventId: 999,
        });
        expect(unmapped.audioSource).toBe('no-recording');
        expect(unmapped.lyrics.join('\n')).not.toMatch(/\{[A-Z_]+\}/);
    });

    it('never unlocks or pretends to play a recording from a non-gesture match event', async () => {
        const director = new StadiumAudioDirector();
        const chant = createChantForCue({
            id: 'fixture-77:kickoff:opening-whistle',
            kind: 'kickoff',
            clubName: 'Chelsea',
            opponentName: 'Liverpool',
            side: 'home',
            minute: 0,
            intensity: 'medium',
        });
        const result = await director.playChant(chant);
        expect(result).toMatchObject({ state: 'locked', retryable: true });
        expect(director.getStatus().state).toBe('locked');
    });
});
