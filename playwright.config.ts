import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: true,
  retries: 0,
  timeout: 90_000,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:4173/sid-tools-web/', browserName: 'chromium' },
  webServer: {
    command:
      'pnpm exec vp -C apps/web preview --host 127.0.0.1 --port 4173 --strictPort --base /sid-tools-web/',
    url: 'http://127.0.0.1:4173/sid-tools-web/',
    reuseExistingServer: false,
  },
});
