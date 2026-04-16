import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5199',
    screenshot: 'on',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 900 },
  },
  outputDir: './screenshots',
  reporter: [
    ['list'],
    ['html', { outputFolder: './screenshots/report' }],
  ],
});
