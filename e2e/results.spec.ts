import { expect, test, type Page } from '@playwright/test';
import { counts, currentIndex, currentTarget, playRun, typeChord } from './helpers';
import { TEST_LENGTH } from '../src/core/session';

/** A `playRun` hook that presses one wrong key first at each listed index. */
const wrongKeyAt = (page: Page, indexes: number[]) => async (i: number) => {
  if (indexes.includes(i)) await page.keyboard.press('KeyH');
};

const rowText = (page: Page) => page.getByTestId('row').textContent();

test.beforeEach(async ({ page }) => {
  await page.goto('/?seed=1');
});

test('criterion 5: after 20 correct and 1 wrong the results show accuracy 95.2%', async ({ page }) => {
  await playRun(page, wrongKeyAt(page, [7]));
  await expect(page.getByTestId('result-accuracy')).toHaveText('95.2%');
  await expect(page.getByTestId('result-time')).toHaveText(/^\d+\.\d{2}$/);
  await expect(page.getByTestId('result-rate')).toHaveText(/^\d+\.\d$/);
  await expect(page.getByTestId('row')).toHaveCount(0); // results replace the test
});

test('keys on the results screen change nothing', async ({ page }) => {
  await playRun(page, wrongKeyAt(page, [7]));
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
  await playRun(page, wrongKeyAt(page, [3, 9]));
  await expect(page.getByTestId('result-accuracy')).toBeVisible();

  await page.getByTestId('restart').click();

  await expect(page.getByTestId('result-accuracy')).toHaveCount(0);
  await expect(page.getByTestId('done')).toHaveCount(0);
  expect(await counts(page)).toEqual({ attempts: 0, errors: 0 });
  expect(await currentIndex(page)).toBe(0);
  await expect(page.locator('[data-index]')).toHaveCount(TEST_LENGTH);
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
  await page.waitForTimeout(500);
  const t0 = Date.now();
  await page.getByTestId('restart').click();
  await playRun(page);
  const wall = (Date.now() - t0) / 1000;
  // A clock that did not reset would include the first run and the wait, and exceed `wall`.
  expect(Number(await page.getByTestId('result-time').textContent())).toBeLessThanOrEqual(wall + 0.05);
  await expect(page.getByTestId('result-accuracy')).toHaveText('100.0%');
});
