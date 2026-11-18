import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (name: string) => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');
const look = read('look.css');
const fonts = read('fonts.css');

describe('styling convention', () => {
  it('no CSS selector uses data-testid', () => {
    expect(look).not.toContain('data-testid');
    expect(fonts).not.toContain('data-testid');
  });

  it('fonts.css holds only @font-face', () => {
    const rest = fonts.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@font-face\s*\{[^}]*\}/g, '');
    expect(rest.trim()).toBe('');
  });

  it('every var() used in look.css is defined in :root', () => {
    const root = /:root\s*\{([^}]*)\}/.exec(look)?.[1] ?? '';
    const defined = new Set([...root.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
    const used = [...look.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(0);
    for (const name of used) expect(defined, `${name} is not defined in :root`).toContain(name);
  });
});
