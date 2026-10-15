import html from './sql-ddl.html?raw';
import { sqlDdlDemos } from './sql-ddl-demos';
import {
  renderSqlDdlSvg,
  serializeSqlDdlSvg,
  identifierText,
  tableText,
  relationshipText,
} from './sql-ddl-svg';
import type { SqlDdlReport, SqlLocation, SqlForeignKey } from '@sid-tools/core/sql-ddl';
export { html };
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string';
const strings = (value: unknown) => Array.isArray(value) && value.every(text);
const nullableString = (value: unknown) => value === null || text(value);
function location(value: unknown): value is SqlLocation {
  return (
    object(value) &&
    ['start', 'end', 'line', 'column'].every(
      (key) => typeof value[key] === 'number' && Number.isSafeInteger(value[key]),
    ) &&
    Number(value.start) >= 0 &&
    Number(value.end) >= Number(value.start) &&
    Number(value.line) >= 1 &&
    Number(value.column) >= 1
  );
}
const identifier = (value: unknown) =>
  object(value) &&
  text(value.name) &&
  typeof value.quoted === 'boolean' &&
  location(value.location);
const identifiers = (value: unknown) => Array.isArray(value) && value.every(identifier);
const tableName = (value: unknown) =>
  object(value) &&
  (value.schema === null || identifier(value.schema)) &&
  identifier(value.name) &&
  location(value.location);
