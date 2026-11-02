import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5273',
    reuseExistingServer: false,
  },
  use: { baseURL: 'http://localhost:5273' },
});
