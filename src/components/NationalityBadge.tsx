import React from 'react';

export interface NationalityInfo {
    label: string;
    description: string;
}

const REGIONAL_INDICATOR_START = 0x1F1E6;
const REGIONAL_INDICATOR_END = 0x1F1FF;

const TAG_FLAG_NATIONALITIES: Record<string, NationalityInfo> = {
    '🏴󠁧󠁢󠁥󠁮󠁧󠁿': { label: 'ENG', description: 'England' },
    '🏴󠁧󠁢󠁳󠁣󠁴󠁿': { label: 'SCO', description: 'Scotland' },
    '🏴󠁧󠁢󠁷󠁬󠁳󠁿': { label: 'WAL', description: 'Wales' },
};

const ISO_COUNTRY_NAMES: Record<string, string> = {
    AR: 'Argentina', AT: 'Austria', AU: 'Australia', BE: 'Belgium', BR: 'Brazil', CA: 'Canada',
    CH: 'Switzerland', CL: 'Chile', CO: 'Colombia', CR: 'Costa Rica', CZ: 'Czechia', DE: 'Germany',
    DK: 'Denmark', EC: 'Ecuador', EG: 'Egypt', ES: 'Spain', FR: 'France', GB: 'United Kingdom',
    GE: 'Georgia', GR: 'Greece', HR: 'Croatia', HU: 'Hungary', IE: 'Ireland', IT: 'Italy',
    JP: 'Japan', KR: 'South Korea', MA: 'Morocco', MX: 'Mexico', NL: 'Netherlands', NO: 'Norway',
    PL: 'Poland', PT: 'Portugal', RO: 'Romania', RS: 'Serbia', SE: 'Sweden', SI: 'Slovenia',
    SK: 'Slovakia', SN: 'Senegal', TR: 'Turkey', UA: 'Ukraine', US: 'United States', UY: 'Uruguay',
    ENG: 'England', SCO: 'Scotland', WAL: 'Wales', NIR: 'Northern Ireland',
};

const regionalIndicatorCode = (value: string): string | null => {
    const indicators = Array.from(value)
        .map(character => character.codePointAt(0) ?? 0)
        .filter(codePoint => codePoint >= REGIONAL_INDICATOR_START && codePoint <= REGIONAL_INDICATOR_END);

    if (indicators.length !== 2) return null;

    return indicators
        .map(codePoint => String.fromCharCode(65 + codePoint - REGIONAL_INDICATOR_START))
        .join('');
};

/**
 * Converts legacy regional-indicator and subdivision-flag values into a compact,
 * readable label. Plain country names and already-normalized ISO values pass through.
 */
export const parseNationality = (nationality: string | null | undefined): NationalityInfo => {
    const raw = nationality?.trim() ?? '';

    if (!raw) return { label: 'NAT', description: 'Nationality unavailable' };
    if (raw === '🏴') return { label: 'UNK', description: 'Nationality unspecified in legacy data' };
    if (TAG_FLAG_NATIONALITIES[raw]) return TAG_FLAG_NATIONALITIES[raw];

    const regionalCode = regionalIndicatorCode(raw);
    if (regionalCode) {
        return {
            label: regionalCode,
            description: ISO_COUNTRY_NAMES[regionalCode] ?? regionalCode,
        };
    }

    if (/^[a-z]{2,3}$/i.test(raw)) {
        const code = raw.toUpperCase();
        return { label: code, description: ISO_COUNTRY_NAMES[code] ?? code };
    }

    const countryName = raw.replace(/\s+/g, ' ');
    return { label: countryName, description: countryName };
};

export interface NationalityBadgeProps {
    nationality: string | null | undefined;
    className?: string;
}

/** A compact non-emoji nationality treatment for player cards and compact lists. */
export const NationalityBadge: React.FC<NationalityBadgeProps> = ({ nationality, className = '' }) => {
    const { label, description } = parseNationality(nationality);

    return (
        <span
            className={`fm-nationality inline-flex max-w-full items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] ${className}`}
            title={`Nationality: ${description}`}
            aria-label={`Nationality: ${description}`}
            data-nationality={label}
        >
            <span className="truncate">{label}</span>
        </span>
    );
};

export default NationalityBadge;
