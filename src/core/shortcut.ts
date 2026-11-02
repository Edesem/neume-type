import type { KeymapEntry } from '../data/keymap';

const PUNCTUATION: Record<string, string> = {
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  Equal: '=',
};

const keyName = (code: string): string => {
  const letter = /^Key([A-Z])$/.exec(code);
  return letter ? letter[1] : (PUNCTUATION[code] ?? code);
};

/** Readable shortcut such as `S + L` or `Shift + R + K`, derived from keymap data. */
export function shortcutText(entry: KeymapEntry): string {
  return [...entry.modifiers, entry.trigger].map(keyName).join(' + ');
}
