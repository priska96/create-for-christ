import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Separate workers also isolate Better Auth's process-wide in-memory rate limiter.
  projects: ['auth', 'marketplace', 'upload', 'chat'].map((name) => ({
    name,
    testMatch: `**/${name}.spec.ts`,
  })),
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    browserName: 'chromium',
    channel: process.env.CFC_TEST_BROWSER || undefined,
    viewport: { width: 390, height: 844 },
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
