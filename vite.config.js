import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Seed & Plate',
          short_name: 'Seed & Plate',
          description:
            'Chemical-free, native-variety produce from our Wai farm. Reserve while it is still in the ground, pay only when it ships.',
          theme_color: '#0E1B10',
          background_color: '#F6F5F2',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          categories: ['food', 'shopping'],
          icons: [
            { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: '/pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallbackDenylist: [/^\/api/],
          runtimeCaching: [
            {
              // Fonts are immutable once fetched.
              urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              // The feed should still render in a low-signal pocket of Wai,
              // but a fresh response always wins when one arrives.
              urlPattern: /\/api\/v1\/crops\//,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'crop-feed',
                networkTimeoutSeconds: 4,
                expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 6 },
              },
            },
          ],
        },
        devOptions: { enabled: false },
      }),
    ],
    server: {
      proxy:
        env.VITE_USE_MOCKS === 'true'
          ? {}
          : {
              '/api': {
                target: env.VITE_DEV_API_PROXY || 'http://localhost:8080',
                changeOrigin: true,
              },
            },
    },
  }
})
