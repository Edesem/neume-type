import { expect, test } from '@playwright/test';
import type { KeymapEntry } from '../src/data/keymap';
import {
  advanceTo, counts, currentIndex, currentTarget, findSeed, targetsFor, typeChord,
} from './helpers';

test('criterion 5: a full run with one deliberate wrong chord has 20 correct of 21 attempts', async ({ page }) => {
  await page.goto('/?seed=1');
  for (let i = 0; i < 20; i++) {
    const target = await currentTarget(page); // read from data-neume-id, looked up in the keymap
    if (i === 7) {
      await page.keyboard.press('KeyH'); // deliberate wrong chord
      await expect(page.getByTestId('errors')).toHaveText('1');
      expect(await currentIndex(page)).toBe(7);
    }
    await typeChord(page, target);
  }
  await expect(page.getByTestId('done')).toBeVisible();
  const { attempts, errors } = await counts(page);
  // 20 correct of 21 total, i.e. 95.2%. The results view that shows the percentage is T8.
  expect({ correct: attempts - errors, total: attempts }).toEqual({ correct: 20, total: 21 });
});

test.describe('criterion 6: S tapped then L versus S held then L', () => {
  const isSL = (e: KeymapEntry) => e.id === 'oligonKentimaMiddle';
  const seed = findSeed((t) => t.some(isSL));
  const at = targetsFor(seed).findIndex(isSL);

  test('S tapped and released, then L, is wrong on an S+L target', async ({ page }) => {
    await page.goto(`/?seed=${seed}`);
    await advanceTo(page, at);
    expect((await currentTarget(page)).id).toBe('oligonKentimaMiddle');
    const before = await counts(page);

    await page.keyboard.down('KeyS');
    await page.keyboard.up('KeyS');
    await page.keyboard.down('KeyL');
    await page.keyboard.up('KeyL');

    expect(await counts(page)).toEqual({ attempts: before.attempts + 1, errors: before.errors + 1 });
    expect(await currentIndex(page)).toBe(at);
  });

  test('S held, then L, is correct on an S+L target', async ({ page }) => {
    await page.goto(`/?seed=${seed}`);
    await advanceTo(page, at);
    const before = await counts(page);

    await page.keyboard.down('KeyS');
    await page.keyboard.down('KeyL');
    await page.keyboard.up('KeyL');
    await page.keyboard.up('KeyS');

    expect(await counts(page)).toEqual({ attempts: before.attempts + 1, errors: before.errors });
    expect(await currentIndex(page)).toBe(at + 1);
  });
});

test.describe('two Ison targets in a row', () => {
  const isIson = (e: KeymapEntry) => e.id === 'ison';
  const seed = findSeed((t) => t.some((e, i) => isIson(e) && i < 19 && isIson(t[i + 1])));
  const at = targetsFor(seed).findIndex((e, i, t) => isIson(e) && isIson(t[i + 1]));

  test('C13: a held J auto-repeating does not answer the next J', async ({ page }) => {
    await page.goto(`/?seed=${seed}`);
    await advanceTo(page, at);
    const before = await counts(page);

    await page.keyboard.down('KeyJ'); // real press
    await page.keyboard.down('KeyJ'); // Playwright marks these as auto-repeat
    await page.keyboard.down('KeyJ');
    await page.keyboard.down('KeyJ');
    expect(await currentIndex(page)).toBe(at + 1);
    expect(await counts(page)).toEqual({ attempts: before.attempts + 1, errors: before.errors });

    await page.keyboard.up('KeyJ');
    await page.keyboard.down('KeyJ'); // a fresh press does answer the second J
    await page.keyboard.up('KeyJ');
    expect(await currentIndex(page)).toBe(at + 2);
  });

  test('C17: Meta+J does not score on a J target', async ({ page }) => {
    await page.goto(`/?seed=${seed}`);
    await advanceTo(page, at);
    expect((await currentTarget(page)).id).toBe('ison');
    const before = await counts(page);

    await page.keyboard.down('Meta');
    await page.keyboard.down('KeyJ');
    await page.keyboard.up('KeyJ');
    await page.keyboard.up('Meta');

    expect(await counts(page)).toEqual(before);
    expect(await currentIndex(page)).toBe(at);
  });
});
