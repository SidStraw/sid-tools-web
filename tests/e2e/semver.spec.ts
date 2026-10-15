import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { SemverComparison } from '@sid-tools/core/semver';

test('SemVer supplied set compares additions/removals with both reasons and reproducible export, without network/storage', async ({
  page,
}) => {
  await page.goto('tools/semver/');
  await expect(page.locator('#route-loading')).toBeHidden();
  const requests: string[] = [],
    errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (r) => {
    if (/^https?:/.test(r.url()) && !new URL(r.url()).pathname.startsWith('/assets/'))
      requests.push(r.url());
  });
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await expect(page.locator('#status')).toContainText('新增 4、移除 2');
  const row = (version: string) =>
    page.locator('.semver-row').filter({ has: page.getByText(version, { exact: true }) });
  await expect(row('0.2.3')).toContainText('移除匹配');
  await expect(row('0.2.3')).toContainText('不符合 >=0.3.0-beta.1');
  await expect(row('0.3.0-beta.2')).toContainText('新增匹配');
  await expect(row('0.3.0-beta.2')).toContainText('prerelease 已明確納入');
  await expect(row('0.4.0-beta.1')).toContainText('不匹配');
  const download = page.waitForEvent('download');
  await page.locator('#export').click();
  const file = await (await download).path();
  if (!file) throw new Error('Missing export');
  const data = JSON.parse(await readFile(file, 'utf8')) as SemverComparison;
  expect(data.engine).toBe('node-semver 7.7.3');
  expect(data.options).toEqual({ loose: false, includePrerelease: false });
  expect(data.removed).toEqual(['0.2.3', '0.2.9']);
  expect(data.added).toEqual(['0.3.0-beta.1', '0.3.0-beta.2', '0.3.0', '0.3.5']);
  await page.locator('#clear').click();
  await expect(page.locator('#versions')).toHaveValue('');
  await expect(page.locator('#range-a')).toHaveValue('');
  await expect(page.locator('#range-b')).toHaveValue('');
  await expect(page.locator('#output')).toBeHidden();
  await page.locator('#versions').fill(data.input.versions);
  await page.locator('#range-a').fill(data.input.before);
  await page.locator('#range-b').fill(data.input.after);
  await page.locator('#run').click();
  await expect(page.locator('#status')).toContainText('新增 4、移除 2');
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test('SemVer explains exact/caret/tilde/prerelease and rejects invalid versions or syntax without stale guesses', async ({
  page,
}) => {
  await page.goto('tools/semver/');
  await page.locator('#versions').fill('1.2.3 1.2.4 1.3.0 1.3.0-beta.1');
  await page.locator('#range-a').fill('~1.2.3');
  await page.locator('#range-b').fill('^1.2.3');
  await page.locator('#run').click();
  await expect(page.locator('#status')).toContainText('新增 1、移除 0');
  await expect(page.locator('.semver-row').last()).toContainText('prerelease 預設排除');
  await page.locator('#range-b').fill('1.2.3');
  await expect(page.locator('#output')).toBeHidden();
  await page.locator('#run').click();
  await expect(page.locator('#status')).toContainText('新增 0、移除 1');
  await page.locator('#versions').fill('1.2.3 01.2.3');
  await page.locator('#run').click();
  await expect(page.locator('#error')).toContainText('第 2 筆版本無效');
  await expect(page.locator('#output')).toBeHidden();
  await page.locator('#versions').fill('1.2.3');
  await page.locator('#range-b').fill('1.2.3 || latest');
  await page.locator('#run').click();
  await expect(page.locator('#error')).toContainText('範圍 B無效或不支援');
  await page.locator('#range-b').fill('');
  await page.locator('#run').click();
  await expect(page.locator('#error')).toContainText('不可空白');
  await page.locator('#versions').fill('<img src=x onerror=alert(1)>');
  await page.locator('#range-b').fill('*');
  await page.locator('#run').click();
  await expect(page.locator('#error')).toContainText('<img');
  await expect(page.locator('#error img')).toHaveCount(0);
  await expect(page.locator('.semver-guide')).toContainText('不保證實際 API 相容性');
});

test('SemVer rejects empty OR branches instead of silently widening a range and hides stale results', async ({
  page,
}) => {
  await page.goto('tools/semver/');
  await page.locator('#versions').fill('1.2.3 9.0.0');
  await page.locator('#range-a').fill('1.2.3');
  await page.locator('#range-b').fill('1.2.3');
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  for (const range of ['1.2.3 ||', '|| 1.2.3', '1.2.3 || \t || 9.0.0']) {
    await page.locator('#range-b').fill(range);
    await expect(page.locator('#output')).toBeHidden();
    await page.locator('#run').click();
    await expect(page.locator('#error')).toContainText('範圍 B的 || OR 分支不可空白');
    await expect(page.locator('#error')).toContainText('請明寫 * 或 x');
    await expect(page.locator('#status')).toHaveText('未產生結果，請修正輸入。');
    await expect(page.locator('#output')).toBeHidden();
    await expect(page.locator('.semver-row')).toHaveCount(0);
  }
  await page.locator('#range-b').fill('x');
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  await expect(page.locator('#status')).toContainText('新增 1、移除 0');
});

test('SemVer route disposes inputs across SPA navigation and history, and remains readable at narrow widths', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('./');
  await expect(page.locator('#route-loading')).toBeHidden();
  await page.evaluate(() => {
    document.documentElement.dataset.semverSession = 'same';
  });
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'SemVer 範圍', exact: true })
    .click();
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('navigation').getByRole('link', { name: 'Cron 預覽', exact: true }).click();
  await expect(page).toHaveURL(/tools\/cron\/$/);
  await page.goBack();
  await expect(page.locator('#versions')).toHaveValue('');
  await expect(page.locator('#output')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.dataset.semverSession)).toBe('same');
  await page.reload();
  await expect(page.locator('#versions')).toHaveValue('');
});

test('SemVer calculation code waits for run and slow loading cannot resurrect cleared results', async ({
  page,
}) => {
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('.js')) scripts.push(r.url());
  });
  await page.goto('tools/semver/');
  await expect(page.locator('#route-loading')).toBeHidden();
  // Controller and calculation are separate chunks; the latter has the browser engine.
  const controllerScripts = [...scripts];
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/semver-*.js', async (route) => {
    await gate;
    await route.continue();
  });
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await expect(page.locator('#status')).toHaveText('正在比較…');
  await page.locator('#clear').click();
  release();
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#status')).toHaveText('資料已清除。');
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  expect(scripts.length).toBeGreaterThan(controllerScripts.length);
});
