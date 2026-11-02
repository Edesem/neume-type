import { describe, expect, it } from 'vitest';
import { seededRandom } from './random';

describe('seededRandom', () => {
  it('gives the same sequence for the same seed', () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('gives different sequences for different seeds', () => {
    expect(seededRandom(1)()).not.toBe(seededRandom(2)());
  });

  it('stays in [0, 1)', () => {
    const r = seededRandom(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
