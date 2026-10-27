import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:5179/ergo/', trace: 'retain-on-failure' },
  webServer: { command: 'npx vite --port 5179 --strictPort', url: 'http://localhost:5179/ergo/', reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Linux WebKit in CI renders slowly; with animations running, clicks can wait forever for "stable" elements.
    { name: 'webkit', use: { ...devices['Desktop Safari'], contextOptions: { reducedMotion: 'reduce' } } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
