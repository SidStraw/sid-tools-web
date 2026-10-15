import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type { ExplainReport } from '@sid-tools/core/explain';

const node = (extra: Record<string, unknown> = {}) => ({
  'Node Type': 'Seq Scan',
  'Startup Cost': 0,
  'Total Cost': 20,
  'Plan Rows': 1,
  ...extra,
});
const wrap = (plan: Record<string, unknown>, statement: Record<string, unknown> = {}) =>
  JSON.stringify([{ Plan: plan, ...statement }], null, 2);
async function inspect(page: Page, text: string) {
  if (text.length > 50_000) {
    // Large synthetic limit fixtures use the textarea/input-event path; normal editing uses fill.
    // Chromium's text-insertion automation timed out on megabyte fill; this is not a paste benchmark.
    await page.locator('#plan').evaluate((element, value) => {
      (element as HTMLTextAreaElement).value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }, text);
  } else await page.locator('#plan').fill(text);
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
}
async function downloadReport(
  page: Page,
): Promise<{ format: string; notice: string; report: ExplainReport }> {
  const promise = page.waitForEvent('download');
  await page.locator('#export').click();
  const path = await (await promise).path();
  if (!path) throw new Error('Missing static report download');
  return JSON.parse(await readFile(path, 'utf8')) as {
    format: string;
    notice: string;
    report: ExplainReport;
  };
}

test('synthetic plan has navigable source-grounded tree, per-loop gaps/cost/timing/buffers without false aggregation', async ({
  page,
}) => {
  await page.goto('tools/explain/');
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await expect(page.locator('#mode')).toContainText('具 ANALYZE rows／loops');
  await expect(page.locator('#mode')).toContainText('2 個節點');
  await expect(page.locator('#node h3')).toHaveText('Nested Loop');
  await expect(page.locator('[data-metric=statement-execution-time] dd')).toHaveText('9 ms');
  await expect(page.locator('[data-metric=statement-planning-time] dd')).toContainText('未知');
  await expect(page.locator('#node [data-metric="Shared Hit Blocks"] dd')).toHaveText('12 blocks');
  const child = page.locator('.explain-node-button').filter({ hasText: 'Index Scan' });
  await child.focus();
  await page.keyboard.press('Enter');
  await expect(child).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#node h3')).toHaveText('Index Scan');
  for (const [key, text] of [
    ['startup-cost', '0'],
    ['total-cost', '2'],
    ['plan-rows', '1 rows'],
    ['actual-rows', '10 rows / loop'],
    ['actual-loops', '10 loops'],
    ['actual-total-time', '0.5 ms / loop'],
    ['Shared Hit Blocks', '10 blocks'],
    ['I/O Read Time', '0.2 ms'],
  ] as const)
    await expect(page.locator(`#node [data-metric="${key}"] dd`)).toHaveText(text);
  await expect(page.locator('.explain-comparison strong')).toHaveText('低估 · 10 倍');
  await expect(page.locator('.explain-derived dd')).toHaveText(['100 rows', '5 ms']);
  await expect(page.locator('#output')).toContainText('父子 timing／buffers 不相加、不相減');
  await page.locator('#node [data-metric=actual-total-time] button').click();
  await expect(page.locator('#plan')).toBeFocused();
  expect(
    await page.locator('#plan').evaluate((input) => {
      const node = input as HTMLTextAreaElement;
      return node.value.slice(node.selectionStart, node.selectionEnd);
    }),
  ).toBe('0.5');
  const data = await downloadReport(page);
  expect(data.format).toBe('sid-tools/explain-static/v1');
  expect(data.notice).toContain('No SQL execution');
  expect(data.report.root?.children[0]?.estimate.factor).toBe(10);
  expect(data.report.root?.actualTotalTime?.value).toBe(8);
  expect(data.report.root?.children[0]?.approximateInclusiveMsAcrossLoops).toBe(5);
  expect(data.report.executionTime?.value).toBe(9);
  expect(data.report.root?.buffers['Shared Hit Blocks']?.value).toBe(12);
  expect(data.report.root?.children[0]?.buffers['Shared Hit Blocks']?.value).toBe(10);
});

