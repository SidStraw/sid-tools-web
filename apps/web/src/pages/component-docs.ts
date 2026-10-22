import html from './component-docs.html?raw';
import type {
  PropsReport,
  PropsDocument,
  PropsChange,
  PropSpan,
  reviewProps,
} from '@sid-tools/core/component-docs';
export { html };
type Review = ReturnType<typeof reviewProps>;
const labels: Record<PropsChange['status'], string> = {
  added: '新增',
  removed: '刪除',
  changed: '變更',
  same: '相同',
  unverified: '未確認',
};
export function mount(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const reportFile = get<HTMLInputElement>('report-file'),
    documentFile = get<HTMLInputElement>('document-file'),
    search = get<HTMLInputElement>('search'),
    filter = get<HTMLSelectElement>('filter');
  const events = new AbortController(),
    urls = new Map<string, ReturnType<typeof setTimeout>>();
  let worker: Worker | undefined,
    timer: ReturnType<typeof setTimeout> | undefined,
    revision = 0,
    offset = 0,
    exampleOffset = 0;
  let report: PropsReport | undefined,
    review: Review | undefined,
    proposal: PropsDocument | null = null;
  const node = (tag: string, text: string) => {
    const el = document.createElement(tag);
    el.textContent = text;
    return el;
  };
  function stop() {
    worker?.terminate();
    worker = undefined;
    clearTimeout(timer);
    timer = undefined;
  }
  function invalidate() {
    revision++;
    stop();
    report = undefined;
    review = undefined;
    proposal = null;
    for (const [url, t] of urls) {
      clearTimeout(t);
      URL.revokeObjectURL(url);
    }
    urls.clear();
    for (const id of [
      'context',
      'coverage',
      'warnings',
      'items',
      'counts',
      'examples',
      'example-summary',
      'source-position',
      'source-text',
    ])
      get(id).replaceChildren();
    get('output').hidden = true;
    get('source-panel').hidden = true;
    get('source-heading').textContent = '原始定義';
    get('error').hidden = true;
    get('status').textContent = '請載入並比較。';
  }
  function fail() {
    revision++;
    stop();
    get('error').hidden = false;
    get('error').textContent =
      '無法比較：請檢查 JSON 格式、scope／元件與每份 2 MB 限制，或重新載入後再試。';
    get('status').textContent = '沒有可用結果。';
  }
  function showSource(name: string, span: PropSpan) {
    if (!report) return;
    get('source-panel').hidden = false;
    get('source-heading').textContent = `${name} 的原始定義`;
    get('source-position').textContent =
      `${report.source.file}:${span.line}:${span.column} · 字元 ${span.start}–${span.end} · SHA256 ${report.source.sha256}`;
    get('source-text').textContent = span.text;
    get('source-panel').focus();
  }
  function item(row: PropsChange) {
    const box = document.createElement('details');
    box.className = 'unused-candidate';
    box.append(node('summary', `${labels[row.status]} · ${row.name}`));
    let loaded = false;
    box.ontoggle = () => {
      if (!box.open || loaded) return;
      loaded = true;
      if (row.fields.length)
        box.append(
          node(
            'p',
            `差異欄位：${row.fields.join('、')}。unknown 是無法確認，不代表已知的新預設值。`,
          ),
        );
      if (row.before) {
        box.append(node('h4', '既有文件'), node('pre', JSON.stringify(row.before, null, 2)));
      }
      if (row.after) {
        const p = row.after;
        box.append(
          node('h4', '目前宣告'),
          node('p', `${p.required ? '必填' : '選填'} · ${p.type}`),
          node(
            'p',
            p.default.state === 'known'
              ? `參數預設：${JSON.stringify(p.default.value)}`
              : p.default.state === 'unknown'
                ? '參數預設：未知'
                : '沒有參數預設',
          ),
          node('p', p.description),
        );
        const source = node('button', '查看 Props 定義') as HTMLButtonElement;
        source.className = 'button secondary';
        source.onclick = () => showSource(p.name, p.definition);
        box.append(source);
        if (p.defaultSource) {
          const def = node('button', '查看預設值來源') as HTMLButtonElement;
          def.className = 'button secondary';
          def.onclick = () => showSource(p.name, p.defaultSource!);
          box.append(def);
        }
        if (p.check.kind === 'unknown')
          box.append(node('p', '範例值型別檢查：未知；這個宣告超過本版檢查範圍。'));
      }
      return;
    };
    return box;
  }
  function rows(reset = true) {
    if (!review) return;
    if (reset) {
      offset = 0;
      get('items').replaceChildren();
    }
    const found = review.rows.filter(
      (r) =>
        (filter.value === 'all' || r.status === filter.value) &&
        r.name.toLowerCase().includes(search.value.toLowerCase()),
    );
    for (const row of found.slice(offset, offset + 50)) get('items').append(item(row));
    offset += 50;
    get('counts').textContent =
      `${review.rows.length} 個 Props · 符合 ${found.length}，顯示 ${Math.min(offset, found.length)}。`;
    get('more').hidden = offset >= found.length;
  }
  function exampleRows() {
    if (!review) return;
    for (const e of review.examples.slice(exampleOffset, exampleOffset + 50))
      get('examples').append(
        node(
          'p',
          `${e.state === 'invalid' ? '問題' : '未知'} · ${e.example} / ${e.prop}：${e.message}`,
        ),
      );
    exampleOffset += 50;
    get('examples-more').hidden = exampleOffset >= review.examples.length;
  }
  function render(data: { report: PropsReport; review: Review; proposal: PropsDocument | null }) {
    report = data.report;
    review = data.review;
    proposal = data.proposal;
    get('output').hidden = false;
    get('context').textContent =
      `${report.scope} · ${report.component} · ${report.source.file} · @babel/parser ${report.engine.version}`;
    get('coverage').textContent = report.complete
      ? '支援範圍內的 Props 清單完整；未知值與型別限制仍須檢查。'
      : '分析不完整；未找到的舊 Props 不會當成刪除，不能下載建議文件。';
    get('warnings').replaceChildren(
      ...[...report.issues, ...review.notices].map((w) => node('p', w)),
    );
    rows();
    get('example-summary').textContent = review.exampleCount
      ? `${review.exampleCount} 個範例，${review.examples.filter((e) => e.state === 'invalid').length} 個問題、${review.examples.filter((e) => e.state === 'unknown').length} 個未知。只在支援範圍內檢查。`
      : '沒有提供使用範例；未執行範例驗證。';
    get('examples').replaceChildren();
    exampleOffset = 0;
    exampleRows();
    get<HTMLButtonElement>('document-download').disabled = !proposal;
    get('status').textContent = '分析報告已載入；請審查後自行決定是否更新文件。';
  }
  get('examples-more').addEventListener('click', exampleRows, { signal: events.signal });
  get('inspect').addEventListener(
    'click',
    () => {
      invalidate();
      const a = reportFile.files?.[0],
        b = documentFile.files?.[0];
      if (!a || a.size > 2_000_000 || (b && b.size > 2_000_000)) {
        fail();
        return;
      }
      const token = revision;
      get('status').textContent = '正在讀取與比較…';
      void Promise.all([a.text(), b ? b.text() : Promise.resolve(null)])
        .then(([text, doc]) => {
          if (token !== revision) return;
          worker = new Worker(new URL('./component-docs.worker.ts', import.meta.url), {
            type: 'module',
          });
          const error = () => {
            if (token === revision) fail();
          };
          worker.onerror = error;
          worker.onmessageerror = error;
          timer = setTimeout(error, 15_000);
          worker.onmessage = (
            e: MessageEvent<{
              ok: boolean;
              report: PropsReport;
              review: Review;
              proposal: PropsDocument | null;
            }>,
          ) => {
            if (token !== revision) return;
            stop();
            if (e.data.ok) render(e.data);
            else fail();
          };
          worker.postMessage({ report: text, document: doc });
        })
        .catch(() => {
          if (token === revision) fail();
        });
    },
    { signal: events.signal },
  );
  for (const input of [reportFile, documentFile])
    input.addEventListener('input', invalidate, { signal: events.signal });
  search.addEventListener('input', () => rows(), { signal: events.signal });
  filter.addEventListener('change', () => rows(), { signal: events.signal });
  get('more').addEventListener('click', () => rows(false), { signal: events.signal });
  function download(data: unknown, filename: string) {
    let created: string | undefined;
    try {
      const text = JSON.stringify(data, null, 2);
      if (new TextEncoder().encode(text).length > 2_000_000) throw Error('limit');
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      created = url;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      urls.set(
        url,
        setTimeout(() => {
          URL.revokeObjectURL(url);
          urls.delete(url);
        }, 1000),
      );
      a.click();
    } catch {
      if (created) {
        clearTimeout(urls.get(created));
        urls.delete(created);
        URL.revokeObjectURL(created);
      }
      get('error').hidden = false;
      get('error').textContent = '無法匯出或結果超過 2 MB，未產生文件。';
    }
  }
  get('document-download').addEventListener(
    'click',
    () => {
      if (proposal) download(proposal, 'props-document-proposed.json');
    },
    { signal: events.signal },
  );
  get('review-download').addEventListener(
    'click',
    () => {
      if (report && review) download({ report, ...review }, 'props-review.json');
    },
    { signal: events.signal },
  );
  get('clear').addEventListener(
    'click',
    () => {
      invalidate();
      reportFile.value = '';
      documentFile.value = '';
      search.value = '';
      filter.value = 'all';
      get('status').textContent = '資料已清除。';
    },
    { signal: events.signal },
  );
  return () => {
    events.abort();
    invalidate();
  };
}
