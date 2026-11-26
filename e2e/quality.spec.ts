import { expect, test } from '@playwright/test';
import { drillPool } from '../src/core/drills';
import { seededRandom } from '../src/core/random';
import { sampleTargets, TEST_LENGTH } from '../src/core/session';
import { counts, currentTarget, playRun, typeChord } from './helpers';

test('V drill: a full run typed with real key events finishes with 0 errors', async ({ page }) => {
  await page.goto('/?seed=1');
  await page.getByTestId('drill-KeyV').click();
  await playRun(page, async () => {
    expect((await currentTarget(page)).modifiers).toContain('KeyV');
  });
  await expect(page.getByTestId('done')).toBeVisible();
  expect((await counts(page)).errors).toBe(0);
});

test('T drill: a full run finishes with 0 errors and never shows an unverified entry', async ({ page }) => {
  await page.goto('/?seed=1');
  await page.getByTestId('drill-KeyT').click();
  await playRun(page, async () => {
    const target = await currentTarget(page);
    expect(target.modifiers).toContain('KeyT');
    expect(target.status).toBe('verified');
  });
  await expect(page.getByTestId('done')).toBeVisible();
  expect((await counts(page)).errors).toBe(0);
});

test('every drawable V and T shortcut types correctly through real key events', async ({ page }) => {
  test.setTimeout(90_000);
  for (const drill of ['KeyV', 'KeyT']) {
    await page.goto('/?seed=1');
    await page.getByTestId(`drill-${drill}`).click();
    const seen = new Set<string>();
    for (let i = 0; i < 400 && seen.size < drillPool(drill).length; i++) {
      if ((await page.getByTestId('done').count()) > 0) await page.getByTestId('restart').click();
      const target = await currentTarget(page);
      seen.add(target.id);
      await typeChord(page, target);
    }
    expect(seen.size).toBe(drillPool(drill).length);
    if (drill === 'KeyT') expect(seen).toContain('fthoraSoftChromaticKeAbove'); // T + M, row 82
    expect((await counts(page)).errors).toBe(0);
  }
});

test('the hint for a T + [ target reads "General Flat fthora: T + ["', async ({ page }) => {
  // The default draw uses TEST_LENGTH random numbers; choosing the T drill then draws from the same stream.
  const seed = Array.from({ length: 5000 }, (_, i) => i + 1).find((s) => {
    const random = seededRandom(s);
    sampleTargets(random, drillPool('all'), TEST_LENGTH);
    return sampleTargets(random, drillPool('KeyT'), TEST_LENGTH)[0].id === 'yfesisGenikiAbove';
  })!;
  await page.goto(`/?seed=${seed}`);
  await page.getByTestId('drill-KeyT').click();
  await page.keyboard.press('KeyH'); // a wrong key shows the hint
  await expect(page.getByTestId('hint')).toHaveText('General Flat fthora: T + [');
});
