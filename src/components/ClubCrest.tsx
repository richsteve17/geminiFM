import React from 'react';
import ClubIdentity, { getClubMonogram } from './ClubIdentity';

export interface ClubCrestProps {
    teamName: string;
    className?: string;
}

/**
 * Compatibility-facing crest component for scorebugs, headers, and selection cards.
 * It renders only sourced identity assets and otherwise defers to ClubIdentity's
 * accessible text-monogram fallback.
 */
const ClubCrest: React.FC<ClubCrestProps> = ({ teamName, className = '' }) => (
    <ClubIdentity
        name={teamName}
        size={className ? '' : 'h-12 w-12'}
        className={className}
    />
);

export { ClubCrest, getClubMonogram };
export default ClubCrest;
