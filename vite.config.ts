import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Strips type="module" and crossorigin from script/link tags so the built
// index.html can be opened directly from the filesystem (file:// protocol).
// This is safe because the bundle is output as IIFE (no ES-module imports).
function classicScriptPlugin(): Plugin {
  return {
    name: 'classic-script',
    enforce: 'post',
    transformIndexHtml(html: string) {
      return html
        .replace(/<script type="module" crossorigin/g, '<script defer')
        .replace(/<link rel="stylesheet" crossorigin/g, '<link rel="stylesheet"');
    },
  };
}

/**
 * Dev-only plugin: exposes POST /dev-api/save-run-log so the browser can
 * persist run-log JSON files to <cwd>/artifacts/runs/ during `npm run dev`.
 * The plugin is a no-op in production builds.
 */
function devRunLogPlugin(): Plugin {
  const runsDir = path.resolve(process.cwd(), 'artifacts', 'runs');
  return {
    name: 'dev-run-log',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/dev-api/save-run-log', (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405).end('Method Not Allowed');
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString('utf-8');
            // Validate it is parseable JSON before writing
            type Bundle = { runs?: Array<{ runMetadata?: { runId?: string } }> };
            const parsed = JSON.parse(body) as Bundle;
            const runId = parsed.runs?.[0]?.runMetadata?.runId ?? `${Date.now()}`;
            fs.mkdirSync(runsDir, { recursive: true });
            const filePath = path.join(runsDir, `run-${runId}.json`);
            fs.writeFileSync(filePath, body, 'utf-8');
            console.log(`[dev-run-log] Saved ${filePath}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, path: filePath }));
          } catch (err) {
            console.error('[dev-run-log] Failed to save run log:', err);
            res.writeHead(400).end('Bad Request');
          }
        });
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), classicScriptPlugin(), devRunLogPlugin()],
  build: {
    rollupOptions: {
      output: {
        format: 'iife',
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
