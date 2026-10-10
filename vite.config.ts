import path from 'node:path';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const packageVersion = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;
const gitRevision = () => {
    try {
        return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
    } catch {
        return 'untracked';
    }
};

export default defineConfig({
    base: '/',
    define: {
        __MANUS_FM_VERSION__: JSON.stringify(packageVersion),
        __MANUS_FM_CHECKPOINT__: JSON.stringify(gitRevision()),
        __MANUS_FM_BUILT_AT__: JSON.stringify(new Date().toISOString()),
    },
    server: {
        port: Number(process.env.PORT || 3000),
        host: '0.0.0.0',
        strictPort: true,
    },
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(import.meta.dirname, '.'),
            '@shared': path.resolve(import.meta.dirname, 'shared'),
        },
    },
});
