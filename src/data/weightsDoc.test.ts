import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { keymap } from './keymap';

interface DocRow {
  n: number;
  name: string;
  pitch: number | null;
  frequency: string;
}

/** Parse the table in docs/neume-weights.md: `| # | shortcut | name | pitch | class | ...`. */
function parseDoc(): DocRow[] {
  const text = readFileSync(new URL('../../docs/neume-weights.md', import.meta.url), 'utf8');
  const rows: DocRow[] = [];
  for (const line of text.split('\n')) {
    const cells = line.split('|').map((c) => c.trim());
    if (!/^\d+$/.test(cells[1] ?? '')) continue;
    const pitchText = cells[4];
    if (pitchText !== 'none' && !/^[+-]?\d+$/.test(pitchText)) {
      throw new Error(`bad pitch cell "${pitchText}" in row ${cells[1]}`);
    }
    rows.push({
      n: Number(cells[1]),
      name: cells[3],
      pitch: pitchText === 'none' ? null : Number(pitchText),
      frequency: cells[5],
    });
  }
  return rows;
}

describe('docs/neume-weights.md matches the keymap', () => {
  const rows = parseDoc();

  it('has 61 rows numbered 1 to 61', () => {
    expect(rows.map((r) => r.n)).toEqual(Array.from({ length: 61 }, (_, i) => i + 1));
  });

  it('agrees with the keymap on name, pitch and class for every row', () => {
    keymap.forEach((entry, i) => {
      const row = rows[i];
      expect({ row: row.n, name: row.name, pitch: row.pitch, frequency: row.frequency }).toEqual({
        row: i + 1,
        name: entry.name,
        pitch: entry.pitch,
        frequency: entry.frequency,
      });
    });
  });
});

describe('keymap weight data', () => {
  it('has a pitch for every pitched neume and null for Rest, Cross and Breath', () => {
    const fixed = keymap.filter((e) => e.frequency === 'fixed').map((e) => e.id);
    expect(fixed).toEqual(['leimma1', 'leimma2', 'leimma3', 'leimma4', 'stavros', 'breath']);
    for (const e of keymap) expect(e.pitch === null).toBe(e.frequency === 'fixed');
  });

  it('keeps all 61 entries verified', () => {
    expect(keymap.every((e) => e.status === 'verified')).toBe(true);
  });
});
