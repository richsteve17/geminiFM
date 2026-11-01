import { describe, expect, it } from 'vitest';
import type { MatchEvent } from '../types';
import { chooseFootballAction, gaitPhase, sampleFootballPose, smoothFacing } from '../engine/playerMotion';

const goal: MatchEvent = {
    id: 71,
    minute: 71,
    type: 'goal',
    teamName: 'Northbridge FC',
    player: 'Marta Vale',
    description: 'Marta Vale scores.',
    play: {
        kind: 'shot',
        outcome: 'goal',
        ballPath: [{ x: 70, y: 50 }, { x: 100, y: 50 }],
        receiver: 'Marta Vale',
    },
};

const savedShot: MatchEvent = {
    ...goal,
    id: 72,
    type: 'commentary',
    description: 'The goalkeeper makes the save.',
    play: {
        ...goal.play!,
        outcome: 'saved',
    },
};

describe('player motion pose math', () => {
    it('freezes gait while paused and otherwise advances from visual distance only', () => {
        expect(gaitPhase(1.2, 999, true)).toBeCloseTo(1.2, 10);
        expect(gaitPhase(0, 0.375, false)).toBeCloseTo(Math.PI, 10);
    });

    it('turns across the -pi/pi boundary through the short angle rather than snapping through zero', () => {
        const facing = smoothFacing(179 * Math.PI / 180, -179 * Math.PI / 180, 0.1);
        expect(Math.abs(facing)).toBeGreaterThan(3);
        expect(Math.abs(facing + 179 * Math.PI / 180)).toBeLessThan(0.03);
    });

    it('bounds malformed or extreme numeric inputs to finite local rig values', () => {
        const pose = sampleFootballPose({
            phase: Number.POSITIVE_INFINITY,
            speed: Number.POSITIVE_INFINITY,
            action: 'save',
            actionProgress: Number.NEGATIVE_INFINITY,
            goalkeeper: true,
        });

        for (const value of Object.values(pose)) {
            expect(Number.isFinite(value)).toBe(true);
            expect(Math.abs(value)).toBeLessThanOrEqual(1.65);
        }
        expect(gaitPhase(Number.NaN, Number.POSITIVE_INFINITY, false)).toBeGreaterThanOrEqual(0);
        expect(gaitPhase(Number.NaN, Number.POSITIVE_INFINITY, false)).toBeLessThan(Math.PI * 2);
        expect(Number.isFinite(smoothFacing(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN))).toBe(true);
    });

    it('returns to rest after action timing ends and only animates known actors', () => {
        const rest = sampleFootballPose({ phase: 0, speed: 0, action: 'idle', actionProgress: 0 });
        expect(sampleFootballPose({ phase: 2.7, speed: 8, action: 'shoot', actionProgress: 1 })).toEqual(rest);
        expect(sampleFootballPose({ phase: 2.7, speed: 8, action: 'run', actionProgress: 1 })).toEqual(rest);

        expect(chooseFootballAction(goal, 'Marta Vale', false, false, 0.7)).toBe('celebrate');
        expect(chooseFootballAction(goal, 'Marta Vale', false, false, 0.97)).toBe('idle');
        expect(chooseFootballAction(goal, 'A. Spectator', false, false, 0.4)).toBe('idle');
    });

    it('uses resolved outcome for goalkeeper saves, never treating a scored goal as a save', () => {
        expect(chooseFootballAction(goal, 'Northbridge GK', true, true, 0.5)).toBe('idle');
        expect(chooseFootballAction(savedShot, 'Northbridge GK', true, true, 0.5)).toBe('save');
        expect(chooseFootballAction(savedShot, 'Northbridge GK', true, false, 0.5)).toBe('idle');
        expect(chooseFootballAction(savedShot, 'Northbridge GK', true, true, 0.9)).toBe('idle');
    });

    it('does not give a same-named opposing keeper or defender the scorer action', () => {
        const collision = { ...goal, teamName: 'Newcastle United', player: 'J. Wilson' };
        expect(chooseFootballAction(collision, 'J. Wilson', true, true, 0.4)).toBe('idle');
        expect(chooseFootballAction(collision, 'J. Wilson', true, true, 0.7)).toBe('idle');
        expect(chooseFootballAction(collision, 'J. Wilson', false, true, 0.7)).toBe('idle');
        expect(chooseFootballAction(collision, 'J. Wilson', false, false, 0.7)).toBe('celebrate');
        const saved = { ...savedShot, player: 'J. Wilson' };
        expect(chooseFootballAction(saved, 'J. Wilson', true, true, 0.5)).toBe('save');
    });
});
