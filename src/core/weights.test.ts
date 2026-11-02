import { describe, expect, it } from 'vitest';
import { keymap, type KeymapEntry } from '../data/keymap';
import { seededRandom } from './random';
import {
  applyFloor,
  FIXED_WEIGHT,
  HALVING_FACTOR,
  MIN_CHANCE,
  neumeChances,
  rawWeight,
  UNCOMMON_MULTIPLIER,
} from './weights';
import { sampleTargets } from './session';

const base = keymap[0];
const make = (id: string, pitch: number | null, frequency: KeymapEntry['frequency']): KeymapEntry => ({
  ...base,
  id,
  pitch,
  frequency,
});

describe('weight constants', () => {
  it('are the owner-specified values', () => {
    expect(HALVING_FACTOR).toBe(0.5);
    expect(UNCOMMON_MULTIPLIER).toBe(0.25);
    expect(FIXED_WEIGHT).toBe(0.02);
    expect(MIN_CHANCE).toBe(0.0025);
  });
});

describe('rawWeight', () => {
  it('halves per step of pitch in either direction', () => {
    expect(rawWeight(make('a', 0, 'common'))).toBe(1);
    expect(rawWeight(make('a', 1, 'common'))).toBe(0.5);
    expect(rawWeight(make('a', -3, 'common'))).toBe(0.125);
  });

  it('multiplies uncommon by 0.25', () => {
    expect(rawWeight(make('a', 2, 'uncommon'))).toBe(0.0625);
    expect(rawWeight(make('a', 0, 'uncommon'))).toBe(0.25);
  });

  it('gives fixed entries 0.02 regardless of pitch', () => {
    expect(rawWeight(make('a', null, 'fixed'))).toBe(0.02);
  });
});

describe('applyFloor', () => {
  it('only normalises when nothing is below the floor', () => {
    const c = applyFloor([1, 0.5, 0.0625, 0.02], 0.0025);
    const sum = 1.5825;
    [1, 0.5, 0.0625, 0.02].forEach((w, i) => expect(c[i]).toBeCloseTo(w / sum, 12));
  });

  it('lifts a single entry to the floor and rescales the rest (hand calculated)', () => {
    // raw [1, 0.001]: second is 0.000999 < 0.0025, so it gets 0.0025 and the first gets 0.9975.
    const c = applyFloor([1, 0.001], 0.0025);
    expect(c[1]).toBe(0.0025);
    expect(c[0]).toBeCloseTo(0.9975, 12);
  });

  it('repeats when scaling pushes another entry under the floor (hand calculated)', () => {
    // floor 0.1, raw [10, 1.2, 0.5], sum 11.7: chances 0.8547, 0.1026, 0.0427.
    // Pass 1: 0.5 floored; the other two share 0.9: 10/11.2*0.9 = 0.80357, 1.2/11.2*0.9 = 0.09643 < 0.1.
    // Pass 2: 1.2 floored too; the first gets 1 - 0.2 = 0.8.
    const c = applyFloor([10, 1.2, 0.5], 0.1);
    expect(c[0]).toBeCloseTo(0.8, 12);
    expect(c[1]).toBe(0.1);
    expect(c[2]).toBe(0.1);
  });

  it('does not mutate its input', () => {
    const raw = [10, 1.2, 0.5];
    applyFloor(raw, 0.1);
    expect(raw).toEqual([10, 1.2, 0.5]);
  });
});

