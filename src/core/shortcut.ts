import type { KeymapEntry } from '../data/keymap';

const PUNCTUATION: Record<string, string> = {
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  Equal: '=',
  Minus: '-',
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Backquote: '`',
};

/** Display name for an event.code (or the logical `Shift`). Throws on anything else. */
export function keyName(code: string): string {
  if (code === 'Shift') return 'Shift';
  const letter = /^Key([A-Z])$/.exec(code);
  if (letter) return letter[1];
  const digit = /^Digit([0-9])$/.exec(code);
  if (digit) return digit[1];
  const punctuation = PUNCTUATION[code];
  if (punctuation === undefined) throw new Error(`keyName: unknown key code "${code}"`);
  return punctuation;
}

/** Readable shortcut such as `S + L` or `Shift + R + K`, derived from keymap data. */
export function shortcutText(entry: KeymapEntry): string {
  return [...entry.modifiers, entry.trigger].map(keyName).join(' + ');
}
