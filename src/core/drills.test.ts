import { describe, expect, it } from 'vitest';
import { keymap, MODIFIER_CATEGORIES, MODIFIERS } from '../data/keymap';
import { DEFAULT_DRILL_ID, drillPool, drills } from './drills';
import { drawPool } from './weights';

const letterModifiers = (m: readonly string[]) => m.filter((x) => x !== 'Shift');

describe('drills', () => {
  const all = drills();
  const byId = (id: string) => all.find((d) => d.id === id)!;

  it('the default drill is all', () => {
    expect(DEFAULT_DRILL_ID).toBe('all');
    expect(all[0].id).toBe('all');
  });

  it('all contains every verified entry in keymap order', () => {
    expect(drillPool('all')).toEqual(drawPool(keymap));
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

  it('letter drills follow MODIFIERS order', () => {
    const ids = all.map((d) => d.id).filter((id) => id.startsWith('Key'));
    expect(ids).toEqual(['KeyR', 'KeyS', 'KeyD', 'KeyF', 'KeyB']);
    const positions = ids.map((id) => MODIFIERS.indexOf(id));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('every drill pool is non-empty', () => {
    for (const d of all) expect(drillPool(d.id).length).toBeGreaterThan(0);
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
