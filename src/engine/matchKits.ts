import { getSeasonKitThemes, type SeasonKitTheme } from '../data/seasonThemes';
import type { Team } from '../types';

export interface MatchKit {
    shirt: string;
    trim: string;
    shorts: string;
    socks: string;
    numberInk: string;
    sourceImage: string | null;
    sourceUrl: string | null;
    label: string;
    kind: 'outfield' | 'goalkeeper';
    approximate: boolean;
}

type PaletteCandidate = MatchKit & {
    catalogClub: string | null;
    outfitId: string;
};

type Rgb = readonly [number, number, number];

const RGB_DISTANCE_MAX = Math.sqrt(3 * 255 ** 2);
const SHIRT_CLASH_DISTANCE = 0.28;
const DEFAULT_NEUTRAL_PALETTE = ['#64748B', '#E2E8F0', '#18212F'] as const;
const KEEPER_PALETTES = [
    { shirt: '#F59E0B', trim: '#172033' },
    { shirt: '#00A6A6', trim: '#F8FAFC' },
    { shirt: '#7C3AED', trim: '#F8FAFC' },
    { shirt: '#E85D04', trim: '#172033' },
    { shirt: '#2563EB', trim: '#F8FAFC' },
    { shirt: '#D61F69', trim: '#F8FAFC' },
] as const;

/**
 * Returns visual render palettes, not claims about complete authentic garments.
 * Catalog choices link to exact-season local source photos; all rendered colour
 * fields remain marked approximate because this app does not hold documented
 * shorts, socks, back, sponsor, or goalkeeper-kit specifications.
 */
export function selectMatchKits(
    home: Team | undefined,
    away: Team | undefined,
    homeName: string,
    awayName: string,
): { home: MatchKit; away: MatchKit; homeKeeper: MatchKit; awayKeeper: MatchKit } {
    const homeIdentity = resolveIdentity(home, homeName);
    const awayIdentity = resolveIdentity(away, awayName);
    const homeCandidates = sourceCandidates(home, homeName, homeIdentity);
    const awayCandidates = sourceCandidates(away, awayName, awayIdentity);
    const selectedHome = selectHomeCandidate(homeCandidates, home, homeIdentity);
    const selectedAway = selectAwayCandidate(
        selectedHome,
        awayCandidates,
        away,
        awayIdentity,
        homeIdentity === awayIdentity,
    );
    const homeKeeper = selectKeeper('home', selectedHome, selectedAway, undefined);
    const awayKeeper = selectKeeper('away', selectedHome, selectedAway, homeKeeper);

    return {
        home: publicKit(selectedHome),
        away: publicKit(selectedAway),
        homeKeeper: publicKit(homeKeeper),
        awayKeeper: publicKit(awayKeeper),
    };
}

function resolveIdentity(team: Team | undefined, suppliedName: string): string {
    return team?.name || suppliedName || 'Unknown team';
}

function sourceCandidates(team: Team | undefined, suppliedName: string, identity: string): PaletteCandidate[] {
    for (const exactName of exactNames(team, suppliedName)) {
        const themes = getSeasonKitThemes(exactName);
        if (themes.length > 0) {
            return themes.map(theme => sourceCandidate(exactName, theme));
        }
    }
    return [];
}

function exactNames(team: Team | undefined, suppliedName: string): string[] {
    return [...new Set([team?.name, suppliedName].filter((name): name is string => Boolean(name)))];
}

function sourceCandidate(catalogClub: string, theme: SeasonKitTheme): PaletteCandidate {
    const shirt = normaliseHex(theme.bg, '#64748B');
    const trim = normaliseHex(theme.accent, '#E2E8F0');
    const sourceImage = isLocalWebp(theme.imageUrl) ? theme.imageUrl : null;

    return {
        shirt,
        trim,
        // These render fields deliberately reuse the reviewed/sampled palette;
        // they do not assert real shorts or socks construction or colours.
        shorts: trim,
        socks: shirt,
        numberInk: contrastingInk(shirt),
        sourceImage,
        sourceUrl: sourceImage ? theme.sourceUrl : null,
        label: `Source photo reference — ${theme.label}; rendered garment palette approximate`,
        kind: 'outfield',
        approximate: true,
        catalogClub,
        outfitId: `${catalogClub}:${theme.id}`,
    };
}

function selectHomeCandidate(
    candidates: PaletteCandidate[],
    team: Team | undefined,
    identity: string,
): PaletteCandidate {
    return candidates.find(candidate => candidate.outfitId.endsWith(':home'))
        ?? candidates[0]
        ?? fallbackCandidates(team, identity)[0];
}

function selectAwayCandidate(
    home: PaletteCandidate,
    sourceOptions: PaletteCandidate[],
    team: Team | undefined,
    identity: string,
    sameTeam: boolean,
): PaletteCandidate {
    const candidates = sourceOptions.length > 0 ? sourceOptions : fallbackCandidates(team, identity);
    const preferred = candidates.find(candidate => candidate.outfitId.endsWith(':home')) ?? candidates[0];
    const mustChangeOutfit = sameTeam || paletteDistance(home, preferred) < SHIRT_CLASH_DISTANCE;

    if (!mustChangeOutfit) {
        return preferred;
    }

    const alternates = candidates.filter(candidate => (
        candidate.outfitId !== home.outfitId
        && candidate.sourceImage !== home.sourceImage
        && candidate !== preferred
    ));
    const pool = alternates.length > 0 ? alternates : candidates.filter(candidate => candidate !== preferred);

    return selectMostDistinct(home, pool) ?? preferred;
}

