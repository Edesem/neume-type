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
  const quantity = keymap.filter((e) => e.table === 'quantity');
  const appendixB = keymap.filter((e) => e.table !== 'quantity');

  it('has exactly 61 quantity entries', () => {
    expect(quantity).toHaveLength(61);
  });

  it('has exactly 29 Appendix B entries (11 quality, 18 fthoras)', () => {
    expect(appendixB).toHaveLength(29);
    expect(keymap.filter((e) => e.table === 'quality')).toHaveLength(11);
    expect(keymap.filter((e) => e.table === 'fthoras')).toHaveLength(18);
    expect(keymap).toHaveLength(90);
  });

  it('has unique ids and unique chords across all entries', () => {
    expect(new Set(keymap.map((e) => e.id)).size).toBe(keymap.length);
    expect(new Set(keymap.map(chordKey)).size).toBe(keymap.length);
  });

  it('quantity entries have unique single code points', () => {
    expect(quantity.every((e) => e.codePoints.length === 1)).toBe(true);
    expect(new Set(quantity.flatMap((e) => e.codePoints)).size).toBe(61);
  });

  it('every entry has a unique code point sequence', () => {
    expect(new Set(keymap.map((e) => e.codePoints.join(','))).size).toBe(keymap.length);
  });

  // Owner decision 2026-11-19: T + M is the guide's "Soft Chromatic Ga fthora" (the glyph can be read on
  // Ga or Ke); the SBMuFL-derived id is kept. Nothing is unverified any more.
  it('has no unverified entries, and row 82 is verified with the guide name and the SBMuFL id', () => {
    expect(keymap.filter((e) => e.status === 'unverified')).toEqual([]);
    expect(find('fthoraSoftChromaticKeAbove')).toMatchObject({
      name: 'Soft Chromatic Ga fthora', modifiers: ['KeyT'], trigger: 'KeyM', codePoints: [0xe000, 0xe19b],
      status: 'verified', table: 'fthoras',
    });
  });

  it('maps V + J to Vareia, with the mark before its base', () => {
    expect(find('vareia')).toMatchObject({
      name: 'Vareia', modifiers: ['KeyV'], trigger: 'KeyJ', codePoints: [0xe0a0, 0xe000], table: 'quality',
    });
  });

  it('maps T + [ to General Flat fthora with trigger BracketLeft', () => {
    expect(find('yfesisGenikiAbove')).toMatchObject({
      name: 'General Flat fthora', modifiers: ['KeyT'], trigger: 'BracketLeft', codePoints: [0xe000, 0xe204], table: 'fthoras',
    });
  });

  it('maps Shift + V + K to Psēfiston (slanted)', () => {
    expect(find('psifistonSalt01')).toMatchObject({
      name: 'Psēfiston (slanted)', modifiers: ['Shift', 'KeyV'], trigger: 'KeyK', codePoints: [0xe000, 0xf006],
    });
  });

  it('gives every Appendix B entry a null pitch and fixed frequency (owner default)', () => {
    for (const e of appendixB) expect(e).toMatchObject({ pitch: null, frequency: 'fixed' });
  });

  it('lists the 15 guide modifiers plus Shift', () => {
    expect(MODIFIERS).toEqual([
      'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyA', 'KeyS', 'KeyD',
      'KeyF', 'KeyG', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'Shift',
    ]);
  });

  // Criterion 1. Adding Haplē-style data (a modifier as trigger) needs the owner's approval and a
  // change to this criterion; the chord tracker already supports solo triggers (SPEC R6).
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
    const spec = readFileSync(new URL('../../SPEC.md', import.meta.url), 'utf8').split('## Appendix A')[1].split('## Appendix B')[0];
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

  it('matches every row of SPEC Appendix B', () => {
    const spec = readFileSync(new URL('../../SPEC.md', import.meta.url), 'utf8').split('## Appendix B')[1];
    const rows = [...spec.matchAll(/^\| (\d+) \| .*? \| (.*?) \| (.*?) \| ((?:U\+[0-9A-F]+ ?)+) \| `([\w.]+)` \| (\w+) \| (\w+) \|$/gm)];
    expect(rows).toHaveLength(29);
    for (const [, n, codes, name, cps, glyph, table, status] of rows) {
      const parts = codes.split(' + ');
      const entry = keymap[Number(n) - 1];
      expect(entry, `row ${n}`).toMatchObject({
        id: glyph.replace('.salt01', 'Salt01'),
        name,
        trigger: parts[parts.length - 1],
        codePoints: cps.trim().split(' ').map((c) => parseInt(c.slice(2), 16)),
        table,
        status,
        pitch: null,
        frequency: 'fixed',
      });
      expect([...entry.modifiers].sort()).toEqual(parts.slice(0, -1).sort());
    }
  });
});
