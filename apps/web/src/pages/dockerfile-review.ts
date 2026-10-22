import html from './dockerfile-review.html?raw';
import type { DockerReport, compareDockerReports } from '@sid-tools/core/dockerfile-review';
export { html };
type Comparison = ReturnType<typeof compareDockerReports>;
export function mount(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const file = get<HTMLInputElement>('report-file'),
    baseline = get<HTMLInputElement>('baseline-file'),
    filter = get<HTMLSelectElement>('filter');
  const events = new AbortController(),
    reasons = new Map<string, string>(),
    urls = new Set<string>();
  let revision = 0,
    worker: Worker | undefined,
    report: DockerReport | undefined,
    comparison: Comparison | undefined,
    offset = 0,
    timer: ReturnType<typeof setTimeout> | undefined;
  const node = (tag: string, text: string) => {
    const el = document.createElement(tag);
    el.textContent = text;
    return el;
  };
  function invalidate() {
    revision++;
    clearTimeout(timer);
    worker?.terminate();
    worker = undefined;
    report = undefined;
    comparison = undefined;
    reasons.clear();
    urls.forEach((url) => URL.revokeObjectURL(url));
    urls.clear();
    get('items').replaceChildren();
    for (const id of ['removed', 'context', 'comparison', 'counts']) get(id).textContent = '';
    get('output').hidden = true;
    get('error').hidden = true;
    get('status').textContent = '請載入報告。';
  }
  function fail() {
    clearTimeout(timer);
    worker?.terminate();
    worker = undefined;
    get('error').hidden = false;
    get('error').textContent = '無法載入：請檢查報告格式、版本、來源摘要及每份 2 MB 限制。';
    get('status').textContent = '沒有可用結果。';
  }
  function render(reset = true) {
    if (!report || !comparison) return;
    if (reset) {
      offset = 0;
      get('items').replaceChildren();
    }
    const rows = comparison.rows.filter(
      (row) => filter.value === 'all' || row.finding.level === filter.value,
    );
    const lines = report.source.text.split('\n');
    for (const { finding: f, change } of rows.slice(offset, offset + 50)) {
      const box = document.createElement('details');
      box.className = 'unused-candidate';
      box.append(
        node(
          'summary',
          `${f.code} · ${f.level} · 第 ${f.line} 行${reasons.has(f.id) ? ' · 已註記' : ''}`,
        ),
      );
      let loaded = false;
      box.ontoggle = () => {
        if (!box.open || loaded) return;
        loaded = true;
        box.append(
          node(
            'p',
            `${report!.source.name}:${f.line}:${f.column} · ${change === 'added' ? '新增' : change === 'unchanged' ? '前次亦有' : '本次結果'}`,
          ),
          node('p', f.message),
          node(
            'pre',
            lines
              .slice(Math.max(0, f.line - 2), f.line + 1)
              .map((line, i) => `${Math.max(1, f.line - 1) + i}: ${line}`)
              .join('\n'),
          ),
        );
        const label = node('label', '誤判／保留理由（最多 1000 字）'),
          reason = document.createElement('textarea');
        reason.maxLength = 1000;
        reason.rows = 3;
        reason.value = reasons.get(f.id) ?? '';
        label.append(reason);
        box.append(label);
        const save = node('button', '保存理由') as HTMLButtonElement;
        save.className = 'button secondary';
        save.onclick = () => {
          if (!reason.value.trim()) {
            get('error').hidden = false;
            get('error').textContent = '請填寫理由。';
            return;
          }
          reasons.set(f.id, reason.value.trim());
          get('error').hidden = true;
          render();
          get('status').textContent = '理由已記錄，下載報告才能保存。';
        };
        const undo = node('button', '撤銷理由') as HTMLButtonElement;
        undo.className = 'button secondary';
        undo.onclick = () => {
          reasons.delete(f.id);
          render();
        };
        box.append(save, undo);
      };
      get('items').append(box);
    }
    offset += 50;
    get('more').hidden = offset >= rows.length;
    get('counts').textContent =
      `${report.findings.length} 項規則結果 · ${reasons.size} 項註記 · 篩選 ${rows.length} 項，顯示 ${Math.min(offset, rows.length)} 項。`;
  }
  get('inspect').addEventListener(
    'click',
    () => {
      invalidate();
      const a = file.files?.[0],
        b = baseline.files?.[0],
        token = revision;
      if (!a || a.size > 2_000_000 || (b && b.size > 2_000_000)) {
        fail();
        return;
      }
      get('status').textContent = '正在核對來源摘要…';
      timer = setTimeout(() => {
        if (token === revision) {
          revision++;
          fail();
        }
      }, 20_000);
      void Promise.all([a.text(), b ? b.text() : null])
        .then(([current, previous]) => {
          if (token !== revision) return;
          worker = new Worker(new URL('./dockerfile-review.worker.ts', import.meta.url), {
            type: 'module',
          });
          worker.onmessageerror = () => {
            if (token === revision) fail();
          };
          worker.onerror = () => {
            if (token === revision) fail();
          };
          worker.onmessage = (
            event: MessageEvent<{ ok: boolean; report: DockerReport; comparison: Comparison }>,
          ) => {
            if (token !== revision) return;
            clearTimeout(timer);
            worker?.terminate();
            worker = undefined;
            if (!event.data.ok) {
              fail();
              return;
            }
            report = event.data.report;
            comparison = event.data.comparison;
            for (const row of comparison.rows)
              if (row.reason) reasons.set(row.finding.id, row.reason);
            get('context').textContent =
              `${report.source.name} · Hadolint ${report.engine.version} · SHA256 ${report.source.sha256}`;
            get('comparison').textContent = !comparison.hasBaseline
              ? '未載入前次報告。'
              : comparison.sameSource
                ? '來源相同，可沿用前次理由。'
                : `來源已改變，${comparison.invalidatedAnnotations} 項前次註記失效。`;
            get('removed').textContent =
              comparison.removed
                .map((f) => `${f.code}:${f.line}:${f.column} ${f.message}`)
                .join('\n') || '沒有未再回報的項目。';
            get('output').hidden = false;
            get('status').textContent = '報告已載入。';
            render();
          };
          worker.postMessage({ current, previous });
        })
        .catch(() => {
          if (token === revision) fail();
        });
    },
    { signal: events.signal },
  );
  for (const input of [file, baseline])
    input.addEventListener('input', invalidate, { signal: events.signal });
  filter.addEventListener('change', () => render(), { signal: events.signal });
  get('more').addEventListener('click', () => render(false), { signal: events.signal });
  get('download').addEventListener(
    'click',
    () => {
      if (!report) return;
      const text = JSON.stringify(
        { ...report, annotations: [...reasons].map(([id, reason]) => ({ id, reason })) },
        null,
        2,
      );
      if (new TextEncoder().encode(text).length > 2_000_000) {
        get('error').textContent = '含理由的報告超過 2 MB，未匯出。';
        get('error').hidden = false;
        return;
      }
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      urls.add(url);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'dockerfile-review.json';
      link.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        urls.delete(url);
      }, 1000);
    },
    { signal: events.signal },
  );
  get('clear').addEventListener(
    'click',
    () => {
      invalidate();
      file.value = '';
      baseline.value = '';
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
