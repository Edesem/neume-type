import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { keymap, MODIFIERS } from './keymap';

const chordKey = (e: { modifiers: readonly string[]; trigger: string }) =>
  [...e.modifiers].sort().concat(e.trigger).join('+');

const find = (id: string) => {
  const entry = keymap.find((e) => e.id === id);
  if (!entry) throw new Error(`no entry ${id}`);
  return entry;
};

describe('keymap data', () => {
  it('has exactly 61 entries', () => {
    expect(keymap).toHaveLength(61);
  });

  it('has unique ids and unique chords', () => {
    expect(new Set(keymap.map((e) => e.id)).size).toBe(61);
    expect(new Set(keymap.map(chordKey)).size).toBe(61);
  });

  it('has unique code points', () => {
    expect(new Set(keymap.flatMap((e) => e.codePoints)).size).toBe(61);
  });

  it('lists the 15 guide modifiers plus Shift', () => {
    expect(MODIFIERS).toEqual([
      'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyA', 'KeyS', 'KeyD',
      'KeyF', 'KeyG', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'Shift',
    ]);
  });

  it('never uses a modifier as a trigger, and every modifier used is listed', () => {
    for (const e of keymap) {
      expect(MODIFIERS).not.toContain(e.trigger);
      for (const m of e.modifiers) expect(MODIFIERS).toContain(m);
    }
  });

  it('marks every entry verified or unverified', () => {
    for (const e of keymap) expect(['verified', 'unverified']).toContain(e.status);
  });

  it('maps J to Ison with no modifiers', () => {
    expect(find('ison')).toMatchObject({
      name: 'Ison', modifiers: [], trigger: 'KeyJ', codePoints: [0xe000], status: 'verified',
    });
  });

  it('maps S + L to Oligon with Kentēma', () => {
    expect(find('oligonKentimaMiddle')).toMatchObject({
      name: 'Oligon with Kentēma', modifiers: ['KeyS'], trigger: 'KeyL', codePoints: [0xe002],
    });
  });

  it('maps Shift + R + K to Kentēmata and Oligon', () => {
    expect(find('oligonKentimataBelow')).toMatchObject({
      name: 'Kentēmata and Oligon', modifiers: ['Shift', 'KeyR'], trigger: 'KeyK', codePoints: [0xe082],
    });
  });

  it('maps Shift + = to Cross and = to Breath', () => {
    expect(find('stavros')).toMatchObject({
      name: 'Cross', modifiers: ['Shift'], trigger: 'Equal', codePoints: [0xe0c0],
    });
    expect(find('breath')).toMatchObject({
      name: 'Breath', modifiers: [], trigger: 'Equal', codePoints: [0xe0c1],
    });
  });

  it('matches every row of SPEC Appendix A', () => {
    const spec = readFileSync('SPEC.md', 'utf8').split('## Appendix A')[1];
    const rows = [...spec.matchAll(/^\| (\d+) \| .*? \| (.*?) \| (.*?) \| (U\+[0-9A-F]+) `(\w+)` \| precomposed \| (\w+) \|$/gm)];
    expect(rows).toHaveLength(61);
    for (const [, n, codes, name, cp, glyph, status] of rows) {
      const parts = codes.split(' + ');
      const entry = keymap[Number(n) - 1];
      expect(entry, `row ${n}`).toMatchObject({
        id: glyph,
        name,
        trigger: parts[parts.length - 1],
        codePoints: [parseInt(cp.slice(2), 16)],
        status,
      });
      expect([...entry.modifiers].sort()).toEqual(parts.slice(0, -1).sort());
    }
  });
});
