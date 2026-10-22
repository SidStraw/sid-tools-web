import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

test('real CLI report loads privately, finds workspace paths, handles invalid input and resets on SPA navigation', async ({
  page,
}) => {
  const report = execFileSync(
    process.execPath,
    [resolve('apps/dependency-graph/dist/cli.mjs'), '.'],
    { encoding: 'utf8' },
  );
  const requests: string[] = [],
    errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('tools/dependency-graph/');
  await expect(page.locator('#route-loading')).toBeHidden();
  page.on('request', (request) => {
    if (!new URL(request.url()).pathname.startsWith('/assets/')) requests.push(request.url());
  });
  await page.locator('#report-file').setInputFiles({
    name: 'report.json',
    mimeType: 'application/json',
    buffer: Buffer.from(report),
  });
  await expect(page.locator('#status')).toContainText('0 則診斷');
  await page.locator('#query').fill('yaml@2.9.1');
  await page.locator('#node').selectOption({ label: 'yaml@2.9.1' });
  await expect(page.locator('#detail')).toContainText('間接');
  await page.locator('#detail summary').first().click();
  await expect(page.locator('#detail')).toContainText('pnpm-lock.yaml:document-2:line-');
  // A new root devDependency can legitimately become the first shortest path.
  await expect(page.locator('#detail')).toContainText(
    /package\.json#\/(?:devDependencies|dependencies)\//,
  );
  await expect(page.locator('#summary')).toContainText('路徑已隱藏');
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(requests).toEqual([]);
  await page.locator('#report-file').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"format":"bad"}'),
  });
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#output')).toBeHidden();
  await page.locator('#demo').click();
  await page.locator('#output > details > summary').click();
  await expect(page.locator('#variants')).toContainText('單一版本 1.0.0');
  await expect(page.locator('#variants')).toContainText('多版本 1.0.0, 2.0.0');
  await page.setViewportSize({ width: 320, height: 760 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => {
    document.documentElement.dataset.graphSession = 'same';
  });
  await page.getByRole('navigation').getByRole('link', { name: 'Cron 預覽', exact: true }).click();
  await expect(page).toHaveURL(/tools\/cron\/$/);
  await expect(page.locator('#route-loading')).toBeHidden();
  await page.goBack();
  await expect(page).toHaveURL(/tools\/dependency-graph\/$/);
  await expect(page.locator('#output')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.dataset.graphSession)).toBe('same');
  await page.reload();
  await expect(page.locator('#output')).toBeHidden();
  expect(errors).toEqual([]);
});
