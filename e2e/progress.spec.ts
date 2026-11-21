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
  // Saved history never shows during a test or on a fresh start, only in the results.
  await expect(page.getByTestId('weakest')).toHaveCount(0);
  await playRun(page);
  await expect(page.getByTestId('weakest').locator(`tr[data-neume-id="${first.id}"]`)).toBeVisible();
});

test('the weakest panel shows only inside the results, never during a test', async ({ page }) => {
  await page.goto('/?seed=1');
  for (let i = 0; i < 3; i++) await page.keyboard.press('KeyH');
  await playRun(page);
  await expect(page.getByTestId('done').getByTestId('weakest')).toBeVisible();
  await page.getByTestId('restart').click();
  await expect(page.getByTestId('weakest')).toHaveCount(0);
  await typeChord(page, await currentTarget(page)); // mid-test with saved history
  await expect(page.getByTestId('weakest')).toHaveCount(0);
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

test('the weakest panel is a quiet table with no outline, no card and no ruled lines', async ({ page }) => {
  await page.goto('/?seed=1');
  for (let i = 0; i < 3; i++) await page.keyboard.press('KeyH');
  await playRun(page);
  const panel = page.getByTestId('weakest');
  const box = await panel.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { width: parseFloat(cs.borderTopWidth), style: cs.borderTopStyle, bg: cs.backgroundColor, radius: parseFloat(cs.borderTopLeftRadius) };
  });
  expect(box.width === 0 || box.style === 'none').toBe(true);
  expect(box.bg).toBe('rgba(0, 0, 0, 0)');
  expect(box.radius).toBe(0);
  // A real table with the column titles from the owner's brief.
  await expect(panel.locator('thead th')).toHaveText(['neume', 'name', 'shortcut', 'miss rate']);
  await expect(panel.locator('tbody tr').first().locator('td').first()).toBeVisible();
  // The ranking scope is stated.
  await expect(panel).toContainText('all time · 3+ attempts');
  // No hard lines: no cell or row has a visible border.
  const ruled = await panel.locator('th, td, tr, table').evaluateAll((els) =>
    els.filter((el) => ['top', 'right', 'bottom', 'left'].some((side) => parseFloat(getComputedStyle(el).getPropertyValue(`border-${side}-width`)) > 0 && getComputedStyle(el).getPropertyValue(`border-${side}-style`) !== 'none')).length,
  );
  expect(ruled).toBe(0);
  // Rows are not interactive, so they do not change on hover.
  const row = panel.locator('tbody tr').first();
  const before = await row.locator('td').nth(1).evaluate((el) => getComputedStyle(el).backgroundColor);
  await row.hover();
  expect(await row.locator('td').nth(1).evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(before);
});

test('the weakest panel text has at least 4.5:1 contrast', async ({ page }) => {
  await page.goto('/?seed=1');
  for (let i = 0; i < 3; i++) await page.keyboard.press('KeyH');
  await playRun(page);
  const ratios = await page.getByTestId('weakest').evaluate((panel) => {
    const lum = (rgb: string) => {
      const [r, g, b] = rgb.match(/[\d.]+/g)!.slice(0, 3).map((v) => {
        const c = Number(v) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const bg = lum(getComputedStyle(document.body).backgroundColor);
    const cells = [
      ...panel.querySelectorAll('h3, p, th, td:not(:first-child)'),
    ] as HTMLElement[];
    return cells.map((el) => {
      const l = lum(getComputedStyle(el).color);
      return { text: el.textContent, ratio: (Math.max(l, bg) + 0.05) / (Math.min(l, bg) + 0.05) };
    });
  });
  expect(ratios.length).toBeGreaterThan(5);
  for (const r of ratios) expect(r.ratio, r.text ?? '').toBeGreaterThanOrEqual(4.5);
});

test('the weakest panel is labelled by its heading and hides the glyphs from screen readers', async ({ page }) => {
  await page.goto('/?seed=1');
  for (let i = 0; i < 3; i++) await page.keyboard.press('KeyH');
  await playRun(page);
  const panel = page.getByTestId('weakest');
  const labelledby = await panel.getAttribute('aria-labelledby');
  expect(labelledby).toBeTruthy();
  await expect(page.locator(`#${labelledby}`)).toHaveText('Weakest neumes');
  await expect(panel.locator('tbody .neume').first()).toHaveAttribute('aria-hidden', 'true');
});

test('on a phone the weakest rows stay readable without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/?seed=1');
  for (let i = 0; i < 3; i++) await page.keyboard.press('KeyH');
  await playRun(page);
  const panel = page.getByTestId('weakest');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const rowHeight = (await panel.locator('tbody tr').first().boundingBox())!.height;
  expect(rowHeight).toBeLessThan(80); // at most two lines of text
});
