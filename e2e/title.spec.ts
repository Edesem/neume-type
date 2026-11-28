import { expect, test } from '@playwright/test';
import { advanceTo, counts, currentIndex, playRun } from './helpers';

test('the title and the browser tab read "neumetype" in lower case', async ({ page }) => {
  await page.goto('/?seed=1');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('neumetype');
  await expect(page).toHaveTitle('neumetype');
});

test('the title renders from the bundled Lexend Deca font, not a fallback or installed copy', async ({ page }) => {
  await page.goto('/?seed=1');
  await page.evaluate(() => document.fonts.ready);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '.title' });
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  expect(fonts).toHaveLength(1);
  expect(fonts[0].familyName).toContain('Lexend Deca');
  expect(fonts[0].isCustomFont).toBe(true);
});

test('clicking the title restarts a running test', async ({ page }) => {
  await page.goto('/?seed=1&debug');
  await advanceTo(page, 2);
  const row = page.getByTestId('row');
  const before = await row.textContent();
  await page.getByRole('button', { name: 'neumetype' }).click();
  expect(await currentIndex(page)).toBe(0);
  expect(await counts(page)).toEqual({ attempts: 0, errors: 0 });
  await expect(row).not.toHaveText(before!); // a new draw, from the same seeded stream
});

test('clicking the title on the results screen starts a new test', async ({ page }) => {
  await page.goto('/?seed=1');
  await playRun(page);
  await page.getByRole('button', { name: 'neumetype' }).click();
  await expect(page.getByTestId('row')).toBeVisible();
  await expect(page.getByTestId('done')).toHaveCount(0);
});

test('the title gives up focus after a click, so Space cannot restart again', async ({ page }) => {
  await page.goto('/?seed=1');
  const title = page.getByRole('button', { name: 'neumetype' });
  await title.click();
  await expect(title).not.toBeFocused();
});
