import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), list: vi.fn() }));
vi.mock('../_core/llm', () => ({ invokeLLM: mocks.invoke, listLLMModels: mocks.list }));
import { generateManagedContent } from './managedContent';
beforeEach(() => {
    vi.stubEnv('MANUS_API_URL', 'https://test.invalid'); vi.stubEnv('MANUS_API_KEY', 'test-placeholder');
    mocks.list.mockResolvedValue({ data: [{ id: 'gemini-3-flash-preview' }] });
    mocks.invoke.mockResolvedValue({ choices: [{ message: { content: '{"questions":[]}' } }], usage: { prompt_tokens: 100, completion_tokens: 30 } });
});
afterEach(() => { vi.unstubAllEnvs(); mocks.invoke.mockReset(); });
describe('managed game AI', () => {
    it('keeps server-only credentials and adapts legacy Gemini contents to the verified managed model', async () => {
        const result = await generateManagedContent({ contents: [{ role: 'user', parts: [{ text: 'Exact game facts' }] }], config: { responseMimeType: 'application/json', maxOutputTokens: 2000 } });
        expect(result.provider).toBe('manus/gemini-3-flash-preview');
        expect(result.text).toBe('{"questions":[]}');
        expect(result.usageMetadata?.prompt_tokens).toBe(100);
        expect(mocks.invoke.mock.calls[0][0]).toMatchObject({ model: 'gemini-3-flash-preview', maxTokens: 3024, thinking: { budget_tokens: 1024 } });
        expect(JSON.stringify(result)).not.toContain('test-placeholder');
    });
    it('refuses unbounded prompts and unsupported tools instead of silently claiming a grounded search', async () => {
        await expect(generateManagedContent({ contents: 'x'.repeat(49_000) })).rejects.toThrow('INVALID_AI_REQUEST');
        await expect(generateManagedContent({ contents: 'search', config: { tools: [{ googleSearch: {} }] } })).rejects.toThrow('TOOL_REQUEST_UNSUPPORTED');
        expect(mocks.invoke).not.toHaveBeenCalled();
    });
    it('rejects empty inference and explicit HTTP-200 error bodies', async () => {
        mocks.invoke.mockResolvedValueOnce({ choices: [] });
        await expect(generateManagedContent({ contents: 'facts' })).rejects.toThrow('MANAGED_AI_EMPTY');
        mocks.invoke.mockResolvedValueOnce({ error: { message: 'quota unavailable' } });
        await expect(generateManagedContent({ contents: 'facts' })).rejects.toThrow('quota unavailable');
    });
});
