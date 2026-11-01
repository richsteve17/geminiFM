import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { GameState, type Team } from '../types';

vi.mock('../data/clubIdentity', () => ({
    getClubIdentity: (name: string) => name === 'Source FC'
        ? {
            name,
            imageUrl: '/assets/crests/source-fc.png',
            sourceUrl: 'https://example.test/source-fc',
            sourceName: 'Test identity source',
            kind: 'club' as const,
        }
        : null,
}));

import ClubCrest, { getClubMonogram } from '../components/ClubCrest';
import NationalityBadge, { parseNationality } from '../components/NationalityBadge';
import TeamDetails from '../components/TeamDetails';
import ScoutingScreen from '../components/ScoutingScreen';

const fallbackTeam: Team = {
    name: 'Unlisted United',
    league: 'Premier League',
    players: [],
    tactic: { formation: '4-4-2', mentality: 'Balanced' },
    prestige: 50,
    chairmanPersonality: 'Traditionalist',
    balance: 0,
    objectives: [],
    activePromises: [],
};

describe('club identity presentation', () => {
    it('uses the sourced crest image when identity data exists', () => {
        const html = renderToStaticMarkup(createElement(ClubCrest, { teamName: 'Source FC' }));

        expect(html).toContain('/assets/crests/source-fc.png');
        expect(html).toContain('Source FC club crest');
        expect(html).not.toContain('data-club-identity-fallback');
    });

    it('renders an accessible text monogram rather than an invented crest when identity data is unavailable', () => {
        const html = renderToStaticMarkup(createElement(ClubCrest, { teamName: 'Unlisted United' }));

        expect(getClubMonogram('Unlisted United')).toBe('UU');
        expect(html).toContain('data-club-identity-fallback="true"');
        expect(html).toContain('aria-label="Unlisted United monogram"');
        expect(html).toContain('UU');
        expect(html).not.toContain('<img');
    });

    it('keeps the squad header usable with the crest fallback and icon-based navigation', () => {
        const html = renderToStaticMarkup(createElement(TeamDetails, {
            team: fallbackTeam,
            gameState: GameState.PRE_MATCH,
            managerReputation: 70,
            nextFixture: null,
            activeTab: 'match',
            onNavigateToTab: vi.fn(),
        }));

        expect(html).toContain('Unlisted United');
        expect(html).toContain('data-club-identity-fallback="true"');
        expect(html).toContain('Console Navigation');
        expect(html).toContain('Match Center');
        expect(html).not.toContain('viewBox="0 0 100 100"');
    });
});

describe('nationality presentation', () => {
    it('parses regional-indicator flags and United Kingdom subdivision tag flags into readable labels', () => {
        expect(parseNationality('🇫🇷')).toEqual({ label: 'FR', description: 'France' });
        expect(parseNationality('🏴󠁧󠁢󠁥󠁮󠁧󠁿')).toEqual({ label: 'ENG', description: 'England' });
        expect(parseNationality('🏴󠁧󠁢󠁳󠁣󠁴󠁿')).toEqual({ label: 'SCO', description: 'Scotland' });
        expect(parseNationality('🏴󠁧󠁢󠁷󠁬󠁳󠁿')).toEqual({ label: 'WAL', description: 'Wales' });
        expect(parseNationality('ENG')).toEqual({ label: 'ENG', description: 'England' });
        expect(parseNationality('SCO')).toEqual({ label: 'SCO', description: 'Scotland' });
        expect(parseNationality('WAL')).toEqual({ label: 'WAL', description: 'Wales' });
        expect(parseNationality('NIR')).toEqual({ label: 'NIR', description: 'Northern Ireland' });
    });

    it('does not invent a country from the ambiguous bare black flag used by legacy roster data', () => {
        expect(parseNationality('🏴')).toEqual({ label: 'UNK', description: 'Nationality unspecified in legacy data' });
    });

    it('preserves raw country names while removing decorative flag rendering from the chip', () => {
        const html = renderToStaticMarkup(createElement(NationalityBadge, { nationality: '🇫🇷' }));

        expect(parseNationality('Costa Rica')).toEqual({ label: 'Costa Rica', description: 'Costa Rica' });
        expect(html).toContain('FR');
        expect(html).toContain('Nationality: France');
        expect(html).not.toContain('🇫🇷');
    });
});

describe('scouting control accessibility', () => {
    it('uses a semantic, labelled button switch instead of a mouse-only div', () => {
        const html = renderToStaticMarkup(createElement(ScoutingScreen, {
            onScout: vi.fn(), scoutResults: [], isLoading: false,
            onSignPlayer: vi.fn(), onBack: vi.fn(),
        }));
        expect(html).toContain('<button type="button" role="switch"');
        expect(html).toContain('aria-label="Use Real World Network"');
        expect(html).toContain('aria-checked="false"');
    });
});
