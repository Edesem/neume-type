import type { Page } from '@playwright/test';
import { seededRandom } from '../src/core/random';
import { sampleTargets } from '../src/core/session';
import { keymap, type KeymapEntry } from '../src/data/keymap';

export const physical = (m: string) => (m === 'Shift' ? 'ShiftLeft' : m);

export function targetsFor(seed: number): KeymapEntry[] {
  return sampleTargets(seededRandom(seed), keymap);
}

/** First seed whose 20 targets satisfy the predicate. The app draws with the same function. */
export function findSeed(predicate: (targets: KeymapEntry[]) => boolean): number {
  for (let seed = 1; seed < 100000; seed++) {
    if (predicate(targetsFor(seed))) return seed;
  }
  throw new Error('no seed found');
}

export async function currentTarget(page: Page): Promise<KeymapEntry> {
  const id = await page.locator('[data-state="current"]').getAttribute('data-neume-id');
  const entry = keymap.find((e) => e.id === id);
  if (!entry) throw new Error(`unknown target ${id}`);
  return entry;
}

export const currentIndex = async (page: Page) =>
  Number(await page.locator('[data-state="current"]').getAttribute('data-index'));

export async function typeChord(page: Page, entry: KeymapEntry) {
  for (const m of entry.modifiers) await page.keyboard.down(physical(m));
  await page.keyboard.down(entry.trigger);
  await page.keyboard.up(entry.trigger);
  for (const m of [...entry.modifiers].reverse()) await page.keyboard.up(physical(m));
}

/** Type the current target correctly until the highlight reaches `index`. */
export async function advanceTo(page: Page, index: number) {
  while ((await currentIndex(page)) < index) await typeChord(page, await currentTarget(page));
}

export const counts = async (page: Page) => ({
  attempts: Number(await page.getByTestId('attempts').textContent()),
  errors: Number(await page.getByTestId('errors').textContent()),
});
