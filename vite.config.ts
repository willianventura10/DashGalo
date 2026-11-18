/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/DashGalo/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'DashGalo: estatísticas do Atlético Mineiro',
        short_name: 'DashGalo',
        description: 'Retrospecto do Clube Atlético Mineiro desde 1909, a partir das fichas do blog O Canto do Galo.',
        lang: 'pt-BR',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        // Dados: rede primeiro (atualização semanal), cache como reserva offline.
        runtimeCaching: [
          {
            urlPattern: /\/data\/.*\.json$/,
            handler: 'NetworkFirst',
            options: { cacheName: 'dados', expiration: { maxEntries: 10 } },
          },
        ],
      },
    }),
  ],
  test: { include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'] },
});
