import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { EnvComparison } from '@sid-tools/core/env-check';

test('env inputs start masked, support keyboard paste/edit and explicit reveal; parsed assignment values stay out of reports/downloads', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('tools/env-check/');
  await expect(page.locator('#route-loading')).toBeHidden();
  const requests: string[] = [],
    errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (
      /^https?:/.test(url.protocol) &&
      (url.origin !== 'http://127.0.0.1:4173' ||
        !url.pathname.startsWith('/assets/') ||
        r.method() !== 'GET')
    )
      requests.push(r.url());
  });
  const secret = 'synthetic-secret-DO-NOT-EXPORT';
  const template = `# private-comment\nTOKEN=template-only-secret\nREQUIRED=placeholder\nEMPTY=placeholder\nDUP=placeholder`;
  const candidate = `TOKEN=${secret}\nEMPTY=""\nDUP=first-private-value\nDUP=second-private-value\nEXTRA=extra-private-value`;
  await expect(page.locator('#reveal')).toHaveAttribute('aria-pressed', 'false');
  for (const id of ['template', 'candidate']) {
    await expect(page.locator(`#${id}`)).toHaveClass('env-masked');
    expect(
      await page
        .locator(`#${id}`)
        .evaluate((input) => getComputedStyle(input).getPropertyValue('-webkit-text-security')),
    ).toBe('disc');
  }
  await page.locator('#template').fill(template);
  await page.evaluate((text) => navigator.clipboard.writeText(text), candidate);
  await page.locator('#candidate').focus();
  await page.keyboard.press('ControlOrMeta+V');
  await expect(page.locator('#candidate')).toHaveValue(candidate);
  await page.keyboard.press('End');
  await page.keyboard.type('x');
  await expect(page.locator('#candidate')).toHaveValue(candidate + 'x');
  await page.locator('#reveal').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#reveal')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#candidate')).not.toHaveClass('env-masked');
  await page.keyboard.press('Enter');
  await expect(page.locator('#candidate')).toHaveClass('env-masked');
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  for (const text of [
    secret,
    'template-only-secret',
    'private-comment',
    'first-private-value',
    'second-private-value',
    'extra-private-value',
  ])
    await expect(page.locator('#output')).not.toContainText(text);
  const missing = page.locator('.env-finding[data-code=missing]');
  await expect(missing).toContainText('REQUIRED');
  await expect(missing).toContainText('範本 第 3 行');
  await missing.getByRole('button', { name: '範本 第 3 行' }).click();
  await expect(page.locator('#template')).toBeFocused();
  expect(
    await page
      .locator('#template')
      .evaluate((input) => (input as HTMLTextAreaElement).selectionStart),
  ).toBe(template.indexOf('REQUIRED='));
  await expect(page.locator('.env-finding[data-code=extra]')).toContainText('待檢查檔 第 5 行');
  await expect(page.locator('.env-finding[data-code=duplicate]')).toContainText('待檢查檔 第 4 行');
  await expect(page.locator('.env-finding[data-code=duplicate]')).toContainText('首次出現行：3');
  await expect(page.locator('.env-finding[data-code=empty]')).toContainText('待檢查檔 第 2 行');
  const download = page.waitForEvent('download');
  await page.locator('#export').click();
  const file = await (await download).path();
  if (!file) throw new Error('Missing download');
  const raw = await readFile(file, 'utf8');
  const data = JSON.parse(raw) as Pick<EnvComparison, 'summary' | 'keys'>;
  expect(data.summary).toMatchObject({ missing: 1, extra: 1, duplicate: 1, empty: 1, errors: 0 });
  expect(data.keys.find((key) => key.key === 'DUP')?.candidateLines).toEqual([3, 4]);
  for (const value of [
    secret,
    'template-only-secret',
    'private-comment',
    'first-private-value',
    'second-private-value',
    'extra-private-value',
  ])
    expect(raw).not.toContain(value);
  expect(raw).toContain('REQUIRED');
  expect(raw).toContain('locationRule');
  expect(
    await page.evaluate(() => [
      localStorage.length,
      sessionStorage.length,
      location.search,
      location.hash,
    ]),
  ).toEqual([0, 0, '', '']);
  await page.locator('#candidate').fill('TOKEN=edited');
  await expect(page.locator('#output')).toBeHidden();
  await page.locator('#reveal').click();
  await page.locator('#clear').click();
  await expect(page.locator('#template')).toHaveValue('');
  await expect(page.locator('#candidate')).toHaveValue('');
  await expect(page.locator('#reveal')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#candidate')).toHaveClass('env-masked');
  await expect(page.locator('#output')).toBeHidden();
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test('unquoted synthetic PEM is incomplete and its body is absent from findings, keys and exported JSON', async ({
  page,
}) => {
  await page.goto('tools/env-check/');
  await page.locator('#template').fill('APP=\nPRIVATE_KEY=');
  await page
    .locator('#candidate')
    .fill(
      'APP=ok\nPRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nSyntheticBodyNoEquals\nSyntheticFragmentAbc123=\n-----END PRIVATE KEY-----',
    );
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  await expect(page.locator('#result')).toContainText('暫定結果');
  const issue = page.locator('.env-finding[data-code=unsupported-syntax]');
  await expect(issue).toContainText('PRIVATE_KEY');
  await expect(issue).toContainText('多行 PEM／PGP／OpenSSH 必須加引號');
  await expect(page.locator('#candidate')).toHaveClass('env-masked');
  await expect(page.locator('#reveal')).toHaveAttribute('aria-pressed', 'false');
  await page.locator('.env-key-inventory summary').click();
  await expect(page.locator('.env-key-row')).toHaveCount(2);
  for (const fragment of ['SyntheticBodyNoEquals', 'SyntheticFragmentAbc123']) {
    await expect(page.locator('#output')).not.toContainText(fragment);
    await expect(page.locator('.env-key-inventory')).not.toContainText(fragment);
  }
  const download = page.waitForEvent('download');
  await page.locator('#export').click();
  const file = await (await download).path();
  if (!file) throw new Error('Missing PEM report download');
  const raw = await readFile(file, 'utf8');
  const data = JSON.parse(raw) as Pick<EnvComparison, 'summary' | 'keys'>;
  expect(data.summary.complete).toBe(false);
  expect(data.keys.map((key) => key.key)).toEqual(['APP', 'PRIVATE_KEY']);
  for (const fragment of [
    'SyntheticBodyNoEquals',
    'SyntheticFragmentAbc123',
    '-----BEGIN PRIVATE KEY-----',
    '-----END PRIVATE KEY-----',
  ])
    expect(raw).not.toContain(fragment);
  await expect(page.locator('.env-guide')).toContainText('分享報告前請檢查');
});

test('all four env examples are reproducible and unsupported syntax stays provisional without executing input', async ({
  page,
}) => {
  await page.goto('tools/env-check/');
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await expect(page.locator('#result')).toContainText('未發現問題');
  await page.locator('.env-key-inventory summary').click();
  await expect(page.locator('.env-key-row')).toHaveCount(4);
  await page.locator('#demo-missing').click();
  await page.locator('#run').click();
  await expect(page.locator('.env-finding[data-code=missing]')).toContainText('API_TOKEN');
  await expect(page.locator('.env-finding[data-code=missing]')).toContainText('範本 第 4 行');
  await expect(page.locator('.env-finding[data-code=empty]')).toContainText('API_URL');
  await expect(page.locator('.env-finding[data-code=extra]')).toContainText('EXTRA_FLAG');
  await page.locator('#demo-duplicate').click();
  await page.locator('#run').click();
  await expect(page.locator('.env-finding[data-code=duplicate]')).toContainText('APP_NAME');
  await expect(page.locator('.env-finding[data-code=duplicate]')).toContainText('待檢查檔 第 7 行');
  await page.locator('#demo-malformed').click();
  await page.locator('#run').click();
  await expect(page.locator('#result')).toContainText('暫定結果');
  await expect(page.locator('.env-finding[data-code=unsupported-interpolation]')).toContainText(
    '待檢查檔 第 2 行',
  );
  await expect(page.locator('.env-finding[data-code=trailing-content]')).toContainText(
    '待檢查檔 第 3 行',
  );
  await expect(page.locator('.env-finding[data-code=unterminated-quote]')).toContainText(
    '待檢查檔 第 4–5 行',
  );
  await page
    .locator('#candidate')
    .fill(
      'API_TOKEN=$(window.envPwned=true)\nAPI_URL="<img src=x onerror=alert(1)>"\nAPP_NAME=demo\nNOTES=ready',
    );
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  expect(await page.evaluate(() => 'envPwned' in window)).toBe(false);
  await expect(page.locator('#output img')).toHaveCount(0);
  await expect(page.locator('#output')).not.toContainText('<img');
  await expect(page.locator('.env-guide')).toContainText('不替換變數、不執行任何輸入');
  await expect(page.locator('.env-guide')).toContainText('空值，不等於少了一個鍵');
});

test('env resource limits do not invent missing keys and findings are paginated without losing report entries', async ({
  page,
}) => {
  await page.goto('tools/env-check/');
  await page.locator('#run').click();
  await expect(page.locator('#result')).toContainText('範本沒有可辨識的鍵');
  await expect(page.locator('#result')).not.toContainText('未發現問題');
  await page.locator('#template').fill('REQUIRED=placeholder');
  await page.locator('#candidate').fill('A=' + 'x'.repeat(10_001));
  await page.locator('#run').click();
  await expect(page.locator('#result')).toContainText('未進行缺漏／多餘比對');
  await expect(page.locator('.env-finding[data-code=line-length-limit]')).toContainText(
    '待檢查檔 第 1 行',
  );
  await expect(page.locator('.env-finding[data-code=missing]')).toHaveCount(0);
  const text = Array.from({ length: 105 }, (_, i) => `KEY_${i}=`).join('\n');
  await page.locator('#template').fill(text);
  await page.locator('#candidate').fill(text);
  await page.locator('#run').click();
  const findings = page.getByRole('region', { name: '問題與原始位置', exact: true });
  await expect(findings.locator('.env-finding')).toHaveCount(100);
  await findings.getByRole('button', { name: '下一頁' }).click();
  await expect(findings).toContainText('101–200 / 210 筆');
  await findings.getByRole('button', { name: '下一頁' }).click();
  await expect(findings.locator('.env-finding')).toHaveCount(10);
});

test('env page remains one responsive SPA, disposes inputs and reveal state, and ignores cleared slow computation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('./');
  await expect(page.locator('#route-loading')).toBeHidden();
  await page.evaluate(() => {
    document.documentElement.dataset.envSession = 'same';
  });
  await page.getByRole('navigation').getByRole('link', { name: '.env 預檢', exact: true }).click();
  await expect(page).toHaveURL(/tools\/env-check\/$/);
  await expect(page.locator('#route-loading')).toBeHidden();
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/env-check-*.js', async (route) => {
    await gate;
    await route.continue();
  });
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await expect(page.locator('#status')).toHaveText('正在檢查…');
  await page.locator('#clear').click();
  release();
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#candidate')).toHaveValue('');
  await page.locator('#demo-missing').click();
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('#reveal').click();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'SemVer 範圍', exact: true })
    .click();
  await expect(page).toHaveURL(/tools\/semver\/$/);
  await page.goBack();
  await expect(page.locator('#candidate')).toHaveValue('');
  await expect(page.locator('#reveal')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#output')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.dataset.envSession)).toBe('same');
  await page.reload();
  await expect(page.locator('#template')).toHaveValue('');
});
