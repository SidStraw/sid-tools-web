import { test, expect, type Page } from '@playwright/test';
async function inspect(page: Page, html: string, selectors: string) {
  await page.locator('#html-source').fill(html);
  await page.locator('#css-source').fill(selectors);
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
}
async function arm(page: Page) {
  await page.evaluate(() => {
    const probe = {
      raw: [] as string[],
      queries: [] as string[],
      docs: [] as Document[],
      csp: [] as string[],
      liveFactories: [] as string[],
    };
    Object.defineProperty(window, '__selectorProbe', { value: probe });
    document.addEventListener('securitypolicyviolation', (event) =>
      probe.csp.push(event.violatedDirective),
    );
    const method = (proto: object, key: string) => {
      const original = Reflect.get(proto, key) as (...args: unknown[]) => unknown;
      Object.defineProperty(proto, key, {
        configurable: true,
        writable: true,
        value: function (this: object, ...args: unknown[]) {
          probe.raw.push(key);
          return Reflect.apply(original, this, args);
        },
      });
    };
    const setter = (proto: object, key: string) => {
      const descriptor = Object.getOwnPropertyDescriptor(proto, key)!;
      Object.defineProperty(proto, key, {
        ...descriptor,
        set: function (this: object, value: unknown) {
          probe.raw.push(key);
          descriptor.set!.call(this, value);
        },
      });
    };
    for (const [proto, name] of [
      [DOMParser.prototype, 'parseFromString'],
      [Element.prototype, 'insertAdjacentHTML'],
      [Range.prototype, 'createContextualFragment'],
      [Document.prototype, 'write'],
      [Document.prototype, 'writeln'],
      [Document.prototype, 'importNode'],
      [Document.prototype, 'adoptNode'],
      [Node.prototype, 'cloneNode'],
    ] as const)
      method(proto, name);
    setter(Element.prototype, 'innerHTML');
    setter(Element.prototype, 'outerHTML');
    setter(HTMLIFrameElement.prototype, 'srcdoc');
    setter(ShadowRoot.prototype, 'innerHTML');
    const create = Object.getOwnPropertyDescriptor(
      DOMImplementation.prototype,
      'createHTMLDocument',
    )!.value as typeof DOMImplementation.prototype.createHTMLDocument;
    DOMImplementation.prototype.createHTMLDocument = function (title?: string) {
      const doc = create.call(this, title);
      probe.docs.push(doc);
      return doc;
    };
    const query = Object.getOwnPropertyDescriptor(Element.prototype, 'querySelectorAll')!
      .value as typeof Element.prototype.querySelectorAll;
    Element.prototype.querySelectorAll = function <T extends Element = Element>(
      selectors: string,
    ): NodeListOf<T> {
      if (this.ownerDocument.defaultView === null) probe.queries.push(selectors);
      return query.call(this, selectors) as NodeListOf<T>;
    };
    const factory = Object.getOwnPropertyDescriptor(Document.prototype, 'createElement')!
      .value as typeof Document.prototype.createElement;
    Document.prototype.createElement = function (tag: string, options?: ElementCreationOptions) {
      if (this === document) probe.liveFactories.push(tag);
      return factory.call(this, tag, options);
    };
  });
}
const snapshot = (page: Page) =>
  page.evaluate(() => {
    const probe = (
      window as unknown as {
        __selectorProbe: {
          raw: string[];
          queries: string[];
          docs: Document[];
          csp: string[];
          liveFactories: string[];
        };
      }
    ).__selectorProbe;
    return {
      raw: probe.raw,
      queries: [...probe.queries],
      csp: probe.csp,
      liveFactories: probe.liveFactories,
      documents: probe.docs.map((doc) => ({
        inert: doc.defaultView === null,
        standards: doc.compatMode,
        foreignNamespace: doc.getElementsByTagName('svg')[0]?.namespaceURI,
        foreignChildren: doc.getElementsByTagName('svg')[0]?.childNodes.length,
        styleCount: doc.getElementsByTagName('style').length,
        scriptChildren: doc.getElementsByTagName('script')[0]?.childNodes.length,
        owned: [...doc.body.getElementsByTagName('*')].every((node) => node.ownerDocument === doc),
        attributes: [...doc.body.getElementsByTagName('*')].flatMap((node) =>
          [...node.attributes].map((attr) => `${node.tagName.toLowerCase()}:${attr.name}`),
        ),
      })),
    };
  });

