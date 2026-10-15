import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { SitemapXmlInspection } from '../../apps/web/src/pages/sitemap-xml';

const ns = 'http://www.sitemaps.org/schemas/sitemap/0.9';
const wrap = (content: string) => `<urlset xmlns="${ns}">${content}</urlset>`;
async function inspect(page: Page, xml: string) {
  await page.locator('#xml').fill(xml);
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
}
async function exported(
  page: Page,
): Promise<SitemapXmlInspection & { notice: string; format: string }> {
  const pending = page.waitForEvent('download');
  await page.locator('#export').click();
  const path = await (await pending).path();
  if (!path) throw new Error('Missing report download');
  return JSON.parse(await readFile(path, 'utf8')) as SitemapXmlInspection & {
    notice: string;
    format: string;
  };
}

test('static Sitemap checks find original duplicate/date/host/missing/invalid entries and navigate exact field sources', async ({
  page,
}) => {
  await page.goto('tools/sitemap/');
  await page.locator('#demo-issues').click();
  await page.locator('#run').click();
  await expect(page.locator('#entries .sitemap-entry')).toHaveCount(5);
  for (const code of [
    'duplicate-loc',
    'invalid-lastmod',
    'mixed-host',
    'missing-loc',
    'invalid-loc',
  ])
    await expect(page.locator(`.sitemap-diagnostic[data-code=${code}]`)).toBeVisible();
  const source = page.locator('.sitemap-diagnostic[data-code=invalid-lastmod] button');
  await expect(source).toContainText('/urlset/url[1]/lastmod · 第 2 行');
  await source.click();
  await expect(page.locator('#xml')).toBeFocused();
  expect(
    await page.locator('#xml').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toBe('<lastmod>');
  await page.locator('#entry-filter').selectOption('duplicates');
  await expect(page.locator('#entries .sitemap-entry')).toHaveCount(1);
  await expect(page.locator('#entries')).toContainText('首次出現於原始第 1 條');
  await page.locator('#entry-filter').selectOption('all');
  await page.locator('#search').fill('other.test');
  await expect(page.locator('#entries .sitemap-entry')).toHaveCount(1);
  const data = await exported(page);
  expect(data).toMatchObject({
    format: 'sid-tools/sitemap-static/v1',
    valid: false,
    complete: false,
    indexingStatus: 'not-checked',
  });
  expect(data.report?.entries).toHaveLength(5);
  expect(data.report?.diagnostics.find((issue) => issue.code === 'duplicate-loc')).toMatchObject({
    ordinal: 2,
    relatedOrdinal: 1,
  });
  expect(data.sources.find((source) => source.pointer === '/urlset/url[1]/lastmod')).toMatchObject({
    line: 2,
  });
  expect(data.notice).toContain('Google indexing were not checked');
  expect(data.rawUtf8Bytes).toBe(
    new TextEncoder().encode(await page.locator('#xml').inputValue()).length,
  );
});

test('valid XML decodes references, supports namespace prefixes and shows a query-preserving path tree/filter list', async ({
  page,
}) => {
  await page.goto('tools/sitemap/');
  await page.locator('#demo-valid').click();
  await page.locator('#run').click();
  await expect(page.locator('#outcome')).toContainText('靜態檢查完成');
  await expect(page.locator('#entries .sitemap-entry')).toHaveCount(4);
  await page.locator('#tree summary').first().click();
  const docs = page
    .locator('#tree details')
    .filter({ has: page.locator(':scope > summary', { hasText: /^\/docs · 2$/ }) });
  await docs.locator(':scope > summary').click();
  await docs.locator(':scope > button').click();
  await expect(page.locator('#entries .sitemap-entry')).toHaveCount(2);
  await expect(page.locator('#entries')).toContainText('/docs/api?lang=zh&v=1');
  await page.locator('#reset-tree').click();
  await page.locator('#search').fill('no-match');
  await expect(page.locator('#entries')).toContainText('沒有符合');
  await inspect(
    page,
    `<?xml version="1.0" encoding="UTF-8"?>\r<!-- <url><loc>fake</loc></url> -->\r<s:urlset xmlns:s="${ns}">\r  <s:url><s:loc><![CDATA[https://example.test/文字?q=a&b=c]]></s:loc></s:url>\r</s:urlset>`,
  );
  const data = await exported(page);
  expect(data.valid).toBe(true);
  expect(data.complete).toBe(true);
  expect(data.report?.entries[0]?.loc).toBe('https://example.test/文字?q=a&b=c');
  expect(data.sources.find((at) => at.pointer === '/urlset/url[1]')).toMatchObject({
    line: 4,
    column: 3,
  });
});

for (const [name, extension] of [
  [
    'image',
    '<image:image xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><image:loc>https://example.test/image.jpg</image:loc></image:image>',
  ],
  [
    'hreflang',
    '<xhtml:link xmlns:xhtml="http://www.w3.org/1999/xhtml" rel="alternate" hreflang="en" href="https://example.test/en"/>',
  ],
]) {
  test(`${name}-only extension is warning/incomplete, not a failed static verdict`, async ({
    page,
  }) => {
    await page.goto('tools/sitemap/');
    await inspect(page, wrap(`<url><loc>https://example.test/</loc>${extension}</url>`));
    await expect(page.locator('#outcome')).not.toContainText('未通過');
    await expect(page.locator('#outcome')).toContainText('不完整');
    const data = await exported(page);
    expect(data).toMatchObject({ valid: true, complete: false });
    expect(data.report).toMatchObject({ valid: true, complete: false });
    expect(
      data.xmlIssues
        .filter((issue) => issue.code === 'namespace')
        .every((issue) => issue.severity === 'warning'),
    ).toBe(true);
    expect(data.report?.diagnostics.some((issue) => issue.code === 'unknown-structure')).toBe(true);
  });
}

test('W3C reduced dates and timezone-qualified minute precision survive the production adapter', async ({
  page,
}) => {
  await page.goto('tools/sitemap/');
  const dates = [
    '2004',
    '2004-12',
    '2004-12-23',
    '2004-12-23T18:00+00:00',
    '2004-12-23T18:00Z',
    '2004-12-23T18:00:01Z',
    '2004-12-23T18:00:01.123Z',
  ];
  await inspect(
    page,
    wrap(
      dates
        .map(
          (date, index) =>
            `<url><loc>https://example.test/${index}</loc><lastmod>${date}</lastmod></url>`,
        )
        .join(''),
    ),
  );
  await expect(page.locator('#outcome')).toContainText('靜態檢查完成');
  expect(await exported(page)).toMatchObject({ valid: true, complete: true });
  for (const date of ['2004-13', '2004-02-30T18:00Z', '2004-12-23T18:00']) {
    await inspect(
      page,
      wrap(`<url><loc>https://example.test/</loc><lastmod>${date}</lastmod></url>`),
    );
    await expect(page.locator('#outcome')).toContainText('未通過');
    expect(
      (await exported(page)).report?.diagnostics.some((issue) => issue.code === 'invalid-lastmod'),
    ).toBe(true);
  }
});

test('index child links are unchecked text only; inspection/download never request linked URLs or persist/share input', async ({
  page,
}) => {
  await page.goto('tools/sitemap/');
  await expect(page.locator('#route-loading')).toBeHidden();
  const requests: string[] = [],
    errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const origin = new URL(page.url()).origin;
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      /^https?:/.test(url.protocol) &&
      (url.origin !== origin || request.method() !== 'GET' || !url.pathname.startsWith('/assets/'))
    )
      requests.push(request.url());
  });
  await page.locator('#demo-index').click();
  await page.locator('#run').click();
  await expect(page.locator('#entries')).toContainText('子檔未檢查');
  await expect(page.locator('#outcome')).toContainText('不完整');
  await expect(page.locator('#output a')).toHaveCount(0);
  await page.locator('#entry-filter').selectOption('unchecked');
  await expect(page.locator('.sitemap-entry')).toHaveCount(2);
  const data = await exported(page);
  expect(data).toMatchObject({ valid: true, complete: false, indexingStatus: 'not-checked' });
  expect(data.report?.uncheckedChildCount).toBe(2);
  expect(data.report?.entries.every((entry) => entry.childStatus === 'unchecked')).toBe(true);
  expect(
    await page.evaluate(() => [
      localStorage.length,
      sessionStorage.length,
      location.search,
      location.hash,
    ]),
  ).toEqual([0, 0, '', '']);
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});

