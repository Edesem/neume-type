import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import playwrightConfig, { E2E_PORT } from '../../playwright.config';
import viteConfig from '../../vite.config';

describe('tooling', () => {
  it('playwright server port differs from the dev server port', () => {
    expect(E2E_PORT).not.toBe(viteConfig.server?.port);
  });

  it('playwright baseURL and webServer url use the e2e port', () => {
    const server = playwrightConfig.webServer;
    const url = Array.isArray(server) ? server[0].url : server?.url;
    expect(url?.endsWith(`:${E2E_PORT}`)).toBe(true);
    expect(playwrightConfig.use?.baseURL?.endsWith(`:${E2E_PORT}`)).toBe(true);
  });

  it('check script runs the build', () => {
    const pkg = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(pkg.scripts.check).toContain('npm run build');
  });
});
