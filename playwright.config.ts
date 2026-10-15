import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: true,
  retries: 0,
  timeout: 90_000,
  workers: 2,
  use: { baseURL: 'http://127.0.0.1:4173/', browserName: 'chromium' },
  webServer: {
    command:
      'pnpm exec wrangler pages dev --ip 127.0.0.1 --port 4173 --show-interactive-dev-session=false',
    url: 'http://127.0.0.1:4173/',
    reuseExistingServer: false,
  },
});
