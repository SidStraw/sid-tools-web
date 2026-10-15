import html from './sitemap.html?raw';
import { sitemapDemos } from './sitemap-demos';
import type { SitemapDiagnosticCode } from '@sid-tools/core/sitemap';
import type { SitemapXmlInspection, SitemapXmlIssueCode, SitemapXmlSource } from './sitemap-xml';
export { html };

const coreMessages: Record<SitemapDiagnosticCode, string> = {
  'invalid-document': '文件資料無效，未完成檢查。',
  'unsafe-xml': '不接受 DOCTYPE／entity 宣告。',
  'malformed-xml': 'XML 語法錯誤。',
  'structure-unchecked': 'XML 結構未檢查。',
  namespace: '必須使用精確 Sitemap 0.9 namespace。',
  'unknown-structure': '含不支援的結構；只顯示已提取欄位，不宣稱完整。',
  'protocol-count-limit': '超過協定 50,000 條目上限。',
  'local-count-limit': '超過本機 10,000 條目上限；未逐條檢查。',
  'protocol-size-limit': '超過協定 52,428,800 bytes 上限。',
  'local-size-limit': '超過本機 2,000,000 UTF-8 bytes 上限。',
  'normalized-size-limit': '提取欄位與 pointer 超過 2,000,000 UTF-16 字碼單元；未逐條檢查。',
  'size-unmeasured': '原始 UTF-8 byte 數未量測。',
  'empty-document': '文件沒有條目。',
  'source-mismatch': '來源條目順序與 pointer 不一致。',
  'invalid-field': '欄位無效或超過 4,096 UTF-16 字碼單元。',
  'missing-loc': '缺少必要 loc，或內容為空白。',
  'invalid-loc': 'loc 不是支援的絕對 HTTP(S) URL；請檢查空白、帳密、fragment、跳脫與長度。',
  'duplicate-loc': '完整 loc 字串重複；不會自動刪除。',
  'mixed-host': 'host 與第一個合法 URL 不同（含 port）。',
  'invalid-lastmod': 'lastmod 不是有效西曆日期或帶時區的支援格式。',
  'invalid-changefreq': 'changefreq 不在支援的七種值中。',
  'invalid-priority': 'priority 必須是 0–1 的十進位值。',
  'unsupported-index-field': 'Sitemap index 不支援 changefreq／priority。',
  'unchecked-children': '所有 index 子檔內容未檢查、未載入。',
};
const xmlMessages: Record<SitemapXmlIssueCode, string> = {
  'unsafe-xml': '解析前已拒絕 DOCTYPE／entity 宣告（含註解／CDATA 中的宣告樣式文字）。',
  'malformed-xml': 'XML 語法錯誤，未產生條目結果；此為文件層級定位。',
  'local-size-limit': '超過本機 2,000,000 UTF-8 bytes；未解析、不提供部分結果。',
  'xml-node-limit': '超過本機 100,000 個 XML 元素；未解析。',
  'xml-depth-limit': '超過本機 128 層 XML 深度；未解析。',
  'unsupported-declaration': '只支援 XML 1.0 與 UTF-8 宣告。',
  'unsupported-root': '根元素必須是 urlset 或 sitemapindex。',
  namespace: '元素 namespace 不符 Sitemap 0.9；不可視為支援欄位。',
  'unsupported-tag': '延伸／未知標籤不支援；保留條目並明示不完整。',
  'unsupported-attribute': '不支援 namespace 宣告以外的屬性。',
  'mixed-text': '結構元素含非空白文字，不支援此內容。',
  'processing-instruction': '不執行 processing instruction，不載入外部樣式；此結構不支援。',
  'duplicate-field': '直接欄位重複，只保留第一值；不宣稱完整。',
  'nested-markup': '欄位含巢狀標記，無法認定為支援結構。',
  'source-map': '無法可靠對應原始 XML 標籤位置，未產生結果。',
};
interface TreeNode {
  label: string;
  origin: string;
  prefix: string;
  children: Map<string, TreeNode>;
  count: number;
}

