import { expect, test, type Page } from '@playwright/test';
import { currentTarget, typeChord } from './helpers';

async function playRun(page: Page) {
  while ((await page.getByTestId('done').count()) === 0) await typeChord(page, await currentTarget(page));
}

test('the default length is 20 and is shown as pressed', async ({ page }) => {
  await page.goto('/?seed=1');
  await expect(page.locator('[data-index]')).toHaveCount(20);
  await expect(page.getByTestId('length-20')).toHaveAttribute('aria-pressed', 'true');
});

test('choosing 10 shows 10 neumes and a 10-neume run shows results', async ({ page }) => {
  await page.goto('/?seed=1');
  await page.getByTestId('length-10').click();
  await expect(page.locator('[data-index]')).toHaveCount(10);
  await playRun(page);
  await expect(page.getByTestId('done')).toBeVisible();
  await expect(page.getByTestId('result-accuracy')).toHaveText('100.0%');
});

test('choosing 50 shows 50 neumes', async ({ page }) => {
  await page.goto('/?seed=1');
  await page.getByTestId('length-50').click();
  await expect(page.locator('[data-index]')).toHaveCount(50);
});

test('the chosen length persists across reload', async ({ page }) => {
  await page.goto('/?seed=1');
  await page.getByTestId('length-10').click();
  await page.reload();
  await expect(page.locator('[data-index]')).toHaveCount(10);
  await expect(page.getByTestId('length-10')).toHaveAttribute('aria-pressed', 'true');
});

test('changing the drill keeps the chosen length across reload', async ({ page }) => {
  await page.goto('/?seed=1');
  await page.getByTestId('length-10').click();
  await page.getByTestId('drill-KeyR').click();
  await page.reload();
  await expect(page.locator('[data-index]')).toHaveCount(10);
  await expect(page.getByTestId('drill-KeyR')).toHaveAttribute('aria-pressed', 'true');
});

test('an invalid stored length falls back to 20', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'neume-type.progress',
      JSON.stringify({ version: 1, settings: { drillId: 'all', showShortcuts: false, length: 30 }, bests: {}, neumes: {} }),
    ),
  );
  await page.goto('/?seed=1');
  await expect(page.locator('[data-index]')).toHaveCount(20);
});

test('bests are separate per length', async ({ page }) => {
  await page.goto('/?seed=1');
  await page.getByTestId('length-10').click();
  await playRun(page);
  await expect(page.getByTestId('new-best')).toBeVisible();
  await page.getByTestId('length-20').click();
  await expect(page.getByTestId('best-rate')).toHaveCount(0); // results are gone, so nothing carries over
  // Make the 20-neume run clearly slower than the 10-neume best. With one shared best it could not
  // beat it, so "New best" can only show if the bests are kept per length.
  for (let i = 0; i < 20 && (await page.getByTestId('done').count()) === 0; i++) {
    if (i === 19) await page.waitForTimeout(1500);
    await typeChord(page, await currentTarget(page));
  }
  await expect(page.getByTestId('done')).toBeVisible();
  await expect(page.getByTestId('new-best')).toBeVisible();
});
