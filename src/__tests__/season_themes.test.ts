import { describe, expect, it } from 'vitest';
import { getSeasonKitThemes, SEASON_THEME_PACK } from '../data/seasonThemes';

describe('season theme pack', () => {
    it('returns accessible home, away, and third UI themes for clubs with a partial color record', () => {
        const themes = getSeasonKitThemes({
            colors: { primary: '#FFFFFF', secondary: '#102B62', text: '#102B62' },
        });

        expect(SEASON_THEME_PACK).toBe('2026/27');
        expect(themes.map(theme => theme.id)).toEqual(['home', 'away', 'third']);
        expect(themes[0].text).toBe('#0F172A');
        expect(themes[1].bg).toBe('#102B62');
        expect(themes[2].accent).toBe('#FFFFFF');
    });
});
