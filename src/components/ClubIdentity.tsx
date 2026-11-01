import React, { useMemo, useState } from 'react';
import { getClubIdentity } from '../data/clubIdentity';

export interface ClubCrestProps {
    name: string;
    /** Tailwind height/width classes. The component remains square at every size. */
    size?: string;
    className?: string;
}

export const getClubMonogram = (name: string): string => {
    const words = name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 0) return 'FC';
    if (words.length === 1) return words[0].slice(0, 3).toUpperCase();

    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
};

/**
 * Renders only a sourced club/national crest. When a source is unavailable or its
 * image fails, the explicit text monogram keeps the team identifiable without
 * inventing a crest, jersey, or other fake visual identity.
 */
export const ClubCrest: React.FC<ClubCrestProps> = ({
    name,
    size = 'h-12 w-12',
    className = '',
}) => {
    const identity = useMemo(() => getClubIdentity(name), [name]);
    const identityKey = `${name}|${identity?.imageUrl ?? ''}`;
    const [failedIdentityKey, setFailedIdentityKey] = useState<string | null>(null);
    const imageFailed = failedIdentityKey === identityKey;
    const monogram = getClubMonogram(name);

    if (!identity || imageFailed) {
        return (
            <span
                className={`${size} ${className} inline-flex shrink-0 items-center justify-center rounded-md border border-slate-600/80 bg-slate-950/70 px-1 font-mono text-[0.68rem] font-black tracking-tight text-slate-200 shadow-inner`}
                role="img"
                aria-label={`${name} monogram`}
                data-club-identity-fallback="true"
                title={`${name} identity source unavailable`}
            >
                {monogram}
            </span>
        );
    }

    return (
        <img
            src={identity.imageUrl}
            alt={`${identity.name} ${identity.kind === 'national' ? 'national flag' : 'club crest'}`}
            className={`${size} ${className} shrink-0 object-contain drop-shadow-[0_5px_12px_rgba(0,0,0,0.45)]`}
            onError={() => setFailedIdentityKey(identityKey)}
            title={`Source: ${identity.sourceName}`}
            data-club-identity-kind={identity.kind}
        />
    );
};

/** Semantic alias for team-header and list use cases. */
export const ClubIdentity = ClubCrest;

export default ClubCrest;
