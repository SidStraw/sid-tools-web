import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
async function demo(page: Page, id = 'demo') {
  await page.locator(`#${id}`).click();
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
}
async function run(page: Page, value: string) {
  await page.locator('#source').fill(value);
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
}
async function download(page: Page) {
  await page.locator('#export-confirm').check();
  const event = page.waitForEvent('download');
  await page.locator('#export-summary').click();
  const path = await (await event).path();
  if (!path) throw new Error('Missing download');
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
    Object.defineProperty(window, '__composeWorkers', { value: list });
    const report = {
      status: 'complete',
      spec: { snapshot: 'fixed', url: 'fixed' },
      coverage: [],
      limits: {},
      services: [],
      networks: [],
      volumes: [],
      dependencies: [],
      attachments: [],
      cycles: [],
      diagnostics: [],
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
        (force ? this.saved : this.onmessage)?.(
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
    (window as unknown as { __composeWorkers: FakeWorker[] }).__composeWorkers.map((item) => ({
      terminated: item.terminated,
      options: item.options,
    })),
  );

test('Run-only actual dedicated worker distinguishes dependency/network/volume/bind/anonymous and implicit default; no inferred unused attachment', async ({
  page,
}) => {
  const urls: string[] = [];
  page.on('worker', (item) => urls.push(item.url()));
  await page.goto('tools/compose/');
  await expect(page.locator('#route-loading')).toBeHidden();
  expect(urls).toEqual([]);
  await page.locator('#demo').click();
  expect(urls).toEqual([]);
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  expect(urls).toHaveLength(1);
  expect(urls[0]).toMatch(/compose\.worker-/);
  await expect.poll(() => page.workers().length).toBe(0);
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'complete');
  await page.locator('#service').selectOption({ label: 'web' });
  for (const kind of ['dependency', 'network', 'volume', 'bind', 'anonymous'])
    await expect(page.locator(`#graph .cmp-reference[data-kind=${kind}]`)).toHaveCount(1);
  await expect(page.locator('#graph [data-kind=dependency]')).toContainText('service_healthy');
  await expect(page.locator('#graph')).not.toContainText('synthetic-web');
  await expect(page.locator('#references')).not.toContainText('unused');
  await expect(page.locator('#volumes')).toContainText('unused');
  await page.locator('#service').selectOption({ label: 'db' });
  await expect(page.locator('#graph .cmp-reference[data-kind=network]')).toContainText(
    'Implicit default',
  );
  await expect(page.locator('#summary')).toContainText('不是完整 schema');
});
test('actual source ranges select original YAML service, reference and diagnosis with paths/line/UTF16 and keyboard', async ({
  page,
}) => {
  await page.goto('tools/compose/');
  await demo(page);
  await page.locator('#service').selectOption({ label: 'web' });
  const reference = page.locator('#graph .cmp-reference[data-kind=dependency]');
  await reference.getByRole('button', { name: /Dependency 來源/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#source')).toBeFocused();
  const selected = await page.locator('#source').evaluate((node) => {
    const input = node as HTMLTextAreaElement;
    return input.value.slice(input.selectionStart, input.selectionEnd);
  });
  expect(selected).toContain('condition: service_healthy');
  await expect(page.locator('#source-status')).toContainText('/services/web/depends_on/db');
  await page
    .locator('#services [data-service=web]')
    .getByRole('button', { name: /Service 來源/ })
    .click();
  expect(
    await page.locator('#source').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toContain('synthetic-web');
  await demo(page, 'demo-missing');
  await page.locator('#diagnostics button').first().click();
  await expect(page.locator('#source')).toBeFocused();
  await expect(page.locator('#source-status')).toContainText('UTF-16');
});
test('defined optional profiled dependency is conditional not undeclared; external existence notchecked and no profiles selected', async ({
  page,
}) => {
  await page.goto('tools/compose/');
  await demo(page, 'demo-conditional');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'partial');
  const dep = page.locator('#references [data-kind=dependency]');
  await expect(dep).toHaveAttribute('data-status', 'declared');
  await expect(dep).toHaveAttribute('data-conditional', 'true');
  await expect(dep).toContainText('required false');
  await expect(page.locator('.cmp-assumptions')).toContainText('沒有選擇任何 profiles');
  await expect(page.locator('#networks')).toContainText('External true · existence not-checked');
  await expect(page.locator('#volumes')).toContainText('External true · existence not-checked');
  await demo(page, 'demo-missing');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'invalid');
  await expect(page.locator('#graph .cmp-reference[data-status=missing]')).toHaveCount(3);
  await expect(page.locator('#graph .cmp-target')).toHaveCount(0);
  await expect(page.locator('#graph .cmp-reference[data-kind=dependency]')).toContainText(
    'required false',
  );
});
test('declared SCC cycles distinguish unconditional vs conditional without pretending activation/runtime health', async ({
  page,
}) => {
  await page.goto('tools/compose/');
  await demo(page, 'demo-cycles');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'invalid');
  await expect(page.locator('#cycles > div:first-child > .cmp-cycle')).toHaveCount(2);
  await expect(page.locator('#cycles .cmp-cycle[data-conditional=false]')).toContainText(
    'Unconditional SCC',
  );
  await expect(page.locator('#cycles .cmp-cycle[data-conditional=true]')).toContainText(
    'Conditional SCC',
  );
  await expect(page.locator('#cycles')).toContainText('不是啟動順序');
});
test('interpolation never evaluated/defaulted empty; include/extends unknown no fake defaultnetwork; unsupported/aliases/null/limit honest', async ({
  page,
}) => {
  await page.goto('tools/compose/');
  await demo(page, 'demo-unresolved');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'partial');
  await expect(page.locator('#services')).toContainText('image unresolved');
  await expect(page.locator('#references [data-kind=dependency]')).toHaveAttribute(
    'data-status',
    'unresolved',
  );
  await expect(page.locator('#references')).not.toContainText('SYNTHETIC_DEP');
  await expect(page.locator('#networks .cmp-resource-card[data-implicit=true]')).toHaveCount(0);
  await demo(page, 'demo-unsupported');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'partial');
  await expect(page.locator('#references [data-kind=network]')).toHaveCount(0);
  await expect(page.locator('#diagnostics')).not.toContainText('synthetic-private');
  await demo(page, 'demo-invalid');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'invalid');
  await expect(page.locator('#references [data-kind=network]')).toHaveCount(0);
  await demo(page, 'demo-alias');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'partial');
  await expect(page.locator('#services .cmp-service-card')).toHaveCount(0);
  await demo(page, 'demo-limit');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'limit');
  await expect(page.locator('#services .cmp-service-card')).toHaveCount(0);
  await page.locator('#export-confirm').check();
  await expect(page.locator('#export-summary')).toBeDisabled();
});
test('consented actual public-helper summary no YAML/image/env/command/path values, metadata conditional state/spec retained', async ({
  page,
}) => {
  await page.goto('tools/compose/');
  await demo(page, 'demo-conditional');
  await expect(page.locator('#export-summary')).toBeDisabled();
  const value = await download(page),
    json = JSON.parse(value) as {
      format: string;
      status: string;
      services: { name: string; image: string; profiles: string[] }[];
    };
  expect(json.format).toBe('sid-tools/compose-static/v1');
  expect(json.status).toBe('partial');
  expect(json.services.find((item) => item.name === 'db')?.profiles).toEqual(['database']);
  expect(value).not.toContain('synthetic-db');
  expect(value).not.toContain('services:');
  expect(json).not.toHaveProperty('source');
  await run(
    page,
    'services:\n  app:\n    image: synthetic-private-image\n    command: synthetic-private-command\n    environment:\n      TOKEN: synthetic-private-env\n    volumes: [./synthetic-private-bind:/synthetic-private-target]\n',
  );
  const redacted = await download(page);
  expect(redacted).not.toContain('synthetic-private');
  expect(JSON.parse(redacted)).toHaveProperty('status', 'partial');
});
test('hostile names are plain text no user network/storage/query/hash/logging; source and exported identity escaped not executed', async ({
  page,
  context,
}) => {
  await page.goto('tools/compose/');
  await expect(page.locator('#route-loading')).toBeHidden();
  const requests: string[] = [],
    errors: string[] = [],
    logs: string[] = [];
  context.on('request', (request) => {
    if (/^https?:/.test(request.url()) && !new URL(request.url()).pathname.includes('/assets/'))
      requests.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => logs.push(message.text()));
  page.on('dialog', (dialog) => {
    errors.push('dialog');
    void dialog.dismiss();
  });
  await run(
    page,
    'services:\n  "<img src=x onerror=alert(1)>&":\n    image: synthetic-private-image\n    networks: ["<svg onload=alert(1)>"]\nnetworks:\n  "<svg onload=alert(1)>": {}\n',
  );
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'invalid');
  await expect(page.locator('#diagnostics')).toContainText('<img src=x onerror=alert(1)>&');
  await expect(
    page.locator('.cmp-main img,.cmp-main svg,.cmp-main script,.cmp-main iframe'),
  ).toHaveCount(0);
  const value = await download(page);
  expect(JSON.parse(value)).toHaveProperty('services');
  expect(value).toContain('<img src=x onerror=alert(1)>&');
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
});
test('revision/workeridentity/id/kind/shape ignore stale; newrun/edit/cancel/clear/dispose terminate; back/reload empty', async ({
  page,
}) => {
  await page.goto('tools/compose/');
  await expect(page.locator('#route-loading')).toBeHidden();
  await fakeWorkers(page);
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await page.locator('#run').click();
  expect((await workers(page))[0]?.terminated).toBe(true);
  expect((await workers(page))[1]?.options.type).toBe('module');
  await page.evaluate(() => {
    const list = (window as unknown as { __composeWorkers: FakeWorker[] }).__composeWorkers;
    list[0]!.reply('ok', true);
    for (const kind of ['wrong-id', 'wrong-kind', 'malformed']) list[1]!.reply(kind);
  });
  await expect(page.locator('#output')).toBeHidden();
  await page.evaluate(() =>
    (window as unknown as { __composeWorkers: FakeWorker[] }).__composeWorkers[1]!.reply('ok'),
  );
  await expect(page.locator('#output')).toBeVisible();
  expect((await workers(page))[1]?.terminated).toBe(true);
  await page.locator('#run').click();
  await page.locator('#source').fill('services: {}');
  expect((await workers(page))[2]?.terminated).toBe(true);
  await page.evaluate(() =>
    (window as unknown as { __composeWorkers: FakeWorker[] }).__composeWorkers[2]!.reply(
      'ok',
      true,
    ),
  );
  await expect(page.locator('#output')).toBeHidden();
  await page.locator('#run').click();
  await page.locator('#cancel').click();
  expect((await workers(page))[3]?.terminated).toBe(true);
  await expect(page.locator('#source')).toHaveValue('services: {}');
  await page.locator('#run').click();
  await page.locator('#clear').click();
  expect((await workers(page))[4]?.terminated).toBe(true);
  await expect(page.locator('#source')).toHaveValue('');
  await page.locator('#run').click();
  await page.getByRole('navigation').getByRole('link', { name: 'SQL 關聯圖', exact: true }).click();
  await expect(page.locator('.ddl-main')).toBeVisible();
  expect((await workers(page))[5]?.terminated).toBe(true);
  await page.goBack();
  await expect(page.locator('#source')).toHaveValue('');
  await expect(page.locator('#output')).toBeHidden();
  await page.reload();
  await expect(page.locator('#source')).toHaveValue('');
});
test('20second timeout/start/load/error/messageerror/failure no mainthread fallback or late revival', async ({
  page,
}) => {
  await page.goto('tools/compose/');
  await expect(page.locator('#route-loading')).toBeHidden();
  await page.clock.install();
  await fakeWorkers(page);
  await page.locator('#run').click();
  await page.clock.fastForward(20001);
  await expect(page.locator('#error')).toContainText('20 秒');
  expect((await workers(page))[0]?.terminated).toBe(true);
  await page.evaluate(() =>
    (window as unknown as { __composeWorkers: FakeWorker[] }).__composeWorkers[0]!.reply(
      'ok',
      true,
    ),
  );
  await expect(page.locator('#output')).toBeHidden();
  for (const [index, method, text] of [
    [1, 'error', '載入或執行失敗'],
    [2, 'messageError', '訊息無法讀取'],
    [3, 'reply', '無法完成預檢'],
  ] as const) {
    await page.locator('#run').click();
    await page.evaluate(
      ({ index, method }) => {
        const item = (window as unknown as { __composeWorkers: FakeWorker[] }).__composeWorkers[
          index
        ]!;
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
  await page.route('**/assets/compose.worker-*.js', (route) => route.abort());
  await page.locator('#run').click();
  await expect(page.locator('#error')).toContainText('載入或執行失敗');
  await expect(page.locator('#output')).toBeHidden();
});
test('Blob timer/edit/dispose cleanup, delayed helper cannot restore old download; export failure no rawfallback', async ({
  page,
}) => {
  await page.goto('tools/compose/');
  await page.evaluate(() => {
    const created: string[] = [],
      revoked: string[] = [];
    Object.defineProperty(window, '__composeUrls', { value: { created, revoked } });
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
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/compose-*.js', async (route) => {
    await gate;
    await route.continue();
  });
  const downloads: string[] = [];
  page.on('download', (item) => downloads.push(item.suggestedFilename()));
  await page.locator('#export-confirm').check();
  await page.locator('#export-summary').click();
  await page.locator('#source').fill('services: {}');
  release();
  await expect(page.locator('#output')).toBeHidden();
  await demo(page);
  expect(downloads).toEqual([]);
  await download(page);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const state = (
          window as unknown as { __composeUrls: { created: string[]; revoked: string[] } }
        ).__composeUrls;
        return (
          state.created.length > 0 && state.created.every((url) => state.revoked.includes(url))
        );
      }),
    )
    .toBe(true);
  await download(page);
  await page.locator('#source').fill('services: {}');
  expect(
    await page.evaluate(() => {
      const state = (
        window as unknown as { __composeUrls: { created: string[]; revoked: string[] } }
      ).__composeUrls;
      return state.created.every((url) => state.revoked.includes(url));
    }),
  ).toBe(true);
  await demo(page);
  await download(page);
  await page.getByRole('navigation').getByRole('link', { name: 'SQL 關聯圖', exact: true }).click();
  await expect(page.locator('.ddl-main')).toBeVisible();
  expect(
    await page.evaluate(() => {
      const state = (
        window as unknown as { __composeUrls: { created: string[]; revoked: string[] } }
      ).__composeUrls;
      return state.created.every((url) => state.revoked.includes(url));
    }),
  ).toBe(true);
  await page.goBack();
  await demo(page);
  await page.locator('#export-confirm').check();
  await page.evaluate(() => {
    URL.createObjectURL = () => {
      throw new Error('Synthetic failure');
    };
  });
  await page.locator('#export-summary').click();
  await expect(page.locator('#export-status')).toContainText('不退回原始 report');
});
test('failed lazy public helper no rawfallback; coverage cites versioned officialCLI primary vs no-interpolate limitation', async ({
  page,
}) => {
  await page.goto('tools/compose/');
  await demo(page);
  await page.route('**/assets/compose-*.js', (route) => route.abort());
  await page.locator('#export-confirm').check();
  await page.locator('#export-summary').click();
  await expect(page.locator('#export-status')).toContainText('不退回原始 report');
  await page.getByText('覆蓋範圍與官方 CLI 固定案例', { exact: true }).click();
  await expect(page.locator('.cmp-main details')).toContainText('v5.5.0');
  await expect(page.locator('.cmp-main details')).toContainText('--no-interpolate');
  await expect(page.locator('.cmp-main details')).toContainText('exit 0 不能作為一致性證明');
});
test('320/390 layout contains graph and complete accessible lists, long names not truncated; 60 mounts plus default paginate50+11', async ({
  page,
}) => {
  await page.goto('tools/compose/');
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const id of [
      'demo',
      'demo-conditional',
      'demo-missing',
      'demo-unresolved',
      'demo-cycles',
    ]) {
      await demo(page, id);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.locator('#services .cmp-source').first().focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#source')).toBeFocused();
  }
  const name = 'Long-name_'.repeat(15);
  await run(
    page,
    `services:\n  "${name}":\n    image: synthetic\n    volumes:\n${Array.from({ length: 60 }, (_, i) => `      - /synthetic${i}`).join('\n')}\n`,
  );
  await expect(page.locator('#services')).toContainText(name);
  await expect(page.locator('#references .cmp-reference')).toHaveCount(50);
  await page.locator('#references').getByRole('button', { name: '下一頁', exact: true }).click();
  await expect(page.locator('#references .cmp-reference')).toHaveCount(11);
  await expect(page.locator('#graph .cmp-reference')).toHaveCount(51);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(JSON.parse(await download(page)).attachments.length).toBe(61);
});
