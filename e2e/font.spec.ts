import { expect, test } from '@playwright/test';

test('U+E000 renders from the Neanes font, not a fallback', async ({ page }) => {
  await page.goto('/');
  const probe = page.getByTestId('glyph-probe');
  await expect(probe).toHaveText('');
  await page.evaluate(() => document.fonts.ready);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: '[data-testid="glyph-probe"]',
  });
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  expect(fonts.map((f) => f.familyName)).toEqual(['Neanes']);
  expect(fonts.every((f) => f.isCustomFont)).toBe(true);
});
