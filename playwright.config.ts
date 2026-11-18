import { defineConfig, devices } from '@playwright/test';

// Localmente dá para usar o Chrome do sistema: PW_CHROME=/usr/bin/google-chrome npm run e2e
const executablePath = process.env.PW_CHROME || undefined;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4173/DashGalo/', launchOptions: { executablePath } },
  webServer: { command: 'npx vite preview --port 4173 --strictPort', url: 'http://localhost:4173/DashGalo/', reuseExistingServer: true },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
    { name: 'celular', use: { ...devices['Pixel 7'] } },
  ],
});