test('isolated text-only structure shows per-complex tuples, logical max/where/nth-of contributions and source navigation', async ({
  page,
}) => {
  await page.goto('tools/selectors/');
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  await expect(page.locator('.selectors-card > strong')).toHaveText([
    '(1, 1, 0)',
    '(0, 3, 0)',
    '(0, 1, 0)',
    '(0, 3, 0)',
    '(0, 1, 0)',
  ]);
  await expect(page.locator('.selectors-card').last()).toHaveAttribute('data-state', 'empty');
  await page.locator('.selectors-card').nth(0).click();
  await expect(page.locator('#contributions')).toContainText('lexicographic max');
  await expect(page.locator('#contributions')).toContainText('#never');
  const source = page
    .locator('#contributions .selectors-contribution')
    .filter({ hasText: 'ID + A' })
    .getByRole('button');
  await source.click();
  await expect(page.locator('#css-source')).toBeFocused();
  expect(
    await page.locator('#css-source').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd);
    }),
  ).toBe('#never');
  await page.locator('.selectors-card').nth(2).click();
  await expect(page.locator('#contributions')).toContainText(':where 歸零');
  await expect(page.locator('.selectors-row[data-hit=true]')).toHaveCount(2);
  await page.locator('.selectors-row[data-hit=true]').first().click();
  await expect(page.locator('#node-detail')).toContainText('最高已命中 tuple (1, 1, 0)');
  await page.locator('#node-detail button').click();
  await expect(page.locator('#html-source')).toBeFocused();
  expect(
    await page.locator('#html-source').evaluate((node) => {
      const input = node as HTMLTextAreaElement;
      return input.value.slice(input.selectionStart, input.selectionEnd).startsWith('<section');
    }),
  ).toBe(true);
  await expect(page.locator('.selectors-boundary')).toContainText('不是完整 cascade');
});

test('hostile corpus never uses raw HTML sinks/live user nodes, executes nothing, requests no resources including same-origin canaries', async ({
  page,
}) => {
  await page.goto('tools/selectors/');
  await expect(page.locator('#route-loading')).toBeHidden();
  await arm(page);
  const requests: string[] = [],
    errors: string[] = [],
    dialogs: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (/^https?:/.test(url.protocol) && !url.pathname.startsWith('/assets/'))
      requests.push(request.url());
  });
  page.on('pageerror', (issue) => errors.push(issue.message));
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.type());
    void dialog.dismiss();
  });
  const u = '/__stw7_canary',
    x = 'https://invalid.example/__stw7_canary';
  const html = `<main id="u-main" data-user="yes"><img src="${u}" srcset="${x} 2x" onerror="window.__stw7Sentinel=1"><picture><source srcset="${u}"></picture><input type="image" src="${u}" autofocus><link rel="preload" href="${u}" as="image"><link rel="prefetch" href="${x}"><link rel="preconnect" href="${x}"><style>@import '${u}';p{background:url(${x})}</style><table background="${u}"><tr><td>cell</table><iframe src="${u}" srcdoc="&lt;script>parent.__stw7Sentinel=1&lt;/script>"></iframe><frame src="${u}"><object data="${u}"><embed src="${x}"></object><audio src="${u}"><source src="${u}"></audio><video poster="${x}" src="${u}"><track src="${u}"></video><svg onload="window.__stw7Sentinel=1"><image href="${u}"/><use href="${u}"/><feImage href="${x}"/></svg><math><mtext><img src="${u}"></mtext></math><meta http-equiv="refresh" content="0;url=${u}"><base href="${x}"><a href="javascript:window.__stw7Sentinel=1" ping="${u}">inert href</a><area href="${u}"><form action="${u}"><button formaction="${x}">submit</button></form><script>window.__stw7Sentinel=1;alert('no')</script><template><img src="${u}"><script>window.__stw7Sentinel=1</script></template><noscript><img src="${u}"></noscript><details open ontoggle="window.__stw7Sentinel=1">safe text</details><body onload="window.__stw7Sentinel=1"><x-attack is="x-live" id="u-custom"><img src="${u}"></x-attack><p id="u-text" style="background:url(${u})" data-literal="&lt;img src=x onerror=alert(1)&gt;">literal</p><!--comment--></main>`;
  await inspect(
    page,
    html.replace('<svg onload=', '<svg><text>suppressed text</text></svg><svg onload='),
    'img, article:has(svg text), [src], [style], script, a:any-link, .missing, style, :where([src],article) :is(.missing,svg text)',
  );
  await expect(page.locator('#summary')).toContainText('部分結果');
  await page.locator('.selectors-card').nth(2).click();
  await expect(page.locator('#selector-detail')).toContainText('被省略的屬性：src');
  await page.locator('.selectors-card').nth(1).click();
  await expect(page.locator('#selector-detail')).toContainText('被省略子樹標籤：text');
  await page.locator('.selectors-card').nth(7).click();
  await expect(page.locator('#selector-detail')).toContainText('被省略子樹標籤：style');
  await page.locator('.selectors-card').nth(8).click();
  await expect(page.locator('#selector-detail')).toContainText('被省略的屬性：src');
  await expect(page.locator('#selector-detail')).toContainText('被省略子樹標籤：text');
  const data = await snapshot(page);
  expect(data.raw).toEqual([]);
  expect(data.csp).toEqual([]);
  expect(data.documents).toHaveLength(1);
  expect(data.documents[0]).toMatchObject({
    inert: true,
    standards: 'CSS1Compat',
    owned: true,
    foreignNamespace: 'http://www.w3.org/2000/svg',
    foreignChildren: 0,
    styleCount: 0,
    scriptChildren: 0,
  });
  expect(
    data.documents[0]!.attributes.some((attr) =>
      /:(src|srcset|style|srcdoc|onerror|onload|ontoggle|ping|action|formaction|poster|background|data|is|autofocus)$/.test(
        attr,
      ),
    ),
  ).toBe(false);
  expect(data.documents[0]!.attributes).toContain('a:href');
  expect(data.documents[0]!.attributes).toContain('area:href');
  expect(data.liveFactories).not.toContain('x-attack');
  expect(data.liveFactories).not.toContain('script');
  expect(
    await page.evaluate(
      () =>
        document.querySelectorAll(
          '[data-user], [id^="u-"], .selectors-main iframe, .selectors-main img, .selectors-main script, .selectors-main svg',
        ).length,
    ),
  ).toBe(0);
  expect(
    await page.evaluate(() => (window as unknown as { __stw7Sentinel?: number }).__stw7Sentinel),
  ).toBeUndefined();
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
  expect(dialogs).toEqual([]);
});