export function mount(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const input = get<HTMLTextAreaElement>('xml'),
    output = get('output'),
    status = get('status'),
    error = get('error'),
    download = get<HTMLButtonElement>('export');
  const search = get<HTMLInputElement>('search'),
    filter = get<HTMLSelectElement>('entry-filter');
  const events = new AbortController();
  let rendering = new AbortController(),
    listing = new AbortController();
  let revision = 0,
    inspection: SitemapXmlInspection | undefined,
    treeSelection: { origin: string; prefix: string } | undefined,
    entryPage = 0;
  const sourcePointers = new Map<string, SitemapXmlSource>(),
    sourceOrdinals = new Map<number, SitemapXmlSource>();
  let issueOrdinals = new Set<number | null>();
  const xmlErrorOrdinals = new Set<number | null>();
  const urls = new Set<string>();
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
    inspection = undefined;
    treeSelection = undefined;
    entryPage = 0;
    sourcePointers.clear();
    sourceOrdinals.clear();
    issueOrdinals.clear();
    xmlErrorOrdinals.clear();
    rendering.abort();
    rendering = new AbortController();
    listing.abort();
    listing = new AbortController();
    revoke();
    output.hidden = true;
    download.disabled = true;
    error.hidden = true;
    search.value = '';
    filter.value = 'all';
    for (const id of ['counts', 'diagnostics', 'tree', 'entries', 'entry-pages'])
      get(id).replaceChildren();
    for (const id of ['outcome', 'tree-status', 'list-status']) get(id).textContent = '';
    get('browse').hidden = true;
    status.textContent = '輸入已更新，舊報告與篩選已清除，請重新預檢。';
  }
  function sourceButton(
    at: SitemapXmlSource | undefined,
    pointer: string,
    signal = rendering.signal,
  ) {
    const button = el(
      'button',
      at ? `${pointer} · 第 ${at.line} 行／${at.column} 欄` : `${pointer} · 文件位置`,
      'text-button sitemap-source',
    );
    button.addEventListener(
      'click',
      () => {
        input.focus();
        input.setSelectionRange(at?.start ?? 0, at?.end ?? 0);
      },
      { signal },
    );
    return button;
  }
  function location(pointer: string, ordinal: number | null) {
    return (
      sourcePointers.get(pointer) ??
      (ordinal !== null ? sourceOrdinals.get(ordinal) : undefined) ??
      inspection?.sources[0]
    );
  }
  function pagination(
    host: HTMLElement,
    index: number,
    count: number,
    size: number,
    render: (index: number) => void,
    signal: AbortSignal,
  ) {
    host.replaceChildren();
    if (count <= size) return;
    const previous = el('button', '上一頁', 'text-button'),
      next = el('button', '下一頁', 'text-button');
    previous.disabled = index === 0;
    next.disabled = (index + 1) * size >= count;
    previous.addEventListener('click', () => render(index - 1), { signal });
    next.addEventListener('click', () => render(index + 1), { signal });
    host.append(previous, el('span', `${index + 1} / ${Math.ceil(count / size)} 頁`), next);
  }
  function renderDiagnostics(data: SitemapXmlInspection) {
    const all = [
      ...data.xmlIssues.map((issue) => ({ ...issue, text: xmlMessages[issue.code] })),
      ...(data.report?.diagnostics ?? []).map((issue) => ({
        code: issue.code,
        severity: issue.severity,
        source: location(issue.pointer, issue.ordinal),
        pointer: issue.pointer,
        text: `${coreMessages[issue.code]}${issue.relatedOrdinal !== null ? ` 參照原始第 ${issue.relatedOrdinal} 條。` : ''}`,
      })),
    ];
    const host = get('diagnostics');
    if (!all.length) {
      host.append(el('p', '未發現支援範圍內的靜態問題。', 'help'));
      return;
    }
    const details = el('details', '', 'sitemap-diagnostics');
    details.open = true;
    details.append(el('summary', `診斷 ${all.length} 筆 · 含 XML 結構與欄位檢查`));
    const rows = el('div'),
      pages = el('div', '', 'sitemap-pages');
    details.append(rows, pages);
    host.append(details);
    let pageEvents = new AbortController();
    rendering.signal.addEventListener('abort', () => pageEvents.abort(), { once: true });
    function render(page: number) {
      pageEvents.abort();
      pageEvents = new AbortController();
      rows.replaceChildren();
      for (const issue of all.slice(page * 50, (page + 1) * 50)) {
        const row = el('div', '', 'sitemap-diagnostic');
        row.dataset.code = issue.code;
        row.append(
          el(
            'span',
            issue.severity === 'error' ? '錯誤' : issue.severity === 'warning' ? '注意' : '資訊',
            `sitemap-severity sitemap-${issue.severity}`,
          ),
          el('p', issue.text),
        );
        const pointer = 'pointer' in issue ? issue.pointer : issue.source.pointer;
        row.append(sourceButton(issue.source, pointer || '/', pageEvents.signal));
        rows.append(row);
      }
      pagination(pages, page, all.length, 50, render, pageEvents.signal);
    }
    render(0);
  }
  function renderEntries() {
    listing.abort();
    listing = new AbortController();
    const report = inspection?.report;
    if (!report) return;
    const query = search.value.toLowerCase();
    const matches = report.entries.filter((entry) => {
      if (
        treeSelection &&
        (!entry.url ||
          entry.url.origin !== treeSelection.origin ||
          !(
            entry.url.pathname === treeSelection.prefix ||
            entry.url.pathname.startsWith(
              treeSelection.prefix.endsWith('/')
                ? treeSelection.prefix
                : `${treeSelection.prefix}/`,
            )
          ))
      )
        return false;
      if (query && !`${entry.loc ?? ''} ${entry.lastmod ?? ''}`.toLowerCase().includes(query))
        return false;
      return (
        filter.value === 'all' ||
        (filter.value === 'issues' && issueOrdinals.has(entry.ordinal)) ||
        (filter.value === 'duplicates' && entry.duplicateOf !== null) ||
        (filter.value === 'invalid' && (!entry.valid || xmlErrorOrdinals.has(entry.ordinal))) ||
        (filter.value === 'unchecked' && entry.childStatus === 'unchecked')
      );
    });
    const host = get('entries');
    host.replaceChildren();
    entryPage = Math.min(entryPage, Math.max(0, Math.ceil(matches.length / 50) - 1));
    get('list-status').textContent =
      `符合 ${matches.length} / ${report.entries.length} 條 · 原始順序保留${matches.length ? ` · 顯示 ${entryPage * 50 + 1}–${Math.min((entryPage + 1) * 50, matches.length)}` : ''}`;
    get('tree-status').textContent = treeSelection
      ? `已篩選 ${treeSelection.origin}${treeSelection.prefix}`
      : '所有路徑。選取節點可篩選清單。';
    if (!matches.length) host.append(el('p', '沒有符合篩選條件的條目。', 'help'));
    for (const entry of matches.slice(entryPage * 50, (entryPage + 1) * 50)) {
      const card = el('article', '', 'sitemap-entry');
      card.dataset.ordinal = String(entry.ordinal);
      card.append(
        el(
          'h3',
          `#${entry.ordinal} · ${entry.childStatus === 'unchecked' ? '子檔未檢查' : entry.valid ? '欄位無錯誤' : '有欄位錯誤'}`,
        ),
        el('p', entry.loc ?? '（缺少 loc）', 'sitemap-loc'),
      );
      if (entry.duplicateOf !== null)
        card.append(el('p', `重複 URL · 首次出現於原始第 ${entry.duplicateOf} 條`, 'help'));
      const fields = el('dl', '', 'sitemap-fields');
      for (const [name, value] of [
        ['lastmod', entry.lastmod],
        ['changefreq', entry.changefreq],
        ['priority', entry.priority],
      ] as const)
        if (value !== null) fields.append(el('dt', name), el('dd', value));
      card.append(fields);
      if (issueOrdinals.has(entry.ordinal))
        card.append(
          el('p', '此條目有靜態診斷，請查看上方問題；欄位無錯誤不代表完整支援或已收錄。', 'help'),
        );
      const at = location(entry.pointer, entry.ordinal);
      // List listeners follow list lifetime instead of retaining every prior filter result.
      const jump = el(
        'button',
        `${entry.pointer} · 第 ${at?.line ?? 1} 行`,
        'text-button sitemap-source',
      );
      jump.addEventListener(
        'click',
        () => {
          input.focus();
          input.setSelectionRange(at?.start ?? 0, at?.end ?? 0);
        },
        { signal: listing.signal },
      );
      card.append(jump);
      host.append(card);
    }
    pagination(
      get('entry-pages'),
      entryPage,
      matches.length,
      50,
      (page) => {
        entryPage = page;
        renderEntries();
      },
      listing.signal,
    );
  }
  function renderTree() {
    const roots = new Map<string, TreeNode>();
    for (const group of inspection?.report?.pathGroups ?? []) {
      let node = roots.get(group.origin);
      if (!node) {
        node = {
          label: group.origin,
          origin: group.origin,
          prefix: '/',
          children: new Map(),
          count: 0,
        };
        roots.set(group.origin, node);
      }
      node.count += group.entryOrdinals.length;
      const parts = group.pathname.slice(1).split('/');
      const segments =
        parts.length > 12 ? [...parts.slice(0, 11), parts.slice(11).join('/')] : parts;
      let prefix = '';
      for (const segment of segments) {
        prefix += `/${segment}`;
        let child: TreeNode | undefined = node.children.get(segment);
        if (!child) {
          child = {
            label: segment ? `/${segment}` : '/',
            origin: group.origin,
            prefix,
            children: new Map(),
            count: 0,
          };
          node.children.set(segment, child);
        }
        child.count += group.entryOrdinals.length;
        node = child;
      }
    }
    const host = get('tree');
    if (!roots.size) host.append(el('p', '沒有可分組的合法 URL。原始條目仍在右側清單。', 'help'));
    function branch(parent: HTMLElement, nodes: TreeNode[]) {
      const list = el('ul', '', 'sitemap-branches');
      parent.append(list);
      let offset = 0;
      const more = el('button', '顯示更多節點', 'text-button');
      function batch() {
        more.remove();
        for (const node of nodes.slice(offset, offset + 60)) {
          const item = el('li'),
            choose = el('button', `${node.label} · ${node.count}`, 'sitemap-node');
          choose.title = `${node.origin}${node.prefix}`;
          choose.addEventListener(
            'click',
            () => {
              treeSelection = { origin: node.origin, prefix: node.prefix };
              entryPage = 0;
              renderEntries();
            },
            { signal: rendering.signal },
          );
          if (node.children.size) {
            const details = el('details'),
              summary = el('summary', `${node.label} · ${node.count}`),
              chooseAll = el('button', '篩選此分支', 'text-button');
            let loaded = false;
            chooseAll.addEventListener('click', () => choose.click(), { signal: rendering.signal });
            details.append(summary, chooseAll);
            details.addEventListener(
              'toggle',
              () => {
                if (details.open && !loaded) {
                  loaded = true;
                  branch(details, [...node.children.values()]);
                }
              },
              { signal: rendering.signal },
            );
            item.append(details);
          } else item.append(choose);
          list.append(item);
        }
        offset += 60;
        if (offset < nodes.length) parent.append(more);
      }
      more.addEventListener('click', batch, { signal: rendering.signal });
      batch();
    }
    branch(host, [...roots.values()]);
  }
  function render(data: SitemapXmlInspection) {
    const report = data.report;
    for (const issue of data.xmlIssues)
      if (issue.severity === 'error') xmlErrorOrdinals.add(issue.source.ordinal);
    for (const at of data.sources) {
      sourcePointers.set(at.pointer, at);
      if (at.ordinal !== null && !sourceOrdinals.has(at.ordinal))
        sourceOrdinals.set(at.ordinal, at);
    }
    issueOrdinals = new Set([
      ...(report?.diagnostics ?? []).map((issue) => issue.ordinal),
      ...data.xmlIssues.map((issue) => issue.source.ordinal),
    ]);
    get('outcome').textContent = !data.valid
      ? '發現錯誤，未通過靜態預檢。請依來源位置修正；不完整結果不可視為整份通過。'
      : !data.complete
        ? '已檢查支援的靜態欄位，但結果不完整或仍有未檢查項目。'
        : '支援範圍內的靜態檢查完成；不代表網站可連線或 Google 已收錄。';
    for (const [name, value] of [
      ['來源條目', report?.sourceEntryCount ?? '—'],
      ['已檢查條目', report?.checkedEntryCount ?? 0],
      ['未檢查子檔', report?.uncheckedChildCount ?? 0],
      ['原始 UTF-8 bytes', data.rawUtf8Bytes ?? '未量測'],
    ] as const) {
      const card = el('div', '', 'sitemap-count');
      card.append(el('strong', String(value)), el('span', name));
      get('counts').append(card);
    }
    renderDiagnostics(data);
    if (report?.entries.length) {
      get('browse').hidden = false;
      renderTree();
      renderEntries();
    }
    output.hidden = false;
    download.disabled = false;
    status.textContent = `靜態預檢完成。${report?.sourceEntryCount ?? 0} 個來源條目；${data.complete ? '支援範圍內完整。' : '有錯誤或未完整檢查項目。'}`;
  }
  input.addEventListener('input', invalidate, { signal: events.signal });
  for (const [name, text] of Object.entries(sitemapDemos))
    get(`demo-${name}`).addEventListener(
      'click',
      () => {
        invalidate();
        input.value = text;
        status.textContent = '合成範例已載入，請按預檢。';
      },
      { signal: events.signal },
    );
  get('clear').addEventListener(
    'click',
    () => {
      invalidate();
      input.value = '';
      status.textContent = '內容、報告與篩選已清除。';
      input.focus();
    },
    { signal: events.signal },
  );
  get('run').addEventListener(
    'click',
    () => {
      invalidate();
      const token = revision;
      status.textContent = '正在靜態預檢…';
      void import('./sitemap-xml')
        .then((module) => {
          if (token !== revision) return;
          inspection = module.inspectSitemapXml(input.value);
          render(inspection);
        })
        .catch(() => {
          if (token !== revision) return;
          error.textContent = '工具載入或預檢失敗，請重試；未回傳原始 XML。';
          error.hidden = false;
          status.textContent = '未產生報告。';
        });
    },
    { signal: events.signal },
  );
  for (const control of [search, filter])
    control.addEventListener(
      control === search ? 'input' : 'change',
      () => {
        entryPage = 0;
        renderEntries();
      },
      { signal: events.signal },
    );
  get('reset-tree').addEventListener(
    'click',
    () => {
      treeSelection = undefined;
      entryPage = 0;
      renderEntries();
    },
    { signal: events.signal },
  );
  download.addEventListener(
    'click',
    () => {
      if (!inspection) return;
      revoke();
      const data = {
        format: 'sid-tools/sitemap-static/v1',
        notice:
          'Static local XML inspection only. No URL or child sitemap was fetched. HTTP status and Google indexing were not checked. Extracted URLs may contain sensitive data.',
        ...inspection,
      };
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      urls.add(url);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'sitemap-static-report.json';
      link.click();
      status.textContent = '已下載靜態報告，含提取 URL 與來源位置；未檢查 HTTP／收錄。';
    },
    { signal: events.signal },
  );
  return () => {
    events.abort();
    invalidate();
    rendering.abort();
    listing.abort();
    input.value = '';
  };
}
