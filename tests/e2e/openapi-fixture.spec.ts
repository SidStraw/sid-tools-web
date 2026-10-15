import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const doc = (schema: unknown, extra: Record<string, unknown> = {}, path = '/test') =>
  JSON.stringify(
    {
      openapi: '3.0.3',
      info: { title: 'Synthetic private title', version: '1' },
      paths: {
        [path]: {
          get: {
            responses: {
              '200': {
                description: 'Synthetic private description',
                content: { 'application/json': { schema, ...extra } },
              },
            },
          },
        },
      },
    },
    null,
    2,
  );
async function inspect(page: Page, id = 'demo') {
  await page.locator(`#${id}`).click();
  await page.locator('#inspect').click();
  await expect(page.locator('#inspection')).toBeVisible();
}
async function choose(page: Page, path = '/books/~sample') {
  await expect(page.locator('#choices')).toBeVisible();
  for (const [id, value] of [
    ['method', 'GET'],
    ['path', path],
    ['response-status', '200'],
    ['media', 'application/json'],
  ] as const)
    await page.locator(`#${id}`).selectOption(value);
}
async function generate(page: Page, confirmed = true) {
  if (confirmed) await page.locator('#source-confirm').check();
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
}
async function custom(page: Page, source: string, path = '/test') {
  await page.locator('#source').fill(source);
  await page.locator('#inspect').click();
  await choose(page, path);
}
async function download(page: Page, type: 'fixture' | 'summary') {
  await page.locator('#download-confirm').check();
  const event = page.waitForEvent('download');
  await page.locator(`#export-${type}`).click();
  const path = await (await event).path();
  if (!path) throw new Error('Missing download');
  return readFile(path, 'utf8');
}
interface FakeWorker {
  id: number;
  kind: string;
  terminated: boolean;
  options: WorkerOptions;
  reply: (type: string, force?: boolean) => void;
  error: () => void;
  messageError: () => void;
}
const workers = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __fxWorkers: FakeWorker[] }).__fxWorkers.map((item) => ({
      id: item.id,
      kind: item.kind,
      terminated: item.terminated,
      options: item.options,
    })),
  );
