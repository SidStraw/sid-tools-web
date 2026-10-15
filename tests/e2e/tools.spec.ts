import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const sample = (name: string) =>
  resolve('research/competitor-validation-2026-10-14/samples/lighthouse', name);
test('all four tools are reachable from the menu and nested URLs survive reload on mobile', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  for (const [label, path] of [
    ['Lighthouse 比較', 'lighthouse'],
    ['JSON 差異', 'json-diff'],
    ['Cron 預覽', 'cron'],
  ] as const) {
    await page
      .getByRole('navigation', { name: '工具選單' })
      .getByRole('link', { name: label, exact: true })
      .click();
    await expect(page).toHaveURL(new RegExp(`/tools/${path}/$`));
    await page.reload();
    await expect(page.getByRole('link', { name: label, exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  await page.getByRole('navigation').getByRole('link', { name: '圖片壓縮', exact: true }).click();
  await expect(page.locator('#file-input')).toBeAttached();
});
test('real Lighthouse files compare, export conditions and deltas, and inputs clear without uploads', async ({
  page,
}) => {
  await page.goto('tools/lighthouse/');
  const errors: string[] = [],
    requests: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (/^https?:/.test(r.url()) && !new URL(r.url()).pathname.includes('/assets/'))
      requests.push(r.url());
  });
  await page.locator('#before-file').setInputFiles(sample('live-chrome-docs-mobile-a.json'));
  await page.locator('#after-file').setInputFiles(sample('live-chrome-docs-mobile-b.json'));
  await expect(page.locator('#before')).not.toHaveValue('');
  await expect(page.locator('#after')).not.toHaveValue('');
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Performance' })).toContainText('69');
  const download = page.waitForEvent('download');
  await page.locator('#export').click();
  const file = await (await download).path();
  if (!file) throw new Error('Missing download');
  const result = JSON.parse(await readFile(file, 'utf8')) as {
    categories: { id: string; delta: number }[];
    conditions: { before: { formFactor: string } };
  };
  expect(result.categories.find((c) => c.id === 'performance')?.delta).toBe(-2);
  expect(result.conditions.before.formFactor).toBe('mobile');
  await page.locator('#after-file').setInputFiles(sample('live-chrome-docs-desktop.json'));
  await expect(page.locator('#after-name')).toContainText('desktop');
  await page.locator('#run').click();
  await expect(page.locator('#result')).toContainText('formFactor 不同');
  await page.locator('#clear').click();
  await expect(page.locator('#before')).toHaveValue('');
  await expect(page.locator('#output')).toBeHidden();
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
test('JSON diff preserves unsafe integers, previews ignored paths, exports raw numbers and invalidates edited results', async ({
  page,
}) => {
  await page.goto('tools/json-diff/');
  await page.locator('#before').fill('{"id":9007199254740992,"meta":{"t":1},"flag":true}');
  await page.locator('#after').fill('{"flag":"true","id":9007199254740993,"meta":{"t":2}}');
  await page.locator('#ignore').fill('/meta/t');
  await page.locator('#run').click();
  await expect(page.locator('#result')).toContainText('2 筆差異');
  await expect(page.locator('#result')).toContainText('/meta/t');
  await expect(page.locator('tbody')).toContainText('9007199254740993');
  await expect(page.getByRole('row').filter({ hasText: '/flag' })).toContainText('"true"');
  const download = page.waitForEvent('download');
  await page.locator('#export').click();
  const file = await (await download).path();
  if (!file) throw new Error('Missing export');
  const raw = await readFile(file, 'utf8');
  expect(raw).toContain('"after": 9007199254740993');
  expect(raw).toContain('"/meta/t"');
  await page.locator('#before').fill('{');
  await expect(page.locator('#output')).toBeHidden();
  await page.locator('#run').click();
  await expect(page.locator('#error')).toContainText('左側 JSON');
  await page.locator('#clear').click();
  await expect(page.locator('#ignore')).toHaveValue('');
});
test('JSON ID conflicts remain visible and user HTML is rendered as text', async ({ page }) => {
  await page.goto('tools/json-diff/');
  await page.locator('#before').fill('[{"id":1},{"id":1}]');
  await page.locator('#after').fill('[{"id":1}]');
  await page.locator('#array-key').fill('id');
  await page.locator('#run').click();
  await expect(page.locator('#result')).toContainText('結果不完整');
  await expect(page.locator('#result')).toContainText('重複');
  await page.locator('#before').fill('{}');
  await page.locator('#after').fill('{"html":"<img src=x onerror=alert(1)>"}');
  await page.locator('#run').click();
  await expect(page.locator('tbody')).toContainText('<img src=x onerror=alert(1)>');
  await expect(page.locator('#result img')).toHaveCount(0);
});
test('Cron DST preview is a real worker calculation with downloadable and copyable zone context', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('tools/cron/');
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await expect(page.locator('tbody tr').nth(1)).toContainText('2026-03-08 03:30:00');
  await expect(page.locator('tbody tr').nth(1)).toContainText('2026-03-08 15:30:00');
  await page.locator('#copy').click();
  await expect(page.locator('#status')).toContainText('已複製');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('America/New_York');
  const download = page.waitForEvent('download');
  await page.locator('#export').click();
  const file = await (await download).path();
  if (!file) throw new Error('Missing export');
  expect(await readFile(file, 'utf8')).toContain('2026-03-08T07:30:00.000Z');
  await page.locator('#expression').fill('0 0 0 * * *');
  await expect(page.locator('#output')).toBeHidden();
  await page.locator('#run').click();
  await expect(page.locator('#error')).toContainText('五欄');
  await page.locator('#clear').click();
  await expect(page.locator('#expression')).toHaveValue('');
});
test('new tool demos run on mobile without horizontal page overflow or network submission', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  for (const path of ['lighthouse', 'json-diff', 'cron']) {
    await page.goto(`tools/${path}/`);
    const requests: string[] = [];
    const track = (r: import('@playwright/test').Request) => {
      if (/^https?:/.test(r.url()) && !new URL(r.url()).pathname.includes('/assets/'))
        requests.push(r.url());
    };
    page.on('request', track);
    await page.locator('#demo').click();
    await page.locator('#run').click();
    await expect(page.locator('#output')).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    expect(requests).toEqual([]);
    page.off('request', track);
    await page.reload();
    await expect(page.locator('#output')).toBeHidden();
    if (path !== 'cron') await expect(page.locator('#before')).toHaveValue('');
  }
  expect(errors).toEqual([]);
});

test('SSG serves full route content without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const [path, title] of [
    ['', '讓圖片'],
    ['tools/lighthouse/', '先看條件'],
    ['tools/json-diff/', '讓變動'],
    ['tools/cron/', '下一次'],
  ] as const) {
    const response = await page.goto(`http://127.0.0.1:4173/${path}`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toContainText(title);
    await expect(page.getByRole('navigation').getByRole('link')).toHaveCount(4);
  }
  await context.close();
});
test('one SPA preserves its document across menu, back and forward; route changes discard input', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.locator('#route-loading')).toBeHidden();
  const documents: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'document') documents.push(r.url());
  });
  await page.evaluate(() => {
    document.documentElement.dataset.testSession = 'same-document';
  });
  await page.getByRole('link', { name: 'JSON 差異', exact: true }).click();
  await expect(page).toHaveURL(/tools\/json-diff\/$/);
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  await page.goBack();
  await expect(page.locator('#file-input')).toBeAttached();
  await page.goForward();
  await expect(page.locator('#before')).toHaveValue('');
  await expect(page.locator('#output')).toBeHidden();
  await page.getByRole('link', { name: '圖片壓縮', exact: true }).click();
  await page.locator('#file-input').setInputFiles(resolve('tests/fixtures/photo.jpg'));
  await page.locator('#start').click();
  await page.getByRole('link', { name: 'Cron 預覽', exact: true }).click();
  await expect(page).toHaveURL(/tools\/cron\/$/);
  await page.getByRole('link', { name: '圖片壓縮', exact: true }).click();
  await expect(page.locator('#file-count')).toHaveText('還沒有圖片');
  expect(await page.evaluate(() => document.documentElement.dataset.testSession)).toBe(
    'same-document',
  );
  expect(documents).toEqual([]);
});
test('initial route loads only its code; calculation dependencies wait for Run', async ({
  page,
}) => {
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('.js')) scripts.push(r.url());
  });
  await page.goto('./');
  await expect(page.locator('#route-loading')).toBeHidden();
  expect(
    scripts.some((url) => /\/(cron|json-diff|lighthouse|tools\.worker|image\.worker)-/.test(url)),
  ).toBe(false);
  await page.getByRole('link', { name: 'Cron 預覽', exact: true }).click();
  await expect(page).toHaveURL(/tools\/cron\/$/);
  expect(scripts.some((url) => /tools\.worker-/.test(url))).toBe(false);
  await page.locator('#run').click();
  await expect(page.locator('tbody tr')).toHaveCount(10);
  expect(scripts.some((url) => /tools\.worker-/.test(url))).toBe(true);
  expect(scripts.some((url) => /\/(json-diff|lighthouse|image\.worker)-/.test(url))).toBe(false);
});
test('failed lazy route reports loading failure and can retry', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#route-loading')).toBeHidden();
  await page.route('**/assets/json-diff-*.js', (route) => route.abort(), { times: 1 });
  await page.getByRole('link', { name: 'JSON 差異', exact: true }).click();
  await expect(page.locator('#route-message')).toContainText('載入失敗');
  await expect(page).not.toHaveURL(/tools\/json-diff/);
  await page.locator('#route-retry').click();
  await expect(page).toHaveURL(/tools\/json-diff\/$/);
  await expect(page.locator('#route-loading')).toBeHidden();
});
test('a slower earlier route cannot overwrite the most recent selection', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#route-loading')).toBeHidden();
  let release: () => void = () => {};
  const gate = new Promise<void>((resolveGate) => {
    release = resolveGate;
  });
  await page.route('**/assets/lighthouse-*.js', async (route) => {
    await gate;
    await route.continue();
  });
  await page.getByRole('link', { name: 'Lighthouse 比較', exact: true }).click();
  await expect(page.locator('#route-message')).toContainText('正在載入Lighthouse');
  await page.getByRole('link', { name: 'Cron 預覽', exact: true }).click();
  await expect(page).toHaveURL(/tools\/cron\/$/);
  release();
  await page.locator('#run').click();
  await expect(page.locator('tbody tr')).toHaveCount(10);
  await expect(page).toHaveURL(/tools\/cron\/$/);
  await expect(page.locator('h1')).toContainText('下一次');
});

