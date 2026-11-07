import { afterEach, describe, expect, it, vi } from 'vitest';
import { interpretRiftMediation } from '../services/riftMediation';
afterEach(() => vi.unstubAllGlobals());
const mock = (value: unknown) => vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } })));
describe('grounded manager rift mediation', () => {
    it('uses a server route and retains a quote of the actual response', async () => {
        mock({ text: JSON.stringify({ tone: 'accountable', quote: 'I take responsibility', acknowledgesCause: true, takesSides: false }), provider: 'managed-gemini' });
        const result = await interpretRiftMediation({ stage: 'Final', scorer: 'Jude', goals: 3 }, 'I take responsibility for how this was handled.');
        expect(result.tone).toBe('accountable'); expect(result.provider).toBe('managed-gemini');
        expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/api/ai/content');
    });
    it('rejects invented evidence instead of applying the AI verdict', async () => {
        mock({ text: JSON.stringify({ tone: 'hostile', quote: 'You are fired', acknowledgesCause: false, takesSides: true }) });
        await expect(interpretRiftMediation({}, 'Let us discuss the final.')).rejects.toThrow('ground');
    });
    it('does not call the provider for an empty or oversized answer', async () => {
        mock({}); await expect(interpretRiftMediation({}, '')).rejects.toThrow('1–1,200');
        expect(fetch).not.toHaveBeenCalled();
    });
    it('does not interpret provider failure as a healed rift', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'AI_RATE_LIMITED' }), { status: 429 })));
        await expect(interpretRiftMediation({}, 'I acknowledge the incident.')).rejects.toThrow('AI_RATE_LIMITED');
    });
});