async function fakeWorkers(page: Page) {
  await page.evaluate(() => {
    const list: FakeWorker[] = [];
    Object.defineProperty(window, '__fxWorkers', { value: list });
    const location = { pointer: '', start: 0, end: 0, line: 1, column: 1 },
      choice = {
        id: 'synthetic',
        method: 'GET',
        path: '/test',
        status: '200',
        mediaType: 'application/json',
        location,
        responseUse: location,
        responseDefinition: location,
        examples: [],
      };
    const inspection = {
      status: 'ready',
      selections: [choice],
      issues: [],
      supportedScope: [],
      limits: {},
    };
    const report = {
      status: 'ready',
      fixtureJson: '42',
      validation: { status: 'passed', issues: [] },
      selection: choice,
      options: {
        method: 'GET',
        path: '/test',
        status: '200',
        mediaType: 'application/json',
        seed: 'test',
        sourceConfirmedSynthetic: true,
      },
      issues: [],
      provenance: [],
      supportedScope: [],
      limits: {},
    };
    class Fake extends EventTarget {
      id = 0;
      kind = '';
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
      postMessage(data: { id: number; kind: string }) {
        this.id = data.id;
        this.kind = data.kind;
        this.saved = this.onmessage;
      }
      terminate() {
        this.terminated = true;
      }
      reply(type: string, force = false) {
        const callback = force ? this.saved : this.onmessage;
        const result = this.kind === 'inspect' ? inspection : report;
        callback?.(
          new MessageEvent('message', {
            data:
              type === 'failure'
                ? { kind: type, id: this.id, request: this.kind }
                : {
                    kind:
                      type === 'wrong-kind'
                        ? this.kind === 'inspect'
                          ? 'generation'
                          : 'inspection'
                        : this.kind === 'inspect'
                          ? 'inspection'
                          : 'generation',
                    id: type === 'wrong-id' ? this.id - 1 : this.id,
                    result: type === 'malformed' ? { status: 'ready' } : result,
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
test('explicit inspection and actual choices only; dedicated real workers, confirmation required and response rules/bounds independently passed', async ({
  page,
}) => {
  const workerUrls: string[] = [];
  page.on('worker', (worker) => workerUrls.push(worker.url()));
  await page.goto('tools/openapi-fixture/');
  await expect(page.locator('#route-loading')).toBeHidden();
  expect(workerUrls).toEqual([]);
  await page.locator('#demo').click();
  expect(workerUrls).toEqual([]);
  await expect(page.locator('#source-confirm')).not.toBeChecked();
  await page.locator('#inspect').click();
  await expect(page.locator('#choices')).toBeVisible();
  expect(workerUrls).toHaveLength(1);
  expect(workerUrls[0]).toMatch(/openapi-fixture\.worker-/);
  await expect(page.locator('#method')).toHaveValue('');
  await expect(page.locator('#run')).toBeDisabled();
  await choose(page);
  await generate(page, false);
  await expect(page.locator('#report-state')).toHaveAttribute(
    'data-state',
    'confirmation-required',
  );
  await expect(page.locator('#export-fixture')).toBeDisabled();
  await expect(page.locator('#export-summary')).toBeDisabled();
  await page.locator('#source-confirm').check();
  await expect(page.locator('#output')).toBeHidden();
  await page.locator('#array-length').fill('3');
  await generate(page);
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'ready');
  await expect(page.locator('#validation-state')).toHaveAttribute('data-state', 'passed');
  const fixture = JSON.parse(await page.locator('#fixture').innerText()) as {
    id: number;
    kind: string;
    tags: number[];
    secret?: unknown;
  };
  expect(fixture.id).toBeGreaterThanOrEqual(10);
  expect(fixture.id).toBeLessThanOrEqual(99);
  expect(fixture.kind).toMatch(/paper|ebook/);
  expect(fixture.tags).toHaveLength(3);
  expect(new Set(fixture.tags).size).toBe(3);
  expect(fixture).not.toHaveProperty('secret');
  await expect(page.locator('.fx-provenance[data-kind=enum]')).toContainText('user-asserted');
  expect(workerUrls.length).toBe(3);
  await expect.poll(() => page.workers().length).toBe(0);
});
test('same document/options/seed byte identity, canonical key reorder, eligible seed change and option edits drop fixture but keep inspection', async ({
  page,
}) => {
  await page.goto('tools/openapi-fixture/');
  await custom(page, doc({ type: 'integer', minimum: 0, maximum: 100000 }));
  await generate(page);
  const first = await page.locator('#fixture').innerText();
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  expect(await page.locator('#fixture').innerText()).toBe(first);
  await page.locator('#seed').fill('different-seed');
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#choices')).toBeVisible();
  await generate(page);
  expect(await page.locator('#fixture').innerText()).not.toBe(first);
  await page.locator('#seed').fill('fixture-study');
  const parsed = JSON.parse(doc({ type: 'integer', minimum: 0, maximum: 100000 })) as Record<
    string,
    unknown
  >;
  await custom(page, JSON.stringify(Object.fromEntries(Object.entries(parsed).reverse())));
  await generate(page);
  expect(await page.locator('#fixture').innerText()).toBe(first);
  await page.locator('#array-length').fill('101');
  await generate(page);
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'limit');
  await expect(page.locator('#export-fixture')).toBeDisabled();
});
test('valid inline and sorted named examples keep priority over seed; named explicit selection; copied provenance and separate source selection', async ({
  page,
}) => {
  await page.goto('tools/openapi-fixture/');
  await inspect(page, 'demo-inline');
  await choose(page);
  await generate(page);
  await expect(page.locator('#fixture')).toHaveText('{"title":"Synthetic library copy"}');
  await expect(page.locator('.fx-provenance[data-kind=media-example]')).toHaveAttribute(
    'data-outcome',
    'used',
  );
  await page.locator('#seed').fill('changed');
  await generate(page);
  await expect(page.locator('#fixture')).toHaveText('{"title":"Synthetic library copy"}');
  await page
    .locator('.fx-provenance[data-kind=media-example] button')
    .filter({ hasText: '定義 ·' })
    .click();
  await expect(page.locator('#source')).toBeFocused();
  expect(
    await page.locator('#source').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toContain('Synthetic library copy');
  await inspect(page, 'demo-named');
  await choose(page);
  await generate(page);
  await expect(page.locator('#fixture')).toHaveText('10');
  await page.locator('#example').selectOption('Zulu');
  await expect(page.locator('#output')).toBeHidden();
  await generate(page);
  await expect(page.locator('#fixture')).toHaveText('90');
  await expect(page.locator('.fx-provenance[data-kind=named-example]')).toContainText(
    '/examples/Zulu/value',
  );
});
test('invalid example fallback retains rejected warnings even validationpassed, defaults ignored; schema example/localref actual definition range', async ({
  page,
}) => {
  await page.goto('tools/openapi-fixture/');
  await inspect(page, 'demo-fallback');
  await choose(page);
  await generate(page);
  await expect(page.locator('#validation-state')).toHaveAttribute('data-state', 'passed');
  expect(Number(await page.locator('#fixture').innerText())).toBeGreaterThanOrEqual(10);
  expect(Number(await page.locator('#fixture').innerText())).toBeLessThanOrEqual(20);
  await expect(page.locator('.fx-provenance[data-kind=media-example]')).toHaveAttribute(
    'data-outcome',
    'rejected',
  );
  await expect(page.locator('#report-issues')).toContainText('default-not-an-example');
  await expect(page.locator('#report-issues')).toContainText('example');
  await inspect(page, 'demo-schema');
  await choose(page);
  await generate(page);
  await expect(page.locator('#fixture')).toHaveText('{"title":"Synthetic schema example"}');
  const row = page.locator('.fx-provenance[data-kind=schema-example]');
  await expect(row).toContainText('/components/schemas/Book~1copy~0/example');
  await row.locator('button').filter({ hasText: '定義 ·' }).click();
  await expect(page.locator('#source')).toBeFocused();
  expect(
    await page.locator('#source').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toContain('Synthetic schema example');
});
test('inspectionready is not supported schema; oneOf/format/external/cycle refuse fixture; invalid/version/limit never invented choices', async ({
  page,
}) => {
  await page.goto('tools/openapi-fixture/');
  await inspect(page, 'demo-unsupported');
  await expect(page.locator('#inspection-state')).toContainText('Inspection ready');
  for (const path of ['/oneOf', '/format', '/external', '/cycle']) {
    await choose(page, path);
    await generate(page);
    await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'unsupported');
    await expect(page.locator('#fixture')).toContainText('無可用 fixture');
    await expect(page.locator('#export-fixture')).toBeDisabled();
    await expect(page.locator('#export-summary')).toBeDisabled();
  }
  for (const [id, status] of [
    ['demo-invalid', 'invalid'],
    ['demo-version', 'unsupported'],
  ] as const) {
    await inspect(page, id);
    await expect(page.locator('#inspection-state')).toContainText(`Inspection ${status}`);
    await expect(page.locator('#choices')).toBeHidden();
    await expect(page.locator('#output')).toBeHidden();
  }
  await page.locator('#source').fill('['.repeat(5000) + ']'.repeat(5000));
  await page.locator('#inspect').click();
  await expect(page.locator('#inspection-state')).toContainText('Inspection limit');
  await expect(page.locator('#choices')).toBeHidden();
  await custom(page, doc({ type: 'integer', enum: [1], minimum: 2 }));
  await generate(page);
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'no-valid-fixture');
});
test('fixture download contains values, summary projection omits literals/rawdata, sensitive seed metadata disclosed; consent/timer/reset/dispose URLcleanup', async ({
  page,
}) => {
  await page.goto('tools/openapi-fixture/');
  await page.evaluate(() => {
    const created: string[] = [],
      revoked: string[] = [];
    Object.defineProperty(window, '__fxUrls', { value: { created, revoked } });
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
  await inspect(page, 'demo-inline');
  await choose(page);
  await generate(page);
  await expect(page.locator('#export-fixture')).toBeDisabled();
  await expect(page.locator('#export-summary')).toBeDisabled();
  const fixture = await download(page, 'fixture');
  expect(fixture).toBe('{"title":"Synthetic library copy"}');
  const summary = await download(page, 'summary');
  expect(summary).not.toContain('Synthetic library copy');
  expect(summary).not.toContain('fixtureJson');
  expect(summary).not.toContain('Synthetic fixture study');
  expect(summary).toContain('fixture-study');
  expect(summary).toContain('media-example');
  const data = JSON.parse(summary) as object;
  expect(data).not.toHaveProperty('source');
  expect(data).not.toHaveProperty('fixtureJson');
  await expect
    .poll(() =>
      page.evaluate(() => {
        const state = (window as unknown as { __fxUrls: { created: string[]; revoked: string[] } })
          .__fxUrls;
        return state.created.every((url) => state.revoked.includes(url));
      }),
    )
    .toBe(true);
  await download(page, 'fixture');
  await page.locator('#seed').fill('edited');
  await expect(page.locator('#download-confirm')).not.toBeChecked();
  await expect(page.locator('#output')).toBeHidden();
  await generate(page);
  await download(page, 'summary');
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'OpenAPI 差異', exact: true })
    .click();
  await expect(page.locator('#before')).toBeAttached();
  expect(
    await page.evaluate(() => {
      const state = (window as unknown as { __fxUrls: { created: string[]; revoked: string[] } })
        .__fxUrls;
      return state.created.every((url) => state.revoked.includes(url));
    }),
  ).toBe(true);
  await page.goBack();
  await expect(page.locator('#source')).toHaveValue('');
  await expect(page.locator('#source-confirm')).not.toBeChecked();
  await page.reload();
  await expect(page.locator('#source')).toHaveValue('');
});
test('no remote ref fetch/storage/query/hash/log or HTMLexecution; hostile source values stay literal and privacy survives clear', async ({
  page,
  context,
}) => {
  await page.goto('tools/openapi-fixture/');
  await expect(page.locator('#route-loading')).toBeHidden();
  const requests: string[] = [],
    logs: string[] = [],
    errors: string[] = [];
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
  const hostile = '<img src=x onerror=window.__fixtureSentinel=1>';
  await custom(page, doc({ type: 'string' }, { example: hostile }, '/' + hostile), '/' + hostile);
  await generate(page);
  await expect(page.locator('#fixture')).toContainText(hostile);
  await expect(page.locator('.fx-main img,.fx-main script,.fx-main iframe')).toHaveCount(0);
  await inspect(page, 'demo-unsupported');
  await choose(page, '/external');
  await generate(page);
  expect(requests).toEqual([]);
  expect(logs.join('')).not.toContain(hostile);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(() => [
      (window as unknown as { __fixtureSentinel?: number }).__fixtureSentinel,
      localStorage.length,
      sessionStorage.length,
      location.search,
      location.hash,
    ]),
  ).toEqual([undefined, 0, 0, '', '']);
  await page.locator('#clear').click();
  await expect(page.locator('#source')).toHaveValue('');
  await expect(page.locator('#inspection')).toBeHidden();
  await expect(page.locator('#source-confirm')).not.toBeChecked();
});
test('worker expectedkind/revision/shape guards, newrequest/source/options/confirmation/cancel/clear/dispose termination and forced late replies', async ({
  page,
}) => {
  await page.goto('tools/openapi-fixture/');
  await expect(page.locator('#route-loading')).toBeHidden();
  await fakeWorkers(page);
  await page.locator('#demo').click();
  await page.locator('#inspect').click();
  await page.locator('#inspect').click();
  expect((await workers(page))[0]?.terminated).toBe(true);
  expect((await workers(page))[1]?.options.type).toBe('module');
  await page.evaluate(() => {
    const list = (window as unknown as { __fxWorkers: FakeWorker[] }).__fxWorkers;
    list[0]!.reply('ok', true);
    for (const kind of ['wrong-kind', 'wrong-id', 'malformed']) list[1]!.reply(kind);
  });
  await expect(page.locator('#inspection')).toBeHidden();
  await page.evaluate(() =>
    (window as unknown as { __fxWorkers: FakeWorker[] }).__fxWorkers[1]!.reply('ok'),
  );
  await choose(page, '/test');
  await page.locator('#source-confirm').check();
  await page.locator('#run').click();
  await page.locator('#seed').fill('changed');
  expect((await workers(page))[2]?.terminated).toBe(true);
  await page.evaluate(() =>
    (window as unknown as { __fxWorkers: FakeWorker[] }).__fxWorkers[2]!.reply('ok', true),
  );
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#choices')).toBeVisible();
  await page.locator('#run').click();
  await page.locator('#source-confirm').uncheck();
  expect((await workers(page))[3]?.terminated).toBe(true);
  await page.locator('#run').click();
  await page.locator('#cancel').click();
  expect((await workers(page))[4]?.terminated).toBe(true);
  await expect(page.locator('#status')).toContainText('已取消');
  await page.locator('#run').click();
  await page.locator('#source').fill(doc({ type: 'string' }));
  expect((await workers(page))[5]?.terminated).toBe(true);
  await expect(page.locator('#choices')).toBeHidden();
  await expect(page.locator('#source-confirm')).not.toBeChecked();
  await page.locator('#inspect').click();
  await page.locator('#clear').click();
  expect((await workers(page))[6]?.terminated).toBe(true);
  await page.locator('#inspect').click();
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'OpenAPI 差異', exact: true })
    .click();
  await expect(page.locator('#before')).toBeAttached();
  expect((await workers(page))[7]?.terminated).toBe(true);
  await page.evaluate(() =>
    (window as unknown as { __fxWorkers: FakeWorker[] }).__fxWorkers[7]!.reply('ok', true),
  );
  await page.goBack();
  await expect(page.locator('#source')).toHaveValue('');
  await expect(page.locator('#inspection')).toBeHidden();
});
test('20s timeout/error/messageerror/failure/construct failure honest; actual failed worker load never mainthread fallback', async ({
  page,
}) => {
  await page.goto('tools/openapi-fixture/');
  await expect(page.locator('#route-loading')).toBeHidden();
  await page.clock.install();
  await fakeWorkers(page);
  await page.locator('#inspect').click();
  await page.clock.fastForward(20001);
  await expect(page.locator('#error')).toContainText('20 秒');
  expect((await workers(page))[0]?.terminated).toBe(true);
  await page.evaluate(() =>
    (window as unknown as { __fxWorkers: FakeWorker[] }).__fxWorkers[0]!.reply('ok', true),
  );
  await expect(page.locator('#inspection')).toBeHidden();
  for (const [index, method, text] of [
    [1, 'error', '載入或執行失敗'],
    [2, 'messageError', '訊息無法讀取'],
    [3, 'reply', '無法完成工作'],
  ] as const) {
    await page.locator('#inspect').click();
    await page.evaluate(
      ({ index, method }) => {
        const item = (window as unknown as { __fxWorkers: FakeWorker[] }).__fxWorkers[index]!;
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
  await page.locator('#inspect').click();
  await expect(page.locator('#error')).toContainText('無法啟動');
  await page.reload();
  await page.route('**/assets/openapi-fixture.worker-*.js', (route) => route.abort());
  await page.locator('#inspect').click();
  await expect(page.locator('#error')).toContainText('載入或執行失敗');
  await expect(page.locator('#inspection')).toBeHidden();
});
test('delayed export import cannot revive edited fixture; helper/download failure no raw fallback', async ({
  page,
}) => {
  await page.goto('tools/openapi-fixture/');
  await inspect(page, 'demo-inline');
  await choose(page);
  await generate(page);
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/openapi-fixture-*.js', async (route) => {
    await gate;
    await route.continue();
  });
  const downloads: string[] = [];
  page.on('download', (item) => downloads.push(item.suggestedFilename()));
  await page.locator('#download-confirm').check();
  await page.locator('#export-fixture').click();
  await expect(page.locator('#export-status')).toContainText('載入');
  await page.locator('#seed').fill('new');
  release();
  await generate(page);
  expect(downloads).toEqual([]);
  await page.locator('#download-confirm').check();
  await page.evaluate(() => {
    URL.createObjectURL = () => {
      throw new Error('Synthetic Blob refusal');
    };
  });
  await page.locator('#export-summary').click();
  await expect(page.locator('#export-status')).toContainText('不退回原始 report');
  expect(downloads).toEqual([]);
});
test('320/390 containment, keyboard source interaction, provenance and selection lists bounded/paginated', async ({
  page,
}) => {
  await page.goto('tools/openapi-fixture/');
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const id of ['demo-inline', 'demo-fallback', 'demo-unsupported']) {
      await inspect(page, id);
      await choose(page, id === 'demo-unsupported' ? '/format' : '/books/~sample');
      await generate(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await inspect(page, 'demo-schema');
    await choose(page);
    await generate(page);
    const source = page.locator('.fx-provenance button').filter({ hasText: '定義 ·' });
    await source.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#source')).toBeFocused();
    expect(
      await page.locator('#source').evaluate((node) => {
        const input = node as HTMLTextAreaElement;
        return input.selectionEnd > input.selectionStart;
      }),
    ).toBe(true);
  }
  await custom(
    page,
    doc({
      type: 'object',
      required: Array.from({ length: 60 }, (_, i) => `p${i}`),
      properties: Object.fromEntries(
        Array.from({ length: 60 }, (_, i) => [`p${i}`, { type: 'integer', enum: [i] }]),
      ),
    }),
  );
  await generate(page);
  await expect(page.locator('.fx-provenance')).toHaveCount(50);
  await page.locator('#provenance').getByRole('button', { name: '下一頁' }).click();
  await expect(page.locator('.fx-provenance')).toHaveCount(11);
  const paths = Object.fromEntries(
    Array.from({ length: 60 }, (_, i) => [
      `/p${String(i).padStart(2, '0')}`,
      {
        get: {
          responses: {
            '200': {
              description: 'Synthetic',
              content: { 'application/json': { schema: { type: 'integer' } } },
            },
          },
        },
      },
    ]),
  );
  await page
    .locator('#source')
    .fill(JSON.stringify({ openapi: '3.0.3', info: { title: 'Synthetic', version: '1' }, paths }));
  await page.locator('#inspect').click();
  await expect(page.locator('#choices')).toBeVisible();
  await page.locator('#method').selectOption('GET');
  await expect(page.locator('#path option')).toHaveCount(51);
  await page.getByRole('button', { name: 'Path 下一批', exact: true }).click();
  await expect(page.locator('#path option')).toHaveCount(11);
  await page.locator('#path').selectOption('/p59');
  await page.locator('#response-status').selectOption('200');
  await page.locator('#media').selectOption('application/json');
  await generate(page);
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'ready');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('actual status/JSONmedia identities and response ref navigation; externalValue refuses; literal enum/default absent from metadata summary and helper-load failure safe', async ({
  page,
}) => {
  await page.goto('tools/openapi-fixture/');
  const source = JSON.stringify(
    {
      openapi: '3.0.3',
      info: { title: 'Synthetic', version: '1' },
      paths: {
        '/ref': { get: { responses: { default: { $ref: '#/components/responses/Shared' } } } },
      },
      components: {
        responses: {
          Shared: {
            description: 'Synthetic',
            content: {
              'application/vnd.synthetic+json; charset=utf-8': {
                schema: {
                  type: 'string',
                  enum: ['Synthetic-private-enum'],
                  default: 'Synthetic-private-default',
                },
              },
              'text/plain': { schema: { type: 'string' } },
            },
          },
        },
      },
    },
    null,
    2,
  );
  await page.locator('#source').fill(source);
  await page.locator('#inspect').click();
  await expect(page.locator('#choices')).toBeVisible();
  await page.locator('#method').selectOption('GET');
  await page.locator('#path').selectOption('/ref');
  await expect(page.locator('#response-status option')).toHaveText(['請選擇 Status', 'default']);
  await page.locator('#response-status').selectOption('default');
  await expect(page.locator('#media option')).toHaveText([
    '請選擇 Media',
    'application/vnd.synthetic+json; charset=utf-8',
  ]);
  await page.locator('#media').selectOption('application/vnd.synthetic+json; charset=utf-8');
  await page.locator('#selection-detail button').filter({ hasText: 'Response 使用點 ·' }).click();
  expect(
    await page.locator('#source').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toContain('$ref');
  await page.locator('#selection-detail button').filter({ hasText: 'Response 定義 ·' }).click();
  expect(
    await page.locator('#source').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toContain('application/vnd.synthetic+json');
  await generate(page);
  expect(await download(page, 'fixture')).toBe('"Synthetic-private-enum"');
  const summary = await download(page, 'summary');
  expect(summary).not.toContain('Synthetic-private-enum');
  expect(summary).not.toContain('Synthetic-private-default');
  expect(summary).toContain('default-not-an-example');
  await custom(
    page,
    doc(
      { type: 'string' },
      {
        examples: { remote: { externalValue: 'https://invalid.example/synthetic-external.json' } },
      },
    ),
  );
  await generate(page);
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'unsupported');
  await expect(page.locator('#export-fixture')).toBeDisabled();
  await page.reload();
  await inspect(page, 'demo-inline');
  await choose(page);
  await generate(page);
  await page.route('**/assets/openapi-fixture-*.js', (route) => route.abort());
  await page.locator('#download-confirm').check();
  await page.locator('#export-fixture').click();
  await expect(page.locator('#export-status')).toContainText('不匯出原始 report');
});
