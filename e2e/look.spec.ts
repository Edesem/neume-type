import { expect, test } from '@playwright/test';

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