test('unknown/dynamic/non-matchable never reach native queries; browser SyntaxError is not an empty match and unknown is not ranked', async ({
  page,
}) => {
  await page.goto('tools/selectors/');
  await expect(page.locator('#route-loading')).toBeHidden();
  await arm(page);
  await page.evaluate(() => {
    const query = Object.getOwnPropertyDescriptor(Element.prototype, 'querySelectorAll')!
      .value as typeof Element.prototype.querySelectorAll;
    Element.prototype.querySelectorAll = function <T extends Element = Element>(selector: string) {
      if (this.ownerDocument.defaultView === null && selector === '.force-native')
        throw new DOMException('Synthetic native support refusal', 'SyntaxError');
      return query.call(this, selector) as NodeListOf<T>;
    };
  });
  await inspect(
    page,
    '<p class="one">safe</p>',
    '.missing, :future-state, p:hover, p::before, svg|p, .force-native',
  );
  await expect(page.locator('.selectors-card')).toHaveCount(6);
  for (const [index, state] of [
    'empty',
    'parser-unsupported',
    'not-evaluated',
    'not-matchable',
    'not-matchable',
    'browser-unsupported',
  ].entries())
    await expect(page.locator('.selectors-card').nth(index)).toHaveAttribute('data-state', state);
  await expect(page.locator('.selectors-card').nth(1)).toContainText('未知 · 不排名');
  expect((await snapshot(page)).queries).toEqual(['.missing']);
  await inspect(page, '<p/>', 'p[');
  await expect(page.locator('.selectors-card')).toHaveCount(0);
  await expect(page.locator('#summary')).toContainText('invalid');
  expect((await snapshot(page)).queries).toEqual(['.missing']);
});

