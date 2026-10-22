import { test, expect } from '@playwright/test';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { proposePropsDocument, parsePropsDocument } from '@sid-tools/core/component-docs';
import { scanProps, storybookPropFixture } from '../helpers/component-fixture';
const upload = (name: string, value: unknown) => ({
  name,
  mimeType: 'application/json',
  buffer: Buffer.from(JSON.stringify(value)),
});
test('real Storybook report supports source navigation, drift review, explicit proposal download and private SPA lifecycle', async ({
  page,
}) => {
  const report = scanProps(storybookPropFixture('Button.tsx.txt')),
    doc = proposePropsDocument(report);
  doc.props = doc.props.filter((p) => p.name !== 'primary');
  doc.props.push({
    name: 'retired',
    type: 'number',
    required: false,
    default: { state: 'none' },
    description: 'Old prop',
  });
  doc.props.find((p) => p.name === 'size')!.default = { state: 'known', value: 'large' };
  doc.props.find((p) => p.name === 'label')!.description =
    '<img src=x onerror=alert(1)> 保留人工說明';
  doc.examples = [
    { name: 'broken', values: { size: 'huge', retired: true } },
    { name: 'callback', values: { label: 'OK', onClick: 'fn' } },
  ];
  await page.goto('tools/component-docs/');
  const requests: string[] = [],
    errors: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  page.on('pageerror', (e) => errors.push(e.message));
  await page.locator('#report-file').setInputFiles(upload('report.json', report));
  await page.locator('#document-file').setInputFiles(upload('document.json', doc));
  await page.locator('#inspect').click();
  await expect(page.locator('#output')).toBeVisible();
  await expect(page.locator('#counts')).toContainText('6 個 Props');
  await expect(page.locator('#example-summary')).toContainText('3 個問題、1 個未知');
  await page.locator('#filter').selectOption('changed');
  await expect(page.locator('#items details')).toHaveCount(1);
  await page.locator('#items summary').click();
  await expect(page.locator('#items')).toContainText('參數預設："medium"');
  await page.getByRole('button', { name: '查看預設值來源' }).click();
  await expect(page.locator('#source-text')).toHaveText("'medium'");
  await expect(page.locator('#source-position')).toContainText(':21:10');
  await page.getByRole('button', { name: '查看 Props 定義' }).click();
  await expect(page.locator('#source-text')).toContainText("size?: 'small' | 'medium' | 'large'");
  await page.locator('#filter').selectOption('all');
  await page.locator('#search').fill('label');
  await page.locator('#items summary').click();
  await expect(page.locator('#items')).toContainText('<img src=x onerror=alert(1)>');
  expect(await page.locator('#items img').count()).toBe(0);
  const download = page.waitForEvent('download');
  await page.locator('#document-download').click();
  const path = await (await download).path();
  expect(path).toBeTruthy();
  const proposed = parsePropsDocument(await readFile(path!, 'utf8'));
  expect(proposed.props.find((p) => p.name === 'label')?.description).toBe(
    doc.props.find((p) => p.name === 'label')?.description,
  );
  expect(proposed.examples).toEqual(doc.examples);
  expect(proposed.props.some((p) => p.name === 'retired')).toBe(false);
  expect(requests.every((url) => new URL(url).pathname.includes('/assets/'))).toBe(true);
  expect(requests.some((url) => url.includes('babel'))).toBe(false);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(errors).toEqual([]);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath('props-mobile.png'), fullPage: true });
  await page.locator('#clear').click();
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#source-text')).toBeEmpty();
  await expect(page.locator('#items')).toBeEmpty();
  await page.evaluate(() => {
    (window as unknown as { propsSpaMarker: number }).propsSpaMarker = 123;
  });
  await page.getByRole('navigation').getByRole('link', { name: '圖片壓縮', exact: true }).click();
  await expect(page.locator('#file-input')).toBeAttached();
  expect(
    await page.evaluate(() => (window as unknown as { propsSpaMarker: number }).propsSpaMarker),
  ).toBe(123);
  await page.goBack();
  await expect(page).toHaveURL(/tools\/component-docs\/$/);
  await expect(page.locator('#output')).toBeHidden();
  expect(
    await page.evaluate(() => (window as unknown as { propsSpaMarker: number }).propsSpaMarker),
  ).toBe(123);
  await page.reload();
  await expect(page.locator('#report-file')).toHaveValue('');
});
test('incomplete sources block destructive proposals; report and example lists paginate and clear cancels pending reads', async ({
  page,
}) => {
  const base = proposePropsDocument(scanProps(storybookPropFixture('Button.tsx.txt'))),
    wrapped = scanProps(storybookPropFixture('WrappedButton.tsx.txt'));
  await page.goto('tools/component-docs/');
  await page.locator('#report-file').setInputFiles(upload('wrapped.json', wrapped));
  await page.locator('#document-file').setInputFiles(upload('old.json', base));
  await page.locator('#inspect').click();
  await expect(page.locator('#coverage')).toContainText('分析不完整');
  await expect(page.locator('#document-download')).toBeDisabled();
  await page.locator('#filter').selectOption('removed');
  await expect(page.locator('#items details')).toHaveCount(0);
  await page.locator('#filter').selectOption('unverified');
  await expect(page.locator('#items details')).toHaveCount(5);
  const dir = await mkdtemp(join(tmpdir(), 'props-browser-'));
  try {
    const file = join(dir, 'Button.tsx');
    await writeFile(
      file,
      `interface Props {${Array.from({ length: 61 }, (_, i) => `p${i}:string;`).join('')}} export const Button=(props:Props)=><div/>;`,
    );
    const report = scanProps(file),
      doc = proposePropsDocument(report);
    doc.examples = Array.from({ length: 2 }, (_, i) => ({ name: `empty-${i}`, values: {} }));
    await page.locator('#clear').click();
    await page.locator('#report-file').setInputFiles(upload('many.json', report));
    await page.locator('#document-file').setInputFiles(upload('many-doc.json', doc));
    await page.locator('#inspect').click();
    await expect(page.locator('#items details')).toHaveCount(50);
    await page.locator('#more').click();
    await expect(page.locator('#items details')).toHaveCount(61);
    await expect(page.locator('#examples p')).toHaveCount(50);
    await page.locator('#examples-more').click();
    await expect(page.locator('#examples p')).toHaveCount(100);
    await page.locator('#examples-more').click();
    await expect(page.locator('#examples p')).toHaveCount(122);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
  await page.evaluate(() => {
    File.prototype.text = async function () {
      await new Promise((r) => setTimeout(r, 100));
      return Blob.prototype.text.call(this);
    };
  });
  await page.locator('#inspect').click();
  await page.locator('#clear').click();
  await page.waitForTimeout(150);
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#items')).toBeEmpty();
  await page.locator('#report-file').setInputFiles(upload('invalid.json', { invalid: true }));
  await page.locator('#inspect').click();
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#output')).toBeHidden();
});
test('actual failed worker load reports failure without falling back to main-thread parsing', async ({
  page,
}) => {
  await page.route('**/*component-docs.worker*', (route) => route.abort());
  await page.goto('tools/component-docs/');
  await page
    .locator('#report-file')
    .setInputFiles(upload('report.json', scanProps(storybookPropFixture('Button.tsx.txt'))));
  await page.locator('#inspect').click();
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#status')).toHaveText('沒有可用結果。');
});
test('download URLs are revoked on clear and when the browser rejects the download action', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL),
      active = new Set<string>();
    URL.createObjectURL = (value) => {
      const url = create(value);
      active.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      active.delete(url);
      revoke(url);
    };
    Object.defineProperty(window, 'propsBlobCount', { get: () => active.size });
  });
  const report = scanProps(storybookPropFixture('Button.tsx.txt'));
  await page.goto('tools/component-docs/');
  await page.locator('#report-file').setInputFiles(upload('report.json', report));
  await page.locator('#inspect').click();
  await expect(page.locator('#output')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.locator('#document-download').click();
  await download;
  await page.locator('#clear').click();
  expect(
    await page.evaluate(() => (window as unknown as { propsBlobCount: number }).propsBlobCount),
  ).toBe(0);
  await page.locator('#report-file').setInputFiles(upload('report.json', report));
  await page.locator('#inspect').click();
  await expect(page.locator('#output')).toBeVisible();
  await page.evaluate(() => {
    HTMLAnchorElement.prototype.click = () => {
      throw new Error('Download unavailable');
    };
  });
  await page.locator('#document-download').click();
  await expect(page.locator('#error')).toContainText('無法匯出');
  expect(
    await page.evaluate(() => (window as unknown as { propsBlobCount: number }).propsBlobCount),
  ).toBe(0);
});
