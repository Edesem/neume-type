import { describe, expect, it } from 'vitest';
import { keymap } from '../data/keymap';
import { shortcutText } from './shortcut';

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
