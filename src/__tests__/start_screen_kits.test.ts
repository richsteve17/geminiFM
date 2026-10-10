import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/geminiService', () => ({
    getPaidVoiceName: () => 'Puck',
    isPaidAudioEnabled: () => false,
    isPaidVideoEnabled: () => false,
    setPaidAudioEnabled: vi.fn(),
    setPaidVideoEnabled: vi.fn(),
    setPaidVoiceName: vi.fn(),
}));

vi.mock('../buildInfo', () => ({
    BUILD_INFO: {
        version: '3.1.2-test',
        checkpoint: 'test',
        builtAt: '2026-10-10T00:00:00.000Z',
        season: '2026/27',
        changes: [],
    },
}));

import StartScreen from '../components/StartScreen';

const props = {
    onSelectTeam: vi.fn(),
    onStartUnemployed: vi.fn(),
    onStartWorldCup: vi.fn(),
};

describe('start screen kit picker', () => {
    it('shows sourced kit cards and source links even without an onThemeSelect callback', () => {
        const html = renderToStaticMarkup(createElement(StartScreen, props));

        expect(html).toContain('Verified Kit Catalog');
        expect(html).toContain('Reference Only');
        expect(html).toContain('Source: Football Kit Archive');
        expect(html).toContain('manchester-city-2026-27-home-kit.jpg');
    });

    it('renders the explicit unverified state instead of stale generic kit cards', () => {
        const html = renderToStaticMarkup(createElement(StartScreen, { ...props, initialTeam: 'West Ham' }));

        expect(html).toContain('No verified 2026/27 kit record');
        expect(html).toContain('not being passed off as a new kit');
        expect(html).not.toContain('Source: Football Kit Archive');
    });
});