function fallbackCandidates(team: Team | undefined, identity: string): PaletteCandidate[] {
    const isNationalTeam = team?.league === 'International';
    const context = isNationalTeam ? 'National-team' : identity;
    const colours = team?.colors;
    const baseColours = [colours?.primary, colours?.third, colours?.secondary]
        .map(colour => normaliseHexOrNull(colour))
        .filter((colour): colour is string => colour !== null);
    const shirtChoices = uniqueColours(baseColours.length > 0 ? baseColours : DEFAULT_NEUTRAL_PALETTE);

    // A narrow neutral reserve lets a same-club or same-colour fixture remain
    // readable without inventing an additional club kit.
    for (const neutral of DEFAULT_NEUTRAL_PALETTE) {
        if (!shirtChoices.includes(neutral)) {
            shirtChoices.push(neutral);
        }
    }

    return shirtChoices.map((shirt, index) => {
        const trim = shirtChoices.find(colour => colour !== shirt) ?? contrastingInk(shirt);
        const role = index === 0 ? '' : ' alternate';
        return {
            shirt,
            trim,
            shorts: shirt,
            socks: trim,
            numberInk: contrastingInk(shirt),
            sourceImage: null,
            sourceUrl: null,
            label: `${context} colour-palette fallback${role} — no kit source; rendered garment colours approximate`,
            kind: 'outfield',
            approximate: true,
            catalogClub: null,
            outfitId: `${identity}:fallback-${index}`,
        };
    });
}

function selectMostDistinct(home: PaletteCandidate, candidates: PaletteCandidate[]): PaletteCandidate | undefined {
    return candidates.reduce<PaletteCandidate | undefined>((best, candidate) => {
        if (!best || paletteDistance(home, candidate) > paletteDistance(home, best)) {
            return candidate;
        }
        return best;
    }, undefined);
}

function selectKeeper(
    side: 'home' | 'away',
    home: PaletteCandidate,
    away: PaletteCandidate,
    otherKeeper: PaletteCandidate | undefined,
): PaletteCandidate {
    const avoid = [home.shirt, home.trim, away.shirt, away.trim];
    if (otherKeeper) {
        avoid.push(otherKeeper.shirt, otherKeeper.trim);
    }

    const selected = KEEPER_PALETTES.reduce<typeof KEEPER_PALETTES[number] | undefined>((best, palette) => {
        if (!best || keeperDistance(palette.shirt, avoid) > keeperDistance(best.shirt, avoid)) {
            return palette;
        }
        return best;
    }, undefined) ?? KEEPER_PALETTES[0];

    return {
        shirt: selected.shirt,
        trim: selected.trim,
        shorts: selected.trim,
        socks: selected.shirt,
        numberInk: contrastingInk(selected.shirt),
        sourceImage: null,
        sourceUrl: null,
        label: `Goalkeeper role colour (${side}) — visual approximation, not a sourced goalkeeper kit`,
        kind: 'goalkeeper',
        approximate: true,
        catalogClub: null,
        outfitId: `goalkeeper-${side}-${selected.shirt}`,
    };
}

function paletteDistance(first: Pick<MatchKit, 'shirt' | 'trim'>, second: Pick<MatchKit, 'shirt' | 'trim'>): number {
    // Shirt colour carries the visual-clash decision. Trim breaks close calls,
    // allowing the catalog's source-reviewed/sampled palettes to guide selection.
    return boundedRgbDistance(first.shirt, second.shirt) * 0.85
        + boundedRgbDistance(first.trim, second.trim) * 0.15;
}

function keeperDistance(shirt: string, avoid: readonly string[]): number {
    return Math.min(...avoid.map(colour => boundedRgbDistance(shirt, colour)));
}

function boundedRgbDistance(first: string, second: string): number {
    const a = rgb(first);
    const b = rgb(second);
    const distance = Math.sqrt(
        (a[0] - b[0]) ** 2
        + (a[1] - b[1]) ** 2
        + (a[2] - b[2]) ** 2,
    );
    return Math.min(1, distance / RGB_DISTANCE_MAX);
}

function contrastingInk(colour: string): string {
    const background = rgb(colour);
    const whiteContrast = contrastRatio(background, [255, 255, 255]);
    const darkContrast = contrastRatio(background, [11, 19, 32]);
    return whiteContrast >= darkContrast ? '#FFFFFF' : '#0B1320';
}

function contrastRatio(first: Rgb, second: Rgb): number {
    const firstLuminance = relativeLuminance(first);
    const secondLuminance = relativeLuminance(second);
    return (Math.max(firstLuminance, secondLuminance) + 0.05) / (Math.min(firstLuminance, secondLuminance) + 0.05);
}

function relativeLuminance([red, green, blue]: Rgb): number {
    const channel = (value: number) => {
        const normalised = value / 255;
        return normalised <= 0.04045
            ? normalised / 12.92
            : ((normalised + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function rgb(colour: string): Rgb {
    const hex = normaliseHex(colour, '#64748B').slice(1);
    return [
        Number.parseInt(hex.slice(0, 2), 16),
        Number.parseInt(hex.slice(2, 4), 16),
        Number.parseInt(hex.slice(4, 6), 16),
    ];
}

function normaliseHexOrNull(colour: string | undefined): string | null {
    return colour && /^#[0-9A-Fa-f]{6}$/.test(colour) ? colour.toUpperCase() : null;
}

function normaliseHex(colour: string, fallback: string): string {
    return normaliseHexOrNull(colour) ?? fallback;
}

function uniqueColours(colours: readonly string[]): string[] {
    return [...new Set(colours)];
}

function isLocalWebp(value: string): boolean {
    return /^\/kits\/2026\/.+\.webp$/i.test(value);
}

function publicKit(candidate: PaletteCandidate): MatchKit {
    const { catalogClub: _catalogClub, outfitId: _outfitId, ...kit } = candidate;
    return kit;
}