test('unsafe declarations are blocked BEFORE DOMParser including external entities and disguised declarations; no external styles or malformed recovery', async ({
  page,
}) => {
  await page.goto('tools/sitemap/');
  await expect(page.locator('#route-loading')).toBeHidden();
  await page.evaluate(() => {
    const original = DOMParser.prototype.parseFromString.bind(new DOMParser());
    Object.defineProperty(window, '__xmlCalls', { value: 0, writable: true });
    DOMParser.prototype.parseFromString = function (...args) {
      const state = window as unknown as { __xmlCalls: number };
      state.__xmlCalls++;
      return original(...args);
    };
  });
  const external: string[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith(new URL(page.url()).origin)) external.push(r.url());
  });
  for (const xml of [
    `<!DOCTYPE urlset SYSTEM "https://never.test/external.dtd">${wrap('')}`,
    `<!DOCTYPE urlset [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>${wrap('<url><loc>&xxe;</loc></url>')}`,
    wrap('<!-- <!DOCTYPE fake> -->'),
    wrap('<![CDATA[<!ENTITY fake>]]>'),
  ]) {
    await inspect(page, xml);
    await expect(page.locator('[data-code=unsafe-xml]')).toBeVisible();
    expect((await exported(page)).report).toBeNull();
  }
  expect(await page.evaluate(() => (window as unknown as { __xmlCalls: number }).__xmlCalls)).toBe(
    0,
  );
  await inspect(
    page,
    `<?xml-stylesheet href="https://never.test/style.xsl" type="text/xsl"?>${wrap('<url><loc>https://example.test/</loc></url>')}`,
  );
  await expect(page.locator('[data-code=processing-instruction]')).toBeVisible();
  await inspect(
    page,
    `<urlset xmlns="${ns}"><url><loc>https://example.test/SECRET_MALFORMED</url></urlset>`,
  );
  await expect(page.locator('[data-code=malformed-xml]')).toContainText('文件層級');
  await expect(page.locator('#output')).not.toContainText('SECRET_MALFORMED');
  expect((await exported(page)).report).toBeNull();
  expect(external).toEqual([]);
});

