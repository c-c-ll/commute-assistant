import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig({
  define: { __API_BASE__: JSON.stringify(process.env.VITE_API_BASE || '/api') },
  plugins: [
    react(),
    {
      name: 'serve-pwa-dev-assets',
      apply: 'serve',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const url = req.url || '';
          if (url === '/sw.js' || url.startsWith('/workbox-') || url === '/registerSW.js') {
            const filePath = resolve(process.cwd(), 'dev-dist', url.slice(1));
            if (existsSync(filePath)) {
              const content = readFileSync(filePath, 'utf8');
              res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
              res.setHeader('Service-Worker-Allowed', '/');
              res.statusCode = 200;
              res.end(content);
              return;
            }
          }
          next();
        });
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      injectRegister: 'auto',
      devOptions: { enabled: true, type: 'module' },
      manifest: {
        name: '鍖椾含閫氬嫟鍔╂墜', short_name: '閫氬嫟鍔╂墜',
        description: '鍖椾含鍏氦鍦伴搧璺嚎瑙勫垝鏌ヨ',
        start_url: '/', display: 'standalone', orientation: 'portrait',
        background_color: '#f8fafc', theme_color: '#2563eb', lang: 'zh-CN',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,ico,png,svg,woff2}'],
        runtimeCaching: [{
          urlPattern: /^\/api\//,
          handler: 'NetworkFirst',
          options: { cacheName: 'api-cache', expiration: { maxEntries: 30, maxAgeSeconds: 300 }, networkTimeoutSeconds: 10 },
        }],
      },
    }),
  ],
  server: {
    port: 5001, host: '0.0.0.0', allowedHosts: true,
    hmr: { overlay: false, timeout: 30000 },
    watch: { usePolling: true, interval: 100 },
    proxy: { '/api': { target: 'http://localhost:5002', changeOrigin: true } },
  },
});