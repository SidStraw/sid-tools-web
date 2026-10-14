import { test, expect, type Page, type Download } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { unzipSync } from 'fflate';
import { inspectImage } from '@sid-tools/core';

const fixture = (name: string) => resolve('tests/fixtures', name);
async function start(page: Page) {
  await page.locator('#start').click();
  await expect(page.getByRole('button', { name: '取消處理', exact: true })).toBeHidden({
    timeout: 60_000,
  });
}
async function downloaded(download: Download) {
  const path = await download.path();
  if (!path) throw new Error('Download missing');
  return readFile(path);
}
async function pixels(page: Page, bytes: Uint8Array) {
  return page.evaluate(
    async (data) => {
      const bitmap = await createImageBitmap(new Blob([new Uint8Array(data)]));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height),
        ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas');
      ctx.drawImage(bitmap, 0, 0);
      const rgba = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
      const result = {
        width: bitmap.width,
        height: bitmap.height,
        corner: [...rgba.slice(0, 4)],
        hasAlpha: rgba.some((value, i) => i % 4 === 3 && value < 255),
      };
      bitmap.close();
      return result;
    },
    [...bytes],
  );
}
test.beforeEach(async ({ page }) => {
  await page.goto('./');
});

test('real batch obeys decimal byte budget and dimensions; ZIP contains decoded images; no uploads', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const network: { url: string; method: string }[] = [];
  page.on('request', (r) => {
    if (/^https?:/.test(r.url())) network.push({ url: r.url(), method: r.method() });
  });
  await page
    .locator('#file-input')
    .setInputFiles([fixture('photo.jpg'), fixture('transparent.png'), fixture('icon.png')]);
  await page.locator('#budget').fill('100');
  await page.locator('#format').selectOption('image/webp');
  await page.getByLabel('最大寬度').fill('1000');
  await page.getByLabel('最大高度').fill('1000');
  await start(page);
  await expect(page.locator('.status.complete')).toHaveCount(3);
  await expect(page.locator('.status.over-budget')).toHaveCount(0);
  const saved = page.waitForEvent('download');
  await page.getByRole('button', { name: '下載全部 ZIP' }).click();
  const files = unzipSync(await downloaded(await saved));
  expect(Object.keys(files)).toEqual(['01-photo.webp', '02-transparent.webp', '03-icon.webp']);
  for (const bytes of Object.values(files)) {
    expect(bytes.length).toBeLessThanOrEqual(100_000);
    const meta = inspectImage(bytes);
    expect(meta.width).toBeLessThanOrEqual(1000);
    expect(meta.height).toBeLessThanOrEqual(1000);
    expect(meta.format).toBe('image/webp');
  }
  const alphaFile = files['02-transparent.webp'];
  if (!alphaFile) throw new Error('Missing PNG output');
  expect((await pixels(page, alphaFile)).hasAlpha).toBe(true);
  await page.getByRole('button', { name: '比較前後' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('#original-preview')).toHaveJSProperty('complete', true);
  await expect(page.locator('#output-preview')).toHaveJSProperty('naturalWidth', 1000);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  expect(
    network.every((r) => r.method === 'GET' && new URL(r.url).pathname.includes('/assets/')),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test('unattainable PNG budget is honest, downloadable and does not shrink beyond requested dimensions', async ({
  page,
}) => {
  await page.locator('#file-input').setInputFiles(fixture('transparent.png'));
  await page.locator('#budget').fill('1');
  await page.locator('#unit').selectOption('1024');
  await expect(page.locator('#byte-hint')).toHaveText('1 KiB = 1,024 bytes');
  await start(page);
  await expect(page.locator('.status')).toHaveText('超出預算');
  await expect(page.locator('.result-detail')).toContainText('PNG 無損編碼');
  await expect(page.locator('.result-info')).toContainText('706 × 1442');
  const saved = page.waitForEvent('download');
  await page.getByRole('button', { name: '下載未達標結果' }).click();
  const bytes = await downloaded(await saved);
  expect(bytes.length).toBeGreaterThan(1024);
  expect((await pixels(page, bytes)).hasAlpha).toBe(true);
});

test('transparent JPEG requires explicit consent; consenting produces white background', async ({
  page,
}) => {
  await page.locator('#file-input').setInputFiles(fixture('transparent.png'));
  await page.locator('#format').selectOption('image/jpeg');
  await start(page);
  await expect(page.locator('.status')).toHaveText('無法處理');
  await expect(page.locator('.result-error')).toContainText('JPEG 無法保留');
  await page.getByLabel('允許 JPEG 填白底').check();
  await start(page);
  await expect(page.locator('.result-detail')).toContainText('透明區域已填入白底');
  const saved = page.waitForEvent('download');
  await page.getByRole('button', { name: '下載 ↓', exact: true }).click();
  const result = await pixels(page, await downloaded(await saved));
  expect(result.hasAlpha).toBe(false);
  expect(result.corner.slice(0, 3).every((n) => n >= 250)).toBe(true);
});

test('small original is kept without growth and EXIF rotation is applied to resized output', async ({
  page,
}) => {
  await page
    .locator('#file-input')
    .setInputFiles([fixture('icon.png'), fixture('orientation-6.jpg')]);
  await page.getByLabel('最大寬度').fill('1200');
  await page.getByLabel('最大高度').fill('1200');
  await start(page);
  await expect(page.locator('.result-row').first()).toContainText('保留原檔');
  const saved = page.waitForEvent('download');
  await page.getByRole('button', { name: '下載全部 ZIP' }).click();
  const files = unzipSync(await downloaded(await saved));
  expect(Buffer.from(files['01-icon.png'] ?? [])).toEqual(await readFile(fixture('icon.png')));
  const oriented = files['02-orientation-6.jpg'];
  if (!oriented) throw new Error('Missing orientation output');
  const info = await pixels(page, oriented);
  expect(info.width).toBe(1200);
  expect(info.height).toBe(800);
});

test('rejects animation, corrupt image and oversized headers without silently decoding frame one', async ({
  page,
}) => {
  const png = await readFile(fixture('icon.png'));
  const chunk = Buffer.alloc(20);
  chunk.writeUInt32BE(8);
  chunk.write('acTL', 4);
  chunk.writeUInt32BE(2, 8);
  const apng = Buffer.concat([png.subarray(0, 33), chunk, png.subarray(33)]);
  const bomb = Buffer.from(png);
  bomb.writeUInt32BE(100_000, 16);
  await page.locator('#file-input').setInputFiles([
    { name: 'animation.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') },
    { name: 'animation.png', mimeType: 'image/png', buffer: apng },
    { name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('not an image') },
    { name: 'bomb.png', mimeType: 'image/png', buffer: bomb },
  ]);
  await start(page);
  await expect(page.locator('.status.error')).toHaveCount(4);
  await expect(page.getByRole('button', { name: '下載全部 ZIP' })).toBeDisabled();
  await expect(page.locator('#results')).toContainText('APNG');
  await expect(page.locator('#results')).toContainText('尺寸超出限制');
});

test('batch count and byte limits, cancellation, and clearing during work', async ({
  page,
}, testInfo) => {
  const small = await readFile(fixture('icon.png'));
  await page.locator('#file-input').setInputFiles(
    Array.from({ length: 31 }, (_, i) => ({
      name: `${i}.png`,
      mimeType: 'image/png',
      buffer: small,
    })),
  );
  await expect(page.getByRole('alert')).toContainText('最多 30');
  await expect(page.locator('.result-row')).toHaveCount(0);
  await page
    .locator('#file-input')
    .setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(20_000_001) });
  await expect(page.getByRole('alert')).toContainText('單檔不可超過');
  // Six individually allowed files exceed the aggregate limit before decoding.
  const largePath = testInfo.outputPath('17mb.png');
  await writeFile(largePath, Buffer.alloc(17_000_000));
  await page.locator('#file-input').setInputFiles(Array.from({ length: 6 }, () => largePath));
  await expect(page.getByRole('alert')).toContainText('整批原圖不可超過');
  await page
    .locator('#file-input')
    .setInputFiles(Array.from({ length: 8 }, () => fixture('photo.jpg')));
  await page.locator('#budget').fill('1');
  await page.locator('#start').click();
  await page.getByRole('button', { name: '取消處理', exact: true }).click();
  await expect(page.locator('.status.cancelled').first()).toBeVisible();
  await expect(page.locator('.status.running')).toHaveCount(0);
  await page.locator('#start').click();
  await page.getByRole('button', { name: '清除全部' }).click();
  await expect(page.locator('.result-row')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '開始處理' })).toBeDisabled();
  await expect(page.locator('#empty-state')).toBeVisible();
});

test('mobile layout remains usable and has no horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: /讓圖片，\s*剛剛好。/ })).toBeVisible();
  await page.locator('#file-input').setInputFiles(fixture('icon.png'));
  await start(page);
  await expect(page.getByRole('button', { name: '下載全部 ZIP' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const startBox = await page.locator('#start').boundingBox();
  const resultsBox = await page.locator('#results').boundingBox();
  if (!startBox || !resultsBox) throw new Error('Missing mobile controls');
  expect(startBox.y).toBeLessThan(resultsBox.y);
});