test('adapter retains every direct entry and flags namespace/cardinality/nesting/extensions/attributes/mixed text instead of silently passing', async ({
  page,
}) => {
  await page.goto('tools/sitemap/');
  await page.locator('#demo-unsupported').click();
  await page.locator('#run').click();
  const demo = await exported(page);
  expect(demo.complete).toBe(false);
  expect(demo.report?.entries).toHaveLength(3);
  expect(demo.report?.entries[1]?.loc).toBe('https://example.test/first');
  for (const code of ['namespace', 'duplicate-field', 'nested-markup'])
    expect(demo.xmlIssues.some((issue) => issue.code === code)).toBe(true);
  await inspect(
    page,
    wrap(
      'text<url attr="x"><loc bad="y">https://example.test/</loc><extra>unknown</extra></url><url xmlns="wrong"><loc>https://example.test/foreign</loc></url><wrapper><url><loc>https://example.test/not-direct</loc></url></wrapper>',
    ),
  );
  const data = await exported(page);
  expect(data.complete).toBe(false);
  expect(data.valid).toBe(false);
  expect(data.report?.sourceEntryCount).toBe(2);
  expect(data.report?.entries).toHaveLength(2);
  expect(data.report?.entries[1]?.loc).toBeNull();
  for (const code of ['mixed-text', 'unsupported-attribute', 'unsupported-tag', 'namespace'])
    expect(data.xmlIssues.some((issue) => issue.code === code)).toBe(true);
  await inspect(page, '<urlset><url><loc>https://example.test/</loc></url></urlset>');
  await expect(page.locator('#outcome')).toContainText('未通過');
  await inspect(page, `<html xmlns="${ns}"/>`);
  await expect(page.locator('[data-code=unsupported-root]')).toBeVisible();
  await inspect(page, `<?xml version="1.0" encoding="ISO-8859-1"?>${wrap('')}`);
  await expect(page.locator('[data-code=unsupported-declaration]')).toBeVisible();
});

