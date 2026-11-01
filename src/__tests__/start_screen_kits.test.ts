import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/geminiService', () => ({
    getPaidVoiceName: () => 'Puck', isPaidAudioEnabled: () => false, isPaidVideoEnabled: () => false,
    setPaidAudioEnabled: vi.fn(), setPaidVideoEnabled: vi.fn(), setPaidVoiceName: vi.fn(),
}));
vi.mock('../buildInfo', () => ({
    BUILD_INFO: { version: '3.2.1-test', checkpoint: 'test', builtAt: '2026-11-01T00:00:00.000Z', season: '2026/27', changes: [] },
}));
import StartScreen from '../components/StartScreen';

const props = { onSelectTeam: vi.fn(), onStartUnemployed: vi.fn(), onStartWorldCup: vi.fn() };

describe('start screen real kit gallery', () => {
    it('shows source links and packaged photos even without a theme callback', () => {
        const html = renderToStaticMarkup(createElement(StartScreen, props));
        expect(html).toContain('Current-Season Kit Catalog');
        expect(html).toContain('Reference Only');
        expect(html).toContain('Source: Football Kit Archive');
        expect(html).toContain('/kits/2026/manchester-city-2026-27-home-kit-441641-');
        expect(html).toContain('approximation, not manufacturer colour specifications');
    });

    it('shows the previously missing West Ham current-season photographs', () => {
        const html = renderToStaticMarkup(createElement(StartScreen, { ...props, initialTeam: 'West Ham', onThemeSelect: vi.fn() }));
        expect(html).toContain('west-ham-united-2026-27-home-kit-');
        expect(html).toContain('Apply UI Theme');
        expect(html).not.toContain('No sourced current-season kit record');
    });

    it('keeps unknown clubs explicit rather than rendering generic fake shirts', () => {
        const html = renderToStaticMarkup(createElement(StartScreen, { ...props, initialTeam: 'Unknown FC' }));
        expect(html).toContain('No sourced current-season kit record');
        expect(html).toContain('No old kit or guessed design');
        expect(html).not.toContain('Source: Football Kit Archive');
    });
});
