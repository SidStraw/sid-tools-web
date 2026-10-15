import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const doc = (paths: unknown = {}, schemas?: unknown) =>
  JSON.stringify(
    {
      openapi: '3.0.3',
      info: { title: 'Synthetic', version: '1' },
      paths,
      ...(schemas ? { components: { schemas } } : {}),
    },
    null,
    2,
  );
const response = (schema: unknown) => ({
  description: 'Synthetic',
  content: { 'application/json': { schema } },
});
const both = (schema: unknown) => ({
  post: {
    requestBody: { content: { 'application/json': { schema } } },
    responses: { '200': response(schema) },
  },
});
async function compare(page: Page, before: string, after: string) {
  await page.locator('#before').fill(before);
  await page.locator('#after').fill(after);
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
}
async function demo(page: Page, id = 'demo') {
  await page.locator(`#${id}`).click();
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
}
const finding = (page: Page, rule: string, direction: string) =>
  page.locator(`.oas-finding[data-rule="${rule}"][data-direction="${direction}"]`);
for (const position of ['paths', 'responses'] as const) {
  test(`actual worker keeps changed ${position} extensions unknown in issues and exported status`, async ({
    page,
  }) => {
    const actualWorkers: string[] = [];
    page.on('worker', (worker) => actualWorkers.push(worker.url()));
    await page.goto('tools/openapi/');
    const source = (value: number) =>
      doc(
        position === 'paths'
          ? { '/x': { get: { responses: { '200': { description: 'ok' } } } }, 'x-policy': value }
          : { '/x': { get: { responses: { '200': { description: 'ok' }, 'x-policy': value } } } },
      );
    await compare(page, source(1), source(2));
    expect(actualWorkers).toHaveLength(1);
    expect(actualWorkers[0]).toMatch(/openapi\.worker-/);
    await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'unknown');
    await expect(page.locator('.oas-count[data-category=unknown] strong')).toHaveText('0');
    await expect(page.locator('#summary')).toContainText('計數即使為 0');
    const pointer = position === 'paths' ? '/paths/x-policy' : '/paths/~1x/get/responses/x-policy';
    for (const side of [0, 1]) {
      const issues = page.locator('#issues > section').nth(side);
      await expect(issues).toContainText('extension-semantics-unknown');
      await expect(issues).toContainText(pointer);
    }
    await page.locator('#export-confirm').check();
    const download = page.waitForEvent('download');
    await page.locator('#export').click();
    const path = await (await download).path();
    if (!path) throw new Error('Missing extension summary export');
    const summary = JSON.parse(await readFile(path, 'utf8')) as {
      status: string;
      counts: { unknown: number };
    };
    expect(summary).toMatchObject({ status: 'unknown', counts: { unknown: 0 } });
    await expect.poll(() => page.workers().length).toBe(0);
  });
}
interface FakeWorker {
  id: number;
  terminated: boolean;
  options: WorkerOptions;
  reply: (kind: string, force?: boolean) => void;
  error: () => void;
  messageError: () => void;
}
const workers = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __oasWorkers: FakeWorker[] }).__oasWorkers.map((worker) => ({
      id: worker.id,
      terminated: worker.terminated,
      options: worker.options,
    })),
  );
