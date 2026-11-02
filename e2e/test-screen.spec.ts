import { expect, test, type Page } from '@playwright/test';
import { keymap, type KeymapEntry } from '../src/data/keymap';

const physical = (m: string) => (m === 'Shift' ? 'ShiftLeft' : m);

async function currentTarget(page: Page): Promise<KeymapEntry> {
  const id = await page.locator('[data-state="current"]').getAttribute('data-neume-id');
  const entry = keymap.find((e) => e.id === id);
  if (!entry) throw new Error(`unknown target ${id}`);
  return entry;
}

async function currentIndex(page: Page): Promise<number> {
  return Number(await page.locator('[data-state="current"]').getAttribute('data-index'));
}

async function typeChord(page: Page, entry: KeymapEntry) {
  for (const m of entry.modifiers) await page.keyboard.down(physical(m));
  await page.keyboard.down(entry.trigger);
  await page.keyboard.up(entry.trigger);
  for (const m of [...entry.modifiers].reverse()) await page.keyboard.up(physical(m));
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?seed=1');
});

test('shows 20 neumes with the first highlighted and no errors', async ({ page }) => {
  await expect(page.locator('[data-index]')).toHaveCount(20);
  await expect(page.locator('[data-state="current"]')).toHaveCount(1);
  expect(await currentIndex(page)).toBe(0);
  await expect(page.getByTestId('errors')).toHaveText('0');
});

test('a wrong key shows an error and the highlight stays', async ({ page }) => {
  await page.keyboard.press('KeyH');
  await expect(page.getByTestId('errors')).toHaveText('1');
  await expect(page.getByTestId('attempts')).toHaveText('1');
  await expect(page.locator('[data-state="current"]')).toHaveAttribute('data-error', 'true');
  expect(await currentIndex(page)).toBe(0);
});

test('exactly one key press counts as exactly one attempt', async ({ page }) => {
  await page.keyboard.press('KeyH');
  await expect(page.getByTestId('attempts')).toHaveText('1');
  await page.keyboard.press('KeyH');
  await expect(page.getByTestId('attempts')).toHaveText('2');
});

test('the target trigger without its modifiers is an error', async ({ page }) => {
  // Find the first target that needs a modifier by playing through correctly.
  for (let i = 0; i < 20; i++) {
    const target = await currentTarget(page);
    if (target.modifiers.length > 0) {
      await page.keyboard.press(target.trigger);
      await expect(page.getByTestId('errors')).toHaveText('1');
      expect(await currentIndex(page)).toBe(i);
      return;
    }
    await typeChord(page, target);
  }
  throw new Error('seed 1 has no chord target');
});

test('plain, Shift and modifier chords each advance the highlight', async ({ page }) => {
  const seen = { plain: false, shift: false, modifier: false };
  for (let i = 0; i < 20; i++) {
    const target = await currentTarget(page);
    if (target.modifiers.length === 0) seen.plain = true;
    if (target.modifiers.includes('Shift')) seen.shift = true;
    if (target.modifiers.some((m) => m !== 'Shift')) seen.modifier = true;
    await typeChord(page, target);
    if (i < 19) expect(await currentIndex(page)).toBe(i + 1);
  }
  expect(seen).toEqual({ plain: true, shift: true, modifier: true });
  await expect(page.getByTestId('done')).toBeVisible();
  await expect(page.getByTestId('errors')).toHaveText('0');
});

test('without ?debug the glyph reference row and last-key line are not shown', async ({ page }) => {
  await expect(page.locator('[data-index]')).toHaveCount(20); // page has loaded
  await expect(page.getByTestId('last-key')).toHaveCount(0);
  await expect(page.locator('[data-testid^="glyph-"]')).toHaveCount(0);
});

test('with ?debug both are shown', async ({ page }) => {
  await page.goto('/?seed=1&debug');
  await expect(page.getByTestId('last-key')).toBeVisible();
  await expect(page.locator('[data-testid^="glyph-"]')).toHaveCount(61);
});