test('EXPLAIN-only, TIMING OFF, partial actuals and never-executed preserve missing/zero distinctions and honest coverage', async ({
  page,
}) => {
  await page.goto('tools/explain/');
  await page.locator('#demo-estimate').click();
  await page.locator('#run').click();
  await expect(page.locator('#mode')).toContainText('只有 EXPLAIN');
  await expect(page.locator('#node [data-metric=actual-total-time] dd')).toContainText('未知');
  await expect(page.locator('#node [data-metric=actual-rows] dd')).toContainText('未知');
  const estimate = await downloadReport(page);
  expect(estimate.report.mode).toBe('explain-only');
  expect(estimate.report.root?.actualTotalTime).toBeNull();
  expect(estimate.report.executionTime).toBeNull();
  await inspect(page, wrap(node({ 'Actual Rows': 0.5, 'Actual Loops': 2 })));
  await expect(page.locator('#mode')).toContainText('具 ANALYZE rows／loops');
  await expect(page.locator('#node [data-metric=actual-total-time] dd')).toContainText('未知');
  await expect(page.locator('.explain-derived dd')).toHaveText(['1 rows', '未知／不可計算']);
  await page.locator('#demo-partial').click();
  await page.locator('#run').click();
  await expect(page.locator('#mode')).toContainText('部分實測');
  await expect(page.locator('#outcome')).toContainText('不完整');
  await expect(page.locator('[data-code=omitted-fields]')).toBeVisible();
  await page.locator('.explain-node-button').filter({ hasText: 'Index Scan' }).click();
  await expect(page.locator('.explain-comparison strong')).toHaveText('未執行 · 不比較');
  await expect(page.locator('#node [data-metric=actual-loops] dd')).toHaveText('0 loops');
  await expect(page.locator('.explain-derived dd')).toHaveText([
    '未知／不可計算',
    '未知／不可計算',
  ]);
  const partial = await downloadReport(page);
  expect(partial.report.root?.children[0]?.estimate.factor).toBeNull();
  expect(
    partial.report.diagnostics.some(
      (issue) =>
        issue.pointer === '/0/Plan/Plans/0' &&
        ['estimate-under', 'estimate-over', 'actual-zero'].includes(issue.code),
    ),
  ).toBe(false);
});

test('per-loop over/under/zero states and field/overflow/omission errors do not become fabricated successful measurements', async ({
  page,
}) => {
  await page.goto('tools/explain/');
  for (const [planRows, actualRows, expected] of [
    [100, 1, '高估 · 100 倍'],
    [0, 1, '估計為零／actual>0'],
    [1, 0, 'actual 顯示為 0／估計>0'],
    [0, 0, '相同 · 1 倍'],
  ] as const) {
    await inspect(
      page,
      wrap(node({ 'Plan Rows': planRows, 'Actual Rows': actualRows, 'Actual Loops': 1 })),
    );
    await expect(page.locator('.explain-comparison strong')).toContainText(expected);
  }
  await inspect(
    page,
    wrap(
      node({
        'Total Cost': 'invalid',
        'Actual Rows': 2,
        'Actual Loops': 1,
        'Actual Total Time': -1,
        Filter: 'SECRET_OMITTED_FILTER',
        'Plan Width': 8,
      }),
    ),
  );
  await expect(page.locator('#outcome')).toContainText('未通過');
  await expect(page.locator('#node h3')).toHaveText('Seq Scan');
  await expect(page.locator('#node [data-metric=total-cost] dd')).toContainText('未知');
  await expect(page.locator('#output')).not.toContainText('SECRET_OMITTED_FILTER');
  const invalid = await downloadReport(page);
  expect(invalid.report.valid).toBe(false);
  expect(JSON.stringify(invalid)).not.toContain('SECRET_OMITTED_FILTER');
  expect(invalid.report.root?.omittedFieldCount).toBe(2);
  await inspect(
    page,
    wrap(node({ 'Actual Rows': 1e308, 'Actual Loops': 2, 'Actual Total Time': 1e308 })),
  );
  await expect(page.locator('[data-code=derived-overflow]').first()).toBeVisible();
  await expect(page.locator('.explain-derived dd')).toHaveText([
    '未知／不可計算',
    '未知／不可計算',
  ]);
  expect((await downloadReport(page)).report.complete).toBe(false);
});

