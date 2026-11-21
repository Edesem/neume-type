import { expect, test, type Page } from '@playwright/test';
import { TEST_LENGTH } from '../src/core/session';
import { currentTarget, targetsFor, typeChord } from './helpers';

/** Type the current target correctly until the results show. `before` runs before the last neume. */
async function playRun(page: Page, before?: () => Promise<void>) {
  for (let i = 0; i < TEST_LENGTH; i++) {
    if (i === TEST_LENGTH - 1) await before?.();
    await typeChord(page, await currentTarget(page));
  }
  await expect(page.getByTestId('done')).toBeVisible();
}

test('first run shows New best and a best rate', async ({ page }) => {
  await page.goto('/?seed=1');
  await playRun(page);
  await expect(page.getByTestId('new-best')).toBeVisible();
  await expect(page.getByTestId('best-rate')).toHaveText(/^\d+\.\d$/);
});

test('a deliberately slower second run is not a new best', async ({ page }) => {
  await page.goto('/?seed=1');
  await playRun(page);
  const best = await page.getByTestId('best-rate').textContent();
  await page.getByTestId('restart').click();
  await playRun(page, () => page.waitForTimeout(1500));
  await expect(page.getByTestId('new-best')).toHaveCount(0);
  await expect(page.getByTestId('best-rate')).toHaveText(best!);
});

test('the weakest panel survives a reload', async ({ page }) => {
  await page.goto('/?seed=1');
  await expect(page.getByTestId('weakest')).toHaveCount(0);
  const first = targetsFor(1)[0];
  for (let i = 0; i < 3; i++) await page.keyboard.press('KeyH'); // wrong keys on the first neume
  await playRun(page);
  await expect(page.getByTestId('weakest').locator(`tr[data-neume-id="${first.id}"]`)).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('weakest').locator(`tr[data-neume-id="${first.id}"]`)).toBeVisible();
});

test('corrupt storage does not break the page', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('neume-type.progress', '{'));
  await page.goto('/?seed=1');
  await expect(page.locator('[data-index]')).toHaveCount(TEST_LENGTH);
  await expect(page.getByTestId('weakest')).toHaveCount(0);
});

test('reset clears the panel', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  await page.goto('/?seed=1');
  for (let i = 0; i < 3; i++) await page.keyboard.press('KeyH');
  await playRun(page);
  await expect(page.getByTestId('weakest')).toBeVisible();
  await page.getByTestId('reset-progress').click();
  await expect(page.getByTestId('weakest')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('weakest')).toHaveCount(0);
});

test('settings persist across reload', async ({ page }) => {
  await page.goto('/?seed=1');
  await page.getByTestId('drill-KeyR').click();
  await page.getByTestId('show-shortcuts').click();
  await page.reload();
  await expect(page.getByTestId('drill-KeyR')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('show-shortcuts')).toHaveAttribute('aria-pressed', 'true');
});

test('a storage that throws does not break the game', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('denied');
      },
    });
  });
  await page.goto('/?seed=1');
  await playRun(page);
  await expect(page.getByTestId('new-best')).toBeVisible();
});

test('settings survive a reset and a reload', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  await page.goto('/?seed=1');
  await page.getByTestId('drill-KeyR').click();
  await page.getByTestId('reset-progress').click();
  await page.reload();
  await expect(page.getByTestId('drill-KeyR')).toHaveAttribute('aria-pressed', 'true');
});

test('the weakest panel is a yellow-outlined card holding a table with no ruled lines', async ({ page }) => {
  await page.goto('/?seed=1');
  for (let i = 0; i < 3; i++) await page.keyboard.press('KeyH');
  await playRun(page);
  const card = page.getByTestId('weakest');
  const outline = await card.evaluate((el) => {
    const cs = getComputedStyle(el);
    return [cs.borderTopColor, cs.borderTopWidth];
  });
  expect(outline[0]).toBe('rgb(226, 183, 20)'); // --accent
  expect(parseFloat(outline[1])).toBeGreaterThanOrEqual(1);
  // A real table with column headers, so each value sits under its title.
  const headers = card.locator('table thead th');
  expect(await headers.count()).toBeGreaterThanOrEqual(3);
  await expect(card.locator('tbody tr').first().locator('td').first()).toBeVisible();
  // No hard lines: no cell or row has a visible border.
  const ruled = await card.locator('th, td, tr, table').evaluateAll((els) =>
    els.filter((el) => ['top', 'right', 'bottom', 'left'].some((side) => parseFloat(getComputedStyle(el).getPropertyValue(`border-${side}-width`)) > 0 && getComputedStyle(el).getPropertyValue(`border-${side}-style`) !== 'none')).length,
  );
  expect(ruled).toBe(0);
});

test('the weakest card is left-aligned and as wide as the settings bar', async ({ page }) => {
  await page.goto('/?seed=1');
  for (let i = 0; i < 3; i++) await page.keyboard.press('KeyH');
  await playRun(page);
  const card = (await page.getByTestId('weakest').boundingBox())!;
  const bar = (await page.locator('.settings').boundingBox())!;
  expect(Math.abs(card.x - bar.x)).toBeLessThan(2);
  expect(Math.abs(card.width - bar.width)).toBeLessThan(2);
  const align = await page.getByTestId('weakest').locator('tbody td').nth(1).evaluate((el) => getComputedStyle(el).textAlign);
  expect(['left', 'start']).toContain(align);
});
