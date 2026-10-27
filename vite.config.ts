import { readFileSync } from 'node:fs';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  base: '/ergo/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    VitePWA({
      // Ask before updating: silently reloading could drop a break in progress.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'logo.svg', 'apple-touch-icon.png', 'sw-notify.js'],
      manifest: {
        name: 'ergo · eye & posture breaks',
        short_name: 'ergo',
        description: 'Evidence-based break reminders for your eyes and posture.',
        theme_color: '#0e1a1f',
        background_color: '#0e1a1f',
        display: 'standalone',
        start_url: '/ergo/',
        scope: '/ergo/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Start reminders', url: '/ergo/?do=start' },
          { name: 'Eye break now', url: '/ergo/?do=break&lane=eye' },
          { name: 'Body break now', url: '/ergo/?do=break&lane=body' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        // Handles notification clicks and action buttons (see public/sw-notify.js).
        importScripts: ['sw-notify.js'],
        navigateFallbackDenylist: [/^[^?#]*\/[^/?#]+\.[^/?#]+$/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts-css' },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-files',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    env: { TZ: 'America/New_York' },
    include: ['src/**/*.test.ts'],
  },
});
