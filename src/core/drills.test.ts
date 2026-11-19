import { describe, expect, it } from 'vitest';
import { keymap, MODIFIER_CATEGORIES, MODIFIERS } from '../data/keymap';
import { DEFAULT_DRILL_ID, drillPool, drills } from './drills';
import { seededRandom } from './random';
import { sampleTargets } from './session';
import { drawPool } from './weights';

const letterModifiers = (m: readonly string[]) => m.filter((x) => x !== 'Shift');

describe('drills', () => {
  const all = drills();
  const byId = (id: string) => all.find((d) => d.id === id)!;

  it('the default drill is all', () => {
    expect(DEFAULT_DRILL_ID).toBe('all');
    expect(all[0].id).toBe('all');
  });

  it('all is exactly the 61 quantity entries in keymap order', () => {
    const quantity = keymap.filter((e) => e.table === 'quantity');
    expect(quantity).toHaveLength(61);
    expect(drillPool('all')).toEqual(drawPool(quantity));
    for (const e of drillPool('all')) expect(e.table).toBe('quantity');
  });

  it('V drill has the 11 quality entries', () => {
    const pool = drillPool('KeyV');
    expect(pool).toHaveLength(11);
    for (const e of pool) {
      expect(e.table).toBe('quality');
      expect(e.modifiers).toContain('KeyV');
    }
  });

  it('T drill has all 18 fthoras, including row 82 (T + M), and can draw it', () => {
    const pool = drillPool('KeyT');
    expect(pool).toHaveLength(18);
    for (const e of pool) expect(e.table).toBe('fthoras');
    expect(pool.map((e) => e.id)).toContain('fthoraSoftChromaticKeAbove');
    const drawn = sampleTargets(seededRandom(1), pool, 2000);
    expect(drawn.map((e) => e.id)).toContain('fthoraSoftChromaticKeAbove');
  });

  it('no drill pool ever contains an unverified entry', () => {
    for (const d of all) for (const e of drillPool(d.id)) expect(e.status).toBe('verified');
  });

  it('plain has 28 entries and none has a letter modifier', () => {
    const pool = drillPool('plain');
    expect(pool).toHaveLength(28);
    for (const e of pool) expect(letterModifiers(e.modifiers)).toEqual([]);
  });

  it('R drill has exactly the 13 R entries', () => {
    const pool = drillPool('KeyR');
    expect(pool).toHaveLength(13);
    for (const e of pool) expect(e.modifiers).toContain('KeyR');
    expect(pool.length).toBe(keymap.filter((e) => e.modifiers.includes('KeyR')).length);
  });

  it('S, D, F, B drills have 5, 4, 7, 4 entries', () => {
    expect(drillPool('KeyS')).toHaveLength(5);
    expect(drillPool('KeyD')).toHaveLength(4);
    expect(drillPool('KeyF')).toHaveLength(7);
    expect(drillPool('KeyB')).toHaveLength(4);
  });

  it('quantity letter drills follow MODIFIERS order, then V and T', () => {
    const ids = all.map((d) => d.id).filter((id) => id.startsWith('Key'));
    expect(ids).toEqual(['KeyR', 'KeyS', 'KeyD', 'KeyF', 'KeyB', 'KeyV', 'KeyT']);
    const quantityPositions = ids.slice(0, 5).map((id) => MODIFIERS.indexOf(id));
    expect(quantityPositions).toEqual([...quantityPositions].sort((a, b) => a - b));
  });

  it('every drill pool is non-empty', () => {
    for (const d of all) expect(drillPool(d.id).length).toBeGreaterThan(0);
  });

  it('every drill pool has at least 2 drawable entries (so avoid repeats is always possible)', () => {
    for (const d of all) expect(drillPool(d.id).length, d.id).toBeGreaterThanOrEqual(2);
  });

  it('drillPool throws on an unknown id', () => {
    expect(() => drillPool('nope')).toThrow('drillPool: unknown drill "nope"');
  });

  it('labels use keyName and titles use the guide categories', () => {
    expect(byId('KeyR')).toMatchObject({ label: 'R', title: 'Kentemata' });
    expect(byId('KeyS').title).toBe('Quantity Modifier 1');
    expect(byId('KeyB').title).toBe('Temporal Augmentation');
    expect(MODIFIER_CATEGORIES.KeyV).toBe('Quality');
  });
});
