import { expect, test } from '@playwright/test';
import { currentTarget, playRun, targetsFor, typeChord } from './helpers';

const stored = (settings: object) =>
  JSON.stringify({ version: 1, settings: { showShortcuts: false, ...settings }, bests: {}, neumes: {} });

test('avoid repeats is off by default, and a default load is the off draw', async ({ page }) => {
  await page.goto('/?seed=1');
  await expect(page.getByTestId('no-repeats')).toHaveAttribute('aria-pressed', 'false');
  expect((await currentTarget(page)).id).toBe(targetsFor(1)[0].id);
});

test('turning it on restarts the test', async ({ page }) => {
  await page.goto('/?seed=1');
  await typeChord(page, await currentTarget(page));
  await page.getByTestId('no-repeats').click();
  await expect(page.getByTestId('no-repeats')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('attempts')).toHaveText('0');
  await expect(page.locator('[data-state="current"]')).toHaveAttribute('data-index', '0');
});

test('with it on, a full 50-neume D-drill run never shows the same neume twice in a row', async ({ page }) => {
  await page.goto('/?seed=1');
  await page.getByTestId('drill-KeyD').click();
  await page.getByTestId('length-50').click();
  await page.getByTestId('no-repeats').click();
  let previous = '';
  let played = 0;
  while ((await page.getByTestId('done').count()) === 0) {
    const target = await currentTarget(page);
    expect(target.id).not.toBe(previous);
    previous = target.id;
    await typeChord(page, target);
    played++;
  }
  expect(played).toBe(50);
  await expect(page.getByTestId('done')).toBeVisible();
});

test('the setting persists across reload, together with drill and length', async ({ page }) => {
  await page.goto('/?seed=1');
  await page.getByTestId('drill-KeyR').click();
  await page.getByTestId('length-10').click();
  await page.getByTestId('no-repeats').click();
  await page.reload();
  await expect(page.getByTestId('no-repeats')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('drill-KeyR')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('length-10')).toHaveAttribute('aria-pressed', 'true');
});

test('an invalid stored value means off, and the drill and length are kept', async ({ page }) => {
  await page.addInitScript((text) => localStorage.setItem('neume-type.progress', text), stored({ drillId: 'KeyR', length: 10, noRepeats: 'yes' }));
  await page.goto('/?seed=1');
  await expect(page.getByTestId('no-repeats')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('drill-KeyR')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('length-10')).toHaveAttribute('aria-pressed', 'true');
});

test('the best key stays drill:length: a run with it on can set a best, and it is shared with it off', async ({ page }) => {
  await page.goto('/?seed=1');
  await page.getByTestId('length-10').click();
  await page.getByTestId('no-repeats').click();
  await playRun(page);
  await expect(page.getByTestId('best-rate')).toBeVisible();
  await expect(page.getByTestId('new-best')).toBeVisible();
  const best = await page.getByTestId('best-rate').textContent();
  await page.getByTestId('no-repeats').click(); // off again, same drill and length
  await playRun(page, async (i) => {
    if (i === 9) await page.waitForTimeout(1500); // clearly slower
  });
  await expect(page.getByTestId('new-best')).toHaveCount(0);
  await expect(page.getByTestId('best-rate')).toHaveText(best!);
});
