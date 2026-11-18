import { expect, test } from '@playwright/test';
import { findSeed, typeChord, currentTarget } from '../e2e/helpers';

test('screenshots: test, hint, results, practice', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  const seed = findSeed((t) => t[3].id !== 'ison');
  await page.goto(`/?seed=${seed}`);
  await page.evaluate(() => document.fonts.ready);
  for (let i = 0; i < 3; i++) await typeChord(page, await currentTarget(page));
  await page.screenshot({ path: 'docs/screenshots/test.png' });
  await page.keyboard.press('KeyJ');
  await expect(page.getByTestId('hint')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/hint.png' });
  while ((await page.getByTestId('done').count()) === 0) await typeChord(page, await currentTarget(page));
  await page.screenshot({ path: 'docs/screenshots/results.png' });
  await page.goto(`/?seed=${seed}`);
  await page.evaluate(() => document.fonts.ready);
  await page.getByTestId('show-shortcuts').click();
  await expect(page.getByTestId('hint')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/practice.png' });
});
