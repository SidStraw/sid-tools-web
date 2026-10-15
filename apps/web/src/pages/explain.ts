import html from './explain.html?raw';
import { explainDemos } from './explain-demos';
import { locateExplainSources, type ExplainSourceRange } from './explain-source';
import type {
  ExplainDiagnosticCode,
  ExplainMetric,
  ExplainNode,
  ExplainReport,
} from '@sid-tools/core/explain';
export { html };

const messages: Record<ExplainDiagnosticCode, string> = {
  'input-limit': '超過 1,000,000 UTF-16 字碼單元；未解析、不顯示部分樹。',
  'json-depth-limit': '超過 96 層 JSON containers；未解析。',
  'container-limit': '超過 10,000 JSON containers；未解析。',
  'invalid-json': 'JSON 語法無效；未回顯解析器原文。',
  'invalid-shape':
    '不支援的結構：需單一 statement array wrapper、合法 Plan／Plans 與非空 Node Type。',
  'node-limit': '超過 2,000 plan 節點；不回傳截斷樹。',
  'plan-depth-limit': '超過 32 層 plan；不回傳截斷樹。',
  'invalid-field': '欄位型別或數值無效；請依支援規則修正，不以零代替。',
  'missing-metric': '缺少 baseline cost／rows 或 actual rows／loops 配對；不完整，不補造數值。',
  'omitted-fields': '有未支援欄位被省略，結果不完整；不分析其內容。',
  'inconsistent-metrics': 'Startup 大於 Total，欄位不一致。',
  'derived-overflow': '衍生乘積或比率溢位；顯示未知，不輸出非有限數值。',
  'never-executed': 'Actual Loops=0：未執行，不比較估計或計算跨 loops 乘積。',
  'estimate-under': '每 loop actual rows 比 plan rows 高至少 10 倍；估計低估，只是觀察。',
  'estimate-over': '每 loop actual rows 比 plan rows 低至少 10 倍；估計高估，只是觀察。',
  'estimate-zero': '估計 rows=0、每 loop actual>0；估計低估，倍數不定義。',
  'actual-zero':
    '每 loop actual rows 顯示為 0、估計>0；估計高估，倍數不定義。若為 PG ≤17 的整數四捨五入，每 loop 真實平均可能 <0.5，不代表真實總 rows 為零；不偵測版本。',
};
const modes = {
  'explain-only': '只有 EXPLAIN · 未提供 actual 證據',
  analyze: '具 ANALYZE rows／loops · 不代表 timing 齊全',
  'partial-actuals': '部分實測 · actual rows／loops 配對不完整',
  unknown: '模式未知 · 結構未通過',
} as const;
function gap(node: ExplainNode): string {
  const estimate = node.estimate;
  if (estimate.state === 'never-executed') return '未執行 · 不比較';
  if (estimate.state === 'unavailable') return '未知 · 缺少可比較資訊';
  if (estimate.state === 'estimate-zero') return '估計為零／actual>0 · 低估，倍數不定義';
  if (estimate.state === 'actual-zero') return 'actual 顯示為 0／估計>0 · 高估，倍數不定義';
  const direction =
    estimate.direction === 'equal'
      ? '相同'
      : estimate.direction === 'underestimated'
        ? '低估'
        : '高估';
  return `${direction} · ${estimate.factor === null ? '倍數未知（衍生溢位）' : `${estimate.factor} 倍`}`;
}

