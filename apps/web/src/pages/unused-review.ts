import html from './unused-review.html?raw';
import type { UnusedReport, UnusedRow, reviewUnused } from '@sid-tools/core/unused-review';
export { html };
type Review = ReturnType<typeof reviewUnused>;
const labels: Record<UnusedRow['status'], string> = {
  new: '新增',
  existing: '既有待處理',
  changed: '來源已改變',
  accepted: '已接受',
  resolved: '已消失',
  'review-needed': '條件不同，待重新審查',
};
export function mount(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const reportFile = get<HTMLInputElement>('report-file'),
    baselineFile = get<HTMLInputElement>('baseline-file'),
    search = get<HTMLInputElement>('search'),
    filter = get<HTMLSelectElement>('filter');
  const events = new AbortController(),
    accepted = new Map<string, string>(),
    urls = new Set<string>();
  let worker: Worker | undefined,
    revision = 0,
    report: UnusedReport | undefined,
    review: Review | undefined,
    offset = 0;
  const node = (tag: string, text: string) => {
    const el = document.createElement(tag);
    el.textContent = text;
    return el;
  };
  function invalidate() {
    revision++;
    worker?.terminate();
    worker = undefined;
    report = undefined;
    review = undefined;
    accepted.clear();
    for (const url of urls) URL.revokeObjectURL(url);
    urls.clear();
    for (const id of ['context', 'compatibility', 'warnings', 'settings', 'counts', 'items'])
      get(id).replaceChildren();
    get('output').hidden = true;
    get('error').hidden = true;
    get('status').textContent = '請載入並比較。';
  }
  function display(row: UnusedRow): UnusedRow {
    return accepted.has(row.finding.id)
      ? { ...row, status: 'accepted', reason: accepted.get(row.finding.id)! }
      : { ...row, status: row.status === 'accepted' ? 'existing' : row.status, reason: null };
  }
  function item(row: UnusedRow) {
    const f = row.finding,
      box = document.createElement('details');
    box.className = 'unused-candidate';
    box.append(node('summary', `${labels[row.status]} · ${f.type} · ${f.name}`));
    let loaded = false;
    box.ontoggle = () => {
      if (!box.open || loaded) return;
      loaded = true;
      box.append(
        node(
          'p',
          `來源：${f.file}${f.line === null ? '（行號未知）' : `:${f.line}:${f.col ?? '?'}`}`,
        ),
        node('p', f.reason),
        node('p', `分析後檔案 SHA256：${f.sourceHash ?? '無法取得；不可接受為已確認的舊問題。'}`),
      );
      if (f.namespace) box.append(node('p', `Namespace：${f.namespace}`));
      if (row.status === 'resolved') return;
      const label = node('label', '保留／接受理由（必填，最多 1000 字）'),
        reason = document.createElement('textarea');
      reason.maxLength = 1000;
      reason.rows = 3;
      reason.value = accepted.get(f.id) ?? '';
      label.append(reason);
      box.append(label);
      const save = node('button', '接受並保留理由') as HTMLButtonElement;
      save.className = 'button secondary';
      save.disabled = !f.sourceHash;
      save.onclick = () => {
        if (!reason.value.trim()) {
          get('error').textContent = '請填寫接受理由，不能只標記忽略。';
          get('error').hidden = false;
          reason.focus();
          return;
        }
        accepted.set(f.id, reason.value.trim());
        get('error').hidden = true;
        rows();
        get('status').textContent = '已記錄接受理由；下載新基準才能在下次沿用。';
      };
      const undo = node('button', '撤銷接受') as HTMLButtonElement;
      undo.className = 'button secondary';
      undo.disabled = !accepted.has(f.id);
      undo.onclick = () => {
        accepted.delete(f.id);
        rows();
        get('status').textContent = '已撤銷接受。';
      };
      const actions = node('div', '');
      actions.className = 'tool-actions';
      actions.append(save, undo);
      box.append(actions);
    };
    return box;
  }
  function rows(reset = true) {
    if (!review) return;
    if (reset) {
      offset = 0;
      get('items').replaceChildren();
    }
    const all = review.rows.map(display),
      query = search.value.toLowerCase();
    const found = all.filter(
      (r) =>
        (filter.value === 'all' || r.status === filter.value) &&
        `${r.finding.file} ${r.finding.name} ${r.finding.namespace} ${r.reason ?? ''}`
          .toLowerCase()
          .includes(query),
    );
    for (const row of found.slice(offset, offset + 50)) get('items').append(item(row));
    offset += 50;
    get('counts').textContent =
      `${all.length} 個候選／歷史項目 · ${all.filter((r) => r.status === 'accepted').length} 已接受 · 符合 ${found.length}，顯示 ${Math.min(offset, found.length)}。`;
    get('more').hidden = offset >= found.length;
  }
  function render(data: UnusedReport, comparison: Review) {
    report = data;
    review = comparison;
    for (const row of comparison.rows)
      if (row.status === 'accepted' && row.reason) accepted.set(row.finding.id, row.reason);
    get('output').hidden = false;
    get('context').textContent =
      `${data.scope} · Knip ${data.engine.version} · ${data.findings.length} 個本次候選`;
    get('compatibility').textContent = !comparison.hasBaseline
      ? '未載入基準；本次候選列為新增。'
      : comparison.comparable
        ? '基準條件一致；來源摘要改變仍須重新審查。'
        : `基準不相容：${comparison.reasons.join(' ')} ${comparison.unverifiedBaselineCount} 個舊項目未判定為已消失。`;
    get('warnings').replaceChildren(...data.warnings.map((w) => node('p', w)));
    get('settings').textContent = JSON.stringify(data.settings, null, 2);
    rows();
    get('status').textContent = '分析報告已載入。';
  }
  function fail() {
    worker?.terminate();
    worker = undefined;
    get('error').hidden = false;
    get('error').textContent = '無法載入：請確認報告／基準格式有效，且每份不超過 8 MB。';
    get('status').textContent = '沒有可用的審查結果。';
  }
  get('inspect').addEventListener(
    'click',
    () => {
      invalidate();
      const a = reportFile.files?.[0],
        b = baselineFile.files?.[0];
      if (!a || a.size > 8_000_000 || (b && b.size > 8_000_000)) {
        fail();
        return;
      }
      const token = revision;
      get('status').textContent = '正在讀取報告…';
      void Promise.all([a.text(), b ? b.text() : Promise.resolve(null)])
        .then(([text, base]) => {
          if (token !== revision) return;
          worker = new Worker(new URL('./unused-review.worker.ts', import.meta.url), {
            type: 'module',
          });
          worker.onerror = () => {
            if (token === revision) fail();
          };
          worker.onmessage = (
            event: MessageEvent<{ ok: boolean; report: UnusedReport; review: Review }>,
          ) => {
            if (token !== revision) return;
            worker?.terminate();
            worker = undefined;
            if (event.data.ok) render(event.data.report, event.data.review);
            else fail();
          };
          worker.postMessage({ report: text, baseline: base });
        })
        .catch(() => {
          if (token === revision) fail();
        });
    },
    { signal: events.signal },
  );
  for (const field of [reportFile, baselineFile])
    field.addEventListener('input', invalidate, { signal: events.signal });
  search.addEventListener('input', () => rows(), { signal: events.signal });
  filter.addEventListener('change', () => rows(), { signal: events.signal });
  get('more').addEventListener('click', () => rows(false), { signal: events.signal });
  function download(value: unknown, name: string) {
    const text = JSON.stringify(value, null, 2);
    if (new TextEncoder().encode(text).length > 8_000_000) throw new Error('limit');
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    urls.add(url);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      urls.delete(url);
    }, 1000);
  }
  get('baseline-download').addEventListener(
    'click',
    () => {
      if (!report) return;
      const data = report,
        token = revision,
        decisions = [...accepted].map(([id, reason]) => ({ id, reason }));
      void import('@sid-tools/core/unused-review')
        .then(({ createUnusedBaseline }) => {
          if (token !== revision) return;
          download(createUnusedBaseline(data, decisions), 'unused-baseline.json');
        })
        .catch(() => {
          if (token === revision) {
            get('error').textContent = '無法匯出基準：請檢查理由、來源摘要與 8 MB 限制。';
            get('error').hidden = false;
          }
        });
    },
    { signal: events.signal },
  );
  get('review-download').addEventListener(
    'click',
    () => {
      if (!report || !review) return;
      try {
        download(
          {
            format: 'sid-tools-unused-review-v1',
            engine: report.engine,
            scope: report.scope,
            settings: report.settings,
            warnings: report.warnings,
            ...review,
            rows: review.rows.map(display),
          },
          'unused-review.json',
        );
      } catch {
        get('error').textContent = '審查結果超過 8 MB，未匯出。';
        get('error').hidden = false;
      }
    },
    { signal: events.signal },
  );
  get('clear').addEventListener(
    'click',
    () => {
      invalidate();
      reportFile.value = '';
      baselineFile.value = '';
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
