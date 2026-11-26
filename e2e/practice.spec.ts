import { expect, test } from '@playwright/test';
import { seededRandom } from '../src/core/random';
import { sampleTargets, TEST_LENGTH } from '../src/core/session';
import { keymap } from '../src/data/keymap';
import { advanceTo, counts, currentIndex, currentTarget, playRun, targetsFor, typeChord } from './helpers';

/** Toggling an option restarts, so the page's next test is the second draw from the same seed. */
const afterRestart = (seed: number) => sampleTargets(seededRandom(seed), keymap, 2 * TEST_LENGTH).slice(TEST_LENGTH);

test('show shortcuts: hint is visible before any key, with the current name and shortcut', async ({ page }) => {
  const seed = Array.from({ length: 5000 }, (_, i) => i + 1).find((s) => afterRestart(s)[0].id === 'oligonKentimaMiddle')!;
  await page.goto(`/?seed=${seed}`);
  await expect(page.getByTestId('hint')).toHaveCount(0);
  await page.getByTestId('show-shortcuts').click();
  await expect(page.getByTestId('show-shortcuts')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('hint')).toHaveText('Oligon with Kentēma: S + L');
});

test('the hint stays visible after a correct attempt while shortcuts are on', async ({ page }) => {
  await page.goto('/?seed=1');
  await page.getByTestId('show-shortcuts').click();
  await typeChord(page, await currentTarget(page));
  await expect(page.getByTestId('hint')).toBeVisible();
});

test('toggling shortcuts restarts the test', async ({ page }) => {
  await page.goto('/?seed=1');
  await page.keyboard.press('KeyH');
  expect((await counts(page)).attempts).toBe(1);
  await page.getByTestId('show-shortcuts').click();
  expect(await counts(page)).toEqual({ attempts: 0, errors: 0 });
  expect(await currentIndex(page)).toBe(0);
});

test('R drill: every target in a full run uses R', async ({ page }) => {
  await page.goto('/?seed=1');
  await page.getByTestId('drill-KeyR').click();
  await expect(page.getByTestId('drill-KeyR')).toHaveAttribute('aria-pressed', 'true');
  await playRun(page, async () => {
    expect((await currentTarget(page)).modifiers).toContain('KeyR');
  });
  await expect(page.getByTestId('done')).toBeVisible();
});

test('the default drill is all and a default load matches targetsFor', async ({ page }) => {
  await page.goto('/?seed=1');
  await expect(page.getByTestId('drill-all')).toHaveAttribute('aria-pressed', 'true');
  expect((await currentTarget(page)).id).toBe(targetsFor(1)[0].id);
});

test('results list the neume that had errors', async ({ page }) => {
  await page.goto('/?seed=1');
  const second = targetsFor(1)[2];
  await advanceTo(page, 2);
  await page.keyboard.press('KeyH'); // H is never a target, so this is a wrong key
  await playRun(page);
  await expect(page.getByTestId('done')).toBeVisible();
  const item = page.getByTestId('hardest').locator(`li[data-neume-id="${second.id}"]`);
  await expect(item).toContainText('1 error');
  await expect(item).not.toContainText('1 errors');
});

test('a clean run shows no errors', async ({ page }) => {
  await page.goto('/?seed=1');
  await playRun(page);
  await expect(page.getByTestId('no-errors')).toBeVisible();
  await expect(page.getByTestId('hardest')).toHaveCount(0);
});
