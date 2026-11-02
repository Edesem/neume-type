import type { KeyEventLike } from '../core/chord';

/** One item of a key script: a plain event, a window blur, or a pause in ms. */
export type ScriptItem = KeyEventLike | { blur: true } | { wait: number };

const NAMES: Record<string, string> = {
  Shift: 'ShiftLeft', ShiftLeft: 'ShiftLeft', ShiftRight: 'ShiftRight', Meta: 'MetaLeft',
  Space: 'Space', Tab: 'Tab', '=': 'Equal', ';': 'Semicolon', ',': 'Comma', '/': 'Slash',
};

/**
 * Turn steps like '↓S', '↑S', '↓J!' (auto-repeat), 'blur', '+5000' (wait) into items.
 * `shiftKey` is deliberately NOT set: the tracker must track ShiftLeft and ShiftRight itself.
 * Only `metaKey` is derived, because browsers report it on the event.
 */
export function script(steps: string[]): ScriptItem[] {
  const down = new Set<string>();
  return steps.map((raw): ScriptItem => {
    if (raw === 'blur') {
      down.clear();
      return { blur: true };
    }
    if (raw.startsWith('+')) return { wait: Number(raw.slice(1)) };
    const repeat = raw.endsWith('!');
    const key = raw.replace('!', '').slice(1);
    const code = NAMES[key] ?? (key.length === 1 ? `Key${key}` : key);
    const type = raw[0] === '↓' ? 'down' : 'up';
    if (type === 'down') down.add(code);
    else down.delete(code);
    return { type, code, repeat, metaKey: down.has('MetaLeft') };
  });
}
