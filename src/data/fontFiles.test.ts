import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sha256 = (url: URL) => createHash('sha256').update(readFileSync(url)).digest('hex');
const font = (name: string) => new URL(`../../public/fonts/${name}`, import.meta.url);

describe('bundled font files', () => {
  it('Neanes.otf matches the pinned SHA-256', () => {
    expect(sha256(font('Neanes.otf'))).toBe(
      '86301a892998089a1d9effa0d40ccd4bc6eb5f8eaa372cf4136354bb2d5c6a90',
    );
  });

  it('OFL.txt matches the pinned SHA-256', () => {
    expect(sha256(font('OFL.txt'))).toBe(
      '4ebeded2bb3a6f553c8f85d87b1807092b7bbe4f7a169e321e0f8c13ff0d9261',
    );
  });

  it('LexendDeca.ttf matches the pinned SHA-256', () => {
    expect(sha256(font('LexendDeca.ttf'))).toBe(
      'd11c12298f431d7e416a1e615d33f2c2b98bda2318a0c186c8c94f08c2d90ce8',
    );
  });

  it('OFL-LexendDeca.txt matches the pinned SHA-256', () => {
    expect(sha256(font('OFL-LexendDeca.txt'))).toBe(
      '5da8505887d0fa7fe963445fd58852707fda34adfeb65af25c99d152bab285bd',
    );
  });
});
