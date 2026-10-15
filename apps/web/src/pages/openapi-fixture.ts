import html from './openapi-fixture.html?raw';
import { fixtureDemos } from './openapi-fixture-demos';
import type {
  FixtureInspection,
  FixtureSelection,
  FixtureIssue,
  FixtureLocation,
  OpenApiFixtureOptions,
  OpenApiFixtureReport,
} from '@sid-tools/core/openapi-fixture';
export { html };
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const location = (value: unknown): value is FixtureLocation =>
  object(value) &&
  typeof value.pointer === 'string' &&
  typeof value.start === 'number' &&
  Number.isSafeInteger(value.start) &&
  value.start >= 0 &&
  typeof value.end === 'number' &&
  Number.isSafeInteger(value.end) &&
  value.end >= value.start &&
  typeof value.line === 'number' &&
  Number.isSafeInteger(value.line) &&
  value.line >= 1 &&
  typeof value.column === 'number' &&
  Number.isSafeInteger(value.column) &&
  value.column >= 1;
const nullableLocation = (value: unknown) => value === null || location(value);
const issues = (value: unknown): value is FixtureIssue[] =>
  Array.isArray(value) &&
  value.every(
    (issue) =>
      object(issue) &&
      typeof issue.code === 'string' &&
      ['error', 'warning'].includes(String(issue.severity)) &&
      nullableLocation(issue.location) &&
      (issue.instancePointer === null || typeof issue.instancePointer === 'string'),
  );
const selection = (value: unknown): value is FixtureSelection =>
  object(value) &&
  ['id', 'method', 'path', 'status', 'mediaType'].every((key) => typeof value[key] === 'string') &&
  ['location', 'responseUse', 'responseDefinition'].every((key) => location(value[key])) &&
  Array.isArray(value.examples) &&
  value.examples.every(
    (example) => object(example) && typeof example.name === 'string' && location(example.location),
  );
const base = (value: Record<string, unknown>) =>
  issues(value.issues) &&
  object(value.limits) &&
  Array.isArray(value.supportedScope) &&
  value.supportedScope.every((rule) => typeof rule === 'string');
const inspectionReply = (value: unknown): value is FixtureInspection =>
  object(value) &&
  base(value) &&
  ['ready', 'invalid', 'unsupported', 'limit'].includes(String(value.status)) &&
  Array.isArray(value.selections) &&
  value.selections.length <= 2000 &&
  value.selections.every(selection);
