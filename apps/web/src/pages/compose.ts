import html from './compose.html?raw';
import { composeDemos } from './compose-demos';
import type {
  ComposeReport,
  ComposeLocation,
  ComposeService,
  ComposeResource,
  ComposeDependency,
  ComposeAttachment,
} from '@sid-tools/core/compose';
export { html };
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const nullableText = (value: unknown) => value === null || text(value);
const strings = (value: unknown) => Array.isArray(value) && value.every(text);
const nullableBoolean = (value: unknown) => value === null || typeof value === 'boolean';
function location(value: unknown): value is ComposeLocation {
  return (
    object(value) &&
    text(value.path) &&
    ['start', 'end', 'line', 'column'].every(
      (key) => typeof value[key] === 'number' && Number.isSafeInteger(value[key]),
    ) &&
    Number(value.start) >= 0 &&
    Number(value.end) >= Number(value.start) &&
    Number(value.line) >= 1 &&
    Number(value.column) >= 1
  );
}
const service = (value: unknown) =>
  object(value) &&
  text(value.id) &&
  text(value.name) &&
  location(value.location) &&
  strings(value.profiles) &&
  typeof value.conditional === 'boolean' &&
  ['declared', 'unresolved', 'absent'].includes(String(value.image)) &&
  typeof value.networkModeUnsupported === 'boolean';
const resource = (value: unknown) =>
  object(value) &&
  text(value.id) &&
  text(value.name) &&
  ['network', 'volume'].includes(String(value.kind)) &&
  (value.location === null || location(value.location)) &&
  typeof value.implicit === 'boolean' &&
  nullableBoolean(value.external) &&
  value.existence === 'not-checked' &&
  ['declared', 'unresolved'].includes(String(value.identity));
const reference = (value: unknown) =>
  object(value) &&
  text(value.id) &&
  text(value.sourceId) &&
  nullableText(value.targetName) &&
  nullableText(value.targetId) &&
  ['declared', 'missing', 'unresolved'].includes(String(value.status)) &&
  location(value.location);
function reportReply(value: unknown): value is ComposeReport {
  if (
    !object(value) ||
    !['complete', 'partial', 'invalid', 'limit'].includes(String(value.status)) ||
    !object(value.spec) ||
    !text(value.spec.snapshot) ||
    !text(value.spec.url) ||
    !strings(value.coverage) ||
    !object(value.limits) ||
    !Array.isArray(value.services) ||
    value.services.length > 128 ||
    !value.services.every(service) ||
    !Array.isArray(value.networks) ||
    value.networks.length > 128 ||
    !value.networks.every(resource) ||
    !Array.isArray(value.volumes) ||
    value.volumes.length > 128 ||
    !value.volumes.every(resource) ||
    !Array.isArray(value.dependencies) ||
    !value.dependencies.every(
      (row) =>
        reference(row) &&
        object(row) &&
        ['service_started', 'service_healthy', 'service_completed_successfully', null].includes(
          row.condition as string | null,
        ) &&
        nullableBoolean(row.required) &&
        nullableBoolean(row.restart) &&
        typeof row.conditional === 'boolean' &&
        typeof row.supported === 'boolean',
    ) ||
    !Array.isArray(value.attachments) ||
    !value.attachments.every(
      (row) =>
        reference(row) &&
        object(row) &&
        ['network', 'volume', 'bind', 'anonymous'].includes(String(row.kind)) &&
        typeof row.implicit === 'boolean',
    ) ||
    value.dependencies.length + value.attachments.length > 4000 ||
    !Array.isArray(value.cycles) ||
    !value.cycles.every(
      (row) =>
        object(row) &&
        text(row.id) &&
        strings(row.serviceIds) &&
        strings(row.dependencyIds) &&
        typeof row.conditional === 'boolean' &&
        typeof row.containsUnconditionalCycle === 'boolean',
    ) ||
    !Array.isArray(value.diagnostics) ||
    value.diagnostics.length > 500 ||
    !value.diagnostics.every(
      (row) =>
        object(row) &&
        text(row.code) &&
        ['info', 'warning', 'error'].includes(String(row.severity)) &&
        ['structure', 'reference', 'cycle', 'unresolved', 'coverage', 'limit'].includes(
          String(row.category),
        ) &&
        location(row.location),
    )
  )
    return false;
  return (
    value.status !== 'limit' ||
    ['services', 'networks', 'volumes', 'dependencies', 'attachments', 'cycles'].every(
      (key) => Array.isArray(value[key]) && value[key].length === 0,
    )
  );
}
type Reference =
  | { kind: 'dependency'; record: ComposeDependency }
  | { kind: 'network' | 'volume' | 'bind' | 'anonymous'; record: ComposeAttachment };
