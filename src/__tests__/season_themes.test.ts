import { describe, expect, it, vi } from 'vitest';
import { getSeasonKitThemes, SEASON_THEME_PACK, VERIFIED_KIT_CLUBS } from '../data/seasonThemes';

const EXPECTED_CLUBS = [
    'Arsenal',
    'Chelsea',
    'Liverpool',
    'Manchester City',
    'Manchester United',
    'Newcastle United',
    'Tottenham',
] as const;

describe('verified current-season kit catalog', () => {
    it('keeps the kit data season aligned with the Vite build-season declaration', async () => {
        vi.stubGlobal('__MANUS_FM_VERSION__', 'test');
        vi.stubGlobal('__MANUS_FM_CHECKPOINT__', 'test');
        vi.stubGlobal('__MANUS_FM_BUILT_AT__', '2026-10-10T00:00:00.000Z');

        const { ACTIVE_SEASON } = await import('../buildInfo');
        expect(SEASON_THEME_PACK).toBe(ACTIVE_SEASON);
        vi.unstubAllGlobals();
    });

    it('contains a complete, source-backed home/away/third record for every imported club', () => {
        expect([...VERIFIED_KIT_CLUBS].sort()).toEqual([...EXPECTED_CLUBS].sort());

        for (const club of EXPECTED_CLUBS) {
            const kits = getSeasonKitThemes(club);
            expect(kits.map(kit => kit.id)).toEqual(['home', 'away', 'third']);

            for (const kit of kits) {
                expect(kit.sourceName).toBe('Football Kit Archive');
                expect(kit.sourceUrl).toMatch(/^https:\/\/www\.footballkitarchive\.com\/.+-kit-\d+\/$/);
                expect(kit.imageUrl).toMatch(/^https:\/\/www\.footballkitarchive\.com\/cdn\/2026\/.+\.jpg$/);
                expect(kit.bg).toMatch(/^#[0-9A-F]{6}$/i);
                expect(kit.accent).toMatch(/^#[0-9A-F]{6}$/i);
                expect(kit.text).toMatch(/^#[0-9A-F]{6}$/i);
                expect(kit.colorNames.length).toBeGreaterThan(0);
                expect(kit.brand).not.toBe('');
                expect(kit.sponsor).not.toBe('');
                expect(kit.design).not.toBe('');
            }
        }
    });

    it('preserves the Manchester City 2026/27 source facts rather than generic legacy colours', () => {
        const [home, away, third] = getSeasonKitThemes('Manchester City');

        expect(home).toMatchObject({
            bg: '#6CABDD',
            accent: '#FFFFFF',
            design: 'Gradient',
            brand: 'Puma',
            sponsor: 'Etihad Airways',
        });
        expect(away).toMatchObject({ bg: '#111111', design: 'Worker-bee graphic' });
        expect(third).toMatchObject({ bg: '#FFFFFF', design: 'Single vertical stripe' });
    });

    it('does not fabricate a current-season kit for an unverified club', () => {
        expect(getSeasonKitThemes('West Ham')).toEqual([]);
    });
});