test('Cloudflare root routing canonicalizes tools, exposes the sitemap, and returns real 404s', async ({
  page,
  request,
}) => {
  for (const path of ['', 'tools/lighthouse/', 'tools/json-diff/', 'tools/cron/']) {
    const response = await request.get('/' + path);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain(`rel="canonical" href="https://tools.sid.tw/${path}"`);
  }
  const redirect = await request.get('/tools/cron', { maxRedirects: 0 });
  expect(redirect.status()).toBeGreaterThanOrEqual(300);
  expect(redirect.status()).toBeLessThan(400);
  expect(redirect.headers().location).toMatch(/\/tools\/cron\/$/);
  expect((await request.get('/not-a-real-tool/')).status()).toBe(404);
  expect((await request.get('/assets/missing-deploy-chunk.js')).status()).toBe(404);
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml.match(/<loc>/g)).toHaveLength(4);
  expect(xml).not.toContain('github.io');
  expect(await (await request.get('/robots.txt')).text()).toContain(
    'Sitemap: https://tools.sid.tw/sitemap.xml',
  );
  await page.goto('./');
  await expect(page.locator('#route-loading')).toBeHidden();
  await page.getByRole('link', { name: 'Cron 預覽', exact: true }).click();
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute(
    'href',
    'https://tools.sid.tw/tools/cron/',
  );
});