const kindLabels = {
  dependency: 'depends_on',
  network: 'Network attachment',
  volume: 'Named volume mount',
  bind: 'Bind mount',
  anonymous: 'Anonymous mount',
};
export function mount(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const source = get<HTMLTextAreaElement>('source'),
    events = new AbortController();
  let resultEvents = new AbortController(),
    graphEvents = new AbortController(),
    referenceEvents = new AbortController(),
    diagnosticEvents = new AbortController();
  let report: ComposeReport | undefined,
    worker: Worker | undefined,
    timer: ReturnType<typeof setTimeout> | undefined,
    revision = 0;
  const urls = new Map<string, ReturnType<typeof setTimeout>>();
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, value = '', className = '') => {
    const node = document.createElement(tag);
    node.textContent = value;
    node.className = className;
    return node;
  };
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
  function enabled() {
    get<HTMLButtonElement>('export-summary').disabled =
      !report || report.status === 'limit' || !get<HTMLInputElement>('export-confirm').checked;
  }
  function reset() {
    revision++;
    stop();
    release();
    report = undefined;
    for (const controller of [resultEvents, graphEvents, referenceEvents, diagnosticEvents])
      controller.abort();
    resultEvents = new AbortController();
    graphEvents = new AbortController();
    referenceEvents = new AbortController();
    diagnosticEvents = new AbortController();
    get('output').hidden = true;
    get('error').hidden = true;
    get<HTMLInputElement>('export-confirm').checked = false;
    get<HTMLSelectElement>('reference-filter').value = 'all';
    get<HTMLSelectElement>('reference-status').value = 'all';
    get<HTMLSelectElement>('diagnostic-filter').value = 'all';
    for (const id of [
      'report-state',
      'summary',
      'counts',
      'spec',
      'service',
      'graph',
      'services',
      'networks',
      'volumes',
      'references',
      'cycles',
      'diagnostics',
      'coverage',
      'source-status',
      'export-status',
    ])
      get(id).replaceChildren();
    enabled();
    get('status').textContent = '來源已更新；舊圖、結果、下載與工作已清除，請重新 Run。';
  }
  function go(value: ComposeLocation, label: string) {
    if (value.end > source.value.length) return;
    source.focus();
    source.setSelectionRange(value.start, value.end);
    get('source-status').textContent =
      `已選 ${label} · ${value.path || '(root)'} · L${value.line}:${value.column} · UTF-16 ${value.start}–${value.end}。`;
  }
  function sourceButton(value: ComposeLocation | null, label: string, signal: AbortSignal) {
    const button = el(
      'button',
      value
        ? `${label} · ${value.path || '(root)'} · L${value.line}:${value.column} · ${value.start}–${value.end}`
        : `${label} · implicit／無明示宣告範圍`,
      'text-button cmp-source',
    );
    button.disabled = !value || value.end > source.value.length;
    button.addEventListener(
      'click',
      () => {
        if (value) go(value, label);
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
      rowEvents = new AbortController();
    signal.addEventListener('abort', () => rowEvents.abort(), { once: true });
    const rows = el('div'),
      nav = el('div', '', 'cmp-pages');
    host.append(rows, nav);
    function show() {
      rowEvents.abort();
      rowEvents = new AbortController();
      rows.replaceChildren(
        ...items.slice(page * 50, (page + 1) * 50).map((item) => render(item, rowEvents.signal)),
      );
      nav.replaceChildren();
      if (items.length > 50) {
        const prev = el('button', '上一頁', 'text-button'),
          next = el('button', '下一頁', 'text-button');
        prev.disabled = page === 0;
        next.disabled = (page + 1) * 50 >= items.length;
        prev.addEventListener(
          'click',
          () => {
            page--;
            show();
          },
          { signal: rowEvents.signal },
        );
        next.addEventListener(
          'click',
          () => {
            page++;
            show();
          },
          { signal: rowEvents.signal },
        );
        nav.append(
          prev,
          el('span', `${page + 1}/${Math.ceil(items.length / 50)} · ${items.length} 筆`),
          next,
        );
      }
    }
    show();
  }
  function serviceCard(item: ComposeService, signal: AbortSignal) {
    const card = el('article', '', 'cmp-service-card');
    card.dataset.service = item.name;
    card.dataset.conditional = String(item.conditional);
    card.append(
      el('span', 'SERVICE', 'cmp-kind'),
      el('h4', item.name),
      el(
        'p',
        `${item.conditional ? 'Conditional · 未選 profile activation' : '不受 profile 條件限制的宣告'} · image ${item.image}`,
        'help',
      ),
      el(
        'p',
        `Profiles: ${item.profiles.length ? item.profiles.join(', ') : '無宣告'}${item.networkModeUnsupported ? ' · network_mode 未處理，沒有猜測 network edges' : ''}`,
        'help',
      ),
      sourceButton(item.location, 'Service 來源', signal),
    );
    return card;
  }
  function resourceCard(item: ComposeResource, signal: AbortSignal) {
    const card = el('article', '', 'cmp-resource-card');
    card.dataset.resource = item.name;
    card.dataset.kind = item.kind;
    card.dataset.implicit = String(item.implicit);
    card.append(
      el('span', item.kind.toUpperCase(), 'cmp-kind'),
      el('h4', item.name),
      el(
        'p',
        `${item.implicit ? 'Implicit default' : '明示宣告'} · identity ${item.identity}`,
        'help',
      ),
      el(
        'p',
        `External ${item.external === null ? 'unresolved' : String(item.external)} · existence ${item.existence}`,
        'help',
      ),
      sourceButton(item.location, 'Resource 來源', signal),
    );
    return card;
  }
  function allReferences(): Reference[] {
    return report
      ? [
          ...report.dependencies.map((record) => ({ kind: 'dependency' as const, record })),
          ...report.attachments.map((record) => ({ kind: record.kind, record })),
        ]
      : [];
  }
  function referenceCard(item: Reference, signal: AbortSignal) {
    const { record, kind } = item,
      card = el('article', '', 'cmp-reference');
    card.dataset.kind = kind;
    card.dataset.status = record.status;
    const from = report?.services.find((service) => service.id === record.sourceId);
    card.append(
      el('div', `${kindLabels[kind]} / ${record.status}`, 'cmp-reference-label'),
      el(
        'h4',
        `${from?.name ?? '來源未確認'} ${record.status === 'declared' ? '→' : '·'} ${record.targetName ?? (kind === 'bind' ? '本機 bind，路徑未保留' : kind === 'anonymous' ? 'anonymous，沒有 named resource' : '未解析 target')}`,
      ),
    );
    if (kind === 'dependency') {
      card.dataset.conditional = String(record.conditional);
      card.dataset.supported = String(record.supported);
      card.append(
        el(
          'p',
          `Condition ${record.condition ?? 'unresolved'} · required ${record.required === null ? 'unresolved' : String(record.required)} · restart ${record.restart === null ? 'unresolved' : String(record.restart)}`,
          'help',
        ),
        el(
          'p',
          `${record.conditional ? 'Profile conditional；未選擇 profiles。' : '不帶 profile 條件的宣告。'}${record.supported ? '' : ' 選項未完全支援，不是確定綁定。'}條件只宣告，不代表已啟動／健康／完成。`,
          'help',
        ),
      );
    } else
      card.append(
        el(
          'p',
          `${record.implicit ? 'Implicit default attachment' : '明示 mount／attachment'}；不代表實際連線、檔案或資源存在。`,
          'help',
        ),
      );
    const target = record.targetId
      ? kind === 'dependency'
        ? report?.services.find((service) => service.id === record.targetId)
        : [...(report?.networks ?? []), ...(report?.volumes ?? [])].find(
            (resource) => resource.id === record.targetId,
          )
      : undefined;
    if (target && record.status === 'declared') {
      const targetHost = el('div', '', 'cmp-target');
      if ('profiles' in target) targetHost.append(serviceCard(target, signal));
      else targetHost.append(resourceCard(target, signal));
      card.append(targetHost);
    } else if (record.status !== 'declared')
      card.append(
        el(
          'p',
          '沒有可確認的宣告節點；保留問題記錄，不把 unknown／missing 當成確定連線。',
          'cmp-uncertain',
        ),
      );
    card.append(
      sourceButton(
        record.location,
        kind === 'dependency' ? 'Dependency 來源' : 'Attachment 來源',
        signal,
      ),
    );
    return card;
  }
  function graph() {
    graphEvents.abort();
    graphEvents = new AbortController();
    const signal = graphEvents.signal,
      host = get('graph');
    host.replaceChildren();
    const selected = report?.services.find(
      (item) => item.id === get<HTMLSelectElement>('service').value,
    );
    if (!selected) {
      host.append(
        el('p', '沒有可列出的服務焦點；請看 status 與診斷，不推論空模型表示有效。', 'help'),
      );
      return;
    }
    const origin = el('section', '', 'cmp-origin');
    origin.append(el('p', 'FROM / 所選宣告', 'cmp-caption'), serviceCard(selected, signal));
    const tracks = el('div', '', 'cmp-tracks');
    host.append(origin, tracks);
    const outgoing = allReferences().filter((item) => item.record.sourceId === selected.id);
    for (const [title, kinds] of [
      ['服務相依', ['dependency']],
      ['Network attachments', ['network']],
      ['Volume / bind / anonymous mounts', ['volume', 'bind', 'anonymous']],
    ] as const) {
      const track = el('section', '', 'cmp-track'),
        list = el('div');
      track.append(el('h3', title), list);
      tracks.append(track);
      paged(
        list,
        outgoing.filter((item) => kinds.some((kind) => kind === item.kind)),
        referenceCard,
        signal,
        '沒有此類引用宣告；不推論實際執行狀態。',
      );
    }
    host.dataset.service = selected.name;
  }
  function references() {
    referenceEvents.abort();
    referenceEvents = new AbortController();
    const kind = get<HTMLSelectElement>('reference-filter').value,
      status = get<HTMLSelectElement>('reference-status').value;
    paged(
      get('references'),
      allReferences().filter(
        (item) =>
          (kind === 'all' || item.kind === kind) &&
          (status === 'all' || item.record.status === status),
      ),
      referenceCard,
      referenceEvents.signal,
      '沒有符合篩選的引用；不是執行／健康證明。',
    );
  }
  function diagnostics() {
    diagnosticEvents.abort();
    diagnosticEvents = new AbortController();
    const severity = get<HTMLSelectElement>('diagnostic-filter').value;
    paged(
      get('diagnostics'),
      (report?.diagnostics ?? []).filter(
        (issue) => severity === 'all' || issue.severity === severity,
      ),
      (issue, signal) => {
        const card = el('article', '', 'cmp-diagnostic');
        card.dataset.code = issue.code;
        card.dataset.severity = issue.severity;
        card.dataset.category = issue.category;
        card.append(
          el('strong', `${issue.severity} / ${issue.category}`),
          el('code', issue.code),
          sourceButton(issue.location, '診斷來源', signal),
        );
        return card;
      },
      diagnosticEvents.signal,
      '沒有回報此類診斷；仍只涵蓋有限靜態子集。',
    );
  }
  function render() {
    if (!report) return;
    const current = report;
    get('output').hidden = false;
    get('report-state').textContent = current.status;
    get('report-state').dataset.state = current.status;
    get('summary').textContent =
      current.status === 'complete'
        ? 'Complete：僅覆蓋此有限靜態子集，不是完整 schema、resolved application 或服務啟動／健康保證。'
        : current.status === 'limit'
          ? 'Limit：模型陣列已清除，不是截斷成功圖，沒有可下載模型。'
          : current.status === 'invalid'
            ? 'Invalid：有 covered 結構／引用／無條件循環錯誤。保留的宣告圖不是有效 Compose application。'
            : 'Partial：存在未解析、未支援或 profile 條件；圖不是已解析的部署設定，不替未知值代空字串。';
    get('spec').textContent = `Report spec snapshot · ${current.spec.snapshot}`;
    for (const [label, count] of [
      ['Services', current.services.length],
      ['Networks / Volumes', `${current.networks.length} / ${current.volumes.length}`],
      [
        'Dependencies / Attachments',
        `${current.dependencies.length} / ${current.attachments.length}`,
      ],
      ['Diagnostics', current.diagnostics.length],
    ] as const) {
      const card = el('div', '', 'cmp-count');
      card.append(el('strong', String(count)), el('span', label));
      get('counts').append(card);
    }
    get<HTMLSelectElement>('service').replaceChildren(
      ...current.services.map((item) => new Option(item.name, item.id)),
    );
    get<HTMLSelectElement>('service').disabled = !current.services.length;
    graph();
    paged(
      get('services'),
      current.services,
      serviceCard,
      resultEvents.signal,
      '沒有可列出的 service 宣告。',
    );
    paged(
      get('networks'),
      current.networks,
      resourceCard,
      resultEvents.signal,
      '沒有可列出的 network 宣告／default。',
    );
    paged(
      get('volumes'),
      current.volumes,
      resourceCard,
      resultEvents.signal,
      '沒有可列出的 named volume 宣告。',
    );
    references();
    diagnostics();
    paged(
      get('cycles'),
      current.cycles,
      (cycle, signal) => {
        const card = el('article', '', 'cmp-cycle');
        card.dataset.conditional = String(cycle.conditional);
        card.dataset.unconditional = String(cycle.containsUnconditionalCycle);
        card.append(
          el(
            'h4',
            `${cycle.conditional ? 'Conditional SCC' : 'Unconditional SCC'} · ${cycle.serviceIds.length} services`,
          ),
          el(
            'p',
            cycle.serviceIds
              .map((id) => current.services.find((item) => item.id === id)?.name ?? '未確認')
              .join(', '),
            'cmp-cycle-members',
          ),
          el(
            'p',
            `Contains unconditional cycle: ${cycle.containsUnconditionalCycle} · 成員集合，不是啟動順序。`,
            'help',
          ),
        );
        const list = el('div');
        card.append(list);
        paged(
          list,
          current.dependencies.filter((dep) => cycle.dependencyIds.includes(dep.id)),
          (record, rowSignal) => referenceCard({ kind: 'dependency', record }, rowSignal),
          signal,
          '沒有可列出的 cycle dependency。',
        );
        return card;
      },
      resultEvents.signal,
      '沒有偵測到 covered declared SCC cycle；不代表 runtime 健康。',
    );
    get('coverage').replaceChildren(...current.coverage.map((rule) => el('li', rule)));
    enabled();
    get('status').textContent =
      `預檢完成 · ${current.status}，worker 已終止；請看覆蓋、條件與診斷。`;
  }
  function fail(message: string) {
    stop();
    get('error').textContent = message;
    get('error').hidden = false;
    get('status').textContent = '工作未完成，沒有可用模型；不在主執行緒 fallback 解析。';
  }
  get('run').addEventListener(
    'click',
    () => {
      reset();
      const id = revision;
      get('status').textContent = '專用 worker 本機預檢中，最多等待 20 秒；可取消。';
      try {
        const active = new Worker(new URL('../compose.worker.ts', import.meta.url), {
          type: 'module',
        });
        worker = active;
        get<HTMLButtonElement>('cancel').disabled = false;
        timer = setTimeout(() => {
          if (id === revision && worker === active)
            fail('工作逾時（20 秒），worker 已終止；未取得有效結論。');
        }, 20000);
        active.onerror = () => {
          if (id === revision && worker === active)
            fail('Worker 載入或執行失敗，已終止；沒有主執行緒 fallback。');
        };
        active.onmessageerror = () => {
          if (id === revision && worker === active)
            fail('Worker 訊息無法讀取，已終止；沒有可用模型。');
        };
        active.onmessage = (event: MessageEvent<unknown>) => {
          const data = event.data;
          if (id !== revision || worker !== active || !object(data) || data.id !== id) return;
          if (data.kind === 'failure') {
            fail('Worker 無法完成預檢，已終止；沒有可用模型。');
            return;
          }
          if (data.kind !== 'report' || !reportReply(data.report)) return;
          stop();
          report = data.report;
          try {
            render();
          } catch {
            reset();
            fail('無法呈現 worker 結果；不提供原始來源匯出 fallback。');
          }
        };
        active.postMessage({ kind: 'analyze', id, source: source.value });
      } catch {
        fail('無法啟動專用 worker；沒有主執行緒 fallback。');
      }
    },
    { signal: events.signal },
  );
  source.addEventListener(
    'input',
    () => {
      reset();
      get('demo-note').textContent = '自訂來源；案例預期不適用於修改後文件。';
    },
    { signal: events.signal },
  );
  for (const [id, demo] of [
    ['demo', composeDemos.declared],
    ['demo-conditional', composeDemos.conditional],
    ['demo-missing', composeDemos.missing],
    ['demo-cycles', composeDemos.cycles],
    ['demo-unresolved', composeDemos.unresolved],
    ['demo-unsupported', composeDemos.unsupported],
    ['demo-invalid', composeDemos.invalid],
    ['demo-alias', composeDemos.alias],
    ['demo-limit', composeDemos.limit],
  ] as const)
    get(id).addEventListener(
      'click',
      () => {
        reset();
        source.value = demo.source;
        get('demo-note').textContent = demo.note;
        get('status').textContent = '人工合成案例已載入；按 Run 才解析。';
      },
      { signal: events.signal },
    );
  get('cancel').addEventListener(
    'click',
    () => {
      reset();
      get('status').textContent = '已取消並終止 worker，來源保留，沒有完整結論。';
    },
    { signal: events.signal },
  );
  get('clear').addEventListener(
    'click',
    () => {
      reset();
      source.value = '';
      get('demo-note').textContent =
        '固定案例皆人工合成；載入與編輯不觸發解析，按 Run 才建立獨立 worker。';
      get('status').textContent = '來源、圖、結果、worker 與下載已清除。';
      source.focus();
    },
    { signal: events.signal },
  );
  get('service').addEventListener('change', graph, { signal: events.signal });
  for (const id of ['reference-filter', 'reference-status'])
    get(id).addEventListener('change', references, { signal: events.signal });
  get('diagnostic-filter').addEventListener('change', diagnostics, { signal: events.signal });
  get('export-confirm').addEventListener(
    'change',
    () => {
      release();
      enabled();
    },
    { signal: events.signal },
  );
  get('export-summary').addEventListener(
    'click',
    () => {
      const current = report,
        id = revision;
      if (
        !current ||
        current.status === 'limit' ||
        !get<HTMLInputElement>('export-confirm').checked
      )
        return;
      get('export-status').textContent = '正在載入公開投影 helper…';
      void import('@sid-tools/core/compose')
        .then((core) => {
          if (
            id !== revision ||
            report !== current ||
            !get<HTMLInputElement>('export-confirm').checked
          )
            return;
          release();
          try {
            const value = core.exportComposeSummary(current),
              url = URL.createObjectURL(new Blob([value], { type: 'application/json' }));
            urls.set(
              url,
              setTimeout(() => {
                URL.revokeObjectURL(url);
                urls.delete(url);
              }, 1000),
            );
            const link = el('a');
            link.href = url;
            link.download = 'compose-static-summary.json';
            link.click();
            get('export-status').textContent =
              `已建立精簡摘要 · ${current.status}；名稱／profiles／paths 仍可能敏感，不是匿名化或部署保證。`;
          } catch {
            release();
            get('export-status').textContent = '無法建立下載；不退回原始 report／YAML。';
          }
        })
        .catch(() => {
          if (id === revision)
            get('export-status').textContent = '無法載入公開 helper；不退回原始 report／YAML。';
        });
    },
    { signal: events.signal },
  );
  return () => {
    events.abort();
    reset();
    resultEvents.abort();
    graphEvents.abort();
    referenceEvents.abort();
    diagnosticEvents.abort();
    source.value = '';
  };
}
