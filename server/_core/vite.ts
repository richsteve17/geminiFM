import express, { type Express } from 'express';
import fs from 'node:fs';
import { type Server } from 'node:http';
import { nanoid } from 'nanoid';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';

const projectRoot = process.env.NODE_ENV === 'production'
    ? path.resolve(import.meta.dirname, '..')
    : path.resolve(import.meta.dirname, '../..');

export async function setupVite(app: Express, server: Server) {
    const { default: viteConfig } = await import('../../vite.config');
    const vite = await createViteServer({
        ...viteConfig,
        configFile: false,
        server: {
            middlewareMode: true,
            hmr: { server },
            allowedHosts: true,
        },
        appType: 'custom',
    });

    app.use(vite.middlewares);
    app.use('*', async (req, res, next) => {
        try {
            const templatePath = path.join(projectRoot, 'index.html');
            let template = await fs.promises.readFile(templatePath, 'utf8');
            template = template.replace('/index.tsx', `/index.tsx?v=${nanoid()}`);
            const page = await vite.transformIndexHtml(req.originalUrl, template);
            res.status(200).set({ 'Content-Type': 'text/html' }).end(page);
        } catch (error) {
            vite.ssrFixStacktrace(error as Error);
            next(error);
        }
    });
}

export function serveStatic(app: Express) {
    const distPath = path.join(projectRoot, 'dist/public');
    if (!fs.existsSync(distPath)) {
        throw new Error('Missing client build. Run npm run build before starting production.');
    }

    app.use(express.static(distPath, { immutable: true, maxAge: '1y', index: false }));
    app.use('*', (_req, res) => {
        res.set('Cache-Control', 'no-store').sendFile(path.join(distPath, 'index.html'));
    });
}
