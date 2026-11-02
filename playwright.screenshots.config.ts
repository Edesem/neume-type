import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Separate config so the capture never runs in `npm run e2e`. Writes docs/screenshots/*.png.
export default defineConfig({ ...base, testDir: 'e2e-screenshots' });
