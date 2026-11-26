import { expect, test } from '@playwright/test';
import { advanceTo, contrastRatios, playRun } from './helpers';

test('a first visit explains how to type, above the neumes', async ({ page }) => {
  await page.goto('/?seed=1');
  const intro = page.getByTestId('intro');
  await expect(intro).toHaveText(
    'Type each neume with its Neanes shortcut, using US key positions. For S + L, hold S and press L. ' +
      'A wrong key shows the answer. You need a physical keyboard.',
  );
  const introBox = (await intro.boundingBox())!;
  const rowBox = (await page.getByTestId('row').boundingBox())!;
  expect(introBox.y + introBox.height).toBeLessThanOrEqual(rowBox.y);
});

test('the example shortcut in the instruction never wraps apart', async ({ page }) => {
  await page.goto('/?seed=1');
  expect(await page.getByTestId('intro').textContent()).toContain('S\u00a0+\u00a0L');
});

test('the instruction stays through an unfinished run and a reload', async ({ page }) => {
  await page.goto('/?seed=1');
  await advanceTo(page, 2);
  await expect(page.getByTestId('intro')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('intro')).toBeVisible();
});

test('the instruction is gone after a finished run, including after restart and reload', async ({ page }) => {
  await page.goto('/?seed=1');
  await playRun(page);
  await expect(page.getByTestId('intro')).toHaveCount(0);
  await page.getByTestId('restart').click();
  await expect(page.getByTestId('row')).toBeVisible();
  await expect(page.getByTestId('intro')).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId('row')).toBeVisible();
  await expect(page.getByTestId('intro')).toHaveCount(0);
});

test('resetting saved progress brings the instruction back', async ({ page }) => {
  page.on('dialog', (d) => void d.accept());
  await page.goto('/?seed=1');
  await playRun(page);
  await page.getByTestId('reset-progress').click();
  await expect(page.getByTestId('intro')).toBeVisible();
});

test('the footer credits Neanes and links to the licence and to feedback, in new tabs', async ({ page }) => {
  await page.goto('/?seed=1');
  const footer = page.getByRole('contentinfo');
  const links = [
    ['Neanes', 'https://github.com/neanes/neanes'],
    ['Font licence (OFL 1.1)', '/fonts/OFL.txt'],
    ['Send feedback', 'https://github.com/Edesem/neume-type/issues'],
  ];
  await expect(footer.getByRole('link')).toHaveCount(links.length);
  for (const [name, href] of links) {
    const link = footer.getByRole('link', { name, exact: true });
    await expect(link).toHaveAttribute('href', href);
    await expect(link).toHaveAttribute('target', '_blank'); // leaving the page would lose a run
    await expect(link).toHaveAttribute('rel', 'noreferrer');
  }
});

test('the footer licence link serves the font licence', async ({ page, request }) => {
  await page.goto('/?seed=1');
  const href = await page.getByRole('link', { name: 'Font licence (OFL 1.1)' }).getAttribute('href');
  const response = await request.get(href!);
  expect(await response.text()).toContain('SIL OPEN FONT LICENSE');
});

test('the footer stays on the results screen', async ({ page }) => {
  await page.goto('/?seed=1');
  await playRun(page);
  await expect(page.getByRole('contentinfo')).toBeVisible();
});

test('the instruction and footer have at least 4.5:1 contrast', async ({ page }) => {
  await page.goto('/?seed=1');
  const ratios = await contrastRatios(page.locator('.intro, .footer, .footer a'));
  expect(ratios).toHaveLength(5); // the instruction, the footer and its three links
  for (const r of ratios) expect(r.ratio, r.text ?? '').toBeGreaterThanOrEqual(4.5);
});

test('on a phone the instruction and footer fit without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto('/?seed=1');
  await expect(page.getByTestId('intro')).toBeVisible();
  await expect(page.getByRole('contentinfo')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
