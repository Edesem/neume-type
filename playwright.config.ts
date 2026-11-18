import { defineConfig } from '@playwright/test';

// Dev uses 5273 (vite.config.ts). Playwright gets its own port so a running dev server never blocks it.
export const E2E_PORT = 5275;

export default defineConfig({
  testDir: 'e2e',
  webServer: {
    command: `npm run dev -- --port ${E2E_PORT}`,
    url: `http://localhost:${E2E_PORT}`,
    reuseExistingServer: false,
  },
  use: { baseURL: `http://localhost:${E2E_PORT}` },
});
