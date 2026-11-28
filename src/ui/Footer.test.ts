import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Footer } from './Footer';

afterEach(() => vi.unstubAllEnvs());

describe('Footer licence links', () => {
  it.each(['/', '/neume-type/'])('follow the Vite base %s, like the font URL', (base) => {
    vi.stubEnv('BASE_URL', base);
    const html = renderToStaticMarkup(createElement(Footer));
    expect(html).toContain(`href="${base}fonts/OFL.txt"`);
    expect(html).toContain(`href="${base}fonts/OFL-LexendDeca.txt"`);
  });
});
