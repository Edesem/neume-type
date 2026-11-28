import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { keymap } from '../src/data/keymap';

const look = readFileSync(new URL('../src/ui/look.css', import.meta.url), 'utf8');

function colour(token: string): number[] {
  const hex = new RegExp(`${token}:\\s*#([0-9a-f]{6})`).exec(look)?.[1];
  if (!hex) throw new Error(`colour: ${token} is not a six-digit colour in look.css`);
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
}

test('the page links an SVG favicon that is served', async ({ page, request }) => {
  await page.goto('/');
  const link = page.locator('link[rel="icon"]');
  await expect(link).toHaveAttribute('type', 'image/svg+xml');
  const response = await request.get((await link.getAttribute('href'))!);
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('image/svg+xml');
});

test('the favicon is Petastē with Ison in the accent colour on a dark rounded tile', async ({ page }) => {
  await page.goto('/');
  const neume = keymap.find((e) => e.id === 'petastiIson')!;
  const icon = await page.evaluate(
    async ({ codePoints, bg, accent }) => {
      const size = 256;
      const canvas = (side: number) => {
        const c = document.createElement('canvas');
        c.width = c.height = side;
        return c.getContext('2d', { willReadFrequently: true })!;
      };
      // A pixel belongs to the glyph when its red channel is nearer the accent than the tile.
      const mask = (ctx: CanvasRenderingContext2D) => {
        const { width, height } = ctx.canvas;
        const data = ctx.getImageData(0, 0, width, height).data;
        return Array.from(
          { length: width * height },
          (_, i) => data[i * 4 + 3] > 127 && data[i * 4] > (bg[0] + accent[0]) / 2,
        );
      };
      const bounds = (m: boolean[], side: number) => {
        const xs: number[] = [];
        const ys: number[] = [];
        m.forEach((on, i) => {
          if (on) {
            xs.push(i % side);
            ys.push(Math.floor(i / side));
          }
        });
        const left = xs.reduce((a, b) => Math.min(a, b), side);
        const right = xs.reduce((a, b) => Math.max(a, b), -1) + 1;
        const top = ys.reduce((a, b) => Math.min(a, b), side);
        const bottom = ys.reduce((a, b) => Math.max(a, b), -1) + 1;
        return { left, top, width: right - left, height: bottom - top };
      };

      const image = new Image();
      image.src = document.querySelector<HTMLLinkElement>('link[rel="icon"]')!.href;
      await image.decode();
      const drawn = canvas(size);
      drawn.drawImage(image, 0, 0, size, size);
      const actual = mask(drawn);
      const box = bounds(actual, size);
      const pixel = (x: number, y: number) => Array.from(drawn.getImageData(x, y, 1, 1).data);

      // The same neume drawn by the bundled font, cropped and fitted to the icon's glyph box.
      await document.fonts.load('400px Neanes', String.fromCodePoint(...codePoints));
      const font = canvas(1024);
      font.fillStyle = `rgb(${bg.join()})`;
      font.fillRect(0, 0, 1024, 1024);
      font.fillStyle = `rgb(${accent.join()})`;
      font.font = '400px Neanes';
      font.fillText(String.fromCodePoint(...codePoints), 300, 600);
      const from = bounds(mask(font), 1024);
      const fitted = canvas(size);
      fitted.drawImage(
        font.canvas,
        from.left, from.top, from.width, from.height,
        box.left, box.top, box.width, box.height,
      );
      const expected = mask(fitted);
      let both = 0;
      let either = 0;
      actual.forEach((on, i) => {
        if (on && expected[i]) both += 1;
        if (on || expected[i]) either += 1;
      });

      return {
        corner: pixel(0, 0),
        edge: pixel(size / 2, 3),
        box,
        overlap: both / either,
        fontAspect: from.width / from.height,
      };
    },
    { codePoints: [...neume.codePoints], bg: colour('--bg'), accent: colour('--accent') },
  );

  expect(icon.corner[3], 'rounded corner is transparent').toBe(0);
  expect(icon.edge, 'tile is the app background').toEqual([...colour('--bg'), 255]);
  expect(icon.overlap, 'glyph matches the font').toBeGreaterThan(0.93);
  expect(icon.box.width / icon.box.height, 'glyph is not stretched').toBeCloseTo(icon.fontAspect, 1);
  expect(Math.max(icon.box.width, icon.box.height), 'glyph fills the tile').toBeGreaterThan(256 * 0.7);
  expect(Math.abs(icon.box.left + icon.box.width / 2 - 128), 'centred across').toBeLessThan(4);
  expect(Math.abs(icon.box.top + icon.box.height / 2 - 128), 'centred down').toBeLessThan(4);
});
