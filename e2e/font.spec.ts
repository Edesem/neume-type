import { expect, test } from '@playwright/test';
import { keymap } from '../src/data/keymap';

test('all 61 keymap code points render from the Neanes font, not a fallback', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');

  expect(keymap).toHaveLength(61);

  // Chrome reports the primary font even for a missing glyph (it draws .notdef), so also
  // compare each glyph's pixels with the pixels of a code point the font lacks (U+E7FF).
  const inkIdentical = await page.evaluate((codePoints) => {
    const ink = (cp: number) => {
      const c = document.createElement('canvas');
      c.width = c.height = 96;
      const ctx = c.getContext('2d')!;
      ctx.font = '48px Neanes';
      ctx.fillText(String.fromCodePoint(cp), 10, 60);
      return Array.from(ctx.getImageData(0, 0, 96, 96).data).join(',');
    };
    const notdef = ink(0xe7ff);
    return codePoints.filter((cp) => ink(cp) === notdef);
  }, keymap.flatMap((e) => [...e.codePoints]));
  expect(inkIdentical, 'code points drawn as .notdef').toEqual([]);
  for (const entry of keymap) {
    const selector = `[data-testid="glyph-${entry.id}"]`;
    const probe = page.locator(selector);
    await expect(probe, entry.id).toHaveText(String.fromCodePoint(...entry.codePoints));
    const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
    const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
    expect(
      fonts.map((f) => f.familyName),
      `${entry.id} U+${entry.codePoints[0].toString(16).toUpperCase()}`,
    ).toEqual(['Neanes']);
    expect(fonts.every((f) => f.isCustomFont)).toBe(true);
  }
});
