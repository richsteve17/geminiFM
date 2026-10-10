import type { Team } from '../types';

export type SeasonKitTheme = {
    id: 'home' | 'away' | 'third';
    label: string;
    bg: string;
    accent: string;
    text: string;
};

/**
 * UI palette pack for the active football season. These are club-colour themes for the
 * command centre, not reproductions of licensed kit designs or shirt assets.
 */
export const SEASON_THEME_PACK = '2026/27';

const defaultColors: Required<NonNullable<Team['colors']>> = {
    primary: '#1F2937',
    secondary: '#94A3B8',
    text: '#F8FAFC',
    third: '#475569',
};

function readableText(background: string, preferred: string) {
    const hex = background.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return preferred;
    const [r, g, b] = [0, 2, 4].map(offset => Number.parseInt(hex.slice(offset, offset + 2), 16));
    const luminance = (r * 299 + g * 587 + b * 114) / 1000;
    return luminance > 162 ? '#0F172A' : '#F8FAFC';
}

export function getSeasonKitThemes(team: Pick<Team, 'colors'>): SeasonKitTheme[] {
    const colors = { ...defaultColors, ...team.colors };
    const third = team.colors?.third || colors.secondary;

    return [
        {
            id: 'home',
            label: `HOME ${SEASON_THEME_PACK}`,
            bg: colors.primary,
            accent: colors.secondary,
            text: readableText(colors.primary, colors.text),
        },
        {
            id: 'away',
            label: `AWAY ${SEASON_THEME_PACK}`,
            bg: third,
            accent: colors.primary,
            text: readableText(third, colors.text),
        },
        {
            id: 'third',
            label: `THIRD ${SEASON_THEME_PACK}`,
            bg: colors.secondary,
            accent: colors.primary,
            text: readableText(colors.secondary, colors.text),
        },
    ];
}
