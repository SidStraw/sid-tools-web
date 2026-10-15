import html from './openapi.html?raw';
import { openapiDemos } from './openapi-demos';
import type {
  OpenApiComparison,
  OasFinding,
  OasCategory,
  OasLocation,
} from '@sid-tools/core/openapi';
export { html };
const categoryLabels: Record<OasCategory, string> = {
  breaking: 'Breaking · 結構不相容',
  'non-breaking': 'Non-breaking · 靜態可相容',
  review: 'Review · 需審查',
  unknown: 'Unknown · 未知',
};
const statusLabels: Record<OpenApiComparison['status'], string> = {
  complete: 'Complete · 靜態子集已覆蓋',
  unknown: 'Unknown · 判斷不完整',
  invalid: 'Invalid · 無有效比較',
  unsupported: 'Unsupported · 不支援版本',
  limit: 'Limit · 超過處理上限',
};
const reason = (finding: OasFinding) => {
  const request = finding.direction === 'request';
  const reasons: Record<string, string> = {
    'operation-removed': '移除 operation，既有呼叫合約不再提供。',
    'operation-added': '新增 operation，不收緊既有呼叫。',
    'parameter-added': '新增參數；required 時收緊可接受的 request，optional 不收緊。',
    'parameter-removed': '移除參數可能改變 server 對既有 request 的行為，需人工審查。',
    'parameter-required-changed':
      '參數必填改動；request 新增必填是 breaking，解除必填是 non-breaking。',
    'request-body-added': '新增 body；required 收緊 request，optional 不收緊。',
    'request-body-removed': '移除 request body 支援，需審查既有傳入內容的處理。',
    'request-body-required-changed': 'Request body 必填改動：收緊 breaking，放寬 non-breaking。',
    'schema-type-changed': request
      ? 'Request 型別變動；number → integer 等收窄接受範圍 breaking，反向放寬 non-breaking；不相關型別替換 breaking。'
      : 'Response 型別變動；integer → number 等削弱回傳保證 breaking，反向增強 non-breaking；不相關型別替換 breaking。',
    'nullable-changed': request
      ? 'Request 禁止原本允許的 null 是 breaking；允許 null 是 non-breaking。'
      : 'Response 從保證非 null 改為可回傳 null 是 breaking；反向 non-breaking。',
    'nullable-enum-interaction': 'Nullable 與 enum 交互影響無法由此子集完整判定，保留 unknown。',
    'enum-values-added': request
      ? 'Enum 新值擴大 request 接受範圍，non-breaking。'
      : 'Response enum 新值可能影響 exhaustive clients，列 review，不直接保證 breaking。',
    'enum-values-removed': request
      ? '移除 request enum 值，收窄接受範圍 breaking。'
      : 'Response enum 值減少，縮小回傳集合，non-breaking。',
    'enum-introduced': request
      ? '新增 enum 約束收窄 request，breaking。'
      : '新增 enum 約束增強 response 保證，non-breaking。',
    'enum-removed': request
      ? '解除 enum 約束放寬 request，non-breaking。'
      : '解除 response enum 約束可能擴大回傳集合，需審查。',
    'required-property-added': request
      ? 'Request property 新增必填，收窄接受範圍 breaking。'
      : 'Response property 新增必填，增強回傳保證 non-breaking。',
    'required-property-removed': request
      ? 'Request property 解除必填，放寬接受範圍 non-breaking。'
      : 'Response property 解除必填，削弱回傳保證 breaking。',
    'property-added': request
      ? '新增 request property；required 收緊，optional 不收緊。'
      : '新增 response property，覆蓋規則內 non-breaking，非 client 執行保證。',
    'property-removed': request
      ? '移除 request property 的行為需人工審查。'
      : '移除 response property，削弱既有回傳合約 breaking。',
    'response-status-added': '新增 response status，需檢查 consumer 處理方式，列 review。',
    'response-status-removed':
      '移除成功 2XX（或沒有 2XX 時的 default）為 breaking；其他 status 移除需審查。',
    'media-added': request
      ? '新增可接受 request media，non-breaking。'
      : '新增 response media，需人工審查。',
    'media-removed': '移除 media 支援是 breaking。',
    'additional-properties-changed': request
      ? 'Request additionalProperties 禁止原本允許的額外欄位是 breaking，反向 non-breaking。'
      : 'Response 放寬額外欄位為 review，收窄為 non-breaking。',
    'direction-flag-changed':
      'ReadOnly／writeOnly 改動需人工審查；request／response required 分別排除 readOnly／writeOnly。',
    'deprecated-added': '新增 deprecated 註記，不移除結構；屬 non-breaking 提醒。',
    'path-variable-renamed': '正規化位置相同的 path variable 重新命名，屬 non-breaking 結構變動。',
    'schema-ref-unresolved': 'Schema 引用未能本機完整解析；不載入外部資源，不假設相容。',
    'recursive-schema-unknown': '循環 schema 無法由此有界比較證明完整相容，保留 unknown。',
    'unassessed-component-change': '未完整評估的 component 改動，不能只因未使用就假設安全。',
    'extension-changed': 'Extension 的執行語意不在靜態子集內，變動為 unknown。',
    'schema-constraint-unsupported':
      '這項 schema facet／constraint 不在已證明的規則內，需人工判讀。',
  };
  return (
    reasons[finding.rule] ??
    (finding.category === 'unknown'
      ? '此規則超出可確認的靜態判斷；保留 unknown，查看逐側 issues。'
      : finding.category === 'review'
        ? '此合約改動需要人工審查實際 consumer／server 行為，不保證相容。'
        : '依顯示方向套用固定靜態規則；分類不代表真實 consumer 執行結果。')
  );
};
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
function location(value: unknown): value is OasLocation | null {
  return (
    value === null ||
    (object(value) &&
      typeof value.pointer === 'string' &&
      Number.isSafeInteger(value.start) &&
      Number.isSafeInteger(value.end) &&
      Number.isSafeInteger(value.line) &&
      Number.isSafeInteger(value.column))
  );
}
// Reject unrelated or malformed replies; the report itself comes from our public core in the worker.
function reportMessage(value: unknown): value is OpenApiComparison {
  if (
    !object(value) ||
    !['complete', 'unknown', 'invalid', 'unsupported', 'limit'].includes(String(value.status)) ||
    !object(value.counts) ||
    !object(value.limits) ||
    !Array.isArray(value.rules) ||
    !value.rules.every((item) => typeof item === 'string') ||
    !Array.isArray(value.findings)
  )
    return false;
  if (
    !['breaking', 'non-breaking', 'review', 'unknown'].every((key) =>
      Number.isSafeInteger((value.counts as Record<string, unknown>)[key]),
    )
  )
    return false;
  for (const key of ['before', 'after']) {
    const side = value[key];
    if (
      !object(side) ||
      !['valid', 'invalid', 'unsupported-version', 'limit'].includes(String(side.status)) ||
      !(side.version === null || typeof side.version === 'string') ||
      !Number.isSafeInteger(side.refs) ||
      !Array.isArray(side.issues) ||
      !side.issues.every(
        (issue) =>
          object(issue) &&
          typeof issue.code === 'string' &&
          typeof issue.severity === 'string' &&
          location(issue.location),
      )
    )
      return false;
  }
  return value.findings.every(
    (finding) =>
      object(finding) &&
      typeof finding.id === 'string' &&
      typeof finding.rule === 'string' &&
      ['breaking', 'non-breaking', 'review', 'unknown'].includes(String(finding.category)) &&
      ['request', 'response', 'contract'].includes(String(finding.direction)) &&
      (finding.operation === null || typeof finding.operation === 'string') &&
      ['before', 'after', 'definitionBefore', 'definitionAfter'].every((key) =>
        location(finding[key]),
      ) &&
      Number.isSafeInteger(finding.affectedCount) &&
      Array.isArray(finding.affectedOperations) &&
      finding.affectedOperations.every((item) => typeof item === 'string') &&
      Array.isArray(finding.uses) &&
      finding.uses.every(
        (use) =>
          object(use) &&
          typeof use.operation === 'string' &&
          location(use.before) &&
          location(use.after),
      ) &&
      (finding.detail === null ||
        (object(finding.detail) &&
          Number.isSafeInteger(finding.detail.beforeCount) &&
          Number.isSafeInteger(finding.detail.afterCount))),
  );
}
export function mount(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const before = get<HTMLTextAreaElement>('before'),
    after = get<HTMLTextAreaElement>('after'),
    events = new AbortController();
  let resultEvents = new AbortController(),
    listEvents = new AbortController(),
    detailEvents = new AbortController();
  let revision = 0,
    worker: Worker | undefined,
    timer: ReturnType<typeof setTimeout> | undefined,
    report: OpenApiComparison | undefined;
  const urls = new Map<string, ReturnType<typeof setTimeout>>();
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') => {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
  };
  function stop() {
    if (worker) {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      worker = undefined;
    }
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
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
  function exportEnabled() {
    get<HTMLButtonElement>('export').disabled =
      !report || !get<HTMLInputElement>('export-confirm').checked;
  }
  function reset() {
    revision++;
    stop();
    release();
    report = undefined;
    resultEvents.abort();
    resultEvents = new AbortController();
    listEvents.abort();
    listEvents = new AbortController();
    detailEvents.abort();
    detailEvents = new AbortController();
    get('output').hidden = true;
    get('error').hidden = true;
    get<HTMLInputElement>('export-confirm').checked = false;
    exportEnabled();
    get<HTMLSelectElement>('category').value = 'all';
    get<HTMLSelectElement>('direction').value = 'all';
    get<HTMLInputElement>('operation-search').value = '';
    for (const id of [
      'report-state',
      'summary',
      'counts',
      'issues',
      'rules',
      'findings',
      'finding-detail',
      'selection-status',
      'export-status',
    ])
      get(id).replaceChildren();
    get('status').textContent = '輸入已更新，舊 worker／結果／來源／匯出已丟棄；請重新比較。';
  }
  function failure(message: string) {
    stop();
    report = undefined;
    get('output').hidden = true;
    get('error').textContent = message;
    get('error').hidden = false;
    get('status').textContent = '比較未完成；沒有主執行緒解析 fallback，也沒有相容結論。';
  }
  function source(
    side: 'before' | 'after',
    value: OasLocation | null,
    label: string,
    signal: AbortSignal,
  ) {
    const button = el(
      'button',
      value
        ? `${label} · ${side} ${value.pointer || '(root)'} · L${value.line}:${value.column} · ${value.start}–${value.end}`
        : `${label} · ${side} 無來源範圍`,
      'text-button oas-source',
    );
    button.disabled = !value;
    button.addEventListener(
      'click',
      () => {
        if (!value) return;
        const input = side === 'before' ? before : after;
        input.focus();
        input.setSelectionRange(value.start, value.end);
      },
      { signal },
    );
    return button;
  }
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
      pages = el('div', '', 'oas-pages');
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
  function select(finding: OasFinding) {
    detailEvents.abort();
    detailEvents = new AbortController();
    const signal = detailEvents.signal,
      host = get('finding-detail');
    host.replaceChildren(
      el(
        'span',
        `${finding.direction.toUpperCase()} / ${categoryLabels[finding.category]}`,
        'oas-badge',
      ),
      el('h3', finding.rule),
      el('p', reason(finding), 'oas-reason'),
    );
    host.dataset.id = finding.id;
    host.dataset.rule = finding.rule;
    host.dataset.direction = finding.direction;
    get('selection-status').textContent =
      `已選取 ${finding.operation ?? '共享／合約層級'} · ${finding.rule}`;
    if (finding.detail)
      host.append(
        el(
          'p',
          `只顯示集合數量：before ${finding.detail.beforeCount} → after ${finding.detail.afterCount}，不回顯 enum literals。`,
          'help',
        ),
      );
    host.append(
      el('h4', '使用位置 · 原始 ref use site／直接位置'),
      source('before', finding.before, '使用點', signal),
      source('after', finding.after, '使用點', signal),
      el('h4', '解析後定義 · 實際位置'),
      source('before', finding.definitionBefore, '定義', signal),
      source('after', finding.definitionAfter, '定義', signal),
    );
    host.append(
      el('h4', `受影響操作 · ${finding.affectedCount} 個（最多列前 20）`),
      el('p', '來自此規則／方向／共享定義的合併使用點，不是所有真實 client 或傳遞影響。', 'help'),
    );
    if (!finding.uses.length)
      host.append(
        el('p', finding.operation ?? '此合約層 finding 沒有可列出的 operation 使用點。', 'help'),
      );
    for (const use of finding.uses) {
      const row = el('div', '', 'oas-use');
      row.append(
        el('code', use.operation),
        source('before', use.before, '操作使用點', signal),
        source('after', use.after, '操作使用點', signal),
      );
      host.append(row);
    }
    for (const button of get('findings').querySelectorAll<HTMLButtonElement>(
      'button[data-finding]',
    ))
      button.setAttribute('aria-pressed', String(button.dataset.finding === finding.id));
  }
  function findings() {
    listEvents.abort();
    listEvents = new AbortController();
    detailEvents.abort();
    get('finding-detail').replaceChildren();
    get('selection-status').textContent = '選一個規則，查看原因、JSON Pointers 與原始來源。';
    if (!report) return;
    const category = get<HTMLSelectElement>('category').value,
      direction = get<HTMLSelectElement>('direction').value,
      search = get<HTMLInputElement>('operation-search').value.toLowerCase();
    const filtered = report.findings.filter(
      (item) =>
        (category === 'all' || category === item.category) &&
        (direction === 'all' || direction === item.direction) &&
        [
          item.operation,
          item.rule,
          item.before?.pointer,
          item.after?.pointer,
          item.definitionBefore?.pointer,
          item.definitionAfter?.pointer,
          ...item.affectedOperations,
        ].some((value) => value?.toLowerCase().includes(search)),
    );
    paged(
      get('findings'),
      filtered,
      (finding, signal) => {
        const row = el('article', '', 'oas-finding');
        row.dataset.direction = finding.direction;
        row.dataset.category = finding.category;
        row.dataset.rule = finding.rule;
        const header = el('div', '', 'oas-finding-meta');
        header.append(
          el('span', finding.direction.toUpperCase()),
          el('span', categoryLabels[finding.category]),
        );
        const button = el('button', finding.rule, 'text-button oas-finding-button');
        button.dataset.finding = finding.id;
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => select(finding), { signal });
        row.append(
          header,
          button,
          el('p', reason(finding), 'oas-row-reason'),
          el('code', finding.operation ?? `${finding.affectedCount} 個操作／合約層級`),
        );
        return row;
      },
      ['invalid', 'unsupported', 'limit'].includes(report.status)
        ? '沒有有效比較 findings；不可當成沒有變更。'
        : report.findings.length
          ? '此篩選沒有 findings；請查看整份狀態與逐側 issues。'
          : '此子集沒有 findings；仍須查看 status 與逐側 issues，不是相容保證。',
      listEvents.signal,
    );
    if (filtered[0]) select(filtered[0]);
  }
  function render() {
    if (!report) return;
    const current = report;
    get('report-state').textContent = statusLabels[current.status];
    get('report-state').dataset.state = current.status;
    get('summary').textContent =
      current.status === 'unknown'
        ? '判斷不完整：unknown finding 計數即使為 0，逐側 issues／引用／比較預算仍可能阻止完整結論。'
        : current.status === 'complete'
          ? '已覆蓋此靜態子集，不代表 compatible。仍可能有 breaking／review；零 findings 也不是 consumer 安全保證。'
          : `未產生完整有效比較：${current.status}。沒有 findings 不等於沒有變更或相容。`;
    for (const category of Object.keys(categoryLabels) as OasCategory[]) {
      const card = el('div', '', 'oas-count');
      card.dataset.category = category;
      card.append(
        el('strong', String(current.counts[category])),
        el('span', categoryLabels[category]),
      );
      get('counts').append(card);
    }
    for (const side of ['before', 'after'] as const) {
      const box = el('section');
      box.append(
        el(
          'h3',
          `${side === 'before' ? 'Before' : 'After'} · ${current[side].status} · ${current[side].version ?? '版本不可用'} · ${current[side].refs} refs`,
        ),
        el('p', 'Valid 僅 parser／root 檢查，不是完整 OAS validation。', 'help'),
      );
      const list = el('div');
      box.append(list);
      paged(
        list,
        current[side].issues,
        (issue, signal) => {
          const row = el('div', '', 'oas-issue');
          row.dataset.code = issue.code;
          row.dataset.severity = issue.severity;
          row.append(
            el('strong', issue.severity),
            el('code', issue.code),
            source(side, issue.location, '問題位置', signal),
          );
          return row;
        },
        '沒有已回報 issue；仍只代表已覆蓋的子集。',
        resultEvents.signal,
      );
      get('issues').append(box);
    }
    get('rules').replaceChildren(...current.rules.map((rule) => el('li', rule)));
    get('output').hidden = false;
    findings();
    get('status').textContent =
      `比較完成 · ${statusLabels[current.status]}。worker 已終止；請查看逐側 issues。`;
  }
  for (const input of [before, after])
    input.addEventListener(
      'input',
      () => {
        reset();
        get('demo-note').textContent = '自訂輸入，舊案例預期不適用於編輯後的內容。';
      },
      { signal: events.signal },
    );
  for (const [id, demo] of [
    ['demo', openapiDemos.directional],
    ['demo-shared', openapiDemos.shared],
    ['demo-unknown', openapiDemos.unknown],
    ['demo-equivalent', openapiDemos.equivalent],
    ['demo-unsupported', openapiDemos.unsupported],
    ['demo-invalid', openapiDemos.invalid],
    ['demo-deep', openapiDemos.deep],
  ] as const)
    get(id).addEventListener(
      'click',
      () => {
        reset();
        before.value = demo.before;
        after.value = demo.after;
        get('demo-note').textContent = demo.note;
        get('status').textContent = '固定合成案例已載入；按比較才啟動專用 worker。';
      },
      { signal: events.signal },
    );
  get('run').addEventListener(
    'click',
    () => {
      reset();
      const token = revision;
      get('status').textContent = '專用 worker 正在本機比較，最多等待 20 秒；可取消。';
      try {
        const current = new Worker(new URL('../openapi.worker.ts', import.meta.url), {
          type: 'module',
        });
        worker = current;
        get<HTMLButtonElement>('cancel').disabled = false;
        timer = setTimeout(() => {
          if (token !== revision || worker !== current) return;
          failure('比較逾時（20 秒），worker 已終止；未取得完整結論。');
        }, 20000);
        current.onerror = () => {
          if (token !== revision || worker !== current) return;
          failure('Worker 載入或執行失敗，已終止；不在主執行緒重試解析。');
        };
        current.onmessageerror = () => {
          if (token !== revision || worker !== current) return;
          failure('Worker 訊息無法讀取，已終止；沒有可用比較結論。');
        };
        current.onmessage = (event: MessageEvent<unknown>) => {
          if (
            token !== revision ||
            worker !== current ||
            !object(event.data) ||
            event.data.id !== token
          )
            return;
          if (event.data.kind === 'failure') {
            failure('Worker 無法完成比較，已終止；未取得完整結論。');
            return;
          }
          if (event.data.kind !== 'result' || !reportMessage(event.data.report)) return;
          stop();
          report = event.data.report;
          try {
            render();
          } catch {
            reset();
            failure('無法顯示 worker 結果；沒有可用比較結論。');
          }
        };
        current.postMessage({
          kind: 'compare',
          id: token,
          before: before.value,
          after: after.value,
        });
      } catch {
        failure('無法啟動專用 worker；沒有主執行緒 fallback，未完成比較。');
      }
    },
    { signal: events.signal },
  );
  get('cancel').addEventListener(
    'click',
    () => {
      reset();
      get('status').textContent = '已取消並終止 worker，沒有完整比較結論；輸入保留，可重新比較。';
    },
    { signal: events.signal },
  );
  get('clear').addEventListener(
    'click',
    () => {
      reset();
      before.value = '';
      after.value = '';
      get('demo-note').textContent = '固定案例都是人工合成，不是外部服務或客戶資料。';
      get('status').textContent = '兩份文件、worker、結果與匯出已清除。';
      before.focus();
    },
    { signal: events.signal },
  );
  for (const [id, event] of [
    ['direction', 'change'],
    ['category', 'change'],
    ['operation-search', 'input'],
  ] as const)
    get(id).addEventListener(event, findings, { signal: events.signal });
  get('export-confirm').addEventListener('change', exportEnabled, { signal: events.signal });
  get('export').addEventListener(
    'click',
    () => {
      if (!report || !get<HTMLInputElement>('export-confirm').checked) return;
      const current = report,
        token = revision;
      get('export-status').textContent = '正在準備明確投影摘要…';
      void import('@sid-tools/core/openapi')
        .then((core) => {
          if (
            token !== revision ||
            report !== current ||
            !get<HTMLInputElement>('export-confirm').checked
          )
            return;
          release();
          try {
            const text = core.exportOpenApiSummary(current),
              url = URL.createObjectURL(new Blob([text], { type: 'application/json' })),
              link = el('a');
            urls.set(
              url,
              setTimeout(() => {
                URL.revokeObjectURL(url);
                urls.delete(url);
              }, 1000),
            );
            link.href = url;
            link.download = 'openapi-static-summary.json';
            link.click();
            get('export-status').textContent =
              '已建立縮減摘要；名稱／pointers 仍可能敏感，分享前請檢查。';
          } catch {
            release();
            get('export-status').textContent = '無法建立摘要；不退回原始 report 或原始文件匯出。';
          }
        })
        .catch(() => {
          if (token === revision)
            get('export-status').textContent = '無法載入摘要工具；沒有匯出原始文件。';
        });
    },
    { signal: events.signal },
  );
  return () => {
    events.abort();
    reset();
    resultEvents.abort();
    listEvents.abort();
    detailEvents.abort();
    before.value = '';
    after.value = '';
  };
}
