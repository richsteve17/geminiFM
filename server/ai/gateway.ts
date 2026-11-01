import { GoogleGenAI } from '@google/genai';
import { nanoid } from 'nanoid';
import { generateManagedContent, managedAiConfigured } from './managedContent';

const ALLOWED_TEXT_MODELS = new Set([
    'gemini-2.5-flash',
    'gemini-3-flash-preview',
    'gemini-2.5-flash-preview-tts',
]);
const VIDEO_MODEL = 'veo-3.1-fast-generate-preview';
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 45;

type RateWindow = { startedAt: number; count: number };
type VideoOperation = {
    providerOperation: unknown;
    completedUri?: string;
    media?: { body: Buffer; contentType: string };
};

const rateWindows = new Map<string, RateWindow>();
const videoOperations = new Map<string, VideoOperation>();
const quotaBlockedUntil = new Map<string, number>();

function getClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_UNAVAILABLE');
    return new GoogleGenAI({ apiKey });
}

function consumeRateLimit(subject: string) {
    const now = Date.now();
    const current = rateWindows.get(subject);
    if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
        rateWindows.set(subject, { startedAt: now, count: 1 });
        return;
    }
    if (current.count >= RATE_LIMIT) throw new Error('AI_RATE_LIMITED');
    current.count += 1;
}

function serializable<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function responseText(response: unknown, payload: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }) {
    try {
        const sdkText = (response as { text?: unknown }).text;
        if (typeof sdkText === 'string') return sdkText;
    } catch {
        // SDK helper accessors may throw when a response contains no text part.
    }
    return payload.candidates?.flatMap(candidate => candidate.content?.parts || [])
        .map(part => part.text || '')
        .join('') || '';
}

function assertTextModel(model: string) {
    if (!ALLOWED_TEXT_MODELS.has(model)) throw new Error('AI_MODEL_NOT_ALLOWED');
}

export async function generateContent(subject: string, request: { model: string; contents: unknown; config?: unknown }) {
    consumeRateLimit(subject);
    assertTextModel(request.model);
    const textOnly = !request.model.includes('tts');
    if (textOnly && managedAiConfigured() && (!process.env.GEMINI_API_KEY || (quotaBlockedUntil.get(request.model) || 0) > Date.now())) return generateManagedContent(request);
    try {
        const response = await getClient().models.generateContent({ model: request.model, contents: request.contents as never, config: request.config as never });
        const payload = serializable(response) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        return { ...payload, text: responseText(response, payload), provider: request.model };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!textOnly || !managedAiConfigured() || !/quota|RESOURCE_EXHAUSTED|429|GEMINI_UNAVAILABLE/i.test(message)) throw error;
        const retrySeconds = Number(message.match(/"retryDelay"\s*:\s*"(\d+)s"/)?.[1] || 60);
        quotaBlockedUntil.set(request.model, Date.now() + Math.min(86_400, retrySeconds) * 1000);
        console.warn(`[AI] Direct ${request.model} quota exhausted; routing text via managed Gemini.`);
        return generateManagedContent(request);
    }
}

export async function startVideo(subject: string, request: { model: string; prompt: string; config?: unknown }) {
    consumeRateLimit(subject);
    if (request.model !== VIDEO_MODEL) throw new Error('AI_MODEL_NOT_ALLOWED');
    const providerOperation = await getClient().models.generateVideos({
        model: request.model,
        prompt: request.prompt,
        config: request.config as never,
    });
    const id = nanoid();
    videoOperations.set(id, { providerOperation });
    return { name: id, done: false };
}

export async function getVideoOperation(subject: string, operationId: string) {
    consumeRateLimit(subject);
    const stored = videoOperations.get(operationId);
    if (!stored) throw new Error('AI_OPERATION_NOT_FOUND');

    if (!stored.completedUri) {
        const updated = await getClient().operations.getVideosOperation({ operation: stored.providerOperation as never });
        stored.providerOperation = updated;
        if (!updated.done) return { name: operationId, done: false };
        const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
        if (!uri) throw new Error('AI_VIDEO_EMPTY');
        stored.completedUri = uri;
    }

    return {
        name: operationId,
        done: true,
        response: {
            generatedVideos: [{ video: { uri: `/api/ai/media/${operationId}` } }],
        },
    };
}

export async function readVideoMedia(operationId: string) {
    const stored = videoOperations.get(operationId);
    if (!stored?.completedUri) throw new Error('AI_MEDIA_NOT_READY');
    if (!stored.media) {
        const url = new URL(stored.completedUri);
        url.searchParams.set('key', process.env.GEMINI_API_KEY || '');
        const upstream = await fetch(url);
        if (!upstream.ok) throw new Error('AI_MEDIA_FETCH_FAILED');
        stored.media = {
            body: Buffer.from(await upstream.arrayBuffer()),
            contentType: upstream.headers.get('content-type') || 'video/mp4',
        };
    }
    return stored.media;
}
