import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { TEAMS } from '../constants';
import { getSeasonKitThemes, SEASON_THEME_PACK, SOURCED_KIT_CLUBS } from '../data/seasonThemes';

const PREVIOUSLY_REVIEWED_CLUBS = ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester City', 'Manchester United', 'Newcastle United', 'Tottenham'];

describe('source-backed current-season kit catalog', () => {
    it('keeps European kit season aligned with the build and preserves MLS calendar seasons', async () => {
        vi.stubGlobal('__MANUS_FM_VERSION__', 'test');
        vi.stubGlobal('__MANUS_FM_CHECKPOINT__', 'test');
        vi.stubGlobal('__MANUS_FM_BUILT_AT__', '2026-11-01T00:00:00.000Z');
        const { ACTIVE_SEASON } = await import('../buildInfo');
        expect(SEASON_THEME_PACK).toBe(ACTIVE_SEASON);
        vi.unstubAllGlobals();
        for (const name of Object.keys(TEAMS)) {
            for (const kit of getSeasonKitThemes(name)) {
                expect(kit.season).toBe(TEAMS[name].league === 'MLS' ? '2026' : '2026/27');
            }
        }
    });

    it('has a source-backed home kit and real local photo for every playable club', () => {
        expect([...SOURCED_KIT_CLUBS].sort()).toEqual(Object.keys(TEAMS).sort());
        for (const club of SOURCED_KIT_CLUBS) {
            const kits = getSeasonKitThemes(club);
            expect(kits.some(kit => kit.id === 'home'), club).toBe(true);
            expect(new Set(kits.map(kit => kit.id)).size).toBe(kits.length);
            for (const kit of kits) {
                expect(kit.sourceName).toBe('Football Kit Archive');
                expect(kit.sourceUrl).toMatch(/^https:\/\/www\.footballkitarchive\.com\/.+-kit-\d+\/$/);
                expect(kit.imageUrl).toMatch(/^\/kits\/2026\/.+\.webp$/);
                expect(kit.originalImageUrl).toMatch(/^https:\/\/www\.footballkitarchive\.com\/cdn\/2026\/.+\.jpg$/);
                expect(existsSync(resolve('public', kit.imageUrl.slice(1)))).toBe(true);
                expect(kit.bg).toMatch(/^#[0-9A-F]{6}$/i);
                expect(kit.accent).toMatch(/^#[0-9A-F]{6}$/i);
                expect(kit.text).toMatch(/^#[0-9A-F]{6}$/i);
                expect(kit.publicationStatus).toBe('archive-reference');
            }
        }
    });

    it('retains the individually reviewed home/away/third facts rather than rewriting them', () => {
        for (const name of PREVIOUSLY_REVIEWED_CLUBS) {
            const kits = getSeasonKitThemes(name);
            expect(kits.map(kit => kit.id)).toEqual(['home', 'away', 'third']);
            expect(kits.every(kit => kit.paletteProvenance === 'source-reviewed')).toBe(true);
            expect(kits.every(kit => kit.brand && kit.sponsor && kit.design)).toBe(true);
        }
        const [home, away, third] = getSeasonKitThemes('Manchester City');
        expect(home).toMatchObject({ bg: '#6CABDD', accent: '#FFFFFF', design: 'Gradient', brand: 'Puma', sponsor: 'Etihad Airways' });
        expect(away).toMatchObject({ bg: '#111111', design: 'Worker-bee graphic' });
        expect(third).toMatchObject({ bg: '#FFFFFF', design: 'Single vertical stripe' });
    });

    it('keeps absent sponsor, release and design metadata null instead of inventing facts', () => {
        const sampled = SOURCED_KIT_CLUBS.flatMap(name => getSeasonKitThemes(name)).filter(kit => kit.paletteProvenance === 'image-sampled');
        expect(sampled.length).toBeGreaterThan(0);
        for (const kit of sampled) {
            expect(kit.sponsor).toBeNull();
            expect(kit.brand).toBeNull();
            expect(kit.released).toBeNull();
            expect(kit.design).toBeNull();
        }
        const proof = JSON.parse(readFileSync('docs/kit-asset-manifest-2026.json', 'utf8'));
        expect(proof.missingClubs).toEqual([]);
        expect(proof.failedImages).toEqual([]);
    });

    it('does not fabricate records or expose inherited object keys for unknown clubs', () => {
        expect(getSeasonKitThemes('Unknown FC')).toEqual([]);
        expect(getSeasonKitThemes('toString')).toEqual([]);
        expect(getSeasonKitThemes('constructor')).toEqual([]);
    });
});