function foreignKey(value: unknown) {
  if (
    !object(value) ||
    !text(value.id) ||
    !text(value.sourceTableId) ||
    !(value.name === null || identifier(value.name)) ||
    !identifiers(value.sourceColumns) ||
    !tableName(value.target) ||
    !(value.targetColumns === null || identifiers(value.targetColumns)) ||
    !location(value.location) ||
    typeof value.supported !== 'boolean' ||
    !object(value.options) ||
    !object(value.binding)
  )
    return false;
  const binding = value.binding,
    options = value.options;
  return (
    ['resolved-local', 'local-candidate', 'unresolved', 'invalid'].includes(
      String(binding.status),
    ) &&
    nullableString(binding.targetTableId) &&
    ['candidateTableIds', 'sourceColumnIds', 'targetColumnIds'].every((key) =>
      strings(binding[key]),
    ) &&
    ['explicit', 'target-primary-key', 'unknown'].includes(String(binding.targetColumnsOrigin)) &&
    (binding.targetPrimaryKeyLocation === null || location(binding.targetPrimaryKeyLocation)) &&
    ['match', 'onDelete', 'onUpdate', 'initially'].every((key) => nullableString(options[key])) &&
    (options.deferrable === null || typeof options.deferrable === 'boolean')
  );
}
function reportReply(value: unknown): value is SqlDdlReport {
  if (
    !object(value) ||
    !['complete', 'partial', 'invalid', 'limit'].includes(String(value.status)) ||
    !object(value.limits) ||
    !strings(value.scope) ||
    !Array.isArray(value.tables) ||
    value.tables.length > 100 ||
    !Array.isArray(value.edges) ||
    value.edges.length > 1000 ||
    !value.edges.every(foreignKey) ||
    !Array.isArray(value.statements) ||
    value.statements.length > 500 ||
    !value.statements.every(
      (row) =>
        object(row) &&
        text(row.id) &&
        ['create-table', 'unsupported', 'invalid'].includes(String(row.kind)) &&
        ['complete', 'partial', 'invalid'].includes(String(row.status)) &&
        location(row.location) &&
        nullableString(row.tableId),
    ) ||
    !Array.isArray(value.diagnostics) ||
    !value.diagnostics.every(
      (row) =>
        object(row) &&
        text(row.code) &&
        ['unsupported', 'invalid', 'limit'].includes(String(row.severity)) &&
        location(row.location) &&
        nullableString(row.statementId) &&
        nullableString(row.tableId),
    )
  )
    return false;
  let columns = 0;
  for (const table of value.tables) {
    if (
      !object(table) ||
      !text(table.id) ||
      !text(table.statementId) ||
      !tableName(table.name) ||
      !location(table.location) ||
      !['complete', 'partial', 'invalid'].includes(String(table.status)) ||
      !Array.isArray(table.columns) ||
      table.columns.length > 200 ||
      !Array.isArray(table.foreignKeys) ||
      !table.foreignKeys.every(foreignKey) ||
      !(
        table.primaryKey === null ||
        (object(table.primaryKey) &&
          text(table.primaryKey.id) &&
          (table.primaryKey.name === null || identifier(table.primaryKey.name)) &&
          identifiers(table.primaryKey.columns) &&
          location(table.primaryKey.location))
      )
    )
      return false;
    columns += table.columns.length;
    if (columns > 2000) return false;
    for (const column of table.columns) {
      if (
        !object(column) ||
        !text(column.id) ||
        !identifier(column.name) ||
        !text(column.dataType) ||
        !location(column.typeLocation) ||
        !location(column.location) ||
        typeof column.nullable !== 'boolean' ||
        typeof column.primaryKey !== 'boolean' ||
        !Array.isArray(column.nullabilityConstraints) ||
        !column.nullabilityConstraints.every(
          (item) =>
            object(item) &&
            (item.name === null || identifier(item.name)) &&
            typeof item.nullable === 'boolean' &&
            location(item.location),
        )
      )
        return false;
    }
  }
  return (
    value.status !== 'limit' ||
    (!value.tables.length && !value.edges.length && !value.statements.length)
  );
}
export function mount(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const source = get<HTMLTextAreaElement>('source'),
    events = new AbortController();
  let resultEvents = new AbortController(),
    tableEvents = new AbortController(),
    relationEvents = new AbortController(),
    detailEvents = new AbortController();
  let report: SqlDdlReport | undefined,
    svg: SVGSVGElement | undefined,
    worker: Worker | undefined,
    timer: ReturnType<typeof setTimeout> | undefined,
    revision = 0,
    scale = 1;
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
    const allowed =
      !!report && report.status !== 'limit' && get<HTMLInputElement>('export-confirm').checked;
    get<HTMLButtonElement>('export-summary').disabled = !allowed;
    get<HTMLButtonElement>('export-svg').disabled = !allowed || !svg;
  }
  function reset() {
    revision++;
    stop();
    release();
    report = undefined;
    svg = undefined;
    scale = 1;
    for (const controller of [resultEvents, tableEvents, relationEvents, detailEvents])
      controller.abort();
    resultEvents = new AbortController();
    tableEvents = new AbortController();
    relationEvents = new AbortController();
    detailEvents = new AbortController();
    get('output').hidden = true;
    get('error').hidden = true;
    get<HTMLInputElement>('export-confirm').checked = false;
    get<HTMLInputElement>('table-filter').value = '';
    get<HTMLSelectElement>('binding-filter').value = 'all';
    for (const id of [
      'report-state',
      'summary',
      'counts',
      'graph',
      'graph-size',
      'tables',
      'relationships',
      'relation-detail',
      'diagnostics',
      'statements',
      'scope',
      'source-status',
      'export-status',
    ])
      get(id).replaceChildren();
    enabled();
    get('status').textContent = '來源已更新；舊圖／結果／下載／worker 已清除，請重新 Run。';
  }
  function go(value: SqlLocation, label: string) {
    if (value.end > source.value.length) return;
    source.focus();
    source.setSelectionRange(value.start, value.end);
    get('source-status').textContent =
      `已選 ${label} · L${value.line}:${value.column} · UTF-16 ${value.start}–${value.end}（end-exclusive）。`;
  }
  function sourceButton(value: SqlLocation | null, label: string, signal: AbortSignal) {
    const button = el(
      'button',
      value
        ? `${label} · L${value.line}:${value.column} · ${value.start}–${value.end}`
        : `${label} · 無可用原始範圍`,
      'text-button ddl-source',
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
      nav = el('div', '', 'ddl-pages');
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
  function relationDetail(edge: SqlForeignKey) {
    detailEvents.abort();
    detailEvents = new AbortController();
    const signal = detailEvents.signal,
      host = get('relation-detail'),
      from = report?.tables.find((table) => table.id === edge.sourceTableId);
    host.replaceChildren(
      el('span', edge.binding.status, 'ddl-binding'),
      el(
        'h3',
        `${from ? tableText(from.name) : '來源未確認'} · ${edge.name ? identifierText(edge.name) : '未命名 FK'}`,
      ),
      el('p', relationshipText(edge), 'ddl-relation-text'),
      el(
        'p',
        edge.binding.status === 'resolved-local'
          ? '僅確認本輸入內的 qualified identity 與 ordered columns，不證明唯一性／型別／DB 接受性。'
          : edge.binding.status === 'local-candidate'
            ? 'search_path 未知，只是輸入內候選，不猜 public／同 schema；虛線不是已證明綁定。'
            : '沒有可確認的綁定，不畫假節點／實線。原始宣告仍保留。',
        'help',
      ),
      sourceButton(edge.location, 'FK 定義', signal),
      sourceButton(edge.target.location, 'Target 名稱', signal),
      el('h4', '有序來源欄位'),
    );
    for (const name of edge.sourceColumns)
      host.append(sourceButton(name.location, identifierText(name), signal));
    host.append(el('h4', `Target columns · ${edge.binding.targetColumnsOrigin}`));
    if (edge.targetColumns)
      for (const name of edge.targetColumns)
        host.append(sourceButton(name.location, identifierText(name), signal));
    else
      host.append(
        el('p', '原始 REFERENCES 未寫 target list；不製造不存在的 target tokens。', 'help'),
      );
    if (edge.binding.targetColumnsOrigin === 'target-primary-key') {
      const target = report?.tables.find((table) => table.id === edge.binding.targetTableId);
      host.append(
        el(
          'p',
          `由明示 PK 推導：${edge.binding.targetColumnIds.map((id) => target?.columns.find((column) => column.id === id)?.name.name ?? '未確認').join(', ')}`,
          'help',
        ),
        sourceButton(edge.binding.targetPrimaryKeyLocation, 'Target PK 推導來源', signal),
      );
    }
    host.append(
      el(
        'p',
        `Candidates ${edge.binding.candidateTableIds.length} · ${edge.supported ? 'FK options covered' : 'unsupported FK tail'}`,
        'help',
      ),
      el(
        'p',
        `MATCH ${edge.options.match ?? '未指定'} / ON DELETE ${edge.options.onDelete ?? '未指定'} / ON UPDATE ${edge.options.onUpdate ?? '未指定'} / DEFERRABLE ${edge.options.deferrable ?? '未指定'} / INITIALLY ${edge.options.initially ?? '未指定'}`,
        'help',
      ),
    );
    host.dataset.binding = edge.binding.status;
    get('source-status').textContent =
      `已選 FK · ${edge.binding.status} · ${relationshipText(edge)}`;
  }
  function relationships() {
    relationEvents.abort();
    relationEvents = new AbortController();
    detailEvents.abort();
    get('relation-detail').replaceChildren(
      el('p', '選擇 FK 或圖中線段，檢查原始定義與綁定。', 'help'),
    );
    if (!report) return;
    const binding = get<HTMLSelectElement>('binding-filter').value,
      filtered = report.edges.filter(
        (edge) => binding === 'all' || edge.binding.status === binding,
      );
    paged(
      get('relationships'),
      filtered,
      (edge, signal) => {
        const row = el('article', '', 'ddl-relationship');
        row.dataset.binding = edge.binding.status;
        const button = el(
          'button',
          `${report!.edges.indexOf(edge) + 1}. ${edge.binding.status} · ${edge.name ? identifierText(edge.name) : 'FK'}`,
          'text-button ddl-relationship-button',
        );
        button.addEventListener('click', () => relationDetail(edge), { signal });
        row.append(button, el('p', relationshipText(edge), 'ddl-relation-text'));
        return row;
      },
      relationEvents.signal,
      '沒有此篩選的明示 FK；不推論名稱相似的關聯。',
    );
    if (filtered[0]) relationDetail(filtered[0]);
  }
  function tables() {
    tableEvents.abort();
    tableEvents = new AbortController();
    if (!report) return;
    const search = get<HTMLInputElement>('table-filter').value.toLowerCase();
    paged(
      get('tables'),
      report.tables.filter((table) => tableText(table.name).toLowerCase().includes(search)),
      (table, signal) => {
        const box = el('article', '', 'ddl-table-doc');
        box.dataset.tableId = table.id;
        box.append(
          el('h3', tableText(table.name)),
          el(
            'p',
            `${table.status} · ${table.columns.length} columns / ${table.foreignKeys.length} declared FKs`,
            'help',
          ),
          sourceButton(table.location, 'Table 定義', signal),
        );
        if (table.primaryKey) {
          box.append(
            el('p', `PK (${table.primaryKey.columns.map(identifierText).join(', ')})`, 'ddl-key'),
            sourceButton(table.primaryKey.location, 'PK 定義', signal),
          );
          for (const name of table.primaryKey.columns)
            box.append(sourceButton(name.location, `PK 欄位 ${identifierText(name)}`, signal));
        }
        const columns = el('div');
        box.append(columns);
        paged(
          columns,
          table.columns,
          (column, columnSignal) => {
            const row = el('div', '', 'ddl-column');
            row.dataset.columnId = column.id;
            row.append(
              el('strong', identifierText(column.name)),
              el('code', column.dataType),
              el(
                'span',
                `${column.primaryKey ? 'PK · ' : ''}${table.foreignKeys.some((edge) => edge.sourceColumns.some((name) => name.name === column.name.name)) ? 'FK · ' : ''}${column.nullable ? 'nullable' : 'not null'}`,
                'ddl-column-flags',
              ),
              sourceButton(column.location, 'Column 定義', columnSignal),
              sourceButton(column.typeLocation, 'Type 定義', columnSignal),
            );
            for (const constraint of column.nullabilityConstraints)
              row.append(
                sourceButton(
                  constraint.location,
                  `${constraint.name ? `${identifierText(constraint.name)} · ` : ''}${constraint.nullable ? 'NULL' : 'NOT NULL'} 原始宣告`,
                  columnSignal,
                ),
              );
            return row;
          },
          signal,
          '沒有已接受欄位。',
        );
        return box;
      },
      tableEvents.signal,
      '沒有符合的已接受 tables；不等於真實 DB 沒有資料表。',
    );
  }
  function zoom(value: number) {
    if (!svg) return;
    scale = Math.min(2, Math.max(0.25, value));
    const box = svg.viewBox.baseVal;
    svg.setAttribute('width', String(box.width * scale));
    svg.setAttribute('height', String(box.height * scale));
    get('zoom-reset').textContent = `${Math.round(scale * 100)}%`;
  }
  function render() {
    if (!report) return;
    const current = report;
    get('output').hidden = false;
    get('report-state').dataset.state = current.status;
    get('report-state').textContent = current.status;
    get('summary').textContent =
      current.status === 'complete'
        ? `Complete 僅覆蓋此宣告子集，不是 DB validation 或 migration 最終狀態。${current.tables.length ? '所有連線只來自明示 FK。' : '空／純註解輸入也不是資料庫 schema 證明。'}`
        : current.status === 'limit'
          ? 'Limit：所有模型陣列已清除，沒有截斷成功圖；請縮小輸入。'
          : `${current.status} · 不完整接受模型：unsupported 不執行，invalid lexical remainder 不猜後續表。保留圖不是完整資料庫 schema。`;
    const entries = [
      ['Tables', current.tables.length],
      ['Columns', current.tables.reduce((sum, table) => sum + table.columns.length, 0)],
      ['Declared FKs', current.edges.length],
      ['Diagnostics', current.diagnostics.length],
    ] as const;
    for (const [label, count] of entries) {
      const card = el('div', '', 'ddl-count');
      card.append(el('strong', String(count)), el('span', label));
      get('counts').append(card);
    }
    if (current.status !== 'limit') {
      try {
        svg = renderSqlDdlSvg(current, { source: go, relationship: relationDetail });
        get('graph').append(svg);
        get('graph').scrollTop = 0;
        get('graph').scrollLeft = 0;
        get('graph-size').textContent =
          `完整 ${svg.getAttribute('width')} × ${svg.getAttribute('height')} units · 未省略接受的 tables／columns／FKs`;
        zoom(1);
      } catch {
        svg = undefined;
        get('graph').append(
          el(
            'p',
            '圖形超出 app renderer 安全預算或無法呈現；不提供截斷 SVG。仍可查看完整文字文件與摘要。',
            'help',
          ),
        );
      }
    } else get('graph').append(el('p', 'Limit · 無可繪製接受模型。', 'help'));
    tables();
    relationships();
    paged(
      get('diagnostics'),
      current.diagnostics,
      (issue, signal) => {
        const row = el('article', '', 'ddl-diagnostic');
        row.dataset.code = issue.code;
        row.dataset.severity = issue.severity;
        row.append(
          el('strong', issue.severity),
          el('code', issue.code),
          el(
            'p',
            `${issue.statementId ?? 'lexical remainder'} · ${issue.tableId ?? 'no table identity'}`,
            'help',
          ),
          sourceButton(issue.location, '診斷位置', signal),
        );
        return row;
      },
      resultEvents.signal,
      '沒有回報 diagnostics；仍非完整 PostgreSQL engine validation。',
    );
    paged(
      get('statements'),
      current.statements,
      (statement, signal) => {
        const row = el('article', '', 'ddl-statement');
        row.append(
          el('code', `${statement.id} · ${statement.kind} / ${statement.status}`),
          sourceButton(statement.location, 'Statement 範圍', signal),
        );
        return row;
      },
      resultEvents.signal,
      '沒有已列出的非空 statement。',
    );
    get('scope').replaceChildren(...current.scope.map((rule) => el('li', rule)));
    enabled();
    get('status').textContent =
      `解析完成 · ${current.status}，worker 已終止。請看覆蓋與綁定，不只看 table／FK 計數。`;
  }
  function fail(message: string) {
    stop();
    get('error').textContent = message;
    get('error').hidden = false;
    get('status').textContent = '工作未完成，沒有可用模型；不在主執行緒重試解析。';
  }
  get('run').addEventListener(
    'click',
    () => {
      reset();
      const id = revision;
      get('status').textContent = '專用 worker 正在本機解析，最多等待 20 秒；可取消。';
      try {
        const active = new Worker(new URL('../sql-ddl.worker.ts', import.meta.url), {
          type: 'module',
        });
        worker = active;
        get<HTMLButtonElement>('cancel').disabled = false;
        timer = setTimeout(() => {
          if (id === revision && worker === active)
            fail('工作逾時（20 秒），worker 已終止；未取得完整結論。');
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
            fail('Worker 無法完成解析，已終止；沒有可用模型。');
            return;
          }
          if (data.kind !== 'report' || !reportReply(data.report)) return;
          stop();
          report = data.report;
          try {
            render();
          } catch {
            reset();
            fail('無法呈現解析結果；不退回原始 DDL 匯出。');
          }
        };
        active.postMessage({ kind: 'parse', id, source: source.value });
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
      get('demo-note').textContent = '自訂 DDL；案例預期不適用於編輯後來源。';
    },
    { signal: events.signal },
  );
  for (const [id, demo] of [
    ['demo', sqlDdlDemos.resolved],
    ['demo-candidate', sqlDdlDemos.candidate],
    ['demo-unsupported', sqlDdlDemos.unsupported],
    ['demo-lexical', sqlDdlDemos.lexical],
    ['demo-invalid', sqlDdlDemos.invalid],
    ['demo-limit', sqlDdlDemos.limit],
    ['demo-hostile', sqlDdlDemos.hostile],
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
      get('status').textContent = '已取消並終止 worker，沒有完整模型；輸入保留。';
    },
    { signal: events.signal },
  );
  get('clear').addEventListener(
    'click',
    () => {
      reset();
      source.value = '';
      get('demo-note').textContent =
        '固定案例均人工合成；輸入與載入不觸發解析，按 Run 才建立專用 worker。';
      get('status').textContent = '來源、模型、圖、worker 與下載已清除。';
      source.focus();
    },
    { signal: events.signal },
  );
  get('table-filter').addEventListener('input', tables, { signal: events.signal });
  get('binding-filter').addEventListener('change', relationships, { signal: events.signal });
  get('export-confirm').addEventListener(
    'change',
    () => {
      release();
      enabled();
    },
    { signal: events.signal },
  );
  get('zoom-out').addEventListener('click', () => zoom(scale - 0.25), { signal: events.signal });
  get('zoom-in').addEventListener('click', () => zoom(scale + 0.25), { signal: events.signal });
  get('zoom-reset').addEventListener('click', () => zoom(1), { signal: events.signal });
  get('fit').addEventListener(
    'click',
    () => {
      if (svg) zoom((get('graph').clientWidth - 24) / svg.viewBox.baseVal.width);
    },
    { signal: events.signal },
  );
  for (const type of ['svg', 'summary'] as const)
    get(`export-${type}`).addEventListener(
      'click',
      () => {
        const current = report,
          currentSvg = svg,
          id = revision;
        if (
          !current ||
          current.status === 'limit' ||
          !get<HTMLInputElement>('export-confirm').checked
        )
          return;
        get('export-status').textContent = '準備明確投影匯出…';
        const content =
          type === 'svg'
            ? Promise.resolve().then(() => {
                if (!currentSvg) throw new Error('SVG unavailable');
                const clone = currentSvg.cloneNode(true) as SVGSVGElement;
                clone.setAttribute('width', String(currentSvg.viewBox.baseVal.width));
                clone.setAttribute('height', String(currentSvg.viewBox.baseVal.height));
                return serializeSqlDdlSvg(clone);
              })
            : import('@sid-tools/core/sql-ddl').then((core) => core.exportSqlDdlSummary(current));
        void content
          .then((value) => {
            if (
              id !== revision ||
              report !== current ||
              !get<HTMLInputElement>('export-confirm').checked
            )
              return;
            release();
            try {
              const url = URL.createObjectURL(
                new Blob([value], { type: type === 'svg' ? 'image/svg+xml' : 'application/json' }),
              );
              urls.set(
                url,
                setTimeout(() => {
                  URL.revokeObjectURL(url);
                  urls.delete(url);
                }, 1000),
              );
              const link = el('a');
              link.href = url;
              link.download = type === 'svg' ? 'sql-declarations.svg' : 'sql-table-summary.json';
              link.click();
              get('export-status').textContent =
                `已建立 ${type === 'svg' ? '完整接受模型 SVG' : '精簡資料表摘要'} · ${current.status}；名稱仍可能敏感，不是完整 DB 證明。`;
            } catch {
              release();
              get('export-status').textContent = '無法建立下載；不退回原始 report／DDL。';
            }
          })
          .catch(() => {
            if (id === revision)
              get('export-status').textContent = '無法載入或建立匯出；不退回原始 report／DDL。';
          });
      },
      { signal: events.signal },
    );
  return () => {
    events.abort();
    reset();
    resultEvents.abort();
    tableEvents.abort();
    relationEvents.abort();
    detailEvents.abort();
    source.value = '';
  };
}