async function fakeWorkers(page: Page) {
  await page.evaluate(() => {
    const instances: FakeWorker[] = [];
    Object.defineProperty(window, '__oasWorkers', { value: instances });
    const result = {
      status: 'complete',
      before: { status: 'valid', version: '3.0.3', issues: [], refs: 0 },
      after: { status: 'valid', version: '3.0.3', issues: [], refs: 0 },
      findings: [],
      counts: { breaking: 0, 'non-breaking': 0, review: 0, unknown: 0 },
      rules: [],
      limits: {},
    };
    class Fake extends EventTarget {
      id = 0;
      terminated = false;
      options: WorkerOptions;
      onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
      onerror: (() => void) | null = null;
      onmessageerror: (() => void) | null = null;
      saved: ((event: MessageEvent<unknown>) => void) | null = null;
      constructor(_url: string | URL, options: WorkerOptions = {}) {
        super();
        this.options = options;
        instances.push(this);
      }
      postMessage(data: { id: number }) {
        this.id = data.id;
        this.saved = this.onmessage;
      }
      terminate() {
        this.terminated = true;
      }
      reply(kind: string, force = false) {
        const callback = force ? this.saved : this.onmessage;
        callback?.(
          new MessageEvent('message', {
            data:
              kind === 'wrong-revision'
                ? { kind: 'result', id: this.id - 1, report: result }
                : kind === 'malformed'
                  ? { kind: 'result', id: this.id, report: { status: 'complete' } }
                  : { kind, id: this.id, report: result },
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
test('Run-only dedicated module worker executes actual comparison; direction and reasons distinguish required/type/nullable/enum changes', async ({
  page,
}) => {
  const actualWorkers: string[] = [];
  page.on('worker', (worker) => actualWorkers.push(worker.url()));
  await page.goto('tools/openapi/');
  await expect(page.locator('#route-loading')).toBeHidden();
  expect(actualWorkers).toEqual([]);
  await page.locator('#demo').click();
  expect(actualWorkers).toEqual([]);
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  expect(actualWorkers).toHaveLength(1);
  expect(actualWorkers[0]).toMatch(/openapi\.worker-/);
  expect(actualWorkers[0]).not.toContain('tools.worker');
  await expect(finding(page, 'required-property-added', 'request')).toHaveAttribute(
    'data-category',
    'breaking',
  );
  await expect(finding(page, 'required-property-added', 'response')).toHaveAttribute(
    'data-category',
    'non-breaking',
  );
  await expect(finding(page, 'schema-type-changed', 'request')).toHaveAttribute(
    'data-category',
    'breaking',
  );
  await expect(finding(page, 'schema-type-changed', 'response')).toHaveAttribute(
    'data-category',
    'non-breaking',
  );
  await expect(finding(page, 'nullable-changed', 'request')).toHaveAttribute(
    'data-category',
    'breaking',
  );
  await expect(finding(page, 'nullable-changed', 'response')).toHaveAttribute(
    'data-category',
    'non-breaking',
  );
  await expect(finding(page, 'enum-values-added', 'request')).toHaveAttribute(
    'data-category',
    'non-breaking',
  );
  await expect(finding(page, 'enum-values-added', 'response')).toHaveAttribute(
    'data-category',
    'review',
  );
  await finding(page, 'enum-values-added', 'response').getByRole('button').click();
  await expect(page.locator('#finding-detail')).toContainText('exhaustive clients');
  await expect(page.locator('#finding-detail')).toContainText('before 1 → after 2');
  await expect(page.locator('#status')).toContainText('worker 已終止');
  await expect.poll(() => page.workers().length).toBe(0);
  await page.locator('#direction').selectOption('response');
  await page.locator('#category').selectOption('review');
  await expect(page.locator('.oas-finding')).toHaveCount(1);
  await page.locator('#operation-search').fill('not-present');
  await expect(page.locator('.oas-finding')).toHaveCount(0);
});
test('reverse request/response rules, required parameters, endpoint removal and response statuses retain explicit category/reason', async ({
  page,
}) => {
  await page.goto('tools/openapi/');
  const old = {
      type: 'object',
      required: ['x'],
      properties: {
        x: { type: 'integer' },
        n: { type: 'string', nullable: false },
        e: { type: 'string', enum: ['A', 'B'] },
      },
    },
    next = {
      type: 'object',
      properties: {
        x: { type: 'number' },
        n: { type: 'string', nullable: true },
        e: { type: 'string', enum: ['A'] },
      },
    };
  await compare(page, doc({ '/x': both(old) }), doc({ '/x': both(next) }));
  for (const rule of [
    'required-property-removed',
    'schema-type-changed',
    'nullable-changed',
    'enum-values-removed',
  ]) {
    await expect(finding(page, rule, 'request')).toHaveAttribute(
      'data-category',
      rule === 'enum-values-removed' ? 'breaking' : 'non-breaking',
    );
    await expect(finding(page, rule, 'response')).toHaveAttribute(
      'data-category',
      rule === 'enum-values-removed' ? 'non-breaking' : 'breaking',
    );
  }
  const operation = (required: boolean) => ({
    get: {
      parameters: [{ in: 'query', name: 'q', required, schema: { type: 'string' } }],
      responses: { '200': { description: 'ok' } },
    },
  });
  await compare(
    page,
    doc({ '/x': operation(false), '/removed': operation(false) }),
    doc({ '/x': operation(true) }),
  );
  await expect(finding(page, 'operation-removed', 'contract')).toHaveAttribute(
    'data-category',
    'breaking',
  );
  await expect(finding(page, 'parameter-required-changed', 'request')).toHaveAttribute(
    'data-category',
    'breaking',
  );
  await compare(
    page,
    doc({ '/x': { get: { responses: { '200': { description: 'ok' } } } } }),
    doc({ '/x': { get: { responses: { '201': { description: 'new' } } } } }),
  );
  await expect(finding(page, 'response-status-added', 'response')).toHaveAttribute(
    'data-category',
    'review',
  );
  await expect(finding(page, 'response-status-removed', 'response')).toHaveAttribute(
    'data-category',
    'breaking',
  );
});
test('shared local ref pointer escaping/use-sites/definitions select original ranges; affected operations bounded first20 plus actual count', async ({
  page,
}) => {
  await page.goto('tools/openapi/');
  await demo(page, 'demo-shared');
  await finding(page, 'required-property-added', 'request').getByRole('button').click();
  await expect(page.locator('#finding-detail')).toContainText(
    '/components/schemas/Book~1item~0/required',
  );
  const definition = page
    .locator('#finding-detail > button')
    .filter({ hasText: '定義 · after /components/schemas/Book~1item~0/required' });
  await definition.click();
  await expect(page.locator('#after')).toBeFocused();
  expect(
    await page.locator('#after').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd).includes('"title"');
    }),
  ).toBe(true);
  await page
    .locator('#finding-detail > button')
    .filter({
      hasText: '使用點 · after /paths/~1books/post/requestBody/content/application~1json/schema ·',
    })
    .click();
  expect(
    await page.locator('#after').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd).includes('"$ref"');
    }),
  ).toBe(true);
  const paths = Object.fromEntries(
    Array.from({ length: 25 }, (_, i) => [
      `/p${i}`,
      { get: { responses: { '200': response({ $ref: '#/components/schemas/Shared' }) } } },
    ]),
  );
  await compare(
    page,
    doc(paths, { Shared: { type: 'string', nullable: false } }),
    doc(paths, { Shared: { type: 'string', nullable: true } }),
  );
  await expect(finding(page, 'nullable-changed', 'response')).toHaveCount(1);
  await expect(page.locator('#finding-detail')).toContainText('25 個（最多列前 20）');
  await expect(page.locator('.oas-use')).toHaveCount(20);
});
test('unknown issues/status remain visible even unknown count0; external and recursive refs never imply equality safety', async ({
  page,
}) => {
  await page.goto('tools/openapi/');
  await demo(page, 'demo-unknown');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'unknown');
  await expect(page.locator('#issues')).toContainText('unresolved-external-ref');
  await expect(page.locator('#findings')).toContainText('recursive');
  const text = doc({
    '/x': {
      get: { responses: { '200': response({ type: 'string', format: 'synthetic-custom' }) } },
    },
  });
  await compare(page, text, text);
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'unknown');
  await expect(page.locator('.oas-count[data-category=unknown] strong')).toHaveText('0');
  await expect(page.locator('#issues')).toContainText('schema-facet-unsupported');
  await expect(page.locator('#summary')).toContainText('計數即使為 0');
  const many = doc({
    '/x': {
      get: {
        responses: {
          '200': response({
            type: 'object',
            properties: Object.fromEntries(
              Array.from({ length: 60 }, (_, i) => [`f${i}`, { type: 'string', format: 'custom' }]),
            ),
          }),
        },
      },
    },
  });
  await compare(page, many, many);
  expect(await page.locator('#issues > section').first().locator('.oas-issue').count()).toBe(50);
  await page.locator('#issues > section').first().getByRole('button', { name: '下一頁' }).click();
  await expect(page.locator('#issues > section').first().locator('.oas-issue')).toHaveCount(10);
});
test('JSON/YAML/reordering equivalent, invalid/unsupported/deep limit distinct from nochange; root valid not full validation', async ({
  page,
}) => {
  await page.goto('tools/openapi/');
  await demo(page, 'demo-equivalent');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'complete');
  await expect(page.locator('.oas-finding')).toHaveCount(0);
  await expect(page.locator('#summary')).toContainText('不代表 compatible');
  await expect(page.locator('#issues')).toContainText('不是完整 OAS validation');
  for (const [id, state] of [
    ['demo-unsupported', 'unsupported'],
    ['demo-invalid', 'invalid'],
    ['demo-deep', 'limit'],
  ] as const) {
    await demo(page, id);
    await expect(page.locator('#report-state')).toHaveAttribute('data-state', state);
    await expect(page.locator('#summary')).toContainText('不等於沒有變更');
    await expect(page.locator('.oas-finding')).toHaveCount(0);
  }
  await compare(page, doc(), '{');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'invalid');
});
test('explicit projected download excludes literals/source/values, structural IDs value-independent, Blob cleaned on reset/dispose and timer', async ({
  page,
}) => {
  await page.goto('tools/openapi/');
  await page.evaluate(() => {
    const created: string[] = [],
      revoked: string[] = [];
    Object.defineProperty(window, '__oasUrls', { value: { created, revoked } });
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
  await compare(
    page,
    doc({
      '/sensitive-name': {
        get: {
          responses: { '200': response({ type: 'string', enum: ['synthetic-private-value'] }) },
        },
      },
    }),
    doc({
      '/sensitive-name': {
        get: {
          responses: {
            '200': response({
              type: 'string',
              enum: ['synthetic-private-value', 'synthetic-second-value'],
            }),
          },
        },
      },
    }),
  );
  await expect(page.locator('#export')).toBeDisabled();
  await page.locator('#export-confirm').check();
  expect(
    await page.locator('#export-confirm').evaluate((node) => node.getBoundingClientRect().width),
  ).toBe(16);
  const download = page.waitForEvent('download');
  await page.locator('#export').click();
  const path = await (await download).path();
  if (!path) throw new Error('Missing export');
  const raw = await readFile(path, 'utf8');
  expect(raw).toContain('sensitive-name');
  expect(raw).not.toContain('synthetic-private-value');
  expect(raw).not.toContain('synthetic-second-value');
  expect(raw).not.toContain('"source"');
  expect(JSON.parse(raw)).not.toHaveProperty('nodes');
  const projection = JSON.parse(raw) as { findings: { id: string }[] };
  for (const entry of projection.findings) expect(entry).not.toHaveProperty('nodes');
  expect(raw).not.toContain('"enum"');
  expect(JSON.parse(raw)).toHaveProperty('status', 'complete');
  await compare(
    page,
    doc({
      '/sensitive-name': {
        get: { responses: { '200': response({ type: 'string', enum: ['C'] }) } },
      },
    }),
    doc({
      '/sensitive-name': {
        get: { responses: { '200': response({ type: 'string', enum: ['C', 'D'] }) } },
      },
    }),
  );
  await expect(page.locator('.oas-finding-button')).toHaveAttribute(
    'data-finding',
    projection.findings[0]!.id,
  );
  await page.locator('#after').fill(doc());
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#export-confirm')).not.toBeChecked();
  expect(
    await page.evaluate(() => {
      const urls = (window as unknown as { __oasUrls: { created: string[]; revoked: string[] } })
        .__oasUrls;
      return urls.created.every((url) => urls.revoked.includes(url));
    }),
  ).toBe(true);
  await demo(page);
  await page.locator('#export-confirm').check();
  const second = page.waitForEvent('download');
  await page.locator('#export').click();
  await second;
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'GraphQL 差異', exact: true })
    .click();
  await expect(page.locator('#demo-variance')).toBeAttached();
  expect(
    await page.evaluate(() => {
      const urls = (window as unknown as { __oasUrls: { created: string[]; revoked: string[] } })
        .__oasUrls;
      return urls.created.every((url) => urls.revoked.includes(url));
    }),
  ).toBe(true);
});
test('hostile names/pointers remain literal, no refs fetch/network/storage/query/hash/logging/dialog/execution', async ({
  page,
  context,
}) => {
  await page.goto('tools/openapi/');
  await expect(page.locator('#route-loading')).toBeHidden();
  const requests: string[] = [],
    errors: string[] = [],
    dialogs: string[] = [],
    logs: string[] = [];
  context.on('request', (request) => {
    if (/^https?:/.test(request.url()) && !new URL(request.url()).pathname.includes('/assets/'))
      requests.push(request.url());
  });
  page.on('pageerror', (issue) => errors.push(issue.message));
  page.on('console', (message) => logs.push(message.text()));
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.type());
    void dialog.dismiss();
  });
  const hostile = '/<img src=x onerror=window.__oasSentinel=1>',
    paths = {
      [hostile]: {
        get: { responses: { '200': response({ $ref: 'https://invalid.example/__oas_canary' }) } },
      },
    };
  await compare(page, doc(paths), doc());
  await expect(page.locator('#findings')).toContainText('<img');
  await expect(page.locator('#finding-detail')).toContainText('<img');
  await expect(page.locator('.oas-main img, .oas-main iframe, .oas-main script')).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as unknown as { __oasSentinel?: number }).__oasSentinel),
  ).toBeUndefined();
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
  expect(dialogs).toEqual([]);
  expect(logs.join('')).not.toContain('__oas_canary');
});
test('worker per-run module options, newrun/edit/clear/cancel/dispose terminate and forced late/unexpected/revision replies cannot resurrect', async ({
  page,
}) => {
  await page.goto('tools/openapi/');
  await expect(page.locator('#route-loading')).toBeHidden();
  await fakeWorkers(page);
  await page.locator('#demo').click();
  await page.locator('#run').click();
  expect((await workers(page))[0]?.options.type).toBe('module');
  await page.locator('#run').click();
  expect((await workers(page))[0]?.terminated).toBe(true);
  await page.evaluate(() => {
    const list = (window as unknown as { __oasWorkers: FakeWorker[] }).__oasWorkers;
    list[0]!.reply('result', true);
    list[1]!.reply('unrelated');
    list[1]!.reply('wrong-revision');
    list[1]!.reply('malformed');
  });
  await expect(page.locator('#output')).toBeHidden();
  await page.evaluate(() =>
    (window as unknown as { __oasWorkers: FakeWorker[] }).__oasWorkers[1]!.reply('result'),
  );
  await expect(page.locator('#output')).toBeVisible();
  expect((await workers(page))[1]?.terminated).toBe(true);
  await page.locator('#run').click();
  await page.locator('#before').fill(doc());
  expect((await workers(page))[2]?.terminated).toBe(true);
  await page.evaluate(() =>
    (window as unknown as { __oasWorkers: FakeWorker[] }).__oasWorkers[2]!.reply('result', true),
  );
  await expect(page.locator('#output')).toBeHidden();
  await page.locator('#run').click();
  await page.locator('#cancel').click();
  expect((await workers(page))[3]?.terminated).toBe(true);
  await expect(page.locator('#status')).toContainText('已取消');
  await expect(page.locator('#before')).not.toHaveValue('');
  await page.locator('#run').click();
  await page.locator('#clear').click();
  expect((await workers(page))[4]?.terminated).toBe(true);
  await expect(page.locator('#before')).toHaveValue('');
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'GraphQL 差異', exact: true })
    .click();
  await expect(page.locator('#demo-variance')).toBeAttached();
  expect((await workers(page))[5]?.terminated).toBe(true);
  await page.evaluate(() =>
    (window as unknown as { __oasWorkers: FakeWorker[] }).__oasWorkers[5]!.reply('result', true),
  );
  await page.goBack();
  await expect(page.locator('#before')).toHaveValue('');
  await expect(page.locator('#output')).toBeHidden();
  await page.reload();
  await expect(page.locator('#after')).toHaveValue('');
});
test('20second worker timeout and worker error/messageerror/failure are honest, no main-thread fallback', async ({
  page,
}) => {
  await page.goto('tools/openapi/');
  await expect(page.locator('#route-loading')).toBeHidden();
  await page.clock.install();
  await fakeWorkers(page);
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await page.clock.fastForward(20001);
  await expect(page.locator('#error')).toContainText('20 秒');
  expect((await workers(page))[0]?.terminated).toBe(true);
  await expect(page.locator('#output')).toBeHidden();
  await page.evaluate(() =>
    (window as unknown as { __oasWorkers: FakeWorker[] }).__oasWorkers[0]!.reply('result', true),
  );
  await expect(page.locator('#output')).toBeHidden();
  for (const [index, method, text] of [
    [1, 'error', '載入或執行失敗'],
    [2, 'messageError', '訊息無法讀取'],
    [3, 'reply', '無法完成比較'],
  ] as const) {
    await page.locator('#run').click();
    await page.evaluate(
      ({ index, method }) => {
        const item = (window as unknown as { __oasWorkers: FakeWorker[] }).__oasWorkers[index]!;
        if (method === 'reply') item.reply('failure');
        else item[method]();
      },
      { index, method },
    );
    await expect(page.locator('#error')).toContainText(text);
    expect((await workers(page))[index]?.terminated).toBe(true);
    await expect(page.locator('#output')).toBeHidden();
  }
  await page.evaluate(() => {
    window.Worker = class {
      constructor() {
        throw new Error('Synthetic load refusal');
      }
    } as unknown as typeof Worker;
  });
  await page.locator('#run').click();
  await expect(page.locator('#error')).toContainText('無法啟動');
  await expect(page.locator('#status')).toContainText('沒有主執行緒解析 fallback');
});
test('actual failed worker script load does not parse on main thread; export helper failure never falls back to raw JSON', async ({
  page,
}) => {
  await page.goto('tools/openapi/');
  await page.route('**/assets/openapi.worker-*.js', (route) => route.abort());
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await expect(page.locator('#error')).toContainText('Worker 載入或執行失敗');
  await expect(page.locator('#output')).toBeHidden();
  await page.unroute('**/assets/openapi.worker-*.js');
  await demo(page);
  await page.locator('#export-confirm').check();
  await page.evaluate(() => {
    URL.createObjectURL = () => {
      throw new Error('Synthetic download refusal');
    };
  });
  await page.locator('#export').click();
  await expect(page.locator('#export-status')).toContainText('不退回原始 report');
});
test('mobile320/390 actual source selection and bounded finding pagination contain long pointers', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('tools/openapi/');
  for (const id of ['demo', 'demo-unknown', 'demo-invalid', 'demo-unsupported']) {
    await demo(page, id);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const paths = Object.fromEntries(
    Array.from({ length: 105 }, (_, i) => [
      `/synthetic/${i}`,
      { get: { responses: { '200': { description: 'ok' } } } },
    ]),
  );
  await compare(page, doc(paths), doc());
  await expect(page.locator('.oas-finding')).toHaveCount(50);
  await page.locator('#findings').getByRole('button', { name: '下一頁' }).click();
  await page.locator('#findings').getByRole('button', { name: '下一頁' }).click();
  await expect(page.locator('.oas-finding')).toHaveCount(5);
  await page.locator('.oas-finding').last().getByRole('button').click();
  await page.locator('#finding-detail > button').filter({ hasText: '使用點 · before' }).click();
  await expect(page.locator('#before')).toBeFocused();
  expect(
    await page.locator('#before').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.selectionEnd > input.selectionStart;
    }),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('delayed exporter import cannot download after clear; successful explicit export Blob timer releases URL', async ({
  page,
}) => {
  await page.goto('tools/openapi/');
  await demo(page);
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/openapi-*.js', async (route) => {
    await gate;
    await route.continue();
  });
  const downloads: string[] = [];
  page.on('download', (download) => downloads.push(download.suggestedFilename()));
  await page.locator('#export-confirm').check();
  await page.locator('#export').click();
  await expect(page.locator('#export-status')).toContainText('準備');
  await page.locator('#clear').click();
  release();
  await expect(page.locator('#output')).toBeHidden();
  await demo(page);
  await expect(page.locator('#export-confirm')).not.toBeChecked();
  expect(downloads).toEqual([]);
  await page.evaluate(() => {
    const revoked: string[] = [];
    Object.defineProperty(window, '__oasRevoked', { value: revoked });
    const original = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = (url) => {
      revoked.push(url);
      original(url);
    };
  });
  await page.locator('#export-confirm').check();
  const download = page.waitForEvent('download');
  await page.locator('#export').click();
  await download;
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __oasRevoked: string[] }).__oasRevoked.length),
    )
    .toBe(1);
});
