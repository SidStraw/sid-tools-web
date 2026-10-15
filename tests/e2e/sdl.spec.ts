import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
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
const change = (page: Page, code: string) => page.locator(`.sdl-change[data-code="${code}"]`);
test('fixed review compares type/field/enum and explains classes separately from static coverage', async ({
  page,
}) => {
  await page.goto('tools/sdl/');
  await demo(page);
  await expect(change(page, 'FIELD_REMOVED')).toHaveAttribute('data-category', 'breaking');
  await expect(change(page, 'FIELD_CHANGED_KIND')).toHaveAttribute('data-category', 'breaking');
  await expect(change(page, 'FIELD_ADDED')).toHaveAttribute('data-category', 'non-breaking');
  await expect(page.locator('.sdl-change[data-category=dangerous]')).toHaveCount(1);
  await change(page, 'FIELD_REMOVED').click();
  await expect(page.locator('#change-detail')).toContainText('legacyCode');
  await expect(page.locator('#change-detail')).toHaveAttribute('data-mapping', 'exact');
  await page.locator('#change-detail .sdl-source').filter({ hasText: 'Before · L' }).click();
  await expect(page.locator('#before')).toBeFocused();
  expect(
    await page.locator('#before').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toBe('legacyCode: String');
  await page.locator('#category').selectOption('dangerous');
  await expect(page.locator('.sdl-change')).toHaveCount(1);
  await expect(page.locator('#change-detail')).toContainText('AUDIO');
  await expect(page.locator('#output')).toContainText('不等於 operational compatibility');
  await compare(
    page,
    'type Query { f: String } type Old { value: String }',
    'type Query { f: String } type New { value: String }',
  );
  await expect(change(page, 'TYPE_REMOVED')).toBeVisible();
  await expect(change(page, 'TYPE_ADDED')).toBeVisible();
});
test('fixed input/output and default/argument examples preserve corrected variance and default reasons', async ({
  page,
}) => {
  await page.goto('tools/sdl/');
  await demo(page, 'demo-variance');
  await expect(change(page, 'FIELD_CHANGED_KIND_SAFE')).toHaveAttribute(
    'data-category',
    'non-breaking',
  );
  await expect(change(page, 'FIELD_CHANGED_KIND')).toHaveAttribute('data-category', 'breaking');
  await expect(page.locator('.sdl-rules')).toContainText('String → String!：non-breaking');
  await expect(page.locator('.sdl-rules')).toContainText('String → String!：breaking');
  await demo(page, 'demo-defaults');
  await expect(change(page, 'ARG_DEFAULT_VALUE_CHANGE')).toHaveAttribute(
    'data-category',
    'dangerous',
  );
  await expect(change(page, 'OPTIONAL_ARG_ADDED')).toHaveAttribute('data-category', 'dangerous');
  await change(page, 'ARG_DEFAULT_VALUE_CHANGE').click();
  await expect(page.locator('#change-detail')).toContainText('10');
  await expect(page.locator('#change-detail')).toContainText('20');
  await compare(
    page,
    'type Query { f(arg: String): String }',
    'type Query { f(arg: String = "synthetic"): String }',
  );
  await expect(change(page, 'ARG_DEFAULT_VALUE_ADDED')).toHaveAttribute(
    'data-category',
    'non-breaking',
  );
});
test('unchanged custom directive applications remain unknown with visible warnings even without ordinary schema changes', async ({
  page,
}) => {
  await page.goto('tools/sdl/');
  await demo(page, 'demo-unknown');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'unknown');
  await expect(page.locator('#issues')).toContainText('custom');
  await expect(page.locator('.sdl-change[data-category=unknown]')).not.toHaveCount(0);
  await expect(page.locator('#summary')).toContainText('結果不完整');
  await expect(page.locator('#demo-note')).toContainText('兩份相同仍 unknown');
});
test('ambiguous changes with unknown count zero never guess exact source; all side coordinates remain navigable', async ({
  page,
}) => {
  await page.goto('tools/sdl/');
  await demo(page, 'demo-ambiguous');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'unknown');
  await expect(page.locator('.sdl-count[data-category=unknown] strong')).toHaveText('0');
  await expect(page.locator('#change-detail')).toHaveAttribute('data-mapping', 'candidates');
  await expect(page.locator('#change-detail')).toContainText('不是確定變更目標');
  await expect(page.locator('#change-detail button').filter({ hasText: '確定座標' })).toHaveCount(
    0,
  );
  await page
    .locator('#change-detail button')
    .filter({ hasText: '查看候選（非歸屬） · before / Query.first' })
    .click();
  await expect(page.locator('#coordinate-detail')).toHaveAttribute('data-path', 'Query.first');
  await page.locator('#coordinate-detail > .sdl-source').click();
  expect(
    await page.locator('#before').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toBe('first: String');
  await page.locator('#side').selectOption('after');
  await page.locator('#coordinate-search').fill('replacement');
  await page.locator('.sdl-coordinate').click();
  await expect(page.locator('#coordinate-detail')).toHaveAttribute('data-side', 'after');
  await expect(page.locator('#coordinate-detail')).toContainText('replacement: String');
});
test('type/field/arg/enum source navigation and bounded direct references use real source locations', async ({
  page,
}) => {
  await page.goto('tools/sdl/');
  const text =
    'type Query { book(id: ID!): Book }\ntype Book { title: String }\nenum Format { PAPER EBOOK }';
  await compare(page, text, text);
  await page.locator('#type-filter').selectOption('Book');
  await page.locator('.sdl-coordinate[data-path="Book.title"]').click();
  await expect(page.locator('#coordinate-detail')).toContainText('Query.book → Book');
  await page
    .locator('#coordinate-detail button')
    .filter({ hasText: '查看定義 · before / Query.book' })
    .click();
  await expect(page.locator('#coordinate-detail')).toHaveAttribute('data-path', 'Query.book');
  await page.locator('#coordinate-search').fill('Query.book(id:)');
  await page.locator('.sdl-coordinate').click();
  await page.locator('#coordinate-detail > .sdl-source').click();
  expect(
    await page.locator('#before').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toBe('id: ID!');
  await page.locator('#coordinate-search').fill('Format.PAPER');
  await page.locator('.sdl-coordinate').click();
  await page.locator('#coordinate-detail > .sdl-source').click();
  expect(
    await page.locator('#before').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toBe('PAPER');
});
test('invalid syntax/unresolved extension and resource limits are not no-change; valid identical SDL is still static-only', async ({
  page,
}) => {
  await page.goto('tools/sdl/');
  await demo(page, 'demo-invalid');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'invalid');
  await expect(page.locator('#summary')).toContainText('不能視為沒有變更或安全');
  await expect(page.locator('#issues')).toContainText('Unresolved type extension.');
  await expect(page.locator('.sdl-change')).toHaveCount(0);
  await page.locator('#issues .sdl-source').filter({ hasText: 'After · L' }).first().click();
  await expect(page.locator('#after')).toBeFocused();
  await compare(page, 'type Query { f: String }', 'type Query {');
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'invalid');
  await compare(page, 'type Query { f: String }', 'x'.repeat(100001));
  await expect(page.locator('#report-state')).toHaveAttribute('data-state', 'limit');
  await expect(page.locator('#changes')).toContainText('不能當成沒有變更');
  await expect(page.locator('.sdl-change')).toHaveCount(0);
  await compare(page, 'type Query { f: String }', 'type Query { f: String }');
  await expect(page.locator('#summary')).toContainText('不代表 resolver');
  await expect(page.locator('#changes')).toContainText('不是 operational safety 保證');
});
test('explicit projected JSON excludes SDL/reasons/signatures/defaults but keeps sensitive coordinates; Blob URLs clean on edit/clear/dispose', async ({
  page,
}) => {
  await page.goto('tools/sdl/');
  await page.evaluate(() => {
    const created: string[] = [],
      revoked: string[] = [];
    Object.defineProperty(window, '__sdlUrls', { value: { created, revoked } });
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
  const old =
      '"synthetic-description" type Query { secretField(arg: String = "synthetic-secret-default"): String }',
    next =
      '"synthetic-description" type Query { secretField(arg: String = "synthetic-secret-default"): String! }';
  await compare(page, old, next);
  await expect(page.locator('#export')).toBeDisabled();
  expect(
    await page.locator('#export-confirm').evaluate((node) => node.getBoundingClientRect().width),
  ).toBe(16);
  await page.locator('#export-confirm').check();
  const download = page.waitForEvent('download');
  await page.locator('#export').click();
  const path = await (await download).path();
  if (!path) throw new Error('Missing export');
  const raw = await readFile(path, 'utf8');
  expect(raw).toContain('secretField');
  expect(raw).not.toContain('synthetic-secret-default');
  expect(raw).not.toContain('synthetic-description');
  expect(raw).not.toContain('"reason"');
  expect(raw).not.toContain('"signature"');
  expect(JSON.parse(raw)).toHaveProperty('format', 'sid-tools/sdl-static/v1');
  await page.locator('#after').fill('type Query { f: String }');
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#export-confirm')).not.toBeChecked();
  expect(
    await page.evaluate(() => {
      const urls = (window as unknown as { __sdlUrls: { created: string[]; revoked: string[] } })
        .__sdlUrls;
      return urls.created.every((url) => urls.revoked.includes(url));
    }),
  ).toBe(true);
  await demo(page);
  await page.locator('#export-confirm').check();
  const second = page.waitForEvent('download');
  await page.locator('#export').click();
  await second;
  await page.locator('#clear').click();
  expect(
    await page.evaluate(() => {
      const urls = (window as unknown as { __sdlUrls: { created: string[]; revoked: string[] } })
        .__sdlUrls;
      return urls.created.every((url) => urls.revoked.includes(url));
    }),
  ).toBe(true);
  await expect(page.locator('#before')).toHaveValue('');
  await demo(page);
  await page.locator('#export-confirm').check();
  const third = page.waitForEvent('download');
  await page.locator('#export').click();
  await third;
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Selector 比較', exact: true })
    .click();
  await expect(page).toHaveURL(/tools\/selectors\/$/);
  await expect(page.locator('#html-source')).toBeAttached();
  expect(
    await page.evaluate(() => {
      const urls = (window as unknown as { __sdlUrls: { created: string[]; revoked: string[] } })
        .__sdlUrls;
      return urls.created.every((url) => urls.revoked.includes(url));
    }),
  ).toBe(true);
});
test('hostile source strings/signatures/reasons remain plain text; no input network/storage/URL/logging or execution', async ({
  page,
}) => {
  await page.goto('tools/sdl/');
  await expect(page.locator('#route-loading')).toBeHidden();
  const requests: string[] = [],
    errors: string[] = [],
    dialogs: string[] = [],
    logs: string[] = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && !new URL(request.url()).pathname.includes('/assets/'))
      requests.push(request.url());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.type());
    void dialog.dismiss();
  });
  page.on('console', (message) => logs.push(message.text()));
  const hostile = '<img src="https://invalid.example/sdl-secret" onerror="window.__sdlSentinel=1">',
    old = `type Query { f(arg: String = ${JSON.stringify(hostile)}): String }`,
    next = 'type Query { f(arg: String = "changed"): String }';
  await compare(page, old, next);
  await expect(page.locator('#change-detail')).toContainText('<img');
  await page.locator('.sdl-coordinate[data-path="Query.f"]').click();
  await expect(page.locator('.sdl-signature')).toContainText('<img');
  await expect(page.locator('.sdl-main img, .sdl-main iframe, .sdl-main script')).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as unknown as { __sdlSentinel?: number }).__sdlSentinel),
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
  expect(logs.join('')).not.toContain('sdl-secret');
});
test('Run-only lazy core loading, late import reset/edit/dispose and route reload cannot resurrect state', async ({
  page,
}) => {
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('.js')) scripts.push(request.url());
  });
  await page.goto('tools/sdl/');
  await expect(page.locator('#route-loading')).toBeHidden();
  const initial = scripts.length;
  await page.locator('#demo').click();
  expect(scripts).toHaveLength(initial);
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/sdl-*.js', async (route) => {
    await gate;
    await route.continue();
  });
  await page.locator('#run').click();
  await expect(page.locator('#status')).toContainText('正在載入');
  await page.locator('#clear').click();
  release();
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#before')).toHaveValue('');
  await demo(page);
  expect(scripts.length).toBeGreaterThan(initial);
  await page.locator('#before').fill('type Query { f: String }');
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#change-detail')).toBeEmpty();
  await demo(page);
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Selector 比較', exact: true })
    .click();
  await expect(page).toHaveURL(/tools\/selectors\/$/);
  await page.goBack();
  await expect(page.locator('#before')).toHaveValue('');
  await expect(page.locator('#output')).toBeHidden();
  await page.reload();
  await expect(page.locator('#after')).toHaveValue('');
  await expect(page.locator('#output')).toBeHidden();
});
test('mobile320/390 layouts remain contained across valid/unknown/invalid and actual source interactions; coordinate pagination retains rows', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('tools/sdl/');
  for (const id of ['demo', 'demo-unknown', 'demo-invalid', 'demo-ambiguous']) {
    await demo(page, id);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const fields = Array.from({ length: 110 }, (_, index) => `f${index}: String`).join('\n'),
    text = `type Query {\n${fields}\n}`;
  await compare(page, text, text);
  await expect(page.locator('.sdl-coordinate')).toHaveCount(50);
  await page.locator('#coordinates').getByRole('button', { name: '下一頁' }).click();
  await page.locator('#coordinates').getByRole('button', { name: '下一頁' }).click();
  await expect(page.locator('.sdl-coordinate')).toHaveCount(11);
  await page.locator('.sdl-coordinate[data-path="Query.f109"]').click();
  await page.locator('#coordinate-detail > .sdl-source').click();
  expect(
    await page.locator('#before').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toBe('f109: String');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('unmapped scalar-reachability changes never invent source links and pending imports cannot revive disposed routes', async ({
  page,
}) => {
  await page.goto('tools/sdl/');
  await compare(page, 'type Query { f: Int g: String }', 'type Query { g: String }');
  await change(page, 'TYPE_REMOVED').click();
  await expect(page.locator('#change-detail')).toHaveAttribute('data-mapping', 'unmapped');
  await expect(page.locator('#change-detail')).toContainText('不從 reason 文字猜測');
  await expect(page.locator('#change-detail button')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#route-loading')).toBeHidden();
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/sdl-*.js', async (route) => {
    await gate;
    await route.continue();
  });
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await expect(page.locator('#status')).toContainText('正在載入');
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Selector 比較', exact: true })
    .click();
  await expect(page.locator('#html-source')).toBeAttached();
  release();
  await page.goBack();
  await expect(page.locator('#before')).toHaveValue('');
  await expect(page.locator('#output')).toBeHidden();
});

test('export errors never fall back to raw report and post-download timer revokes successful Blob URL', async ({
  page,
}) => {
  await page.goto('tools/sdl/');
  await demo(page);
  await page.locator('#export-confirm').check();
  await page.evaluate(() => {
    const original = URL.createObjectURL.bind(URL);
    Object.defineProperty(window, '__sdlOriginalCreate', { value: original });
    URL.createObjectURL = () => {
      throw new Error('Synthetic blob failure');
    };
  });
  await page.locator('#export').click();
  await expect(page.locator('#export-status')).toContainText('沒有改以原始 report');
  await page.evaluate(() => {
    URL.createObjectURL = (
      window as unknown as { __sdlOriginalCreate: typeof URL.createObjectURL }
    ).__sdlOriginalCreate;
    const revoked: string[] = [];
    Object.defineProperty(window, '__sdlRevoked', { value: revoked });
    const original = URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL = (url) => {
      revoked.push(url);
      original(url);
    };
  });
  const download = page.waitForEvent('download');
  await page.locator('#export').click();
  await download;
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { __sdlRevoked: string[] }).__sdlRevoked.length),
    )
    .toBe(1);
});
