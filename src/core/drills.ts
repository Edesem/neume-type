import { keymap, MODIFIER_CATEGORIES, MODIFIERS, type KeymapEntry } from '../data/keymap';
import { keyName } from './shortcut';
import { drawPool } from './weights';

export interface Drill {
  id: string;
  label: string;
  /** Tooltip: the Neanes guide category of the modifier, or a short description. */
  title: string;
  entries: readonly KeymapEntry[];
}

export const DEFAULT_DRILL_ID = 'all';

const isLetter = (code: string) => code !== 'Shift';

/**
 * Practice drills: every entry, entries without a letter modifier, then one drill per letter
 * modifier used by a verified entry, in `MODIFIERS` order. Groups follow the guide's modifier table.
 */
export function drills(entries: readonly KeymapEntry[] = keymap): Drill[] {
  const verified = drawPool(entries);
  const list: Drill[] = [
    { id: DEFAULT_DRILL_ID, label: 'all', title: 'Every neume', entries: verified },
    {
      id: 'plain',
      label: 'plain',
      title: 'No letter modifier',
      entries: verified.filter((e) => !e.modifiers.some(isLetter)),
    },
  ];
  for (const code of MODIFIERS.filter(isLetter)) {
    const group = verified.filter((e) => e.modifiers.includes(code));
    if (group.length > 0) {
      list.push({ id: code, label: keyName(code), title: MODIFIER_CATEGORIES[code], entries: group });
    }
  }
  return list;
}

/** The pool to draw from for a drill. Throws on an unknown id. */
export function drillPool(id: string, entries: readonly KeymapEntry[] = keymap): readonly KeymapEntry[] {
  const drill = drills(entries).find((d) => d.id === id);
  if (!drill) throw new Error(`drillPool: unknown drill "${id}"`);
  return drawPool(drill.entries);
}
