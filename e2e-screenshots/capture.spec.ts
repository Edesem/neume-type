import { expect, test, type Page } from '@playwright/test';
import { findSeed, typeChord, currentTarget, playRun } from '../e2e/helpers';

/** Load a fresh page with no saved settings, so one shot's choices never leak into the next. */
async function freshPage(page: Page, url: string) {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
}

test('screenshots: test, hint, results, practice, quality', async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 900 });
  const seed = findSeed((t) => t[3].id !== 'ison');
  await page.goto(`/?seed=${seed}`);
  await page.evaluate(() => document.fonts.ready);
  for (let i = 0; i < 3; i++) await typeChord(page, await currentTarget(page));
  await page.screenshot({ path: 'docs/screenshots/test.png' });
  await page.keyboard.press('KeyJ');
  await expect(page.getByTestId('hint')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/hint.png' });
  await playRun(page);
  await page.screenshot({ path: 'docs/screenshots/results.png' });
  await freshPage(page, `/?seed=${seed}`);
  await page.getByTestId('show-shortcuts').click();
  await expect(page.getByTestId('hint')).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/practice.png' });
  await freshPage(page, `/?seed=${seed}`);
  await page.getByTestId('drill-KeyV').click();
  await page.screenshot({ path: 'docs/screenshots/quality.png' });
});