test('original JSON source navigation handles escaped keys, last duplicate value/object and absent-field parent fallback', async ({
  page,
}) => {
  await page.goto('tools/explain/');
  const text =
    '[{"Plan":{"Node Type":"Seq Scan","Startup Cost":0,"Total Cost":5,"Plan Rows":1,"Actual Rows":111,"Actual\\u0020Rows":222,"Actual Loops":1,"I/O Read Time":0.25}}]';
  await inspect(page, text);
  await page.locator('#node [data-metric=actual-rows] button').click();
  const selection = () =>
    page.locator('#plan').evaluate((input) => {
      const node = input as HTMLTextAreaElement;
      return node.value.slice(node.selectionStart, node.selectionEnd);
    });
  expect(await selection()).toBe('222');
  await page.locator('#node [data-metric="I/O Read Time"] button').click();
  expect(await selection()).toBe('0.25');
  await expect(page.locator('#node [data-metric="I/O Read Time"] button')).toContainText(
    '/I~1O Read Time',
  );
  await inspect(
    page,
    '[{"Plan":{"Node Type":"OLD","Startup Cost":99,"Total Cost":9,"Plan Rows":1},"Plan":{"Node Type":"NEW","Total Cost":2,"Plan Rows":1}}]',
  );
  const missing = page.locator('[data-code=missing-metric] button');
  await expect(missing).toContainText('回到父層 /0/Plan');
  await missing.click();
  expect(await selection()).toBe('{"Node Type":"NEW","Total Cost":2,"Plan Rows":1}');
});

test('malformed/unsupported and resource-limit plans show static diagnostics, no truncated tree or echoed parse errors; wide tree remains navigable', async ({
  page,
}) => {
  await page.goto('tools/explain/');
  for (const [text, code] of [
    ['SECRET_INVALID_JSON', 'invalid-json'],
    [JSON.stringify(node()), 'invalid-shape'],
    ['[]', 'invalid-shape'],
    [('x'.repeat(100) + '\n').repeat(9_901), 'input-limit'],
    ['['.repeat(97) + ']'.repeat(97), 'json-depth-limit'],
    [wrap(node({ Unknown: Array.from({ length: 10_001 }, () => ({})) })), 'container-limit'],
    [wrap(node({ Plans: Array.from({ length: 2000 }, () => node()) })), 'node-limit'],
  ] as const) {
    await inspect(page, text);
    await expect(page.locator(`[data-code=${code}]`)).toBeVisible();
    await expect(page.locator('#browse')).toBeHidden();
    await expect(page.locator('#output')).not.toContainText('SECRET_INVALID_JSON');
    expect((await downloadReport(page)).report.root).toBeNull();
  }
  let deep = node();
  for (let i = 0; i < 32; i++) deep = node({ Plans: [deep] });
  await inspect(page, wrap(deep));
  await expect(page.locator('[data-code=plan-depth-limit]')).toBeVisible();
  await inspect(
    page,
    wrap(
      node({ Plans: Array.from({ length: 65 }, (_, i) => node({ 'Node Type': `Child ${i}` })) }),
    ),
  );
  await expect(page.locator('.explain-node-button')).toHaveCount(61);
  await page.getByRole('button', { name: '顯示更多同層節點' }).click();
  await expect(page.locator('.explain-node-button')).toHaveCount(66);
  await page.getByRole('button', { name: 'Child 64', exact: true }).click();
  await expect(page.locator('#node h3')).toHaveText('Child 64');
});

test('untrusted node/relation/schema/alias text stays inert, static report excludes unsupported SQL and privacy/mobile boundaries hold', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('tools/explain/');
  await expect(page.locator('#route-loading')).toBeHidden();
  const requests: string[] = [],
    errors: string[] = [],
    origin = new URL(page.url()).origin;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      /^https?:/.test(url.protocol) &&
      (url.origin !== origin || request.method() !== 'GET' || !url.pathname.startsWith('/assets/'))
    )
      requests.push(request.url());
  });
  const literal = '<img src=x onerror=alert(1)>';
  await inspect(
    page,
    wrap(
      node({
        'Node Type': literal,
        'Relation Name': '<svg onload=alert(1)>',
        Schema: 's'.repeat(400),
        Alias: '<script>alert(1)</script>',
        SQL: 'SECRET_SQL_OMITTED',
      }),
    ),
  );
  await expect(page.locator('#node h3')).toHaveText(literal);
  await expect(page.locator('#output img, #output svg, #output script')).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const data = await downloadReport(page);
  expect(data.report.root?.nodeType).toBe(literal);
  expect(JSON.stringify(data)).not.toContain('SECRET_SQL_OMITTED');
  expect(data.notice).toContain('Names can be sensitive');
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

