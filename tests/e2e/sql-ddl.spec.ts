import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
async function demo(page: Page, id = 'demo') {
  await page.locator(`#${id}`).click();
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
}
async function run(page: Page, source: string) {
  await page.locator('#source').fill(source);
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
}
async function download(page: Page, type: 'svg' | 'summary') {
  await page.locator('#export-confirm').check();
  const event = page.waitForEvent('download');
  await page.locator(`#export-${type}`).click();
  const path = await (await event).path();
  if (!path) throw new Error('Missing export');
  return readFile(path, 'utf8');
}
interface FakeWorker {
  id: number;
  terminated: boolean;
  options: WorkerOptions;
  reply: (kind: string, force?: boolean) => void;
  error: () => void;
  messageError: () => void;
}
async function fakeWorkers(page: Page) {
  await page.evaluate(() => {
    const list: FakeWorker[] = [];
    Object.defineProperty(window, '__ddlWorkers', { value: list });
    const report = {
      status: 'complete',
      tables: [],
      edges: [],
      statements: [],
      diagnostics: [],
      scope: [],
      limits: {},
    };
    class Fake extends EventTarget {
      id = 0;
      terminated = false;
      options: WorkerOptions;
      onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
      saved: ((event: MessageEvent<unknown>) => void) | null = null;
      onerror: (() => void) | null = null;
      onmessageerror: (() => void) | null = null;
      constructor(_url: string | URL, options: WorkerOptions = {}) {
        super();
        this.options = options;
        list.push(this);
      }
      postMessage(data: { id: number }) {
        this.id = data.id;
        this.saved = this.onmessage;
      }
      terminate() {
        this.terminated = true;
      }
      reply(kind: string, force = false) {
        const fn = force ? this.saved : this.onmessage;
        fn?.(
          new MessageEvent('message', {
            data: {
              kind: kind === 'wrong-kind' ? 'unrelated' : kind === 'failure' ? 'failure' : 'report',
              id: kind === 'wrong-id' ? this.id - 1 : this.id,
              report: kind === 'malformed' ? { status: 'complete' } : report,
            },
          }),
        );
      }
      error() {
        this.onerror?.();
      }
      messageError() {
        this.onmessageerror?.();
      }
    }
    window.Worker = Fake as unknown as typeof Worker;
  });
}
const workers = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __ddlWorkers: FakeWorker[] }).__ddlWorkers.map((item) => ({
      terminated: item.terminated,
      options: item.options,
    })),
  );
