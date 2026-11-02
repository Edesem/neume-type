import { expect, test } from '@playwright/test';

test('pressing a key shows its label on the page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('last-key')).toHaveText('none');
  await page.keyboard.press('KeyJ');
  await expect(page.getByTestId('last-key')).toHaveText('J');
});