test('input edits/reruns, clear, SPA history and reload reset node selections, source maps and Blob URLs', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.locator('#route-loading')).toBeHidden();
  await page.evaluate(() => {
    document.documentElement.dataset.explainSession = 'same';
  });
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'EXPLAIN 檢視', exact: true })
    .click();
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  await page.locator('.explain-node-button').filter({ hasText: 'Index Scan' }).click();
  await page.evaluate(() => {
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL),
      active = new Set<string>();
    Object.defineProperty(window, '__explainUrls', { value: active });
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
  await downloadReport(page);
  expect(
    await page.evaluate(
      () => (window as unknown as { __explainUrls: Set<string> }).__explainUrls.size,
    ),
  ).toBe(1);
  await page.locator('#plan').fill((await page.locator('#plan').inputValue()) + '\n');
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#node')).toBeEmpty();
  await expect(page.locator('#selection-status')).toBeEmpty();
  await expect(page.locator('#export')).toBeDisabled();
  expect(
    await page.evaluate(
      () => (window as unknown as { __explainUrls: Set<string> }).__explainUrls.size,
    ),
  ).toBe(0);
  await page.locator('#run').click();
  await expect(page.locator('#node h3')).toHaveText('Nested Loop');
  await page.locator('#clear').click();
  await expect(page.locator('#plan')).toHaveValue('');
  await expect(page.locator('#output')).toBeHidden();
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Sitemap 預檢', exact: true })
    .click();
  await expect(page).toHaveURL(/tools\/sitemap\/$/);
  await page.goBack();
  await expect(page.locator('#plan')).toHaveValue('');
  await expect(page.locator('#output')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.dataset.explainSession)).toBe('same');
  await page.locator('#demo').click();
  await page.reload();
  await expect(page.locator('#plan')).toHaveValue('');
});

test('rounded displayed zero discloses conditional pre-PG18 row/time bounds beside products and in the downloaded notice', async ({
  page,
}) => {
  await page.goto('tools/explain/');
  await inspect(
    page,
    wrap(
      node({
        'Plan Rows': 1,
        'Actual Rows': 0,
        'Actual Loops': 100000,
        'Actual Total Time': 0.002,
      }),
    ),
  );
  await expect(page.locator('.explain-comparison strong')).toContainText('actual 顯示為 0');
  await expect(page.locator('.explain-comparison')).toContainText('不能推論真實總 rows 為零');
  await expect(page.locator('.explain-derived dd')).toHaveText(['0 rows', '200 ms']);
  const rows = page.locator('.explain-derived [data-rounding=rows]');
  await expect(rows).toContainText('若為 PG ≤17');
  await expect(rows).toContainText('50000 rows（0.5 × 100000 loops）');
  await expect(rows).toContainText('每 loop <0.5 rows');
  await expect(rows).toContainText('不代表已偵測版本');
  await expect(page.locator('.explain-derived [data-rounding=time]')).toContainText(
    '50 ms（0.0005 × 100000 loops）',
  );
  const data = await downloadReport(page);
  expect(data.notice).toContain('Before PostgreSQL 18');
  expect(data.notice).toContain('No server version is detected');
  expect(data.notice).toContain('displayed zero may hide a true per-loop average <0.5');
  expect(data.notice).toContain('0.5 × loops rows');
  expect(data.notice).toContain('0.0005 × loops ms');
  expect(data.notice).toContain('50000 rows and 50 ms');
  expect(data.notice).toContain('not exact true totals');
  expect(data.report.root?.estimate.state).toBe('actual-zero');
  expect(data.report.root?.approximateRowsAcrossLoops).toBe(0);
  expect(data.report.root?.approximateInclusiveMsAcrossLoops).toBe(200);
  await inspect(page, wrap(node({ 'Actual Rows': 0.25, 'Actual Loops': 100000 })));
  await expect(page.locator('[data-rounding=rows]')).toHaveCount(0);
  await inspect(page, wrap(node({ 'Actual Rows': 0, 'Actual Loops': 0 })));
  await expect(page.locator('[data-rounding=rows]')).toHaveCount(0);
  await expect(page.locator('.explain-comparison strong')).toHaveText('未執行 · 不比較');
  await expect(page.locator('.explain-derived dd')).toHaveText([
    '未知／不可計算',
    '未知／不可計算',
  ]);
});

test('EXPLAIN engine is Run-only lazy and slow completion cannot resurrect cleared state', async ({
  page,
}) => {
  await page.goto('tools/explain/');
  await expect(page.locator('#route-loading')).toBeHidden();
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/explain-*.js', async (route) => {
    await gate;
    await route.continue();
  });
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await expect(page.locator('#status')).toHaveText('正在檢視計畫…');
  await page.locator('#clear').click();
  release();
  await expect(page.locator('#plan')).toHaveValue('');
  await expect(page.locator('#output')).toBeHidden();
  await page.locator('#demo-estimate').click();
  await page.locator('#run').click();
  await expect(page.locator('#mode')).toContainText('只有 EXPLAIN');
});
