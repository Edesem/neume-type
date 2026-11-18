import { describe, expect, it } from 'vitest';
import { keymap } from '../data/keymap';
import { SCORED_CODES } from './chord';
import { keyName, shortcutText } from './shortcut';

const byId = (id: string) => keymap.find((e) => e.id === id)!;

describe('shortcutText', () => {
  it('formats single keys, chords and Shift chords', () => {
    expect(shortcutText(byId('ison'))).toBe('J');
    expect(shortcutText(byId('oligonKentimaMiddle'))).toBe('S + L');
    expect(shortcutText(byId('oligonKentimataBelow'))).toBe('Shift + R + K');
  });

  it('shows punctuation as the character', () => {
    expect(shortcutText(byId('petastiKentima'))).toBe('Shift + ;');
  });

  it('never leaves a raw event.code in the text', () => {
    for (const e of keymap) expect(shortcutText(e)).not.toMatch(/Key|Digit|Semicolon|Quote|Comma|Period|Slash|Equal/);
  });
});

describe('keyName', () => {
  it('maps every scored key code', () => {
    for (const code of SCORED_CODES) {
      const name = keyName(code);
      expect(name).not.toMatch(/^(Key|Digit|Minus|Equal|Bracket|Backslash|Backquote|Semicolon|Quote|Comma|Period|Slash)/);
      expect(name).toHaveLength(1);
    }
  });

  it('names Shift', () => {
    expect(keyName('Shift')).toBe('Shift');
  });

  it('throws on an unknown code', () => {
    expect(() => keyName('F13')).toThrow('keyName: unknown key code "F13"');
  });
});

describe('shortcutText with bracket keys', () => {
  it('shows T + [ for BracketLeft', () => {
    const entry = { ...byId('ison'), modifiers: ['KeyT'], trigger: 'BracketLeft' };
    expect(shortcutText(entry)).toBe('T + [');
  });
});