test('local UTF-8/count/depth limits reject without partial passing entries and list/tree pagination retains every item', async ({
  page,
}) => {
  await page.goto('tools/sitemap/');
  await inspect(page, wrap(`<url><loc>https://example.test/${'文'.repeat(670_000)}</loc></url>`));
  const bytes = await exported(page);
  expect(bytes.rawUtf8Bytes).toBeGreaterThan(2_000_000);
  expect(bytes.report).toBeNull();
  await expect(page.locator('[data-code=local-size-limit]')).toBeVisible();
  await inspect(page, wrap('<x>'.repeat(128) + '</x>'.repeat(128)));
  await expect(page.locator('[data-code=xml-depth-limit]')).toBeVisible();
  await inspect(page, wrap('<x/>'.repeat(100_000)));
  await expect(page.locator('[data-code=xml-node-limit]')).toBeVisible();
  await inspect(page, 'x'.repeat(2_000_001));
  expect((await exported(page)).rawUtf8Bytes).toBeNull();
  await expect(page.locator('[data-code=local-size-limit]')).toBeVisible();
  await inspect(page, wrap(Array.from({ length: 10_001 }, () => '<url/>').join('')));
  await expect(page.locator('[data-code=local-count-limit]')).toBeVisible();
  const count = await exported(page);
  expect(count.report?.sourceEntryCount).toBe(10_001);
  expect(count.report?.entries).toHaveLength(0);
  await inspect(
    page,
    wrap(
      Array.from({ length: 65 }, (_, i) => `<url><loc>https://example.test/p${i}</loc></url>`).join(
        '',
      ),
    ),
  );
  await expect(page.locator('.sitemap-entry')).toHaveCount(50);
  await page.locator('#entry-pages').getByRole('button', { name: '下一頁' }).click();
  await expect(page.locator('.sitemap-entry')).toHaveCount(15);
  await page.locator('#tree summary').first().click();
  await expect(page.locator('#tree .sitemap-node')).toHaveCount(60);
  await page.locator('#tree').getByRole('button', { name: '顯示更多節點' }).click();
  await expect(page.locator('#tree .sitemap-node')).toHaveCount(65);
});

test('literal HTML and malicious URL text remain inert and mobile review has no page overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('tools/sitemap/');
  await inspect(
    page,
    wrap(
      '<url><loc><![CDATA[<img src=x onerror=alert(1)>]]></loc><lastmod><![CDATA[<svg onload=alert(1)>]]></lastmod></url><url><loc>https://example.test/a/b/c/d/e/f/g/h/i/j/k/l/m/n?long=' +
        'x'.repeat(500) +
        '</loc></url>',
    ),
  );
  await expect(page.locator('#entries')).toContainText('<img src=x onerror=alert(1)>');
  await expect(page.locator('#entries')).toContainText('<svg onload=alert(1)>');
  await expect(page.locator('#output img, #output svg, #output script, #output a')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const data = await exported(page);
  expect(data.report?.entries).toHaveLength(2);
  expect(data.report?.pathGroups[0]?.pathname).toContain('/l/m/n');
});

test('clear/edit/recheck and SPA history invalidate reports/filters/URLs; delayed adapter cannot resurrect old input', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.locator('#route-loading')).toBeHidden();
  await page.evaluate(() => {
    document.documentElement.dataset.sitemapSession = 'same';
  });
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Sitemap 預檢', exact: true })
    .click();
  await expect(page.locator('#route-loading')).toBeHidden();
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/sitemap-xml-*.js', async (route) => {
    await gate;
    await route.continue();
  });
  await page.locator('#demo-valid').click();
  await page.locator('#run').click();
  await expect(page.locator('#status')).toHaveText('正在靜態預檢…');
  await page.locator('#clear').click();
  release();
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#xml')).toHaveValue('');
  await page.locator('#demo-valid').click();
  await page.locator('#run').click();
  await expect(page.locator('.sitemap-entry')).toHaveCount(4);
  await page.evaluate(() => {
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL);
    const active = new Set<string>();
    Object.defineProperty(window, '__sitemapUrls', { value: active });
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      active.add(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      active.delete(url);
      revoke(url);
    };
  });
  await exported(page);
  expect(
    await page.evaluate(
      () => (window as unknown as { __sitemapUrls: Set<string> }).__sitemapUrls.size,
    ),
  ).toBe(1);
  await page.locator('#search').fill('docs');
  await page.locator('#tree summary').first().click();
  await page.locator('#tree > ul > li > details > button').click();
  await expect(page.locator('#tree-status')).toContainText('https://example.test/');
  const xml = await page.locator('#xml').inputValue();
  await page.locator('#xml').fill(xml.replace('?>', '?>\n'));
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#export')).toBeDisabled();
  await expect(page.locator('#search')).toHaveValue('');
  await expect(page.locator('#tree-status')).toHaveText('');
  await expect(page.locator('#list-status')).toHaveText('');
  expect(
    await page.evaluate(
      () => (window as unknown as { __sitemapUrls: Set<string> }).__sitemapUrls.size,
    ),
  ).toBe(0);
  await page.locator('#run').click();
  await expect(page.locator('.sitemap-entry')).toHaveCount(4);
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Git diff 檢視', exact: true })
    .click();
  await expect(page).toHaveURL(/tools\/git-diff\/$/);
  await page.goBack();
  await expect(page.locator('#xml')).toHaveValue('');
  await expect(page.locator('#output')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.dataset.sitemapSession)).toBe('same');
  await page.locator('#demo-valid').click();
  await page.reload();
  await expect(page.locator('#xml')).toHaveValue('');
});
