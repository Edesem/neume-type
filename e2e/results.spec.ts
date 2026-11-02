import { expect, test, type Page } from '@playwright/test';
import { counts, currentIndex, currentTarget, typeChord } from './helpers';

/** Play all 20 neumes, with `wrongAt` listing indexes where one wrong key is pressed first. */
async function playRun(page: Page, wrongAt: number[] = []) {
  for (let i = 0; i < 20; i++) {
    const target = await currentTarget(page);
    if (wrongAt.includes(i)) await page.keyboard.press('KeyH');
    await typeChord(page, target);
  }
}

const rowText = (page: Page) => page.getByTestId('row').textContent();

test.beforeEach(async ({ page }) => {
  await page.goto('/?seed=1');
});

test('criterion 5: after 20 correct and 1 wrong the results show accuracy 95.2%', async ({ page }) => {
  await playRun(page, [7]);
  await expect(page.getByTestId('result-accuracy')).toHaveText('95.2%');
  await expect(page.getByTestId('result-time')).toHaveText(/^\d+\.\d{2}$/);
  await expect(page.getByTestId('result-rate')).toHaveText(/^\d+\.\d$/);
  await expect(page.getByTestId('row')).toHaveCount(0); // results replace the test
});

test('keys on the results screen change nothing', async ({ page }) => {
  await playRun(page, [7]);
  const accuracy = await page.getByTestId('result-accuracy').textContent();
  const time = await page.getByTestId('result-time').textContent();
  const before = await counts(page);

  await page.keyboard.press('KeyJ');
  await page.keyboard.press('KeyH');
  await page.keyboard.press('Space');

  expect(await counts(page)).toEqual(before);
  await expect(page.getByTestId('result-accuracy')).toHaveText(accuracy!);
  await expect(page.getByTestId('result-time')).toHaveText(time!);
});

test('criterion 8: restart after a run gives a new test with zeroed counts', async ({ page }) => {
  await playRun(page, [3, 9]);
  await expect(page.getByTestId('result-accuracy')).toBeVisible();

  await page.getByTestId('restart').click();

  await expect(page.getByTestId('result-accuracy')).toHaveCount(0);
  await expect(page.getByTestId('done')).toHaveCount(0);
  expect(await counts(page)).toEqual({ attempts: 0, errors: 0 });
  expect(await currentIndex(page)).toBe(0);
  await expect(page.locator('[data-index]')).toHaveCount(20);
});

test('criterion 8: restart during a test draws a new test and zeroes counts', async ({ page }) => {
  const first = await rowText(page);
  await typeChord(page, await currentTarget(page));
  await page.keyboard.press('KeyH');
  expect(await counts(page)).toEqual({ attempts: 2, errors: 1 });

  await page.getByTestId('restart').click();

  expect(await counts(page)).toEqual({ attempts: 0, errors: 0 });
  expect(await currentIndex(page)).toBe(0);
  expect(await rowText(page)).not.toBe(first);
});

test('restart is visible during the test and on the results screen', async ({ page }) => {
  await expect(page.getByTestId('restart')).toBeVisible();
  await playRun(page);
  await expect(page.getByTestId('restart')).toBeVisible();
});

test('the restart button is blurred after a click so Space cannot re-trigger it', async ({ page }) => {
  await page.getByTestId('restart').click();
  await page.keyboard.press('KeyH'); // one error
  await expect(page.getByTestId('errors')).toHaveText('1');
  await page.keyboard.press('Space'); // would click a focused button and restart
  await expect(page.getByTestId('errors')).toHaveText('1');
  await expect(page.getByTestId('restart')).not.toBeFocused();
});

test('a fresh run after restart is timed from its own first attempt', async ({ page }) => {
  await playRun(page);
  await page.getByTestId('restart').click();
  await playRun(page);
  await expect(page.getByTestId('result-accuracy')).toHaveText('100.0%');
});