test('trusted fixture native parity for logical/has/nth-of/combinators/attributes/empty and scoped body semantics', async ({
  page,
}) => {
  await page.goto('tools/selectors/');
  const selectors = [
    '.card:is(.featured,#never)',
    '.card:not(.muted):has(> p)',
    'li:nth-child(2 of .item)',
    'li + li',
    '[data-test="p"]',
    ':scope > section',
    'p:empty',
    'input:checked',
  ];
  const html =
    '<section data-test="a" class="card featured"><p data-test="p"></p><ul><li data-test="one" class="item"></li><li data-test="two" class="item"></li></ul></section><section data-test="b" class="card"></section><input data-test="check" type="checkbox" checked>';
  const expected = await page.evaluate((selectors) => {
    const doc = document.implementation.createHTMLDocument('');
    const add = (tag: string, attrs: Record<string, string>, parent: Element) => {
      const node = doc.createElement(tag);
      for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
      parent.appendChild(node);
      return node;
    };
    const section = add('section', { 'data-test': 'a', class: 'card featured' }, doc.body);
    add('p', { 'data-test': 'p' }, section);
    const ul = add('ul', {}, section);
    add('li', { 'data-test': 'one', class: 'item' }, ul);
    add('li', { 'data-test': 'two', class: 'item' }, ul);
    add('section', { 'data-test': 'b', class: 'card' }, doc.body);
    add('input', { 'data-test': 'check', type: 'checkbox', checked: '' }, doc.body);
    return selectors.map((selector) =>
      [...doc.body.querySelectorAll(selector)].map((node) => node.getAttribute('data-test')),
    );
  }, selectors);
  await inspect(page, html, selectors.join(', '));
  await page.locator('#tree-filter').selectOption('matched');
  for (const [index, ids] of expected.entries()) {
    await page.locator('.selectors-card').nth(index).click();
    const labels = await page.locator('.selectors-row[data-hit=true] code').allTextContents();
    expect(labels.map((label) => /data-test="([^"]+)"/.exec(label)?.[1] ?? null)).toEqual(ids);
  }
});

test('repair/implied source labels, placeholder identity and initial form states are honest; escaped hostile values stay literal', async ({
  page,
}) => {
  await page.goto('tools/selectors/');
  await page.locator('#demo-repair').click();
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  await expect(page.locator('#diagnostics')).toContainText('implied');
  await expect(page.locator('.selectors-row').filter({ hasText: '<tbody>' })).toContainText(
    'implied',
  );
  await page.locator('.selectors-row').filter({ hasText: '<tbody>' }).click();
  await expect(page.locator('#node-detail button')).toBeDisabled();
  await inspect(
    page,
    '<p id="bad" id="duplicate">repair</p><script id="same" class="kept"><b>gone</b></script><input type="checkbox" checked><p data-x="&lt;img src=x onerror=alert(1)&gt;">literal</p>',
    'script#same.kept:empty, input:checked, :where([src]) p, [data-x]',
  );
  await expect(page.locator('[data-code^="parse5:"]')).toBeVisible();
  await expect(page.locator('.selectors-card').nth(0)).toHaveAttribute('data-state', 'matched');
  await expect(page.locator('.selectors-row').filter({ hasText: 'data-x=' })).toContainText(
    '<img src=x onerror=alert(1)>',
  );
  await expect(page.locator('#output img, #output b#same')).toHaveCount(0);
  await expect(page.locator('#output')).toContainText('初始 attrs/default state');
});

test('explicit document wrappers are located omissions with global and every-branch partial warnings, never clean empty', async ({
  page,
}) => {
  await page.goto('tools/selectors/');
  await arm(page);
  const html =
    '<html class="dark" lang="en"><body class="page"><div class="card">x</div></body></html>';
  await inspect(page, html, '.dark .card, body.page .card, html[lang] .card');
  await expect(page.locator('[data-code="document-wrapper-ignored"]')).toHaveCount(2);
  await expect(page.locator('#summary')).toContainText('部分結果');
  const cards = page.locator('.selectors-card');
  await expect(cards).toHaveCount(3);
  for (const card of await cards.all()) {
    await expect(card).toHaveAttribute('data-state', 'empty');
    await expect(card).toContainText('partial');
    await card.click();
    await expect(page.locator('#selector-detail .selectors-warning')).not.toHaveCount(0);
    await expect(page.locator('#selector-detail')).toContainText('部分重建');
  }
  await cards.nth(1).click();
  await expect(page.locator('#selector-detail')).toContainText('selector 參照被省略子樹標籤：body');
  await cards.nth(2).click();
  await expect(page.locator('#selector-detail')).toContainText('selector 參照被省略的屬性：lang');
  const source = page.locator('[data-code="document-wrapper-ignored"]').first().getByRole('button');
  await expect(source).toBeEnabled();
  await source.click();
  expect(
    await page.locator('#html-source').evaluate((node) => {
      const textarea = node as HTMLTextAreaElement;
      return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
    }),
  ).toBe('<html class="dark" lang="en">');
  // Implied wrappers on ordinary fragments must not fabricate wrapper omissions.
  await inspect(page, '<div class="card">x</div>', '.card');
  await expect(page.locator('[data-code="document-wrapper-ignored"]')).toHaveCount(0);
  await expect(page.locator('.selectors-card')).toHaveAttribute('data-state', 'matched');
  await inspect(page, '<!doctype html><html><head></head><body><div>x</div></body></html>', 'div');
  await expect(page.locator('[data-code="document-wrapper-ignored"]')).toHaveCount(4);
  expect(await snapshot(page)).toMatchObject({ raw: [], csp: [] });
});