describe('neumeChances', () => {
  it('matches hand-calculated values for a small list', () => {
    const list = [
      make('a', 0, 'common'), // 1
      make('b', 1, 'common'), // 0.5
      make('c', 2, 'uncommon'), // 0.0625
      make('d', null, 'fixed'), // 0.02
    ];
    const c = neumeChances(list);
    expect(c[0]).toBeCloseTo(1 / 1.5825, 12);
    expect(c[1]).toBeCloseTo(0.5 / 1.5825, 12);
    expect(c[2]).toBeCloseTo(0.0625 / 1.5825, 12);
    expect(c[3]).toBeCloseTo(0.02 / 1.5825, 12);
  });

  it('applies the real floor: pitch 10 would be 0.0976% so it gets 0.25%', () => {
    const c = neumeChances([make('a', 0, 'common'), make('b', 10, 'common')]);
    expect(c[1]).toBe(MIN_CHANCE);
    expect(c[0]).toBeCloseTo(1 - MIN_CHANCE, 12);
  });

  it('ignores unverified entries', () => {
    const c = neumeChances([
      make('a', 0, 'common'),
      { ...make('x', 0, 'common'), status: 'unverified' },
      make('b', 1, 'common'),
    ]);
    expect(c).toHaveLength(2);
    expect(c[0]).toBeCloseTo(2 / 3, 12);
  });

  describe('for the real keymap', () => {
    const c = neumeChances(keymap);

    it('sum to 1', () => {
      expect(c.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    });

    it('never fall below the floor', () => {
      for (const p of c) expect(p).toBeGreaterThanOrEqual(MIN_CHANCE);
    });

    it('put Ison first', () => {
      const ison = keymap.findIndex((e) => e.id === 'ison');
      expect(c[ison]).toBe(Math.max(...c));
    });

    it('make a petastē with a high pitch rarer than Oligon', () => {
      const at = (id: string) => c[keymap.findIndex((e) => e.id === id)];
      expect(at('oligon')).toBeGreaterThan(at('petastiYpsiliRight'));
    });
  });
});

describe('sampleTargets with weights', () => {
  it('draws roughly at the stated chances over a large seeded sample', () => {
    const n = 200_000;
    const chances = neumeChances(keymap);
    const counts = new Map<string, number>();
    for (const e of sampleTargets(seededRandom(12345), keymap, n)) {
      counts.set(e.id, (counts.get(e.id) ?? 0) + 1);
    }
    keymap.forEach((e, i) => {
      const p = chances[i];
      const observed = (counts.get(e.id) ?? 0) / n;
      expect(Math.abs(observed - p)).toBeLessThan(5 * Math.sqrt((p * (1 - p)) / n));
    });
  });

  it('does draw a rare entry', () => {
    const chances = neumeChances(keymap);
    const rare = keymap[chances.indexOf(Math.min(...chances))];
    const drawn = sampleTargets(seededRandom(7), keymap, 200_000);
    expect(drawn.some((e) => e.id === rare.id)).toBe(true);
  });

  it('draws with replacement and never an unverified entry', () => {
    const entries: KeymapEntry[] = [{ ...keymap[0], id: 'bad', status: 'unverified' }, ...keymap];
    const drawn = sampleTargets(seededRandom(3), entries, 5000);
    expect(drawn.some((e) => e.status === 'unverified')).toBe(false);
    expect(new Set(drawn.map((e) => e.id)).size).toBeLessThan(drawn.length);
  });

  describe('boundaries of random()', () => {
    const pool = keymap.filter((e) => e.status !== 'unverified');
    const chances = neumeChances(keymap);

    it('0 gives the first entry', () => {
      expect(sampleTargets(() => 0, keymap, 1)[0]).toBe(pool[0]);
    });

    it('the largest value below 1 gives the last entry', () => {
      expect(sampleTargets(() => 1 - 2 ** -53, keymap, 1)[0]).toBe(pool[pool.length - 1]);
    });

    it('a value on a cumulative edge goes to the next entry', () => {
      expect(sampleTargets(() => chances[0], keymap, 1)[0]).toBe(pool[1]);
      expect(sampleTargets(() => chances[0] - 1e-9, keymap, 1)[0]).toBe(pool[0]);
    });

    it('never returns undefined even if rounding leaves the total just under 1', () => {
      for (const r of [1 - 2 ** -53, 0.9999999999999, 0.999999]) {
        expect(sampleTargets(() => r, keymap, 1)[0]).toBeDefined();
      }
    });
  });
});
