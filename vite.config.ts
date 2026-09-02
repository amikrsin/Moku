import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Lightweight Vite dev plugin for local API mock matching Worker logic
function devApiPlugin(): Plugin {
  const inMemoryStore: Record<string, any> = {};

  return {
    name: 'dev-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          return next();
        }

        const url = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);

        if (url.pathname === '/api/health') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ok', app: 'MOKU Dev Server', timestamp: Date.now() }));
          return;
        }

        const userId = (req.headers['x-user-id'] as string) || 'local-user';

        if (url.pathname === '/api/reset' && (req.method === 'POST' || req.method === 'DELETE')) {
          inMemoryStore[userId] = { plans: [], expenses: [], savingsEntries: [] };
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, reset: true, timestamp: Date.now() }));
          return;
        }

        if (url.pathname === '/api/state' && req.method === 'GET') {
          const userStore = inMemoryStore[userId] || { plans: [], expenses: [], savingsEntries: [] };
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ...userStore, userId, syncedAt: Date.now() }));
          return;
        }

        if (url.pathname === '/api/sync' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              inMemoryStore[userId] = {
                plans: data.plans || [],
                expenses: data.expenses || [],
                savingsEntries: data.savingsEntries || [],
              };
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  ok: true,
                  serverTime: Date.now(),
                  plansUpdated: (data.plans || []).length,
                  expensesUpdated: (data.expenses || []).length,
                  savingsUpdated: (data.savingsEntries || []).length,
                })
              );
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Failed to parse JSON', details: err?.message }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      devApiPlugin(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'manifest.webmanifest'],
        manifest: {
          name: 'MOKU',
          short_name: 'MOKU',
          description: 'Mindful personal expense tracker and budget planner.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          background_color: '#EDE8DA',
          theme_color: '#EDE8DA',
          icons: [
            {
              src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Crect width='512' height='512' rx='100' fill='%23EDE8DA'/%3E%3Ccircle cx='256' cy='256' r='180' stroke='%23A8342A' stroke-width='24' fill='none'/%3E%3Ccircle cx='256' cy='256' r='150' stroke='%23A8342A' stroke-width='4' stroke-dasharray='10 10' fill='none'/%3E%3Ctext x='256' y='300' font-family='serif' font-size='120' font-weight='bold' fill='%23A8342A' text-anchor='middle'%3EM%3C/text%3E%3C/svg%3E",
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,json}'],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
