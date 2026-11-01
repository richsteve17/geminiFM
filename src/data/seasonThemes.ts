import importedCatalog from './seasonKitCatalog.json';

export type SeasonKitTheme = {
    id: 'home' | 'away' | 'third';
    label: string;
    season: '2026/27' | '2026';
    bg: string;
    accent: string;
    text: string;
    colorNames: readonly string[];
    design: string | null;
    brand: string | null;
    sponsor: string | null;
    released: string | null;
    description: string | null;
    sourceName: string;
    sourceUrl: string;
    imageUrl: string;
    originalImageUrl: string;
    catalogUrl: string;
    paletteProvenance: 'source-reviewed' | 'image-sampled';
    publicationStatus: 'archive-reference';
};

export const SEASON_THEME_PACK = '2026/27';

/**
 * Source-linked photographs and local image assets, not fictional kit drawings.
 * MLS records retain their calendar-year season. Archive presence is not official
 * release certification; newly imported sponsor/release/design fields remain null.
 * New UI palettes are sampled approximations, never claimed manufacturer specs.
 */
const KITS_BY_CLUB = Object.freeze(Object.fromEntries(
    Object.entries(importedCatalog).map(([name, kits]) => [
        name,
        Object.freeze(kits.map(kit => Object.freeze(kit))),
    ]),
)) as Readonly<Record<string, readonly SeasonKitTheme[]>>;

export const SOURCED_KIT_CLUBS = Object.freeze(Object.keys(KITS_BY_CLUB));
/** Backward-compatible identifier; source presence is not official certification. */
export const VERIFIED_KIT_CLUBS = SOURCED_KIT_CLUBS;

export function getSeasonKitThemes(teamName: string): readonly SeasonKitTheme[] {
    return Object.prototype.hasOwnProperty.call(KITS_BY_CLUB, teamName)
        ? KITS_BY_CLUB[teamName]
        : [];
}
