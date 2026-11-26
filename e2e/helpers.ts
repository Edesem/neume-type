import { expect, type Locator, type Page } from '@playwright/test';
import { physicalCode } from '../src/core/chord';
import { DEFAULT_DRILL_ID, drillPool } from '../src/core/drills';
import { seededRandom } from '../src/core/random';
import { LENGTH_OPTIONS, sampleTargets } from '../src/core/session';
import { keymap, type KeymapEntry } from '../src/data/keymap';


export function targetsFor(seed: number): KeymapEntry[] {
  return sampleTargets(seededRandom(seed), drillPool(DEFAULT_DRILL_ID)); // what the app draws on load
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
  for (const m of entry.modifiers) await page.keyboard.down(physicalCode(m));
  await page.keyboard.down(entry.trigger);
  await page.keyboard.up(entry.trigger);
  for (const m of [...entry.modifiers].reverse()) await page.keyboard.up(physicalCode(m));
}

/** Type the current target correctly until the highlight reaches `index`. */
export async function advanceTo(page: Page, index: number) {
  while ((await currentIndex(page)) < index) await typeChord(page, await currentTarget(page));
}

/**
 * Type a test of any length correctly until the results show, and fail if they never do.
 * `beforeEach` runs before each neume is typed, with its index.
 */
export async function playRun(page: Page, beforeEach?: (index: number) => Promise<unknown>) {
  const longestTest = Math.max(...LENGTH_OPTIONS);
  for (let i = 0; i < longestTest && (await page.getByTestId('done').count()) === 0; i++) {
    await beforeEach?.(i);
    await typeChord(page, await currentTarget(page));
  }
  await expect(page.getByTestId('done')).toBeVisible();
}

/** Contrast ratio of each matched element's text against the page background. Waits for a match. */
export async function contrastRatios(elements: Locator): Promise<{ text: string | null; ratio: number }[]> {
  await elements.first().waitFor(); // evaluateAll does not wait, and would pass on no elements
  const ratios = await elements.evaluateAll((els) => {
    const lum = (rgb: string) => {
      const [r, g, b] = rgb.match(/[\d.]+/g)!.slice(0, 3).map((v) => {
        const c = Number(v) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const bg = lum(getComputedStyle(document.body).backgroundColor);
    return els.map((el) => {
      const l = lum(getComputedStyle(el).color);
      return { text: el.textContent, ratio: (Math.max(l, bg) + 0.05) / (Math.min(l, bg) + 0.05) };
    });
  });
  return ratios;
}

export const counts = async (page: Page) => ({
  attempts: Number(await page.getByTestId('attempts').textContent()),
  errors: Number(await page.getByTestId('errors').textContent()),
});
