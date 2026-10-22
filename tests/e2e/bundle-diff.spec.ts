import { test, expect } from '@playwright/test';
import { buildBundlePair } from '../helpers/bundle-build';

test('real build pair compares privately with source drilldown, incompatibility, export, invalidation and SPA cleanup', async ({
  page,
}, testInfo) => {
  const pair = await buildBundlePair();
  try {
    const errors: string[] = [],
      requests: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('tools/bundle-diff/');
    await expect(page.locator('#route-loading')).toBeHidden();
    page.on('request', (request) => {
      if (!new URL(request.url()).pathname.startsWith('/assets/')) requests.push(request.url());
    });
    const input = (value: unknown) => ({
      name: 'report.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(value)),
    });
    await page.locator('#base-file').setInputFiles(input(pair.before));
    await page.locator('#candidate-file').setInputFiles(input(pair.after));
    await page.locator('#budget').fill('0');
    await page.locator('#compare').click();
    await expect(page.locator('#comparability')).toHaveText('已記錄的量測條件一致，可比較。');
    await expect(page.locator('#budget-result')).toContainText('exceeded');
    await expect(page.locator('#totals')).toContainText('brotli');
    await page.locator('#items summary').first().click();
    await expect(page.locator('#items')).toContainText('SHA256');
    await page.locator('#group').selectOption('modules');
    await page.locator('#search').fill('main.js');
    await expect(page.locator('#count')).toContainText('1 筆符合');
    await page.locator('#items summary').click();
    await expect(page.locator('#items')).toContainText('Candidate chunks');
    await page.locator('#group').selectOption('packages');
    await page.locator('#search').fill('sample-package');
    await expect(page.locator('#items')).toContainText('sample-package');
    const pending = page.waitForEvent('download');
    await page.locator('#download').click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe('bundle-comparison.json');
    await download.saveAs(testInfo.outputPath('comparison.json'));
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
    expect(requests).toEqual([]);
    await page.setViewportSize({ width: 320, height: 780 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath('bundle-mobile.png'), fullPage: true });
    await page.locator('#candidate-file').setInputFiles(input({ ...pair.after, environment: {} }));
    await expect(page.locator('#output')).toBeHidden();
    await page.locator('#compare').click();
    await expect(page.locator('#comparability')).toContainText('不可直接比較');
    await expect(page.locator('#budget-result')).toContainText('not-evaluated');
    await page.locator('#candidate-file').setInputFiles(input({ invalid: true }));
    await page.locator('#compare').click();
    await expect(page.locator('#error')).toBeVisible();
    await expect(page.locator('#output')).toBeHidden();
    await expect(page.locator('#download')).toBeDisabled();
    await page.locator('#clear').click();
    await expect(page.locator('#base-file')).toHaveValue('');
    await expect(page.locator('#environment')).toBeEmpty();
    await expect(page.locator('#totals')).toBeEmpty();
    await page.locator('#base-file').setInputFiles(input(pair.before));
    await page.locator('#candidate-file').setInputFiles(input(pair.after));
    await page.locator('#compare').click();
    await expect(page.locator('#output')).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.dataset.bundleSession = 'same';
    });
    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'Cron 預覽', exact: true })
      .click();
    await expect(page).toHaveURL(/tools\/cron\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/tools\/bundle-diff\/$/);
    await expect(page.locator('#output')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.dataset.bundleSession)).toBe('same');
    expect(errors).toEqual([]);
  } finally {
    await pair.cleanup();
  }
});
