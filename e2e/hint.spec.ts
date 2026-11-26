import { expect, test } from '@playwright/test';
import { drillPool } from '../src/core/drills';
import { shortcutText } from '../src/core/shortcut';
import { advanceTo, contrastRatios, currentIndex, currentTarget, typeChord, findSeed } from './helpers';

const hint = (page: import('@playwright/test').Page) => page.getByTestId('hint');

// A seed whose first neume is not Ison, so J is a wrong attempt, and whose second differs from the first.
const seed = findSeed((t) => t[0].id !== 'ison' && t[1].id !== t[0].id);

test.beforeEach(async ({ page }) => {
  await page.goto(`/?seed=${seed}`);
});

test('no hint at the start, even after a correct attempt', async ({ page }) => {
  await expect(hint(page)).toHaveCount(0);
  await typeChord(page, await currentTarget(page));
  await expect(hint(page)).toHaveCount(0);
});

test('a wrong attempt shows the current name and shortcut, gone on the next neume', async ({ page }) => {
  const target = await currentTarget(page);
  await page.keyboard.press('KeyJ');
  await expect(hint(page)).toContainText(target.name);
  expect(await currentIndex(page)).toBe(0);

  await typeChord(page, target);
  await expect(page.locator('[data-state="current"]')).toHaveAttribute('data-index', '1');
  await expect(hint(page)).toHaveCount(0);
});

test('the hint shows a literal shortcut such as S + L', async ({ page }) => {
  const sl = findSeed((t) => t[0].id === 'oligonKentimaMiddle');
  await page.goto(`/?seed=${sl}`);
  await page.keyboard.press('KeyJ');
  await expect(hint(page)).toHaveText('Oligon with Kentēma: S + L');
});

test('restart clears the hint', async ({ page }) => {
  await page.keyboard.press('KeyJ');
  await expect(hint(page)).toBeVisible();
  await page.getByTestId('restart').click();
  await expect(hint(page)).toHaveCount(0);
});

test('on a short screen a first-time visitor sees the answer without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.reload();
  await expect(page.getByTestId('intro')).toBeVisible();
  await page.keyboard.press('KeyJ');
  await expect(hint(page)).toBeInViewport({ ratio: 1 });
});

/** Default-draw entries, longest hint text first. */
const byHintLength = drillPool('all')
  .map((e) => ({ id: e.id, shortcut: shortcutText(e), length: `${e.name}: ${shortcutText(e)}`.length }))
  .sort((a, b) => b.length - a.length);
const longest = byHintLength[0];

for (const width of [1280, 600, 390, 320]) {
  test(`at ${width}px the longest hint sits above the neumes and does not move them`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(`/?seed=${findSeed((t) => t[0].id === longest.id)}`);
    await page.evaluate(() => document.fonts.ready);
    const before = (await page.getByTestId('row').boundingBox())!;
    await page.keyboard.press('KeyH'); // H is never a target
    const hintBox = (await hint(page).boundingBox())!;
    const after = (await page.getByTestId('row').boundingBox())!;
    expect(hintBox.y + hintBox.height).toBeLessThanOrEqual(after.y);
    expect(after.y).toBe(before.y);
  });
}

test('late in a 50-neume test the hint stays on screen and clear of the current neume', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 600 });
  await page.getByTestId('length-50').click();
  await advanceTo(page, 40);
  const current = page.locator('[data-state="current"]');
  await current.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.keyboard.press('KeyH');
  await expect(hint(page)).toBeInViewport({ ratio: 1 });
  const hintBox = (await hint(page).boundingBox())!;
  const currentBox = (await current.boundingBox())!;
  expect(hintBox.y + hintBox.height).toBeLessThanOrEqual(currentBox.y);
});

for (const width of [390, 320]) {
  test(`at ${width}px a long hint never splits its shortcut across lines`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const entry of byHintLength.slice(0, 3)) {
      await page.goto(`/?seed=${findSeed((t) => t[0].id === entry.id)}`);
      await page.keyboard.press('KeyH');
      const lines = await hint(page).evaluate((el, shortcut) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const chars: [Node, number][] = [];
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          for (let i = 0; i < n.textContent!.length; i++) chars.push([n, i]);
        }
        const from = el.textContent!.lastIndexOf(shortcut);
        if (from < 0) throw new Error(`"${shortcut}" is not in the hint`);
        const tops = chars.slice(from, from + shortcut.length).map(([node, i]) => {
          const range = document.createRange();
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          return Math.round(range.getBoundingClientRect().top);
        });
        return new Set(tops).size;
      }, entry.shortcut);
      expect(lines, entry.shortcut).toBe(1);
    }
  });
}

test('the hint text has at least 4.5:1 contrast', async ({ page }) => {
  await page.keyboard.press('KeyJ');
  for (const r of await contrastRatios(page.locator('.hint'))) expect(r.ratio, r.text ?? '').toBeGreaterThanOrEqual(4.5);
});
