import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Footer } from './Footer';

afterEach(() => vi.unstubAllEnvs());

describe('Footer licence link', () => {
  it.each(['/', '/neume-type/'])('follows the Vite base %s, like the font URL', (base) => {
    vi.stubEnv('BASE_URL', base);
    expect(renderToStaticMarkup(createElement(Footer))).toContain(`href="${base}fonts/OFL.txt"`);
  });
});