test('Run-only real dedicated moduleworker creates source-linked resolved composite/self graph; no guessed edges and independent coverage', async ({
  page,
}) => {
  const urls: string[] = [];
  page.on('worker', (worker) => urls.push(worker.url()));
  await page.goto('tools/sql-ddl/');
  await expect(page.locator('#route-loading')).toBeHidden();
  expect(urls).toEqual([]);
  await page.locator('#demo').click();
  expect(urls).toEqual([]);
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  expect(urls).toHaveLength(1);
  expect(urls[0]).toMatch(/sql-ddl\.worker-/);
  await expect.poll(() => page.workers().length).toBe(0);
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'complete');
  await expect(page.locator('#summary')).toContainText('不是 DB validation');
  await expect(page.locator('#graph svg')).toHaveAttribute('data-tables', '2');
  await expect(page.locator('#graph svg')).toHaveAttribute('data-columns', '7');
  await expect(page.locator('#graph path[data-binding=resolved-local]')).toHaveCount(2);
  await expect(page.locator('#graph')).toContainText('tenant_id, book_id');
  await expect(page.locator('#graph')).toContainText('implicit target PK');
  await expect(page.locator('.ddl-relationship')).toHaveCount(2);
  await page.locator('#relationships button').filter({ hasText: 'parent_fk' }).click();
  await expect(page.locator('#relation-detail')).toContainText('target-primary-key');
  await expect(page.locator('#relation-detail')).toContainText('loan_id');
  await page.locator('#relation-detail button').filter({ hasText: 'Target PK 推導來源' }).click();
  await expect(page.locator('#source')).toBeFocused();
  expect(
    await page.locator('#source').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toContain('PRIMARY KEY');
  await run(page, 'CREATE TABLE public.a (id integer); CREATE TABLE public.b (a_id integer);');
  await expect(page.locator('#graph path')).toHaveCount(0);
  await expect(page.locator('#relationships')).toContainText('不推論');
});
test('actual SVG/table/column/type/PK/FK source selections preserve original UTF16 and ordered composite keys with keyboard interaction', async ({
  page,
}) => {
  await page.goto('tools/sql-ddl/');
  await demo(page);
  await page.locator('#graph [role=button][aria-label="Table 1 source"]').click();
  await expect(page.locator('#source')).toBeFocused();
  expect(
    await page.locator('#source').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toContain('CREATE TABLE library."Book"');
  await page.locator('#graph [aria-label="Table 1 column 3 source"]').focus();
  await page.keyboard.press('Enter');
  expect(
    await page.locator('#source').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toBe('title character varying(120) NOT NULL');
  await page.locator('#graph [aria-label="Table 1 primary key source"]').focus();
  await page.keyboard.press('Space');
  expect(
    await page.locator('#source').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toContain('PRIMARY KEY (tenant_id, book_id)');
  await page.locator('#graph path').first().focus();
  await page.keyboard.press('Enter');
  await page.locator('#relation-detail button').filter({ hasText: 'FK 定義' }).click();
  expect(
    await page.locator('#source').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toContain('FOREIGN KEY (tenant_id, book_id)');
  await expect(page.locator('#relation-detail')).toContainText(
    'tenant_id, book_id → library."Book" (tenant_id, book_id)',
  );
  const column = page.locator('.ddl-column').filter({ hasText: 'character varying' });
  await column.getByRole('button', { name: /Type 定義/ }).click();
  expect(
    await page.locator('#source').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toBe('character varying(120)');
  await page.locator('#table-filter').fill('loan');
  await expect(page.locator('.ddl-table-doc')).toHaveCount(1);
});
test('candidate dashed distinct from solid; missing target/unqualified implicitPK textual records with no invented table/columns', async ({
  page,
}) => {
  await page.goto('tools/sql-ddl/');
  await demo(page, 'demo-candidate');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'partial');
  await expect(page.locator('#graph path[data-binding=resolved-local]')).toHaveCount(0);
  await expect(page.locator('#graph path[data-binding=local-candidate]')).toHaveAttribute(
    'stroke-dasharray',
    '7 5',
  );
  await expect(page.locator('#graph svg')).toHaveAttribute('data-tables', '3');
  await expect(page.locator('#graph svg')).toHaveAttribute('data-relationships', '3');
  await page.locator('#binding-filter').selectOption('local-candidate');
  await expect(page.locator('.ddl-relationship')).toHaveCount(1);
  await expect(page.locator('#relation-detail')).toContainText('search_path 未知');
  await page.locator('#binding-filter').selectOption('unresolved');
  await expect(page.locator('.ddl-relationship')).toHaveCount(2);
  await page.locator('#relationships button').last().click();
  await expect(page.locator('#relation-detail')).toContainText('target columns unknown');
  await expect(page.locator('#relation-detail')).toContainText('不製造不存在');
});
test('unsupported statements/clauses individually located, lexical modes preserve boundaries; invalidremainder retained earlier only and limits clear all', async ({
  page,
}) => {
  await page.goto('tools/sql-ddl/');
  await demo(page, 'demo-unsupported');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'partial');
  await expect(page.locator('#graph svg')).toHaveAttribute('data-tables', '2');
  expect(await page.locator('.ddl-diagnostic[data-code=unsupported-statement]').count()).toBe(3);
  await page
    .locator('.ddl-diagnostic[data-code=unsupported-statement]')
    .first()
    .getByRole('button')
    .click();
  expect(
    await page.locator('#source').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toBe('SET search_path TO public;');
  await expect(page.locator('#tables')).not.toContainText('later');
  await demo(page, 'demo-lexical');
  await expect(page.locator('#graph svg')).toHaveAttribute('data-tables', '2');
  await expect(page.locator('#tables')).toContainText('after_lexical');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'partial');
  await demo(page, 'demo-invalid');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'invalid');
  await expect(page.locator('#graph svg')).toHaveAttribute('data-tables', '1');
  await expect(page.locator('#tables')).not.toContainText('never_guessed');
  await expect(page.locator('#summary')).toContainText('不完整接受模型');
  const invalidSvg = await download(page, 'svg');
  expect(invalidSvg).toContain('INCOMPLETE ACCEPTED MODEL');
  expect(invalidSvg).not.toContain('never_guessed');
  await demo(page, 'demo-limit');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'limit');
  await expect(page.locator('#graph svg')).toHaveCount(0);
  await expect(page.locator('#export-summary')).toBeDisabled();
  await run(page, '-- synthetic comment only');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'complete');
  await expect(page.locator('#summary')).toContainText('不是資料庫 schema 證明');
  await expect(page.locator('#graph svg')).toHaveAttribute('data-tables', '0');
});
test('standalone actual SVG download readable/full table columns relationships at original dimensions even after zoom; summary helper no raw SQL/literals/comments', async ({
  page,
}) => {
  await page.goto('tools/sql-ddl/');
  await demo(page);
  await expect(page.locator('#export-svg')).toBeDisabled();
  expect(
    await page.locator('#export-confirm').evaluate((node) => node.getBoundingClientRect().width),
  ).toBe(16);
  const original = await page.locator('#graph svg').getAttribute('width');
  await page.locator('#zoom-out').click();
  await expect(page.locator('#zoom-reset')).toHaveText('75%');
  const svg = await download(page, 'svg');
  const parsed = await page.evaluate((text) => {
    const xml = new DOMParser().parseFromString(text, 'image/svg+xml');
    return {
      errors: xml.querySelectorAll('parsererror').length,
      width: xml.documentElement.getAttribute('width'),
      tables: xml.querySelectorAll('[data-table-index]').length,
      columns: xml.querySelectorAll('[data-column-index]').length,
      edges: xml.querySelectorAll('path[data-edge-index]').length,
      register: xml.querySelectorAll('[data-register-index]').length,
      text: xml.documentElement.textContent,
      unsafe: xml.querySelectorAll('script,foreignObject,image,a,style').length,
    };
  }, svg);
  expect(parsed.errors).toBe(0);
  expect(parsed.width).toBe(original);
  expect(parsed.tables).toBe(2);
  expect(parsed.columns).toBe(7);
  expect(parsed.edges).toBe(2);
  expect(parsed.register).toBe(2);
  expect(parsed.text).toContain('loan_id');
  expect(parsed.text).toContain('character varying ( 120 )');
  expect(parsed.text).toContain('resolved-local');
  expect(parsed.unsafe).toBe(0);
  const json = JSON.parse(await download(page, 'summary')) as { tables: unknown[] };
  expect(json.tables).toHaveLength(2);
  expect(json).not.toHaveProperty('source');
  expect(json).not.toHaveProperty('edges');
  await demo(page, 'demo-lexical');
  const lexicalSvg = await download(page, 'svg'),
    summary = await download(page, 'summary');
  for (const value of [lexicalSvg, summary]) {
    expect(value).not.toContain('synthetic-private');
    expect(value).not.toContain('CREATE TABLE public');
    expect(value).not.toContain('DEFAULT E');
  }
  expect(lexicalSvg).toContain('INCOMPLETE ACCEPTED MODEL');
});
test('geometry no clipped/overlapping text within tables, full long quoted names/types; zoom/fit preserve complete graph; no silent column omissions', async ({
  page,
}) => {
  await page.goto('tools/sql-ddl/');
  const name = 'Long quoted name & '.repeat(9);
  await run(
    page,
    `CREATE TABLE public."${name}" ("${'字'.repeat(100)}" numeric(10, 2) PRIMARY KEY, label character varying(120));`,
  );
  const geometry = await page.locator('#graph svg').evaluate((node) => {
    const svg = node as SVGSVGElement,
      view = svg.viewBox.baseVal;
    const labels = [...svg.querySelectorAll('text')].map((text) => {
      const box = text.getBBox();
      return {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        size: Number(text.getAttribute('font-size')),
      };
    });
    const clipped = labels.some(
      (box) =>
        box.x < 0 ||
        box.y < 0 ||
        box.x + box.width > view.width ||
        box.y + box.height > view.height,
    );
    const overlap = labels.some((a, i) =>
      labels
        .slice(i + 1)
        .some(
          (b) =>
            a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y,
        ),
    );
    return { clipped, overlap, minFont: Math.min(...labels.map((item) => item.size)) };
  });
  expect(geometry.clipped).toBe(false);
  expect(geometry.overlap).toBe(false);
  expect(geometry.minFont).toBeGreaterThanOrEqual(11);
  await expect(page.locator('#graph')).toContainText(name);
  await expect(page.locator('#graph')).toContainText('字'.repeat(100));
  await page.locator('#fit').click();
  await page.locator('#zoom-reset').click();
  await expect(page.locator('#zoom-reset')).toHaveText('100%');
  await run(
    page,
    `CREATE TABLE public.wide (${Array.from({ length: 60 }, (_, i) => `c${i} integer`).join(',')});`,
  );
  expect(
    await page.locator('#graph').evaluate((node) => [node.scrollTop, node.scrollLeft]),
  ).toEqual([0, 0]);
  await expect(page.locator('#graph [data-column-index]')).toHaveCount(60);
  await expect(page.locator('.ddl-column')).toHaveCount(50);
  await page.locator('#tables').getByRole('button', { name: '下一頁', exact: true }).click();
  await expect(page.locator('.ddl-column')).toHaveCount(10);
  const svg = await download(page, 'svg');
  expect(svg).toContain('data-columns="60"');
  expect(svg).toContain('c59');
});
test('XML/HTML hostile identifiers escaped as literal and safe standalone SVG nodes/attrs/numericgeometry only; no request/storage/query/hash/logging', async ({
  page,
  context,
}) => {
  await page.goto('tools/sql-ddl/');
  await expect(page.locator('#route-loading')).toBeHidden();
  const requests: string[] = [],
    errors: string[] = [],
    logs: string[] = [];
  context.on('request', (request) => {
    if (/^https?:/.test(request.url()) && !new URL(request.url()).pathname.includes('/assets/'))
      requests.push(request.url());
  });
  page.on('console', (message) => logs.push(message.text()));
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', (dialog) => {
    errors.push('dialog');
    void dialog.dismiss();
  });
  await demo(page, 'demo-hostile');
  await expect(page.locator('#graph')).toContainText('<img src=x onerror=alert(1)>&');
  await expect(page.locator('.ddl-main img,.ddl-main script,.ddl-main iframe')).toHaveCount(0);
  const svg = await download(page, 'svg');
  expect(svg).toContain('&lt;img');
  expect(svg).not.toContain('<img');
  expect(svg).not.toContain('href=');
  const safety = await page.evaluate((value) => {
    const xml = new DOMParser().parseFromString(value, 'image/svg+xml');
    return {
      errors: xml.querySelectorAll('parsererror').length,
      badNodes: xml.querySelectorAll('script,foreignObject,image,a,iframe,style').length,
      badAttrs: [...xml.querySelectorAll('*')].flatMap((node) =>
        [...node.attributes]
          .filter((attr) => /^on|href|style/i.test(attr.name) || /url\(/i.test(attr.value))
          .map((attr) => attr.name),
      ),
      paths: [...xml.querySelectorAll('path')].every((path) =>
        /^[MHV\d .-]+$/.test(path.getAttribute('d') ?? ''),
      ),
      text: xml.documentElement.textContent,
    };
  }, svg);
  expect(safety.errors).toBe(0);
  expect(safety.badNodes).toBe(0);
  expect(safety.badAttrs).toEqual([]);
  expect(safety.paths).toBe(true);
  expect(safety.text).toContain('<img src=x onerror=alert(1)>&');
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  expect(logs.join('')).not.toContain('onerror=alert');
  expect(
    await page.evaluate(() => [
      localStorage.length,
      sessionStorage.length,
      location.search,
      location.hash,
    ]),
  ).toEqual([0, 0, '', '']);
  await run(page, 'CREATE TABLE public."control\u0001name" ("line\ncolumn" integer);');
  const controls = await download(page, 'svg');
  expect(controls).toContain('control\\u0001name');
  expect(controls).toContain('line\\u000acolumn');
  expect(
    await page.evaluate(
      (value) =>
        new DOMParser().parseFromString(value, 'image/svg+xml').querySelectorAll('parsererror')
          .length,
      controls,
    ),
  ).toBe(0);
});
test('worker late/expectedkind/revision/shape guards, newrun/edit/cancel/clear/dispose terminate, source/report do not survive back/reload', async ({
  page,
}) => {
  await page.goto('tools/sql-ddl/');
  await expect(page.locator('#route-loading')).toBeHidden();
  await fakeWorkers(page);
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await page.locator('#run').click();
  expect((await workers(page))[0]?.terminated).toBe(true);
  expect((await workers(page))[1]?.options.type).toBe('module');
  await page.evaluate(() => {
    const list = (window as unknown as { __ddlWorkers: FakeWorker[] }).__ddlWorkers;
    list[0]!.reply('ok', true);
    for (const kind of ['wrong-id', 'wrong-kind', 'malformed']) list[1]!.reply(kind);
  });
  await expect(page.locator('#output')).toBeHidden();
  await page.evaluate(() =>
    (window as unknown as { __ddlWorkers: FakeWorker[] }).__ddlWorkers[1]!.reply('ok'),
  );
  await expect(page.locator('#output')).toBeVisible();
  expect((await workers(page))[1]?.terminated).toBe(true);
  await page.locator('#run').click();
  await page.locator('#source').fill('CREATE TABLE public.edited (id integer);');
  expect((await workers(page))[2]?.terminated).toBe(true);
  await page.evaluate(() =>
    (window as unknown as { __ddlWorkers: FakeWorker[] }).__ddlWorkers[2]!.reply('ok', true),
  );
  await expect(page.locator('#output')).toBeHidden();
  await page.locator('#run').click();
  await page.locator('#cancel').click();
  expect((await workers(page))[3]?.terminated).toBe(true);
  await expect(page.locator('#status')).toContainText('已取消');
  await expect(page.locator('#source')).not.toHaveValue('');
  await page.locator('#run').click();
  await page.locator('#clear').click();
  expect((await workers(page))[4]?.terminated).toBe(true);
  await expect(page.locator('#source')).toHaveValue('');
  await page.locator('#run').click();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'SQL 關聯圖', exact: true })
    .getAttribute('aria-current');
  await page
    .getByRole('navigation')
    .getByRole('link', { name: '回應 Fixture', exact: true })
    .click();
  await expect(page.locator('#inspect')).toBeAttached();
  expect((await workers(page))[5]?.terminated).toBe(true);
  await page.evaluate(() =>
    (window as unknown as { __ddlWorkers: FakeWorker[] }).__ddlWorkers[5]!.reply('ok', true),
  );
  await page.goBack();
  await expect(page.locator('#source')).toHaveValue('');
  await expect(page.locator('#output')).toBeHidden();
  await page.reload();
  await expect(page.locator('#source')).toHaveValue('');
});
test('20second timeout/error/messageerror/failure/start and actualworkerload failures honest with no mainthread fallback', async ({
  page,
}) => {
  await page.goto('tools/sql-ddl/');
  await expect(page.locator('#route-loading')).toBeHidden();
  await page.clock.install();
  await fakeWorkers(page);
  await page.locator('#run').click();
  await page.clock.fastForward(20001);
  await expect(page.locator('#error')).toContainText('20 秒');
  expect((await workers(page))[0]?.terminated).toBe(true);
  await page.evaluate(() =>
    (window as unknown as { __ddlWorkers: FakeWorker[] }).__ddlWorkers[0]!.reply('ok', true),
  );
  await expect(page.locator('#output')).toBeHidden();
  for (const [index, method, text] of [
    [1, 'error', '載入或執行失敗'],
    [2, 'messageError', '訊息無法讀取'],
    [3, 'reply', '無法完成解析'],
  ] as const) {
    await page.locator('#run').click();
    await page.evaluate(
      ({ index, method }) => {
        const item = (window as unknown as { __ddlWorkers: FakeWorker[] }).__ddlWorkers[index]!;
        if (method === 'reply') item.reply('failure');
        else item[method]();
      },
      { index, method },
    );
    await expect(page.locator('#error')).toContainText(text);
    expect((await workers(page))[index]?.terminated).toBe(true);
  }
  await page.evaluate(() => {
    window.Worker = class {
      constructor() {
        throw new Error('Synthetic refusal');
      }
    } as unknown as typeof Worker;
  });
  await page.locator('#run').click();
  await expect(page.locator('#error')).toContainText('無法啟動');
  await page.reload();
  await page.route('**/assets/sql-ddl.worker-*.js', (route) => route.abort());
  await page.locator('#run').click();
  await expect(page.locator('#error')).toContainText('載入或執行失敗');
  await expect(page.locator('#output')).toBeHidden();
});
test('Blob URLs released by timer/edit/dispose and late summaryhelper cannot revive old download; export failures no rawfallback', async ({
  page,
}) => {
  await page.goto('tools/sql-ddl/');
  await page.evaluate(() => {
    const created: string[] = [],
      revoked: string[] = [];
    Object.defineProperty(window, '__ddlUrls', { value: { created, revoked } });
    const create = URL.createObjectURL.bind(URL),
      revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = (blob) => {
      const url = create(blob);
      created.push(url);
      return url;
    };
    URL.revokeObjectURL = (url) => {
      revoked.push(url);
      revoke(url);
    };
  });
  await demo(page);
  await download(page, 'svg');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const state = (window as unknown as { __ddlUrls: { created: string[]; revoked: string[] } })
          .__ddlUrls;
        return state.created.every((url) => state.revoked.includes(url));
      }),
    )
    .toBe(true);
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/sql-ddl-*.js', async (route) => {
    await gate;
    await route.continue();
  });
  const downloads: string[] = [];
  page.on('download', (item) => downloads.push(item.suggestedFilename()));
  await page.locator('#export-summary').click();
  await page.locator('#source').fill('-- edited');
  release();
  await expect(page.locator('#output')).toBeHidden();
  await demo(page);
  expect(downloads).toEqual([]);
  await download(page, 'svg');
  await page
    .getByRole('navigation')
    .getByRole('link', { name: '回應 Fixture', exact: true })
    .click();
  await expect(page.locator('#inspect')).toBeAttached();
  expect(
    await page.evaluate(() => {
      const state = (window as unknown as { __ddlUrls: { created: string[]; revoked: string[] } })
        .__ddlUrls;
      return state.created.every((url) => state.revoked.includes(url));
    }),
  ).toBe(true);
  await page.goBack();
  await demo(page);
  await page.locator('#export-confirm').check();
  await page.evaluate(() => {
    URL.createObjectURL = () => {
      throw new Error('Synthetic Blob failure');
    };
  });
  await page.locator('#export-summary').click();
  await expect(page.locator('#export-status')).toContainText('不退回原始 report');
  await page.evaluate(() => {
    XMLSerializer.prototype.serializeToString = () => {
      throw new Error('Synthetic serializer failure');
    };
  });
  await page.locator('#export-svg').click();
  await expect(page.locator('#export-status')).toContainText('不退回原始 report');
});
test('failed summaryhelper import no fallback; invalid binding never solid and no fabricatedtarget', async ({
  page,
}) => {
  await page.goto('tools/sql-ddl/');
  await run(
    page,
    'CREATE TABLE public.a (id integer PRIMARY KEY); CREATE TABLE public.b (x integer, FOREIGN KEY (x) REFERENCES public.a(missing));',
  );
  await expect(page.locator('#graph path[data-binding=resolved-local]')).toHaveCount(0);
  await expect(page.locator('#graph svg')).toHaveAttribute('data-tables', '2');
  await expect(page.locator('.ddl-relationship')).toHaveCount(1);
  await page.route('**/assets/sql-ddl-*.js', (route) => route.abort());
  await page.locator('#export-confirm').check();
  await page.locator('#export-summary').click();
  await expect(page.locator('#export-status')).toContainText('不退回原始 report');
});
test('320/390 page contained with internalgraphscroll/zoom, keyboard alternatives and diagnostic pagination', async ({
  page,
}) => {
  await page.goto('tools/sql-ddl/');
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const id of [
      'demo',
      'demo-candidate',
      'demo-unsupported',
      'demo-invalid',
      'demo-hostile',
    ]) {
      await demo(page, id);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    expect(
      await page.locator('#graph').evaluate((node) => node.scrollWidth > node.clientWidth),
    ).toBe(true);
    await page.locator('#graph').focus();
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() => page.locator('#graph').evaluate((node) => node.scrollLeft))
      .toBeGreaterThan(0);
    await page.locator('#fit').click();
    await page.locator('#zoom-reset').click();
    await expect(page.locator('#zoom-reset')).toHaveText('100%');
    const table = page
      .locator('.ddl-table-doc')
      .first()
      .getByRole('button', { name: /Table 定義/ });
    await table.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#source')).toBeFocused();
  }
  await run(
    page,
    Array.from({ length: 60 }, (_, i) => `ALTER TABLE public.a ADD COLUMN c${i} integer;`).join(
      '\n',
    ),
  );
  await expect(page.locator('.ddl-diagnostic')).toHaveCount(50);
  await page.locator('#diagnostics').getByRole('button', { name: '下一頁', exact: true }).click();
  await expect(page.locator('.ddl-diagnostic')).toHaveCount(10);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
