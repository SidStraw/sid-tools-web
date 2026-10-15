import html from './sdl.html?raw';
import { sdlDemos } from './sdl-demos';
import type {
  SdlComparison,
  SdlSide,
  SdlCategory,
  SdlCoordinate,
  SdlLocation,
  SdlChange,
} from '@sid-tools/core/sdl';
export { html };
const categories: Record<SdlCategory, string> = {
  breaking: 'Breaking · 結構不相容',
  dangerous: 'Dangerous · 需審查',
  'non-breaking': 'Non-breaking · 靜態可相容',
  unknown: 'Unknown · 待人工判讀',
};
const statuses: Record<SdlComparison['status'], string> = {
  complete: 'Complete · 靜態覆蓋完整',
  unknown: 'Unknown · 判讀／歸屬不完整',
  invalid: 'Invalid · 無有效比較',
  limit: 'Limit · 超過處理上限',
};
export function mount(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const before = get<HTMLTextAreaElement>('before'),
    after = get<HTMLTextAreaElement>('after'),
    events = new AbortController();
  let resultEvents = new AbortController(),
    detailEvents = new AbortController(),
    coordinateEvents = new AbortController();
  let revision = 0,
    report: SdlComparison | undefined,
    serializer: ((report: SdlComparison) => string) | undefined;
  const urls = new Map<string, ReturnType<typeof setTimeout>>();
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') => {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
  };
  const side = () => get<HTMLSelectElement>('side').value as SdlSide;
  const release = () => {
    for (const [url, timer] of urls) {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
    }
    urls.clear();
  };
  const enableExport = () => {
    get<HTMLButtonElement>('export').disabled =
      !report || !get<HTMLInputElement>('export-confirm').checked;
  };
  function reset() {
    revision++;
    listEvents.abort();
    navigationEvents.abort();
    resultEvents.abort();
    resultEvents = new AbortController();
    detailEvents.abort();
    detailEvents = new AbortController();
    coordinateEvents.abort();
    coordinateEvents = new AbortController();
    report = undefined;
    serializer = undefined;
    release();
    get('output').hidden = true;
    get('error').hidden = true;
    get<HTMLInputElement>('export-confirm').checked = false;
    enableExport();
    get<HTMLSelectElement>('category').value = 'all';
    get<HTMLSelectElement>('side').value = 'before';
    get<HTMLInputElement>('coordinate-search').value = '';
    get('type-filter').replaceChildren(el('option', '所有型別／座標'));
    get('type-filter').firstElementChild!.setAttribute('value', 'all');
    for (const id of [
      'summary',
      'counts',
      'issues',
      'scope',
      'changes',
      'change-detail',
      'coordinates',
      'coordinate-detail',
      'selection-status',
      'report-state',
      'export-status',
    ])
      get(id).replaceChildren();
    get('status').textContent = '輸入已更新，舊結果／來源／匯出已丟棄，請重新比較。';
  }
  function source(which: SdlSide, location: SdlLocation | null, signal: AbortSignal) {
    const button = el(
      'button',
      location
        ? `${which === 'before' ? 'Before' : 'After'} · L${location.line}:${location.column} · ${location.start}–${location.end}`
        : `${which} · 無可用來源範圍`,
      'text-button sdl-source',
    );
    button.disabled = !location;
    button.addEventListener(
      'click',
      () => {
        if (!location) return;
        const input = which === 'before' ? before : after;
        input.focus();
        input.setSelectionRange(location.start, location.end);
      },
      { signal },
    );
    return button;
  }
  // Each paged list owns and drops its button listeners when repaged, reset or disposed.
  function paged<T>(
    host: HTMLElement,
    items: readonly T[],
    render: (item: T, signal: AbortSignal) => HTMLElement,
    empty: string,
    parentSignal: AbortSignal,
  ) {
    host.replaceChildren();
    if (!items.length) {
      host.append(el('p', empty, 'help'));
      return;
    }
    let page = 0,
      controller = new AbortController();
    parentSignal.addEventListener('abort', () => controller.abort(), { once: true });
    const rows = el('div'),
      pages = el('div', '', 'sdl-pages');
    host.append(rows, pages);
    const show = () => {
      controller.abort();
      controller = new AbortController();
      rows.replaceChildren(
        ...items.slice(page * 50, (page + 1) * 50).map((item) => render(item, controller.signal)),
      );
      pages.replaceChildren();
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
          { signal: controller.signal },
        );
        next.addEventListener(
          'click',
          () => {
            page++;
            show();
          },
          { signal: controller.signal },
        );
        pages.append(
          previous,
          el('span', `${page + 1}/${Math.ceil(items.length / 50)} 頁 · ${items.length} 筆`),
          next,
        );
      }
    };
    show();
  }
  function navigate(which: SdlSide, coordinate: SdlCoordinate) {
    get<HTMLSelectElement>('side').value = which;
    refreshTypes();
    get<HTMLSelectElement>('type-filter').value = 'all';
    get<HTMLInputElement>('coordinate-search').value = '';
    renderCoordinates();
    showCoordinate(which, coordinate);
  }
  function coordinateLink(
    which: SdlSide,
    coordinate: SdlCoordinate,
    label: string,
    signal: AbortSignal,
  ) {
    const button = el(
      'button',
      `${label} · ${which} / ${coordinate.path}`,
      'text-button sdl-source',
    );
    button.addEventListener('click', () => navigate(which, coordinate), { signal });
    return button;
  }
  function showCoordinate(which: SdlSide, coordinate: SdlCoordinate) {
    if (!report) return;
    coordinateEvents.abort();
    coordinateEvents = new AbortController();
    const signal = coordinateEvents.signal,
      host = get('coordinate-detail');
    get('selection-status').textContent =
      `已選取 ${which} / ${coordinate.path} · ${coordinate.kind}`;
    host.replaceChildren(
      el('h3', coordinate.path),
      el('pre', coordinate.signature, 'sdl-signature'),
      source(which, coordinate.location, signal),
    );
    host.dataset.path = coordinate.path;
    host.dataset.side = which;
    const type = coordinate.kind === 'type' ? coordinate.path : coordinate.type,
      refs = type
        ? report[which].references.filter(
            (ref) =>
              ref.to === type ||
              ref.from === coordinate.path ||
              ref.from === type ||
              ref.from.startsWith(`${type}.`),
          )
        : [];
    host.append(
      el('h4', type ? `與 ${type} 有關的直接引用` : '此座標沒有可用的型別引用'),
      el(
        'p',
        '僅一跳關係，含此型別的成員引用與指向此型別的引用；不是使用量或傳遞影響分析。',
        'help',
      ),
    );
    const referenceHost = el('div');
    host.append(referenceHost);
    paged(
      referenceHost,
      refs,
      (ref, rowSignal) => {
        const row = el('div', '', 'sdl-reference');
        row.append(el('code', `${ref.from} → ${ref.to}`), source(which, ref.location, rowSignal));
        for (const path of [ref.from, ref.to]) {
          const target = report?.[which].coordinates.find((item) => item.path === path);
          if (target) row.append(coordinateLink(which, target, '查看定義', rowSignal));
        }
        return row;
      },
      '沒有已索引的直接引用；built-in scalars 可能沒有 SDL 定義，不杜撰來源。',
      signal,
    );
  }
  function showChange(change: SdlChange) {
    if (!report) return;
    detailEvents.abort();
    detailEvents = new AbortController();
    const signal = detailEvents.signal,
      host = get('change-detail');
    host.replaceChildren(
      el('span', categories[change.category], 'sdl-badge'),
      el('h3', change.code),
      el('p', change.reason, 'sdl-reason'),
    );
    host.dataset.mapping = change.mapping;
    host.dataset.category = change.category;
    host.append(
      el(
        'p',
        change.mapping === 'exact'
          ? `來源歸屬：exact · ${change.path}`
          : change.mapping === 'candidates'
            ? `來源歸屬不明：${change.candidateCount} 個候選，最多列出 20；不是確定變更目標。`
            : '來源無對應：不從 reason 文字猜測型別／欄位或連結。',
        'sdl-mapping',
      ),
    );
    if (change.mapping === 'exact' && change.path) {
      for (const which of ['before', 'after'] as const)
        for (const target of report[which].coordinates.filter(
          (item) => item.path === change.path,
        )) {
          host.append(
            coordinateLink(which, target, '確定座標', signal),
            source(which, target.location, signal),
          );
        }
    } else if (change.mapping === 'candidates') {
      host.append(el('p', '下列只供獨立查看候選定義；不代表此 change 已精確歸屬。', 'help'));
      for (const path of change.candidatePaths) {
        const row = el('div', '', 'sdl-candidate');
        row.append(el('code', path));
        for (const which of ['before', 'after'] as const)
          for (const target of report[which].coordinates.filter((item) => item.path === path))
            row.append(coordinateLink(which, target, '查看候選（非歸屬）', signal));
        host.append(row);
      }
    }
    if (change.category === 'unknown')
      host.append(
        el(
          'p',
          '未知影響保留人工審查；即使兩份 SDL 一樣，自訂 directive application 也不能宣告安全。',
          'help',
        ),
      );
  }
  let listEvents = new AbortController(),
    navigationEvents = new AbortController();
  function renderChanges() {
    listEvents.abort();
    listEvents = new AbortController();
    if (!report) return;
    const filter = get<HTMLSelectElement>('category').value;
    const changes = report.changes.filter(
      (change) => filter === 'all' || change.category === filter,
    );
    paged(
      get('changes'),
      changes,
      (change, signal) => {
        const button = el('button', '', 'sdl-change');
        button.dataset.code = change.code;
        button.dataset.category = change.category;
        button.append(
          el('span', categories[change.category], 'sdl-badge'),
          el(
            'code',
            change.path ??
              (change.mapping === 'candidates'
                ? `${change.candidateCount} 個候選 · 未精確歸屬`
                : '無對應座標'),
          ),
          el('small', change.code),
        );
        button.addEventListener(
          'click',
          () => {
            for (const node of get('changes').querySelectorAll('button.sdl-change'))
              node.setAttribute('aria-pressed', String(node === button));
            showChange(change);
          },
          { signal },
        );
        return button;
      },
      report.status === 'invalid' || report.status === 'limit'
        ? '未產生比較：invalid／limit 不能當成沒有變更。'
        : report.changes.length
          ? '此分類沒有變更；仍請查看整份狀態與 warnings。'
          : '此靜態子集未列出變更；不是 operational safety 保證。',
      listEvents.signal,
    );
    get('change-detail').replaceChildren(
      el(
        'p',
        report.status === 'invalid' || report.status === 'limit'
          ? '未產生有效變更清單；請查看上方問題，或逐側檢視可用來源。'
          : '選取一項變更，查看原始分類原因與來源歸屬。',
        'help',
      ),
    );
    detailEvents.abort();
    detailEvents = new AbortController();
    if (changes[0]) {
      showChange(changes[0]);
      get('changes').querySelector('button.sdl-change')?.setAttribute('aria-pressed', 'true');
    }
  }
  function refreshTypes() {
    const select = get<HTMLSelectElement>('type-filter');
    select.replaceChildren();
    const all = el('option', '所有型別／座標');
    all.value = 'all';
    select.append(all);
    for (const type of [
      ...new Set(
        report?.[side()].coordinates.flatMap((coordinate) =>
          coordinate.type ? [coordinate.type] : [],
        ) ?? [],
      ),
    ].sort()) {
      const option = el('option', type);
      option.value = type;
      select.append(option);
    }
  }
  function renderCoordinates() {
    navigationEvents.abort();
    navigationEvents = new AbortController();
    if (!report) return;
    const which = side(),
      type = get<HTMLSelectElement>('type-filter').value,
      search = get<HTMLInputElement>('coordinate-search').value.toLowerCase();
    const coordinates = report[which].coordinates.filter(
      (item) => (type === 'all' || item.type === type) && item.path.toLowerCase().includes(search),
    );
    paged(
      get('coordinates'),
      coordinates,
      (coordinate, signal) => {
        const button = el('button', '', 'sdl-coordinate');
        button.dataset.path = coordinate.path;
        button.append(
          el('code', coordinate.path),
          el(
            'small',
            `${coordinate.kind} · ${coordinate.location ? `L${coordinate.location.line}:${coordinate.location.column}` : '無來源範圍'}`,
          ),
        );
        button.addEventListener('click', () => showCoordinate(which, coordinate), { signal });
        return button;
      },
      '此側沒有符合的可用座標。超限可能不保留任何來源投影。',
      navigationEvents.signal,
    );
  }
  function render() {
    if (!report) return;
    const current = report;
    get('report-state').textContent = statuses[current.status];
    get('report-state').dataset.state = current.status;
    get('summary').textContent =
      current.status === 'invalid'
        ? '無有效比較：至少一側 SDL 無效／extension 未解析。未產生 changes，不能視為沒有變更或安全。'
        : current.status === 'limit'
          ? '超過處理上限：未產生完整比較，零筆也不能當成沒有變更。'
          : current.status === 'unknown'
            ? '結果不完整：有未知影響或來源歸屬不明。Unknown 計數即使為 0，整份 status 仍是 unknown；請查看 warnings／mapping。'
            : current.changes.length
              ? '靜態分類／來源覆蓋完整。Complete 不代表沒有 breaking，也不是執行相容性或安全保證。'
              : '此靜態子集沒有列出變更；不代表 resolver、directive、資料或 client usage 安全。';
    for (const category of Object.keys(categories) as SdlCategory[]) {
      const card = el('div', '', 'sdl-count');
      card.dataset.category = category;
      card.append(el('strong', String(current.counts[category])), el('span', categories[category]));
      get('counts').append(card);
    }
    const issues = get('issues');
    for (const which of ['before', 'after'] as const) {
      const container = el('section');
      container.append(
        el('h3', `${which === 'before' ? 'Before' : 'After'} · ${current[which].status}`),
      );
      const list = el('div');
      container.append(list);
      paged(
        list,
        [...current[which].errors, ...current[which].warnings],
        (issue, signal) => {
          const row = el('div', '', 'sdl-issue');
          row.dataset.code = issue.code;
          row.append(
            el('code', issue.code),
            el('p', issue.message),
            source(which, issue.location, signal),
          );
          return row;
        },
        '沒有已回報的 errors／warnings，仍適用靜態限制。',
        resultEvents.signal,
      );
      issues.append(container);
    }
    get('scope').replaceChildren(...current.scope.map((item) => el('li', item)));
    get('output').hidden = false;
    renderChanges();
    refreshTypes();
    renderCoordinates();
    get('selection-status').textContent = '選一個座標，查看 signature、實際來源與直接引用。';
    get('status').textContent = `比較完成 · ${statuses[current.status]}，請先看狀態再看計數。`;
  }
  for (const input of [before, after])
    input.addEventListener(
      'input',
      () => {
        reset();
        listEvents.abort();
        navigationEvents.abort();
        get('demo-note').textContent = '自訂輸入；舊範例預期不套用於編輯後的內容。';
      },
      { signal: events.signal },
    );
  for (const [id, demo] of [
    ['demo', sdlDemos.review],
    ['demo-variance', sdlDemos.variance],
    ['demo-defaults', sdlDemos.defaults],
    ['demo-unknown', sdlDemos.unknown],
    ['demo-ambiguous', sdlDemos.ambiguous],
    ['demo-invalid', sdlDemos.invalid],
  ] as const)
    get(id).addEventListener(
      'click',
      () => {
        reset();
        listEvents.abort();
        navigationEvents.abort();
        before.value = demo.before;
        after.value = demo.after;
        get('demo-note').textContent = demo.note;
        get('status').textContent = '固定合成案例已載入；請按比較 SDL。';
      },
      { signal: events.signal },
    );
  get('run').addEventListener(
    'click',
    () => {
      reset();
      listEvents.abort();
      navigationEvents.abort();
      const token = revision;
      get('status').textContent = '正在載入本機分類器並比較…';
      void import('@sid-tools/core/sdl')
        .then((core) => {
          if (token !== revision) return;
          report = core.compareSdl(before.value, after.value);
          serializer = core.exportSdlComparison;
          render();
        })
        .catch(() => {
          if (token !== revision) return;
          reset();
          get('error').textContent =
            '無法載入或完成本機比較；沒有有效結論。請重試，未上傳任何輸入。';
          get('error').hidden = false;
          get('status').textContent = '比較未完成。';
        });
    },
    { signal: events.signal },
  );
  get('category').addEventListener('change', renderChanges, { signal: events.signal });
  get('side').addEventListener(
    'change',
    () => {
      refreshTypes();
      renderCoordinates();
      coordinateEvents.abort();
      get('coordinate-detail').replaceChildren();
      get('selection-status').textContent = '已切換側，請選取實際來源座標。';
    },
    { signal: events.signal },
  );
  for (const [id, event] of [
    ['type-filter', 'change'],
    ['coordinate-search', 'input'],
  ] as const)
    get(id).addEventListener(event, renderCoordinates, { signal: events.signal });
  get('export-confirm').addEventListener('change', enableExport, { signal: events.signal });
  get('export').addEventListener(
    'click',
    () => {
      if (!report || !serializer || !get<HTMLInputElement>('export-confirm').checked) return;
      release();
      try {
        const text = serializer(report),
          url = URL.createObjectURL(new Blob([text], { type: 'application/json' })),
          link = el('a');
        const timer = setTimeout(() => {
          URL.revokeObjectURL(url);
          urls.delete(url);
        }, 1000);
        urls.set(url, timer);
        link.href = url;
        link.download = 'sdl-static-comparison.json';
        link.click();
        get('export-status').textContent =
          '已建立縮減 JSON；名稱仍可能敏感。沒有匯出 SDL／signature／reason。';
      } catch {
        release();
        get('export-status').textContent = '無法建立下載；沒有改以原始 report 或 SDL 匯出。';
      }
    },
    { signal: events.signal },
  );
  get('clear').addEventListener(
    'click',
    () => {
      reset();
      listEvents.abort();
      navigationEvents.abort();
      before.value = '';
      after.value = '';
      get('demo-note').textContent = '人工合成範例供核對，不是外部服務或真實客戶 schema。';
      get('status').textContent = '兩份 SDL、比較結果與匯出已清除。';
      before.focus();
    },
    { signal: events.signal },
  );
  return () => {
    events.abort();
    reset();
    resultEvents.abort();
    detailEvents.abort();
    coordinateEvents.abort();
    listEvents.abort();
    navigationEvents.abort();
    before.value = '';
    after.value = '';
  };
}
