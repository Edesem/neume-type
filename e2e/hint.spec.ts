import { expect, test } from '@playwright/test';
import { currentIndex, currentTarget, typeChord, findSeed } from './helpers';
import { shortcutText } from '../src/core/shortcut';

const hint = (page: import('@playwright/test').Page) => page.getByTestId('hint');

// A seed whose first neume is not Ison, so J is a wrong attempt, and whose second differs from the first.
const seed = findSeed((t) => t[0].id !== 'ison' && t[1].id !== t[0].id);

test.beforeEach(async ({ page }) => {
  await page.goto(`/?seed=${seed}`);
});

test('no hint at the start, even after a correct attempt', async ({ page }) => {
  await expect(hint(page)).toHaveCount(0);
  await typeChord(page, await currentTarget(page));
  await expect(hint(page)).toHaveCount(0);
});

test('a wrong attempt shows the current name and shortcut, gone on the next neume', async ({ page }) => {
  const target = await currentTarget(page);
  await page.keyboard.press('KeyJ');
  await expect(hint(page)).toContainText(target.name);
  await expect(hint(page)).toContainText(shortcutText(target));
  expect(await currentIndex(page)).toBe(0);

  await typeChord(page, target);
  await expect(page.locator('[data-state="current"]')).toHaveAttribute('data-index', '1');
  await expect(hint(page)).toHaveCount(0);
});

test('restart clears the hint', async ({ page }) => {
  await page.keyboard.press('KeyJ');
  await expect(hint(page)).toBeVisible();
  await page.getByTestId('restart').click();
  await expect(hint(page)).toHaveCount(0);
});

test('the hint text matches the keymap for the neume shown', async ({ page }) => {
  await page.keyboard.press('KeyJ');
  const t = await currentTarget(page);
  await expect(hint(page)).toHaveText(`${t.name}: ${shortcutText(t)}`);
});