function generationReply(value: unknown): value is OpenApiFixtureReport {
  if (
    !object(value) ||
    !base(value) ||
    ![
      'ready',
      'confirmation-required',
      'invalid',
      'unsupported',
      'limit',
      'no-valid-fixture',
    ].includes(String(value.status)) ||
    !object(value.validation) ||
    !['passed', 'failed', 'not-run'].includes(String(value.validation.status)) ||
    !issues(value.validation.issues) ||
    !(value.selection === null || selection(value.selection)) ||
    !(value.options === null || object(value.options)) ||
    !Array.isArray(value.provenance) ||
    !value.provenance.every(
      (row) =>
        object(row) &&
        ['media-example', 'named-example', 'schema-example', 'generated', 'enum'].includes(
          String(row.kind),
        ) &&
        ['used', 'rejected', 'attempted'].includes(String(row.outcome)) &&
        typeof row.instancePointer === 'string' &&
        nullableLocation(row.use) &&
        nullableLocation(row.definition),
    )
  )
    return false;
  return value.status === 'ready'
    ? typeof value.fixtureJson === 'string' &&
        value.fixtureJson.length <= 100000 &&
        value.validation.status === 'passed' &&
        object(value.options) &&
        value.options.sourceConfirmedSynthetic === true
    : value.fixtureJson === null;
}
export function mount(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const source = get<HTMLTextAreaElement>('source'),
    events = new AbortController();
  let inspectionEvents = new AbortController(),
    choiceEvents = new AbortController(),
    reportEvents = new AbortController();
  let revision = 0,
    worker: Worker | undefined,
    timer: ReturnType<typeof setTimeout> | undefined,
    inspection: FixtureInspection | undefined,
    report: OpenApiFixtureReport | undefined;
  const pages = new Map<string, number>(),
    urls = new Map<string, ReturnType<typeof setTimeout>>();
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') => {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
  };
  const select = (id: string) => get<HTMLSelectElement>(id);
  const selected = () =>
    inspection?.selections.find(
      (item) =>
        item.method === select('method').value &&
        item.path === select('path').value &&
        item.status === select('response-status').value &&
        item.mediaType === select('media').value,
    );
  function stop() {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      worker = undefined;
    }
    get<HTMLButtonElement>('cancel').disabled = true;
  }
  function release() {
    for (const [url, timeout] of urls) {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
    }
    urls.clear();
  }
  function downloads() {
    const allowed =
      report?.status === 'ready' &&
      report.validation.status === 'passed' &&
      report.fixtureJson !== null &&
      get<HTMLInputElement>('source-confirm').checked &&
      get<HTMLInputElement>('download-confirm').checked;
    for (const id of ['export-fixture', 'export-summary'])
      get<HTMLButtonElement>(id).disabled = !allowed;
  }
  function invalidate() {
    revision++;
    stop();
    release();
    report = undefined;
    reportEvents.abort();
    reportEvents = new AbortController();
    get('output').hidden = true;
    get('error').hidden = true;
    get<HTMLInputElement>('download-confirm').checked = false;
    downloads();
    for (const id of [
      'report-state',
      'fixture',
      'fixture-size',
      'validation-state',
      'validation-issues',
      'report-issues',
      'provenance',
      'supported-scope',
      'source-status',
      'export-status',
      'result-note',
    ])
      get(id).replaceChildren();
    get('status').textContent = '選項已更新，舊產物／下載／工作已丟棄；請重新產生。';
  }
  function resetSource() {
    invalidate();
    inspection = undefined;
    inspectionEvents.abort();
    inspectionEvents = new AbortController();
    choiceEvents.abort();
    choiceEvents = new AbortController();
    pages.clear();
    get('inspection').hidden = true;
    get('choices').hidden = true;
    get<HTMLInputElement>('source-confirm').checked = false;
    get<HTMLButtonElement>('run').disabled = true;
    for (const id of ['method', 'path', 'response-status', 'media', 'example'])
      select(id).replaceChildren();
    for (const id of [
      'inspection-state',
      'inspection-issues',
      'selection-detail',
      'selection-pages',
    ])
      get(id).replaceChildren();
    get('status').textContent = '文件已變動；檢查、測試資料確認、產物與舊工作已清除。';
  }
  function sourceButton(value: FixtureLocation | null, label: string, signal: AbortSignal) {
    const button = el(
      'button',
      value
        ? `${label} · ${value.pointer || '(root)'} · L${value.line}:${value.column} · ${value.start}–${value.end}`
        : `${label} · 無來源範圍`,
      'text-button fx-source',
    );
    button.disabled = !value || value.end > source.value.length;
    button.addEventListener(
      'click',
      () => {
        if (!value) return;
        source.focus();
        source.setSelectionRange(value.start, value.end);
        get('source-status').textContent =
          `已選取 ${value.pointer || '(root)'}，原始 UTF-16 ${value.start}–${value.end}。`;
      },
      { signal },
    );
    return button;
  }
  function paged<T>(
    host: HTMLElement,
    items: readonly T[],
    render: (item: T, signal: AbortSignal) => HTMLElement,
    signal: AbortSignal,
    empty: string,
  ) {
    host.replaceChildren();
    if (!items.length) {
      host.append(el('p', empty, 'help'));
      return;
    }
    let page = 0,
      rowsEvents = new AbortController();
    signal.addEventListener('abort', () => rowsEvents.abort(), { once: true });
    const rows = el('div'),
      nav = el('div', '', 'fx-pages');
    host.append(rows, nav);
    function show() {
      rowsEvents.abort();
      rowsEvents = new AbortController();
      rows.replaceChildren(
        ...items.slice(page * 50, (page + 1) * 50).map((item) => render(item, rowsEvents.signal)),
      );
      nav.replaceChildren();
      if (items.length > 50) {
        const previous = el('button', '上一頁', 'text-button'),
          next = el('button', '下一頁', 'text-button');
        previous.disabled = page === 0;
        next.disabled = (page + 1) * 50 >= items.length;
        previous.addEventListener(
          'click',
          () => {
            page--;
            show();
          },
          { signal: rowsEvents.signal },
        );
        next.addEventListener(
          'click',
          () => {
            page++;
            show();
          },
          { signal: rowsEvents.signal },
        );
        nav.append(
          previous,
          el('span', `${page + 1}/${Math.ceil(items.length / 50)} 頁 · ${items.length} 筆`),
          next,
        );
      }
    }
    show();
  }
  function showIssues(id: string, items: FixtureIssue[], signal: AbortSignal) {
    paged(
      get(id),
      items,
      (issue, rowSignal) => {
        const row = el('article', '', 'fx-issue');
        row.dataset.code = issue.code;
        row.dataset.severity = issue.severity;
        row.append(
          el('strong', issue.severity),
          el('code', issue.code),
          el('p', `Instance pointer · ${issue.instancePointer ?? '不適用'}`, 'help'),
          sourceButton(issue.location, '問題來源', rowSignal),
        );
        return row;
      },
      signal,
      '沒有已回報 issue；不代表完整 OAS 驗證。',
    );
  }
  function options(): OpenApiFixtureOptions | undefined {
    const current = selected();
    if (!current) return;
    const length = get<HTMLInputElement>('array-length').value;
    return {
      method: current.method,
      path: current.path,
      status: current.status,
      mediaType: current.mediaType,
      seed: get<HTMLInputElement>('seed').value,
      sourceConfirmedSynthetic: get<HTMLInputElement>('source-confirm').checked,
      ...(select('example').value ? { exampleName: select('example').value } : {}),
      ...(length !== '' ? { arrayLength: Number(length) } : {}),
    };
  }
  function fill(
    id: string,
    values: string[],
    label: string,
    remember: string,
    signal: AbortSignal,
  ) {
    const input = select(id),
      page = Math.min(pages.get(id) ?? 0, Math.max(0, Math.ceil(values.length / 50) - 1));
    pages.set(id, page);
    input.replaceChildren(
      new Option(
        id === 'example' ? '工具策略 · 排序第一個（若有）' : `請選擇 ${label}`,
        '',
        true,
        true,
      ),
      ...values.slice(page * 50, (page + 1) * 50).map((value) => new Option(value, value)),
    );
    input.disabled = !values.length;
    input.value = values.slice(page * 50, (page + 1) * 50).includes(remember) ? remember : '';
    if (values.length > 50) {
      const nav = el('div', '', 'fx-page-group'),
        prev = el('button', `${label} 上一批`, 'text-button'),
        next = el('button', `${label} 下一批`, 'text-button');
      prev.disabled = page === 0;
      next.disabled = (page + 1) * 50 >= values.length;
      for (const [button, delta] of [
        [prev, -1],
        [next, 1],
      ] as const)
        button.addEventListener(
          'click',
          () => {
            invalidate();
            pages.set(id, page + delta);
            input.value = '';
            clearAfter(id);
            choices();
          },
          { signal },
        );
      nav.append(
        prev,
        el('span', `${label} ${page + 1}/${Math.ceil(values.length / 50)} · ${values.length} 個`),
        next,
      );
      get('selection-pages').append(nav);
    }
  }
  function clearAfter(id: string) {
    const ids = ['method', 'path', 'response-status', 'media', 'example'],
      index = ids.indexOf(id);
    for (const following of ids.slice(index + 1)) {
      select(following).value = '';
      pages.delete(following);
    }
  }
  function choices() {
    choiceEvents.abort();
    choiceEvents = new AbortController();
    const signal = choiceEvents.signal;
    get('selection-pages').replaceChildren();
    const all = inspection?.selections ?? [];
    const unique = (items: string[]) => [...new Set(items)];
    fill(
      'method',
      unique(all.map((item) => item.method)),
      'Method',
      select('method').value,
      signal,
    );
    const byMethod = all.filter((item) => item.method === select('method').value);
    fill('path', unique(byMethod.map((item) => item.path)), 'Path', select('path').value, signal);
    const byPath = byMethod.filter((item) => item.path === select('path').value);
    fill(
      'response-status',
      unique(byPath.map((item) => item.status)),
      'Status',
      select('response-status').value,
      signal,
    );
    const byStatus = byPath.filter((item) => item.status === select('response-status').value);
    fill(
      'media',
      unique(byStatus.map((item) => item.mediaType)),
      'Media',
      select('media').value,
      signal,
    );
    const current = selected();
    fill(
      'example',
      current?.examples.map((item) => item.name) ?? [],
      'Example',
      select('example').value,
      signal,
    );
    get<HTMLButtonElement>('run').disabled = !current;
    const detail = get('selection-detail');
    detail.replaceChildren();
    if (current)
      detail.append(
        el('h3', `${current.method} ${current.path} → ${current.status} · ${current.mediaType}`),
        sourceButton(current.location, '選定 media', signal),
        sourceButton(current.responseUse, 'Response 使用點', signal),
        sourceButton(current.responseDefinition, 'Response 定義', signal),
      );
    else detail.append(el('p', '尚未完整選擇；不套用猜測或第一個回應。', 'help'));
  }
  function showInspection() {
    if (!inspection) return;
    get('inspection').hidden = false;
    get('inspection-state').textContent =
      `Inspection ${inspection.status} · ${inspection.selections.length} 個實際 JSON 回應。Ready 只是列出選擇，不代表 schema 有效或完整 OAS conformance。`;
    showIssues('inspection-issues', inspection.issues, inspectionEvents.signal);
    get('choices').hidden = inspection.status !== 'ready' || !inspection.selections.length;
    get('selection-count').textContent =
      `${inspection.selections.length} SELECTIONS / ACTUAL IDENTITIES`;
    choices();
    get('status').textContent = '檢查完成，worker 已終止。請明確選擇 method／path／status／media。';
  }
  function showReport() {
    if (!report) return;
    const current = report;
    get('output').hidden = false;
    get('report-state').dataset.state = current.status;
    get('report-state').textContent = current.status;
    get('validation-state').dataset.state = current.validation.status;
    get('validation-state').textContent =
      `Validation ${current.validation.status} · 獨立 traversal，只驗證支援子集。`;
    const ready =
      current.status === 'ready' &&
      current.validation.status === 'passed' &&
      current.fixtureJson !== null;
    get('fixture').textContent = ready
      ? current.fixtureJson
      : '無可用 fixture；不以空物件或成功預設值替代。';
    get('fixture-size').textContent = ready
      ? `${current.fixtureJson!.length} UTF-16 UNITS`
      : 'NO FIXTURE';
    get('result-note').textContent = ready
      ? 'Ready + passed：此 fixture 通過支援子集的獨立驗證，不代表完整規格或真實 API 行為。來源 literals 是您確認為測試資料，不是自動匿名化。'
      : current.status === 'confirmation-required'
        ? 'Confirmation required：請確認來源文件、examples、defaults、enums 僅含測試資料。未確認不產出 fixture／下載。'
        : `${current.status}：沒有已建立的有效 fixture，無可下載產物。No-valid-fixture 不是 schema 無解證明；請查看來源與診斷。`;
    showIssues('validation-issues', current.validation.issues, reportEvents.signal);
    showIssues('report-issues', current.issues, reportEvents.signal);
    get('supported-scope').replaceChildren(...current.supportedScope.map((rule) => el('li', rule)));
    paged(
      get('provenance'),
      current.provenance,
      (row, signal) => {
        const card = el('article', '', 'fx-provenance');
        card.dataset.kind = row.kind;
        card.dataset.outcome = row.outcome;
        card.append(
          el('div', `${row.kind} / ${row.outcome}`, 'fx-provenance-label'),
          el('code', `Instance pointer · ${row.instancePointer || '(root)'}`),
          el(
            'p',
            row.kind === 'generated'
              ? '本機 seeded generation；attempted 不等於已通過驗證。'
              : '沿用／嘗試來源值：user-asserted test data，不是匿名化或 server observed。',
            'help',
          ),
          sourceButton(row.use, '使用點', signal),
          sourceButton(row.definition, '定義', signal),
        );
        return card;
      },
      reportEvents.signal,
      '沒有來源嘗試記錄；不表示存在可用 fixture。',
    );
    downloads();
    get('status').textContent =
      `產生完成 · ${current.status} / validation ${current.validation.status}，worker 已終止。`;
  }
  function fail(message: string) {
    stop();
    get('error').textContent = message;
    get('error').hidden = false;
    get('status').textContent =
      '工作未完成；沒有主執行緒 parser／generator fallback，沒有有效性結論。';
  }
  function request(kind: 'inspect' | 'generate') {
    if (kind === 'inspect') resetSource();
    else invalidate();
    const requestedOptions = kind === 'generate' ? options() : undefined;
    if (kind === 'generate' && !requestedOptions) return;
    const id = revision;
    get('status').textContent = `專用 worker 本機 ${kind}，最多等待 20 秒；可取消。`;
    try {
      const active = new Worker(new URL('../openapi-fixture.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker = active;
      get<HTMLButtonElement>('cancel').disabled = false;
      timer = setTimeout(() => {
        if (id !== revision || worker !== active) return;
        fail('工作逾時（20 秒），worker 已終止；沒有可用結論。');
      }, 20000);
      active.onerror = () => {
        if (id === revision && worker === active)
          fail('Worker 載入或執行失敗，已終止；不在主執行緒重試。');
      };
      active.onmessageerror = () => {
        if (id === revision && worker === active) fail('Worker 訊息無法讀取，已終止；不回退解析。');
      };
      active.onmessage = (event: MessageEvent<unknown>) => {
        const data = event.data;
        if (id !== revision || worker !== active || !object(data) || data.id !== id) return;
        if (data.kind === 'failure' && data.request === kind) {
          fail('Worker 無法完成工作，已終止；沒有可用結論。');
          return;
        }
        if (kind === 'inspect' && data.kind === 'inspection' && inspectionReply(data.result)) {
          stop();
          inspection = data.result;
          showInspection();
        } else if (
          kind === 'generate' &&
          data.kind === 'generation' &&
          generationReply(data.result) &&
          (data.result.status !== 'ready' ||
            (requestedOptions?.sourceConfirmedSynthetic === true &&
              data.result.options?.seed === requestedOptions.seed &&
              data.result.options.arrayLength === requestedOptions.arrayLength &&
              data.result.options.exampleName === requestedOptions.exampleName &&
              data.result.selection?.method === requestedOptions.method &&
              data.result.selection.path === requestedOptions.path &&
              data.result.selection.status === requestedOptions.status &&
              data.result.selection.mediaType === requestedOptions.mediaType))
        ) {
          stop();
          report = data.result;
          showReport();
        }
      };
      active.postMessage(
        kind === 'inspect'
          ? { kind, id, source: source.value }
          : { kind, id, source: source.value, options: requestedOptions },
      );
    } catch {
      fail('無法啟動專用 worker；沒有主執行緒 fallback。');
    }
  }
  source.addEventListener(
    'input',
    () => {
      resetSource();
      get('demo-note').textContent = '自訂來源；案例預期不適用於修改後的文件。';
    },
    { signal: events.signal },
  );
  for (const [id, demo] of [
    ['demo', fixtureDemos.basic],
    ['demo-inline', fixtureDemos.inline],
    ['demo-fallback', fixtureDemos.fallback],
    ['demo-schema', fixtureDemos.schema],
    ['demo-named', fixtureDemos.named],
    ['demo-unsupported', fixtureDemos.unsupported],
    ['demo-invalid', fixtureDemos.invalid],
    ['demo-version', fixtureDemos.version],
  ] as const)
    get(id).addEventListener(
      'click',
      () => {
        resetSource();
        source.value = demo.source;
        get('demo-note').textContent = demo.note;
        get('status').textContent = '人工合成案例已載入；按檢查才解析。';
      },
      { signal: events.signal },
    );
  for (const id of ['method', 'path', 'response-status', 'media', 'example'])
    select(id).addEventListener(
      'change',
      () => {
        invalidate();
        clearAfter(id);
        choices();
      },
      { signal: events.signal },
    );
  for (const id of ['seed', 'array-length', 'source-confirm'])
    get(id).addEventListener(id === 'source-confirm' ? 'change' : 'input', invalidate, {
      signal: events.signal,
    });
  get('inspect').addEventListener('click', () => request('inspect'), { signal: events.signal });
  get('run').addEventListener('click', () => request('generate'), { signal: events.signal });
  get('cancel').addEventListener(
    'click',
    () => {
      invalidate();
      get('status').textContent = '已取消並終止 worker，沒有完整結論；輸入與有效檢查保留。';
    },
    { signal: events.signal },
  );
  get('clear').addEventListener(
    'click',
    () => {
      resetSource();
      source.value = '';
      get<HTMLInputElement>('seed').value = 'fixture-study';
      get<HTMLInputElement>('array-length').value = '';
      get('demo-note').textContent = '固定案例皆人工合成。載入、輸入或選項變動不會自動解析。';
      get('status').textContent = '來源、選擇、確認、產物、worker 與下載已清除。';
      source.focus();
    },
    { signal: events.signal },
  );
  get('download-confirm').addEventListener(
    'change',
    () => {
      release();
      downloads();
    },
    { signal: events.signal },
  );
  for (const type of ['fixture', 'summary'] as const)
    get(`export-${type}`).addEventListener(
      'click',
      () => {
        const current = report,
          id = revision;
        if (
          !current ||
          current.status !== 'ready' ||
          current.validation.status !== 'passed' ||
          !get<HTMLInputElement>('download-confirm').checked ||
          !get<HTMLInputElement>('source-confirm').checked
        )
          return;
        get('export-status').textContent = '正在載入公開匯出 helper，準備縮減投影…';
        void import('@sid-tools/core/openapi-fixture')
          .then((core) => {
            if (
              id !== revision ||
              report !== current ||
              !get<HTMLInputElement>('download-confirm').checked ||
              !get<HTMLInputElement>('source-confirm').checked
            )
              return;
            release();
            try {
              const text =
                type === 'fixture'
                  ? core.exportOpenApiFixture(current)
                  : core.exportOpenApiFixtureSummary(current);
              if (text === null) throw new Error('Export unavailable');
              const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
              urls.set(
                url,
                setTimeout(() => {
                  URL.revokeObjectURL(url);
                  urls.delete(url);
                }, 1000),
              );
              const link = el('a');
              link.href = url;
              link.download =
                type === 'fixture' ? 'openapi-fixture.json' : 'openapi-fixture-summary.json';
              link.click();
              get('export-status').textContent =
                type === 'fixture'
                  ? '已建立含實際值的 fixture；請檢查敏感內容後再分享。'
                  : '已建立精簡摘要；seed／名稱／pointers 仍可能敏感，不是匿名化。';
            } catch {
              release();
              get('export-status').textContent =
                '無法建立下載；不退回原始 report／來源／未驗證 fixture。';
            }
          })
          .catch(() => {
            if (id === revision)
              get('export-status').textContent = '無法載入公開 helper；不匯出原始 report／來源。';
          });
      },
      { signal: events.signal },
    );
  return () => {
    events.abort();
    resetSource();
    inspectionEvents.abort();
    choiceEvents.abort();
    reportEvents.abort();
    source.value = '';
    get<HTMLInputElement>('seed').value = '';
    get<HTMLInputElement>('array-length').value = '';
  };
}
