import type { KeymapEntry } from '../data/keymap';

/** Raw weight is multiplied by this for every step of pitch away from the previous note. */
export const HALVING_FACTOR = 0.5;
/** Extra multiplier for entries marked uncommon. */
export const UNCOMMON_MULTIPLIER = 0.25;
/** Raw weight of fixed entries (Rest, Cross, Breath). */
export const FIXED_WEIGHT = 0.02;
/** Smallest chance any entry gets per draw (0.25%). */
export const MIN_CHANCE = 0.0025;

/** See docs/neume-weights.md. */
export function rawWeight(entry: Pick<KeymapEntry, 'pitch' | 'frequency'>): number {
  if (entry.frequency === 'fixed' || entry.pitch === null) return FIXED_WEIGHT;
  const w = HALVING_FACTOR ** Math.abs(entry.pitch);
  return entry.frequency === 'uncommon' ? w * UNCOMMON_MULTIPLIER : w;
}

/**
 * Turn raw weights into chances that sum to 1 with none below `floor`. Entries below the floor
 * get exactly the floor; the rest are scaled proportionally to fill what remains. Scaling can
 * push another entry under the floor, so this repeats until nothing changes.
 */
export function applyFloor(raw: readonly number[], floor: number = MIN_CHANCE): number[] {
  const floored = new Array<boolean>(raw.length).fill(false);
  for (;;) {
    let freeRaw = 0;
    let floorCount = 0;
    raw.forEach((w, i) => {
      if (floored[i]) floorCount++;
      else freeRaw += w;
    });
    const share = (1 - floorCount * floor) / freeRaw;
    let changed = false;
    raw.forEach((w, i) => {
      if (!floored[i] && w * share < floor) {
        floored[i] = true;
        changed = true;
      }
    });
    if (!changed) return raw.map((w, i) => (floored[i] ? floor : w * share));
  }
}

/** Chances for the entries not marked unverified, in their original order. */
export function neumeChances(entries: readonly KeymapEntry[]): number[] {
  return applyFloor(entries.filter((e) => e.status !== 'unverified').map(rawWeight));
}
