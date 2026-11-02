import { MODIFIERS, type KeymapEntry } from '../data/keymap';

/** The subset of a keyboard event the tracker needs. Plain data, no DOM types. */
export interface KeyEventLike {
  type: 'down' | 'up';
  /** event.code */
  code: string;
  repeat?: boolean;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  isComposing?: boolean;
}

export type ChordResult =
  | { kind: 'ignored'; preventDefault: boolean }
  | { kind: 'held'; preventDefault: boolean }
  | {
      kind: 'attempt';
      preventDefault: boolean;
      trigger: string;
      /** Logical modifiers held at the keydown ('Shift' covers both Shift keys). */
      modifiers: readonly string[];
    };

export interface ChordTracker {
  handle(event: KeyEventLike): ChordResult;
  /** Window blur or hidden page: clear the held set (R14). */
  blur(): void;
}

const SHIFT_CODES = ['ShiftLeft', 'ShiftRight'];

const SCORED = new Set([
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((c) => `Key${c}`),
  ...'0123456789'.split('').map((d) => `Digit${d}`),
  'Minus', 'Equal', 'BracketLeft', 'BracketRight', 'Backslash',
  'Semicolon', 'Quote', 'Comma', 'Period', 'Slash', 'Backquote',
]);

/** Logical modifier name for a physical code, or undefined if the key is not a modifier. */
function modifierOf(code: string): string | undefined {
  if (SHIFT_CODES.includes(code)) return 'Shift';
  return MODIFIERS.includes(code) ? code : undefined;
}

const ignored: ChordResult = { kind: 'ignored', preventDefault: false };

export function createChordTracker(): ChordTracker {
  const held = new Set<string>();

  const heldModifiers = (): string[] => {
    const mods = new Set<string>();
    for (const code of held) {
      const m = modifierOf(code);
      if (m) mods.add(m);
    }
    return [...mods];
  };

  return {
    blur() {
      held.clear();
    },

    handle(e) {
      if (e.isComposing) return ignored;

      if (e.type === 'up') {
        held.delete(e.code);
        return ignored;
      }

      // R14: resync Shift from the event.
      if (e.shiftKey === false) SHIFT_CODES.forEach((c) => held.delete(c));
      else if (e.shiftKey === true && !SHIFT_CODES.some((c) => held.has(c))) held.add('ShiftLeft');

      // R12: browser combinations pass through untouched.
      if (e.ctrlKey || e.metaKey || e.altKey) return ignored;

      const isModifier = modifierOf(e.code) !== undefined;
      const isScored = SCORED.has(e.code) && !isModifier;
      // R11: unscored keys.
      if (!isModifier && !isScored) return ignored;

      // R7: auto-repeat never answers anything. Still prevented so held keys do not
      // trigger browser defaults (R13).
      if (e.repeat) return { kind: 'ignored', preventDefault: true };

      held.add(e.code);
      if (isModifier) return { kind: 'held', preventDefault: true };

      return {
        kind: 'attempt',
        preventDefault: true,
        trigger: e.code,
        modifiers: heldModifiers(),
      };
    },
  };
}

/** R1: an attempt matches only if the trigger and the full modifier set equal the target's. */
export function attemptMatches(
  attempt: Extract<ChordResult, { kind: 'attempt' }>,
  target: KeymapEntry,
): boolean {
  if (attempt.trigger !== target.trigger) return false;
  if (attempt.modifiers.length !== target.modifiers.length) return false;
  return target.modifiers.every((m) => attempt.modifiers.includes(m));
}
