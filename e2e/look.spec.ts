import { expect, test } from '@playwright/test';
import { advanceTo } from './helpers';

test('no glyph clips at the chosen size', async ({ page }) => {
  await page.goto('/?debug');
  await page.evaluate(() => document.fonts.ready);
  const clipped = await page.evaluate(() => {
    const out: string[] = [];
    const canvas = document.createElement('canvas').getContext('2d')!;
    for (const el of document.querySelectorAll<HTMLElement>('[data-testid^="glyph-"]')) {
      const cs = getComputedStyle(el);
      canvas.font = `${cs.fontSize} Neanes`;
      const m = canvas.measureText(el.textContent ?? '');
      const box = el.getBoundingClientRect();
      const pad = (p: string) => parseFloat(cs.getPropertyValue(p));
      // Content box (excluding border) the glyph may use, baseline measured from the text's own metrics.
      const inkHeight = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
      const inkWidth = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      const availH = box.height - pad('padding-top') - pad('padding-bottom') - pad('border-bottom-width');
      const availW = box.width - pad('padding-left') - pad('padding-right');
      // 1px tolerance for rounding; ink must fit inside the element, and inside the viewport width.
      if (inkHeight > availH + 1 || inkWidth > availW + 1 || box.right > window.innerWidth) {
        out.push(`${el.dataset.testid}: ink ${inkWidth.toFixed(1)}x${inkHeight.toFixed(1)} avail ${availW.toFixed(1)}x${availH.toFixed(1)}`);
      }
    }
    return out;
  });
  expect(clipped).toEqual([]);
});

test('done neumes are near-white, untyped are dim, stats text keeps its grey', async ({ page }) => {
  await page.goto('/?seed=1');
  await advanceTo(page, 1);
  const colour = (selector: string) =>
    page.locator(selector).first().evaluate((el) => getComputedStyle(el).color);
  expect(await colour('.neume[data-state="done"]')).toBe('rgb(242, 241, 234)');
  expect(await colour('.neume[data-state="todo"]')).toBe('rgb(74, 76, 80)');
  const stats = page.locator('p', { has: page.getByTestId('errors') });
  expect(await stats.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(100, 102, 105)');
});

test('each setting is a group: a dim non-clickable title beside its selectable options', async ({ page }) => {
  await page.goto('/?seed=1');
  const groups = page.locator('.setting-group');
  expect(await groups.count()).toBeGreaterThanOrEqual(4);
  for (const group of await groups.all()) {
    const label = group.locator('.setting-label');
    await expect(label).toHaveCount(1);
    expect(await label.locator('button').count()).toBe(0); // a title is never a control
    expect(await group.locator('.setting-options button').count()).toBeGreaterThan(0);
  }
  // The title is visibly quieter than an unselected option.
  const colour = (selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).color);
  expect(await colour('.setting-label')).not.toBe(await colour('.setting-options button[aria-pressed="false"]'));
});

test('the settings sit in one bar and the options in chips, each on its own background', async ({ page }) => {
  await page.goto('/?seed=1');
  const bg = (selector: string) => page.locator(selector).first().evaluate((el) => getComputedStyle(el).backgroundColor);
  const page_ = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const bar = await bg('.settings');
  const chip = await bg('.setting-options');
  expect(bar).not.toBe(page_);
  expect(chip).not.toBe(bar);
  expect(chip).not.toBe('rgba(0, 0, 0, 0)');
  const barBox = (await page.locator('.settings').boundingBox())!;
  const rowBox = (await page.getByTestId('row').boundingBox())!;
  expect(barBox.y + barBox.height).toBeLessThanOrEqual(rowBox.y);
});

test('the errors and attempts line is hidden by default and shown with ?debug', async ({ page }) => {
  await page.goto('/?seed=1');
  await expect(page.locator('.stats')).toBeHidden();
  await page.goto('/?debug');
  await expect(page.locator('.stats')).toBeVisible();
});
