import type { Request, Response, Router } from 'express';
import { z } from 'zod';
import { generateContent, getVideoOperation, readVideoMedia, startVideo } from './gateway';

const contentRequest = z.object({
    model: z.string().min(1),
    contents: z.unknown(),
    config: z.unknown().optional(),
});
const videoRequest = z.object({
    model: z.string().min(1),
    prompt: z.string().min(1).max(12_000),
    config: z.unknown().optional(),
});
const operationRequest = z.object({
    operation: z.object({ name: z.string().min(1) }),
});

const clientSubject = (req: Request) => req.ip || req.socket.remoteAddress || 'anonymous';
const messageFor = (error: unknown) => error instanceof Error ? error.message : 'AI_REQUEST_FAILED';
const statusFor = (message: string) => {
    if (message === 'GEMINI_UNAVAILABLE') return 503;
    if (message === 'AI_RATE_LIMITED') return 429;
    if (message === 'AI_OPERATION_NOT_FOUND') return 404;
    if (message === 'AI_MODEL_NOT_ALLOWED' || message === 'INVALID_AI_REQUEST') return 400;
    return 502;
};

function respondError(res: Response, error: unknown) {
    const message = messageFor(error);
    res.status(statusFor(message)).json({ error: message });
}

export function registerAiRoutes(router: Router) {
    router.post('/content', async (req, res) => {
        const parsed = contentRequest.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: 'INVALID_AI_REQUEST' });
        try {
            return res.json(await generateContent(clientSubject(req), parsed.data));
        } catch (error) {
            return respondError(res, error);
        }
    });

    router.post('/video', async (req, res) => {
        const parsed = videoRequest.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: 'INVALID_AI_REQUEST' });
        try {
            return res.json(await startVideo(clientSubject(req), parsed.data));
        } catch (error) {
            return respondError(res, error);
        }
    });

    router.post('/video-operation', async (req, res) => {
        const parsed = operationRequest.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ error: 'INVALID_AI_REQUEST' });
        try {
            return res.json(await getVideoOperation(clientSubject(req), parsed.data.operation.name));
        } catch (error) {
            return respondError(res, error);
        }
    });

    router.get('/media/:operationId', async (req, res) => {
        try {
            const media = await readVideoMedia(req.params.operationId);
            res.set('Cache-Control', 'private, max-age=300').type(media.contentType).send(media.body);
        } catch (error) {
            respondError(res, error);
        }
    });
}