test('body-only wrapper attributes remain omitted but produce located partial warnings on empty branches', async ({
  page,
}) => {
  await page.goto('tools/selectors/');
  await arm(page);
  await inspect(
    page,
    '<body class="x"><div class="card">x</div></body>',
    '.x .card, body.x .card, [class="x"] .card',
  );
  await expect(page.locator('[data-code="document-wrapper-ignored"]')).toHaveCount(1);
  await expect(page.locator('[data-code="document-wrapper-ignored"]')).toContainText('<body>');
  await expect(page.locator('[data-code="document-wrapper-ignored"] button')).toBeEnabled();
  await expect(page.locator('#summary')).toContainText('部分結果');
  for (const card of await page.locator('.selectors-card').all()) {
    await expect(card).toHaveAttribute('data-state', 'empty');
    await expect(card).toContainText('partial');
    await card.click();
    await expect(page.locator('#selector-detail')).toContainText('部分重建');
  }
  await expect(page.locator('#selector-detail')).toContainText('selector 參照被省略的屬性：class');
  expect(await snapshot(page)).toMatchObject({ raw: [], csp: [] });
});

test('whole-input HTML and selector aggregate limits reject without truncated output including omitted/template children; pagination keeps all rows', async ({
  page,
}) => {
  await page.goto('tools/selectors/');
  const cases: [string, string][] = [
    ['x'.repeat(50001), 'p'],
    ['<i></i>'.repeat(2001), 'i'],
    ['<div>'.repeat(65) + '</div>'.repeat(65), 'div'],
    [`<p ${Array.from({ length: 65 }, (_, i) => `data-a${i}="x"`).join(' ')}></p>`, 'p'],
    [`<p title="${'x'.repeat(2001)}"></p>`, 'p'],
    ['x'.repeat(10001), 'p'],
    ['<template>' + '<i></i>'.repeat(2000) + '</template>', 'i'],
    ['<p/>', Array(21).fill('p').join(',')],
    ['<p/>', 'p'.repeat(1001)],
    ['<p/>', 'x'.repeat(20001)],
    ['<p/>', ':is('.repeat(17) + 'p' + ')'.repeat(17)],
    ['<p/>', Array(20).fill(Array(106).fill('.a').join('')).join(',')],
  ];
  for (const [html, css] of cases) {
    await page.locator('#html-source').fill(html);
    await page.locator('#css-source').fill(css);
    await page.locator('#run').click();
    await expect(page.locator('#error')).toBeVisible();
    await expect(page.locator('#output')).toBeHidden();
  }
  await inspect(page, '<i></i>'.repeat(205), 'i');
  await expect(page.locator('.selectors-row')).toHaveCount(100);
  await page.locator('#tree-pages').getByRole('button', { name: '下一頁' }).click();
  await page.locator('#tree-pages').getByRole('button', { name: '下一頁' }).click();
  await expect(page.locator('.selectors-row')).toHaveCount(5);
  await expect(page.locator('.selectors-row').last()).toContainText('n205');
  await inspect(page, '<img src="/never">'.repeat(60), '[src]');
  await expect(page.locator('.selectors-diagnostic')).toHaveCount(50);
  await page.locator('#diagnostics').getByRole('button', { name: '下一頁' }).click();
  await expect(page.locator('.selectors-diagnostic')).toHaveCount(10);
});

