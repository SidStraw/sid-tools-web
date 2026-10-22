import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { unusedFixture } from '../helpers/unused-fixture';

test('real Knip report supports reasoned acceptance, baseline reload, changed sources, incompatible conditions and private SPA lifecycle', async ({
  page,
}, testInfo) => {
  const fixture = unusedFixture();
  try {
    for (let i = 0; i < 60; i++)
      writeFileSync(join(fixture.root, `src/unused-${i}.ts`), `console.log(${i});\n`);
    const report = fixture.scan(),
      errors: string[] = [],
      requests: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('tools/unused-review/');
    await expect(page.locator('#route-loading')).toBeHidden();
    page.on('request', (request) => {
      if (!new URL(request.url()).pathname.startsWith('/assets/')) requests.push(request.url());
    });
    const upload = (value: unknown) => ({
      name: 'report.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(value)),
    });
    await page.locator('#report-file').setInputFiles(upload(report));
    await page.locator('#inspect').click();
    await expect(page.locator('#context')).toContainText('Knip 6.42.1');
    await expect(page.locator('#items details')).toHaveCount(50);
    await page.locator('#more').click();
    await expect(page.locator('#items details')).toHaveCount(report.findings.length);
    await page.locator('#search').fill('unusedExport');
    await expect(page.locator('#items details')).toHaveCount(1);
    await page.locator('#items summary').click();
    await expect(page.locator('#items')).toContainText('src/used.ts:2:');
    await expect(page.locator('#items')).toContainText('SHA256');
    await page.getByRole('button', { name: '接受並保留理由', exact: true }).click();
    await expect(page.locator('#error')).toContainText('請填寫接受理由');
    await page.locator('#items textarea').fill('保留作為下一版公開介面，待 API 審查。');
    await page.getByRole('button', { name: '接受並保留理由', exact: true }).click();
    await expect(page.locator('#items summary')).toContainText('已接受');
    const pending = page.waitForEvent('download');
    await page.locator('#baseline-download').click();
    const download = await pending;
    const path = testInfo.outputPath('baseline.json');
    await download.saveAs(path);
    const baseline = JSON.parse(readFileSync(path, 'utf8'));
    expect(baseline.accepted).toHaveLength(1);
    expect(baseline.accepted[0].reason).toContain('公開介面');
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
    expect(requests).toEqual([]);
    await page.locator('#clear').click();
    await expect(page.locator('#settings')).toBeEmpty();
    await page.locator('#report-file').setInputFiles(upload(report));
    await page.locator('#baseline-file').setInputFiles(upload(baseline));
    await page.locator('#inspect').click();
    await expect(page.locator('#compatibility')).toContainText('基準條件一致');
    await page.locator('#filter').selectOption('accepted');
    await expect(page.locator('#items details')).toHaveCount(1);
    await page.locator('#items summary').click();
    await expect(page.locator('#items textarea')).toHaveValue(
      '保留作為下一版公開介面，待 API 審查。',
    );
    await page.getByRole('button', { name: '撤銷接受', exact: true }).click();
    await expect(page.locator('#items details')).toHaveCount(0);
    await page.locator('#filter').selectOption('all');
    writeFileSync(
      join(fixture.root, 'src/used.ts'),
      "export const used = 3;\nexport const unusedExport = 'changed source';\n",
    );
    const changed = fixture.scan();
    await page.locator('#report-file').setInputFiles(upload(changed));
    await expect(page.locator('#output')).toBeHidden();
    await page.locator('#inspect').click();
    await page.locator('#filter').selectOption('changed');
    await expect(page.locator('#items summary')).toContainText('來源已改變');
    await page.setViewportSize({ width: 320, height: 780 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath('unused-mobile.png'), fullPage: true });
    await page
      .locator('#report-file')
      .setInputFiles(upload({ ...changed, scope: 'different-repo' }));
    await page.locator('#inspect').click();
    await expect(page.locator('#compatibility')).toContainText('基準不相容');
    await page.locator('#filter').selectOption('accepted');
    await expect(page.locator('#items details')).toHaveCount(0);
    await page.locator('#report-file').setInputFiles(upload({ issues: [] }));
    await page.locator('#inspect').click();
    await expect(page.locator('#error')).toBeVisible();
    await expect(page.locator('#output')).toBeHidden();
    await page.locator('#clear').click();
    await page.locator('#report-file').setInputFiles(upload(report));
    await page.evaluate(() => {
      document.querySelector<HTMLButtonElement>('#inspect')!.click();
      document.querySelector<HTMLButtonElement>('#clear')!.click();
    });
    await expect(page.locator('#status')).toHaveText('資料已清除。');
    await expect(page.locator('#output')).toBeHidden();
    await page.locator('#report-file').setInputFiles(upload(report));
    await page.locator('#inspect').click();
    await expect(page.locator('#output')).toBeVisible();
    await page.evaluate(() => {
      document.documentElement.dataset.unusedSession = 'same';
    });
    await page
      .getByRole('navigation')
      .getByRole('link', { name: 'Cron 預覽', exact: true })
      .click();
    await expect(page).toHaveURL(/tools\/cron\/$/);
    await page.goBack();
    await expect(page).toHaveURL(/tools\/unused-review\/$/);
    await expect(page.locator('#output')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.dataset.unusedSession)).toBe('same');
    await page.reload();
    await expect(page.locator('#report-file')).toHaveValue('');
    expect(errors).toEqual([]);
  } finally {
    fixture.cleanup();
  }
});