export function mount(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const input = get<HTMLTextAreaElement>('plan'),
    output = get('output'),
    status = get('status'),
    error = get('error'),
    download = get<HTMLButtonElement>('export');
  const events = new AbortController();
  let rendering = new AbortController(),
    detailEvents = new AbortController();
  let revision = 0,
    report: ExplainReport | undefined;
  let ranges = new Map<string, ExplainSourceRange>();
  const nodes = new Map<string, ExplainNode>(),
    treeButtons = new Map<string, HTMLButtonElement>(),
    urls = new Set<string>();
  function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
  }
  function revoke() {
    for (const url of urls) URL.revokeObjectURL(url);
    urls.clear();
  }
  function invalidate() {
    revision++;
    report = undefined;
    ranges.clear();
    nodes.clear();
    treeButtons.clear();
    rendering.abort();
    rendering = new AbortController();
    detailEvents.abort();
    detailEvents = new AbortController();
    revoke();
    output.hidden = true;
    get('browse').hidden = true;
    download.disabled = true;
    error.hidden = true;
    for (const id of [
      'outcome',
      'mode',
      'statement',
      'diagnostics',
      'tree',
      'node',
      'selection-status',
    ])
      get(id).replaceChildren();
    delete get('node').dataset.nodeId;
    status.textContent = '輸入已更新，舊報告與節點選取已清除，請重新檢視。';
  }
  function source(pointer: string, signal = detailEvents.signal) {
    let target = pointer;
    while (!ranges.has(target) && target) target = target.slice(0, target.lastIndexOf('/'));
    const range = ranges.get(target),
      button = el(
        'button',
        `${pointer || '/'}${!range ? ' · 來源定位不可用' : target !== pointer ? ` · 回到父層 ${target || '/'}` : ''}`,
        'text-button explain-source',
      );
    button.disabled = !range;
    button.addEventListener(
      'click',
      () => {
        if (!range) return;
        input.focus();
        input.setSelectionRange(range.start, range.end);
      },
      { signal },
    );
    return button;
  }
  function metric(
    host: HTMLElement,
    label: string,
    value: ExplainMetric | null,
    unit: string,
    key: string,
    signal = detailEvents.signal,
  ) {
    const card = el('div', '', 'explain-metric');
    card.dataset.metric = key;
    card.append(
      el('dt', label),
      el('dd', value ? `${value.value}${unit ? ` ${unit}` : ''}` : '未知 · 未提供或無效'),
    );
    if (value) card.append(source(value.pointer, signal));
    host.append(card);
  }
  function selectNode(node: ExplainNode) {
    detailEvents.abort();
    detailEvents = new AbortController();
    for (const [id, button] of treeButtons)
      button.setAttribute('aria-pressed', String(id === node.id));
    const host = get('node');
    host.replaceChildren();
    host.dataset.nodeId = node.id;
    get('selection-status').textContent = `已選取 ${node.nodeType} · ${node.pointer}`;
    host.append(el('h3', node.nodeType), source(node.pointer));
    const identity = el('dl', '', 'explain-identity');
    for (const [label, text] of [
      ['Relation Name', node.relation],
      ['Schema', node.schema],
      ['Alias', node.alias],
      ['Parent Relationship', node.parentRelationship],
    ] as const)
      if (text !== null) identity.append(el('dt', label), el('dd', text));
    host.append(identity);
    const comparison = el('div', '', 'explain-comparison');
    comparison.dataset.estimateState = node.estimate.state;
    comparison.append(
      el('span', '估計差距 · 每 loop rows'),
      el('strong', gap(node)),
      el('p', '以 Actual Rows ÷ Plan Rows 的方向比較，不使用 rows × loops。這不是效能改善量測。'),
    );
    host.append(comparison);
    if (node.estimate.state === 'actual-zero')
      comparison.append(
        el(
          'p',
          '這是顯示值為 0：若為 PG ≤17 的整數四捨五入，每 loop 真實平均可能 <0.5，不能推論真實總 rows 為零；本頁不偵測版本。',
        ),
      );
    if (node.execution === 'never-executed')
      host.append(
        el(
          'p',
          '未執行：loops=0。下方保留原始零值，不把它判讀為選擇率或估計失準。',
          'result-notice',
        ),
      );
    if (node.omittedFieldCount)
      host.append(
        el(
          'p',
          `此節點省略 ${node.omittedFieldCount} 個不支援欄位；請回到原始 JSON 查看，報告不包含其內容。`,
          'help',
        ),
      );
    const costs = el('dl', '', 'explain-metrics');
    metric(costs, 'Startup Cost · planner 單位', node.startupCost, '', 'startup-cost');
    metric(costs, 'Total Cost · planner 單位', node.totalCost, '', 'total-cost');
    metric(costs, 'Plan Rows · 估計每 loop', node.planRows, 'rows', 'plan-rows');
    host.append(el('h4', 'Planner 估計'), costs);
    const actual = el('dl', '', 'explain-metrics');
    metric(actual, 'Actual Rows · per-loop 平均', node.actualRows, 'rows / loop', 'actual-rows');
    metric(actual, 'Actual Loops · 原始次數', node.actualLoops, 'loops', 'actual-loops');
    metric(
      actual,
      'Actual Startup Time · per-loop',
      node.actualStartupTime,
      'ms / loop',
      'actual-startup-time',
    );
    metric(
      actual,
      'Actual Total Time · per-loop inclusive',
      node.actualTotalTime,
      'ms / loop',
      'actual-total-time',
    );
    host.append(el('h4', '原始實測欄位 · 未提供不補零'), actual);
    const derived = el('dl', '', 'explain-derived');
    for (const [name, value, unit] of [
      ['Rows × loops · 近似', node.approximateRowsAcrossLoops, 'rows'],
      ['Total Time × loops · 近似 inclusive', node.approximateInclusiveMsAcrossLoops, 'ms'],
    ] as const) {
      const label = el('dt', name);
      const loops = node.actualLoops?.value;
      if (loops !== undefined && loops > 1) {
        if (
          unit === 'rows' &&
          node.actualRows !== null &&
          Number.isInteger(node.actualRows.value)
        ) {
          const note = el(
            'p',
            `條件式上限：若為 PG ≤17 的整數四捨五入，rows 乘積與真實總 rows 的誤差最多 ${0.5 * loops} rows（0.5 × ${loops} loops）。顯示為 0 仍可能隱藏每 loop <0.5 rows；這不是精確總數，也不代表已偵測版本。`,
            'help',
          );
          note.dataset.rounding = 'rows';
          label.append(note);
        }
        if (unit === 'ms' && node.actualTotalTime !== null) {
          const note = el(
            'p',
            `若節點時間依 3 位小數四捨五入，time 乘積誤差最多 ${0.0005 * loops} ms（0.0005 × ${loops} loops）；仍不是 query wall-clock。`,
            'help',
          );
          note.dataset.rounding = 'time';
          label.append(note);
        }
      }
      derived.append(label, el('dd', value === null ? '未知／不可計算' : `${value} ${unit}`));
    }
    host.append(el('h4', '單一節點衍生量 · 不是 query wall-clock'), derived);
    const buffers = el('dl', '', 'explain-metrics');
    for (const [name, value] of Object.entries(node.buffers))
      metric(buffers, name, value, name.endsWith('Blocks') ? 'blocks' : 'ms', name);
    host.append(el('h4', 'Buffers／I/O · 不乘 loops，不合併父子'));
    if (Object.keys(node.buffers).length) host.append(buffers);
    else host.append(el('p', '未知 · 此節點未提供有效 buffer／I/O metrics，不補零。', 'help'));
  }
  function renderTree(rootNode: ExplainNode) {
    function branch(host: HTMLElement, children: ExplainNode[], depth: number) {
      const list = el('ul', '', 'explain-branches');
      host.append(list);
      let offset = 0;
      const more = el('button', '顯示更多同層節點', 'text-button');
      function batch() {
        more.remove();
        for (const node of children.slice(offset, offset + 60)) {
          const item = el('li'),
            choose = el(
              'button',
              `${node.nodeType}${node.relation ? ` · ${node.relation}` : ''}`,
              'explain-node-button',
            );
          choose.dataset.nodeId = node.id;
          choose.setAttribute('aria-pressed', String(get('node').dataset.nodeId === node.id));
          choose.addEventListener('click', () => selectNode(node), { signal: rendering.signal });
          treeButtons.set(node.id, choose);
          item.append(choose, el('span', gap(node), 'explain-tree-gap'));
          if (node.children.length) {
            const details = el('details'),
              summary = el('summary', `子節點 · ${node.children.length}`);
            details.append(summary);
            let loaded = false;
            const load = () => {
              if (details.open && !loaded) {
                loaded = true;
                branch(details, node.children, depth + 1);
              }
            };
            details.addEventListener('toggle', load, { signal: rendering.signal });
            if (depth === 0) {
              details.open = true;
              load();
            }
            item.append(details);
          }
          list.append(item);
        }
        offset += 60;
        if (offset < children.length) host.append(more);
      }
      more.addEventListener('click', batch, { signal: rendering.signal });
      batch();
    }
    branch(get('tree'), [rootNode], 0);
  }
  function renderDiagnostics(data: ExplainReport) {
    if (!data.diagnostics.length) {
      get('diagnostics').append(el('p', '未發現支援子集內的診斷。', 'help'));
      return;
    }
    const details = el('details', '', 'explain-diagnostics');
    details.open = true;
    details.append(el('summary', `靜態診斷 · ${data.diagnostics.length}`));
    const rows = el('div'),
      pages = el('div', '', 'explain-pages');
    details.append(rows, pages);
    get('diagnostics').append(details);
    let pageEvents = new AbortController();
    rendering.signal.addEventListener('abort', () => pageEvents.abort(), { once: true });
    function page(index: number) {
      pageEvents.abort();
      pageEvents = new AbortController();
      rows.replaceChildren();
      pages.replaceChildren();
      for (const diagnostic of data.diagnostics.slice(index * 50, (index + 1) * 50)) {
        const row = el('div', '', 'explain-diagnostic');
        row.dataset.code = diagnostic.code;
        row.append(
          el(
            'span',
            diagnostic.severity === 'error'
              ? '錯誤'
              : diagnostic.severity === 'warning'
                ? '注意'
                : '資訊',
          ),
          el('p', messages[diagnostic.code]),
          source(diagnostic.pointer, pageEvents.signal),
        );
        const node = nodes.get(diagnostic.pointer);
        if (node) {
          const show = el('button', '查看此節點', 'text-button');
          show.addEventListener('click', () => selectNode(node), { signal: pageEvents.signal });
          row.append(show);
        }
        rows.append(row);
      }
      if (data.diagnostics.length <= 50) return;
      const previous = el('button', '上一頁', 'text-button'),
        next = el('button', '下一頁', 'text-button');
      previous.disabled = index === 0;
      next.disabled = (index + 1) * 50 >= data.diagnostics.length;
      previous.addEventListener('click', () => page(index - 1), { signal: pageEvents.signal });
      next.addEventListener('click', () => page(index + 1), { signal: pageEvents.signal });
      pages.append(
        previous,
        el('span', `${index + 1} / ${Math.ceil(data.diagnostics.length / 50)} 頁`),
        next,
      );
    }
    page(0);
  }
  function render(data: ExplainReport) {
    get('outcome').textContent = !data.valid
      ? '計畫有錯誤，未通過靜態檢查。可保留有效結構供對照，但不可視為整份通過。'
      : !data.complete
        ? '已提取支援欄位，但有缺漏、省略或衍生計算限制；結果不完整。'
        : '支援子集內的靜態檢查完成；不代表完整 PostgreSQL 支援或已驗證效能。';
    get('mode').textContent = `${modes[data.mode]} · ${data.nodeCount} 個節點`;
    if (data.root) {
      const wanted = new Set<string>(['', '/0']);
      const stack = [data.root];
      while (stack.length) {
        const node = stack.pop()!;
        nodes.set(node.id, node);
        wanted.add(node.pointer);
        for (const value of [
          node.startupCost,
          node.totalCost,
          node.planRows,
          node.actualRows,
          node.actualLoops,
          node.actualStartupTime,
          node.actualTotalTime,
          ...Object.values(node.buffers),
        ])
          if (value) wanted.add(value.pointer);
        stack.push(...node.children);
      }
      for (const diagnostic of data.diagnostics) wanted.add(diagnostic.pointer);
      for (const value of [data.planningTime, data.executionTime])
        if (value) wanted.add(value.pointer);
      ranges = locateExplainSources(input.value, wanted);
      get('browse').hidden = false;
      selectNode(data.root);
      renderTree(data.root);
    }
    const statement = el('dl', '', 'explain-metrics');
    metric(
      statement,
      'Statement Planning Time · 獨立來源',
      data.planningTime,
      'ms',
      'statement-planning-time',
      rendering.signal,
    );
    metric(
      statement,
      'Statement Execution Time · 獨立來源',
      data.executionTime,
      'ms',
      'statement-execution-time',
      rendering.signal,
    );
    get('statement').append(statement);
    renderDiagnostics(data);
    output.hidden = false;
    download.disabled = false;
    status.textContent = `已檢視 ${data.nodeCount} 個節點。${data.valid && data.complete ? '支援子集內完整。' : '有錯誤或不完整項目。'}`;
  }
  input.addEventListener('input', invalidate, { signal: events.signal });
  for (const [id, text] of [
    ['demo', explainDemos.analyze],
    ['demo-estimate', explainDemos.estimate],
    ['demo-partial', explainDemos.partial],
  ] as const)
    get(id).addEventListener(
      'click',
      () => {
        invalidate();
        input.value = text;
        status.textContent = '人工合成範例已載入，非資料庫實測；請按檢視。';
      },
      { signal: events.signal },
    );
  get('clear').addEventListener(
    'click',
    () => {
      invalidate();
      input.value = '';
      status.textContent = '內容、報告與節點選取已清除。';
      input.focus();
    },
    { signal: events.signal },
  );
  get('run').addEventListener(
    'click',
    () => {
      invalidate();
      const token = revision;
      status.textContent = '正在檢視計畫…';
      void import('@sid-tools/core/explain')
        .then((module) => {
          if (token !== revision) return;
          report = module.parseExplain(input.value);
          render(report);
        })
        .catch(() => {
          if (token !== revision) return;
          error.textContent = '工具載入或檢視失敗，請重試；未回傳原始 JSON。';
          error.hidden = false;
          status.textContent = '未完成檢視。';
        });
    },
    { signal: events.signal },
  );
  download.addEventListener(
    'click',
    () => {
      if (!report) return;
      revoke();
      const data = {
        format: 'sid-tools/explain-static/v1',
        notice:
          'Static supported-field inspection only. No SQL execution, database connection or measured optimization. Names can be sensitive. Node timing is per-loop and inclusive; never sum parent and child metrics. No server version is detected. Before PostgreSQL 18, Actual Rows per-loop averages are rounded to whole numbers; PostgreSQL 18 can emit fractional rows. Conditional on PostgreSQL <=17 whole-number rounding, rows × loops error is up to 0.5 × loops rows; displayed zero may hide a true per-loop average <0.5, not true zero rows. Node times rounded to 3 decimals have time-product error up to 0.0005 × loops ms. For 100000 loops these conditional bounds are 50000 rows and 50 ms. Products are approximate, not exact true totals or query wall-clock.',
        report,
      };
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      urls.add(url);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'explain-static-report.json';
      link.click();
      status.textContent = '已下載支援欄位的靜態報告；名稱仍可能敏感，不代表已實測改善。';
    },
    { signal: events.signal },
  );
  return () => {
    events.abort();
    invalidate();
    rendering.abort();
    detailEvents.abort();
    input.value = '';
  };
}