test('adversarial bounded wide/deep :has stays within measured production budget and keeps logical unknowns distinct', async ({
  page,
}) => {
  await page.goto('tools/selectors/');
  const html =
    '<main>' +
    Array.from(
      { length: 30 },
      () => '<div>'.repeat(60) + '<b class="leaf"></b>' + '</div>'.repeat(60),
    ).join('') +
    '</main>';
  const selectors = Array.from(
    { length: 20 },
    (_, i) => `div:has(${'> div '.repeat(i % 12)}.leaf)`,
  ).join(',');
  const before = Date.now();
  await inspect(page, html, selectors);
  const elapsed = Date.now() - before;
  console.info(
    `STW7 synthetic 1831-element/20-selector bounded :has production round: ${elapsed}ms (includes browser input/render).`,
  );
  expect(elapsed).toBeLessThan(3000);
  await expect(page.locator('.selectors-card')).toHaveCount(20);
  await expect(page.locator('#summary')).not.toContainText('慢速比對');
  await inspect(page, '<div><p/></div>', 'div:has(:has(p)), :is(.a,:unknown-state)');
  await expect(page.locator('.selectors-card[data-state=parser-unsupported]')).toHaveCount(2);
  await expect(page.locator('.selectors-card strong')).toHaveText([
    '未知 · 不排名',
    '未知 · 不排名',
  ]);
});

test('slow/budget statuses are explicit and remaining eligible branches are not converted to empty matches', async ({
  page,
}) => {
  await page.goto('tools/selectors/');
  await page.evaluate(() => {
    let time = 0;
    Object.defineProperty(performance, 'now', { configurable: true, value: () => time });
    const original = Object.getOwnPropertyDescriptor(Element.prototype, 'querySelectorAll')!
      .value as typeof Element.prototype.querySelectorAll;
    Element.prototype.querySelectorAll = function <T extends Element = Element>(selector: string) {
      const result = original.call(this, selector) as NodeListOf<T>;
      if (this.ownerDocument.defaultView === null) time += 2101;
      return result;
    };
  });
  await inspect(page, '<p>synthetic clock only</p>', 'p, .absent');
  await expect(page.locator('.selectors-card').nth(0)).toHaveAttribute('data-state', 'matched');
  await expect(page.locator('.selectors-card').nth(1)).toHaveAttribute(
    'data-state',
    'budget-not-evaluated',
  );
  await expect(page.locator('#summary')).toContainText('慢速比對');
});

test('explicit plaintext clipboard and readonly fallback are safe, include failures/omissions and remain narrow-screen contained', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.setViewportSize({ width: 320, height: 760 });
  await page.goto('tools/selectors/');
  await inspect(
    page,
    '<p data-x="&lt;img src=x onerror=alert(1)&gt;" style="color:red">literal</p>',
    '[data-x], .absent, :unknown-state',
  );
  await page.locator('#copy').click();
  await expect(page.locator('#copy-status')).toContainText('已複製');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain('未知 · 不排名');
  expect(text).toContain('有效 · 空命中');
  expect(text).toContain('omitted-attribute');
  expect(text).toContain('not rendered HTML or full cascade');
  expect(text).toContain('<img src=x onerror=alert(1)>');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('Synthetic denied')) },
    });
  });
  await page.locator('#copy').click();
  await expect(page.locator('#copy-fallback')).toBeVisible();
  await expect(page.locator('#copy-text')).toHaveValue(text);
  await expect(page.locator('#copy-text')).toHaveAttribute('readonly', '');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('#output img, #output iframe')).toHaveCount(0);
});

test('edit/clear/dispose/reload drop results/source and late imports cannot resurrect input; no storage/query/hash/network submission', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.locator('#route-loading')).toBeHidden();
  await page.evaluate(() => {
    document.documentElement.dataset.selectorSession = 'same';
  });
  await page
    .getByRole('navigation')
    .getByRole('link', { name: 'Selector 比較', exact: true })
    .click();
  await expect(page.locator('#route-loading')).toBeHidden();
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/assets/selectors-html-*.js', async (route) => {
    await gate;
    await route.continue();
  });
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await page.locator('#clear').click();
  release();
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#html-source')).toHaveValue('');
  await page.locator('#demo').click();
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  await page.locator('#css-source').fill('.new');
  await expect(page.locator('#output')).toBeHidden();
  await expect(page.locator('#structure-list')).toBeEmpty();
  await page.locator('#run').click();
  await expect(page.locator('#output')).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: '圖片配色', exact: true }).click();
  await expect(page).toHaveURL(/tools\/palette\/$/);
  await page.goBack();
  await expect(page.locator('#html-source')).toHaveValue('');
  await expect(page.locator('#css-source')).toHaveValue('');
  await expect(page.locator('#output')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.dataset.selectorSession)).toBe('same');
  await page.reload();
  await expect(page.locator('#output')).toBeHidden();
  expect(
    await page.evaluate(() => [
      localStorage.length,
      sessionStorage.length,
      location.search,
      location.hash,
    ]),
  ).toEqual([0, 0, '', '']);
});
