import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sha256 = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');

describe('bundled font files', () => {
  it('Neanes.otf matches the pinned SHA-256', () => {
    expect(sha256('public/fonts/Neanes.otf')).toBe(
      '86301a892998089a1d9effa0d40ccd4bc6eb5f8eaa372cf4136354bb2d5c6a90',
    );
  });

  it('OFL.txt matches the pinned SHA-256', () => {
    expect(sha256('public/fonts/OFL.txt')).toBe(
      '4ebeded2bb3a6f553c8f85d87b1807092b7bbe4f7a169e321e0f8c13ff0d9261',
    );
  });
});
