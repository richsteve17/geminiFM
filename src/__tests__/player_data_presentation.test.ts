import { describe, expect, it } from 'vitest';
import { formatRosterAge } from '../engine/playerDataPresentation';

describe('roster source facts in player presentation', () => {
    it('keeps an observed or ordinary saved career age readable', () => {
        expect(formatRosterAge({ age: 24 })).toBe('24');
    });
    it('does not present a game fallback as a sourced real age', () => {
        const player = { age: 25, gameDerived: { ageFallback: true } };
        expect(formatRosterAge(player)).toBe('25 (est.)');
        player.age = 26;
        expect(formatRosterAge(player)).toBe('26 (est.)');
    });
});
