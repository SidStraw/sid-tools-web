import html from './bundle-diff.html?raw';
import type {
  BundleComparison,
  BundleAssetChange,
  BundleLengthChange,
  ByteMetric,
} from '@sid-tools/core/bundle-diff';
export { html };
export function mount(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const before = get<HTMLInputElement>('base-file'),
    after = get<HTMLInputElement>('candidate-file'),
    budget = get<HTMLInputElement>('budget'),
    metric = get<HTMLSelectElement>('metric'),
    search = get<HTMLInputElement>('search'),
    group = get<HTMLSelectElement>('group');
  const events = new AbortController();
  let worker: Worker | undefined,
    revision = 0,
    result: BundleComparison | undefined,
    offset = 0;
  const urls = new Set<string>();
  const node = (tag: string, text: string) => {
    const el = document.createElement(tag);
    el.textContent = text;
    return el;
  };
  const number = (value: number | null) =>
    value === null ? '未知' : value.toLocaleString('en-US');
  function invalidate() {
    revision++;
    worker?.terminate();
    worker = undefined;
    result = undefined;
    for (const url of urls) URL.revokeObjectURL(url);
    urls.clear();
    get('output').hidden = true;
    get('items').replaceChildren();
    for (const id of [
      'comparability',
      'totals',
      'budget-result',
      'warnings',
      'environment',
      'count',
    ])
      get(id).replaceChildren();
    get('error').hidden = true;
    get<HTMLButtonElement>('download').disabled = true;
    get('status').textContent = '輸入已變更，請重新比較。';
  }
  function assetRow(row: BundleAssetChange) {
    const details = document.createElement('details');
    details.append(
      node(
        'summary',
        `${row.status} · ${row.after?.file ?? row.before?.file} · gzip Δ ${number(row.delta?.gzip ?? null)} bytes`,
      ),
    );
    let shown = false;
    details.ontoggle = () => {
      if (!details.open || shown) return;
      shown = true;
      details.append(node('p', `Identity：${row.identity}`));
      for (const [side, asset] of [
        ['Base', row.before],
        ['Candidate', row.after],
      ] as const) {
        details.append(node('h3', side));
        if (!asset) {
          details.append(node('p', '無對應產物（或無法唯一配對）'));
          continue;
        }
        details.append(
          node(
            'p',
            `${asset.file} · ${asset.kind} · entry=${asset.entry} · dynamicEntry=${asset.dynamicEntry}`,
          ),
        );
        details.append(
          node(
            'p',
            `raw ${number(asset.bytes.raw)} / gzip ${number(asset.bytes.gzip)} / Brotli ${number(asset.bytes.brotli)} bytes`,
          ),
        );
        details.append(
          node(
            'p',
            `Imports：${asset.imports.join(', ') || '無'}；dynamic imports：${asset.dynamicImports.join(', ') || '無'}`,
          ),
        );
        details.append(node('p', `SHA256：${asset.sha256}`));
        details.append(
          node(
            'p',
            `${asset.modules.length} 個 module；完整明細請切換 Module 檢視或下載 JSON。${asset.modules.length ? '' : '無 module 歸因資訊。'}`,
          ),
        );
      }
    };
    return details;
  }
  function lengthRow(row: BundleLengthChange) {
    const details = document.createElement('details');
    details.append(node('summary', `${row.id} · renderedLength Δ ${number(row.delta)}`));
    details.append(
      node(
        'p',
        `長度 ${number(row.before)} → ${number(row.after)}；package：${row.package ?? 'project／virtual／external，無套件歸屬'}`,
      ),
    );
    details.append(
      node('p', `Base chunks：${row.beforeChunks.join(', ') || '無'}`),
      node('p', `Candidate chunks：${row.afterChunks.join(', ') || '無'}`),
    );
    return details;
  }
  function rows(reset = true) {
    if (!result) return;
    if (reset) {
      offset = 0;
      get('items').replaceChildren();
    }
    const query = search.value.toLowerCase();
    const items =
      group.value === 'assets'
        ? result.assets.filter((a) =>
            `${a.identity} ${a.before?.file} ${a.after?.file} ${a.before?.modules.map((m) => m.id).join(' ')} ${a.after?.modules.map((m) => m.id).join(' ')}`
              .toLowerCase()
              .includes(query),
          )
        : (group.value === 'packages' ? result.packages : result.modules).filter((m) =>
            `${m.id} ${m.package} ${m.beforeChunks.join(' ')} ${m.afterChunks.join(' ')}`
              .toLowerCase()
              .includes(query),
          );
    for (const item of items.slice(offset, offset + 50))
      get('items').append('identity' in item ? assetRow(item) : lengthRow(item));
    offset += 50;
    get('count').textContent =
      `${items.length} 筆符合，已顯示 ${Math.min(offset, items.length)} 筆。`;
    get('more').hidden = offset >= items.length;
  }
  function render(data: BundleComparison) {
    result = data;
    get('output').hidden = false;
    get('comparability').textContent = data.comparable
      ? '已記錄的量測條件一致，可比較。'
      : '量測條件不完整或不同，不可直接比較；下方數字僅供查閱。';
    get('totals').replaceChildren(
      ...(['raw', 'gzip', 'brotli'] as const).map((m) =>
        node(
          'p',
          `${m}：${number(data.totals.before[m])} → ${number(data.totals.after[m])} bytes（Δ ${number(data.totals.delta[m])}）`,
        ),
      ),
    );
    get('budget-result').textContent = data.budget
      ? `預算 ${data.budget.metric} ${number(data.budget.limit)} bytes：${data.budget.status}`
      : '未設定預算。';
    get('warnings').replaceChildren(...data.warnings.map((w) => node('p', w)));
    get('environment').replaceChildren(
      ...data.reasons.map((r) => node('p', r)),
      ...Object.keys(data.environments.before).map((k) => {
        const key = k as keyof typeof data.environments.before;
        return node(
          'p',
          `${key}：${data.environments.before[key] ?? '缺少'} → ${data.environments.after[key] ?? '缺少'}`,
        );
      }),
    );
    get('status').textContent = '比較完成。';
    get<HTMLButtonElement>('download').disabled = false;
    rows();
  }
  const fail = () => {
    worker?.terminate();
    worker = undefined;
    get('error').hidden = false;
    get('error').textContent =
      '無法比較：請選兩份有效報告（各不超過 8 MB），預算須為 0–1,000,000,000 的整數 bytes。';
    get('status').textContent = '未產生比較結果。';
  };
  get('compare').addEventListener(
    'click',
    () => {
      invalidate();
      const a = before.files?.[0],
        b = after.files?.[0];
      if (
        !a ||
        !b ||
        a.size > 8_000_000 ||
        b.size > 8_000_000 ||
        (budget.value !== '' &&
          (!/^\d+$/.test(budget.value) || Number(budget.value) > 1_000_000_000)) ||
        budget.validity.badInput
      ) {
        fail();
        return;
      }
      const token = revision,
        selectedBudget =
          budget.value === ''
            ? null
            : { metric: metric.value as ByteMetric, limit: Number(budget.value) };
      get('status').textContent = '正在比較…';
      void Promise.all([a.text(), b.text()])
        .then(([aText, bText]) => {
          if (token !== revision) return;
          worker = new Worker(new URL('./bundle-diff.worker.ts', import.meta.url), {
            type: 'module',
          });
          worker.onerror = () => {
            if (token === revision) fail();
          };
          worker.onmessage = (event: MessageEvent<{ ok: boolean; result: BundleComparison }>) => {
            if (token !== revision) return;
            worker?.terminate();
            worker = undefined;
            if (event.data.ok) render(event.data.result);
            else fail();
          };
          worker.postMessage({ before: aText, after: bText, budget: selectedBudget });
        })
        .catch(() => {
          if (token === revision) fail();
        });
    },
    { signal: events.signal },
  );
  for (const field of [before, after, budget, metric])
    field.addEventListener('input', invalidate, { signal: events.signal });
  search.addEventListener('input', () => rows(), { signal: events.signal });
  group.addEventListener('change', () => rows(), { signal: events.signal });
  get('more').addEventListener('click', () => rows(false), { signal: events.signal });
  get('clear').addEventListener(
    'click',
    () => {
      invalidate();
      before.value = '';
      after.value = '';
      budget.value = '';
      search.value = '';
      get('status').textContent = '資料已清除。';
    },
    { signal: events.signal },
  );
  get('download').addEventListener(
    'click',
    () => {
      if (!result) return;
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }),
      );
      urls.add(url);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bundle-comparison.json';
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        urls.delete(url);
      }, 1000);
    },
    { signal: events.signal },
  );
  return () => {
    events.abort();
    invalidate();
  };
}
