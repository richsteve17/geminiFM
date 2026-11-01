import { describe, expect, it } from 'vitest';
import { TEAMS } from '../constants';
import { getSeasonKitThemes } from '../data/seasonThemes';
import { selectMatchKits } from '../engine/matchKits';
import type { Team } from '../types';

const withPalette = (name: string, colors?: Team['colors']): Team => ({
    ...TEAMS['Arsenal'],
    name,
    colors,
});

describe('match kit selection', () => {
    it('uses the exact-season local source photograph for a catalogued home club', () => {
        const result = selectMatchKits(TEAMS['Arsenal'], TEAMS['Chelsea'], 'Arsenal', 'Chelsea');
        const arsenalHome = getSeasonKitThemes('Arsenal').find(kit => kit.id === 'home');

        expect(result.home.sourceImage).toBe(arsenalHome?.imageUrl);
        expect(result.home.sourceImage).toMatch(/^\/kits\/2026\/.+\.webp$/);
        expect(result.home.sourceUrl).toBe(arsenalHome?.sourceUrl);
        expect(result.home.label).toContain('HOME · 2026/27');
        expect(result.home.approximate).toBe(true);
    });

    it('selects a sourced alternate when the catalogued home shirts visually clash', () => {
        const result = selectMatchKits(
            TEAMS['Arsenal'],
            TEAMS['Manchester United'],
            'Arsenal',
            'Manchester United',
        );
        const unitedHome = getSeasonKitThemes('Manchester United').find(kit => kit.id === 'home');
        const unitedAlternates = getSeasonKitThemes('Manchester United')
            .filter(kit => kit.id !== 'home')
            .map(kit => kit.imageUrl);

        expect(result.away.sourceImage).not.toBe(unitedHome?.imageUrl);
        expect(unitedAlternates).toContain(result.away.sourceImage);
    });

    it('uses a different sourced outfit for a club playing itself', () => {
        const result = selectMatchKits(TEAMS['Arsenal'], TEAMS['Arsenal'], 'Arsenal', 'Arsenal');

        expect(result.home.sourceImage).not.toBe(result.away.sourceImage);
        expect(result.away.sourceImage).toBeTruthy();
        expect(result.away.label).not.toContain('HOME · 2026/27');
    });

    it('does not invent a source for an unknown club and labels the palette fallback as approximate', () => {
        const home = withPalette('Northbridge FC', {
            primary: '#123456',
            secondary: '#F0C000',
            text: '#FFFFFF',
        });
        const away = withPalette('Southbank United', {
            primary: '#654321',
            secondary: '#EEEEEE',
            text: '#000000',
        });
        const result = selectMatchKits(home, away, home.name, away.name);

        expect(result.home).toMatchObject({
            shirt: '#123456',
            sourceImage: null,
            sourceUrl: null,
            approximate: true,
        });
        expect(result.home.label).toContain('colour-palette fallback');
        expect(result.away.sourceImage).toBeNull();
        expect(result.away.sourceUrl).toBeNull();
    });

    it('uses a neutral, explicitly approximate fallback for national teams without kit catalog records', () => {
        const england = withPalette('England', undefined);
        const france = withPalette('France', undefined);
        england.league = 'International';
        france.league = 'International';

        const result = selectMatchKits(england, france, 'England', 'France');

        expect(result.home.sourceImage).toBeNull();
        expect(result.away.sourceImage).toBeNull();
        expect(result.home.approximate).toBe(true);
        expect(result.home.label).toContain('National-team');
        expect(result.away.label).toContain('National-team');
    });

    it('gives both goalkeepers distinct high-contrast, role-only approximate colours', () => {
        const result = selectMatchKits(TEAMS['Arsenal'], TEAMS['Manchester United'], 'Arsenal', 'Manchester United');

        expect(result.homeKeeper).toMatchObject({
            kind: 'goalkeeper',
            sourceImage: null,
            sourceUrl: null,
            approximate: true,
        });
        expect(result.awayKeeper.kind).toBe('goalkeeper');
        expect(result.homeKeeper.label).toContain('Goalkeeper role colour');
        expect(result.awayKeeper.label).toContain('Goalkeeper role colour');
        expect(result.homeKeeper.shirt).not.toBe(result.awayKeeper.shirt);
        expect([result.home.shirt, result.away.shirt]).not.toContain(result.homeKeeper.shirt);
        expect([result.home.shirt, result.away.shirt]).not.toContain(result.awayKeeper.shirt);
    });

    it('returns the same complete kit selection for stable inputs', () => {
        const first = selectMatchKits(TEAMS['AC Milan'], TEAMS['AS Roma'], 'AC Milan', 'AS Roma');
        const second = selectMatchKits(TEAMS['AC Milan'], TEAMS['AS Roma'], 'AC Milan', 'AS Roma');

        expect(second).toEqual(first);
    });
});
