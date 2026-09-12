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
          type: 'module',
        },
        includeAssets: [
          'favicon.png',
          'apple-touch-icon.png',
          'icon.svg',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-maskable-512x512.png',
        ],
        manifest: {
          id: '/',
          name: 'MOKU - Mindful Kakeibo Budget',
          short_name: 'MOKU',
          description: 'Mindful Japanese Kakeibo budgeting and expense journal.',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#F7F8F7',
          theme_color: '#176B52',
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-maskable-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest,json}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
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
