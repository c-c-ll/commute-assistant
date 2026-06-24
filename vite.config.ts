import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/commute-assistant/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png'],
      injectRegister: 'auto',
      devOptions: { enabled: true, type: 'module' },
      manifest: {
        name: '北京通勤助手', short_name: '通勤助手',
        description: '北京公交地铁路线规划查询',
        start_url: '/commute-assistant/', display: 'standalone', orientation: 'portrait',
        background_color: '#f8fafc', theme_color: '#2563eb', lang: 'zh-CN',
        icons: [
          { src: '/commute-assistant/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/commute-assistant/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/commute-assistant/icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{html,js,css,ico,png,svg,woff2}'],
        runtimeCaching: [{
          urlPattern: /\/api\//,
          handler: 'NetworkFirst',
          options: { cacheName: 'api-cache', expiration: { maxEntries: 30, maxAgeSeconds: 300 }, networkTimeoutSeconds: 10 },
        }],
      },
    }),
  ],
});
