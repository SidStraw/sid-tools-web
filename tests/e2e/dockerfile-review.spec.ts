import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseDockerReport, createDockerReport } from '@sid-tools/core/dockerfile-review';
const upload = (value: unknown) => ({
  name: 'report.json',
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify(value)),
});
test('Dockerfile report preserves reasons, invalidates changed sources and stays private across SPA navigation', async ({
  page,
}, info) => {
  const report = await parseDockerReport(
    readFileSync('tests/fixtures/dockerfile-review/report.json', 'utf8'),
  );
  const requests: string[] = [],
    errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('tools/dockerfile-review/');
  await expect(page.locator('#route-loading')).toBeHidden();
  page.on('request', (request) => {
    if (!new URL(request.url()).pathname.startsWith('/assets/')) requests.push(request.url());
  });
  await page.locator('#report-file').setInputFiles(upload(report));
  await page.locator('#inspect').click();
  await expect(page.locator('#context')).toContainText('Hadolint 2.15.1');
  await expect(page.locator('#items details')).toHaveCount(report.findings.length);
  await page.locator('#items summary').first().click();
  await expect(page.locator('#items')).toContainText('Dockerfile:8:1');
  await page.getByRole('button', { name: '保存理由', exact: true }).click();
  await expect(page.locator('#error')).toContainText('請填寫理由');
  await page.locator('#items textarea').fill('測試保留理由 <script>bad()</script>');
  await page.getByRole('button', { name: '保存理由', exact: true }).click();
  await expect(page.locator('#items summary').first()).toContainText('已註記');
  const pending = page.waitForEvent('download');
  await page.locator('#download').click();
  const download = await pending;
  const path = info.outputPath('review.json');
  await download.saveAs(path);
  const baseline = await parseDockerReport(readFileSync(path, 'utf8'));
  expect(baseline.annotations).toHaveLength(1);
  await page.locator('#baseline-file').setInputFiles(upload(baseline));
  await page.locator('#inspect').click();
  await expect(page.locator('#comparison')).toContainText('來源相同');
  await page.locator('#items summary').first().click();
  await expect(page.locator('#items textarea')).toHaveValue(baseline.annotations[0]!.reason);
  const changed = await createDockerReport(
    report.source.name,
    report.source.text + '# source changed\n',
    report.findings,
  );
  await page.locator('#report-file').setInputFiles(upload(changed));
  await page.locator('#inspect').click();
  await expect(page.locator('#comparison')).toContainText('1 項前次註記失效');
  await expect(page.locator('#counts')).toContainText('0 項註記');
  await page.locator('#filter').selectOption('info');
  await expect(page.locator('#items details')).toHaveCount(
    report.findings.filter((f) => f.level === 'info').length,
  );
  await page.setViewportSize({ width: 320, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('dockerfile-mobile.png'), fullPage: true });
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  await page
    .locator('#report-file')
    .setInputFiles(upload({ ...report, engine: { ...report.engine, version: 'wrong' } }));
  await page.locator('#inspect').click();
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#output')).toBeHidden();
  await page.locator('#report-file').setInputFiles(upload(report));
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('#inspect')!.click();
    document.querySelector<HTMLButtonElement>('#clear')!.click();
  });
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#status')).toHaveText('資料已清除。');
  await page.evaluate(() => {
    document.documentElement.dataset.dockerSession = 'same';
  });
  await page.getByRole('navigation').getByRole('link', { name: 'Cron 預覽', exact: true }).click();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Dockerfile 審查', exact: true })
    .click();
  await expect(page.locator('#route-loading')).toBeHidden();
  await expect(page.locator('#output')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.dataset.dockerSession)).toBe('same');
  expect(errors).toEqual([]);
});
