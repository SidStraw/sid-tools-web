import html from './selectors.html?raw';
import { selectorDemos } from './selectors-demos';
import type {
  SelectorListAnalysis,
  SelectorContribution,
  SelectorSpan,
  Specificity,
} from '@sid-tools/core/selectors';
import type { StructureReport, MatchingReport, StructureRow, MatchState } from './selectors-html';
export { html };
const tuple = (value: Specificity | null) => (value ? `(${value.join(', ')})` : '未知 · 不排名');
const states: Record<MatchState, string> = {
  matched: '靜態命中',
  empty: '有效 · 空命中',
  invalid: '無效 selector',
  'parser-unsupported': 'parser 不支援 · 不排名',
  'not-evaluated': '動態狀態 · 未評估',
  'not-matchable': 'pseudo-element／namespace · 不比對',
  'browser-unsupported': 'Browser SyntaxError · 不支援此匹配',
  'native-error': '原生比對失敗 · 非空命中',
  'budget-not-evaluated': '超過整輪時間預算 · 未評估',
};
const contributionLabels: Record<SelectorContribution['rule'], string> = {
  id: 'ID + A',
  class: 'Class + B',
  attribute: 'Attribute + B',
  type: 'Type + C',
  'pseudo-class': 'Pseudo-class + B',
  'pseudo-element': 'Pseudo-element + C',
  maximum: '參數 lexicographic max（不表示該分支命中）',
  where: ':where 歸零（子項保留說明）',
  nth: 'nth pseudo-class 1 + of-list max',
  branch: '參數分支',
};
export function mount(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const htmlInput = get<HTMLTextAreaElement>('html-source'),
    cssInput = get<HTMLTextAreaElement>('css-source'),
    events = new AbortController();
  let rendering = new AbortController(),
    detailsEvents = new AbortController(),
    treeEvents = new AbortController();
  let revision = 0,
    structure: StructureReport | undefined,
    analysis: SelectorListAnalysis | undefined,
    matches: MatchingReport | undefined,
    selected = 0,
    treePage = 0,
    copyText = '';
  const output = get('output'),
    status = get('status'),
    error = get('error');
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') => {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
  };
  function invalidate() {
    revision++;
    rendering.abort();
    rendering = new AbortController();
    detailsEvents.abort();
    detailsEvents = new AbortController();
    treeEvents.abort();
    treeEvents = new AbortController();
    structure = undefined;
    analysis = undefined;
    matches = undefined;
    copyText = '';
    selected = 0;
    treePage = 0;
    output.hidden = true;
    error.hidden = true;
    get('copy-fallback').hidden = true;
    get<HTMLTextAreaElement>('copy-text').value = '';
    get<HTMLSelectElement>('tree-filter').value = 'all';
    for (const id of [
      'selector-cards',
      'diagnostics',
      'structure-list',
      'tree-pages',
      'selector-detail',
      'contributions',
      'node-detail',
      'selection-status',
      'summary',
      'copy-status',
    ])
      get(id).replaceChildren();
    status.textContent = '輸入已更新，舊 inert document／來源／命中已丟棄，請重新比對。';
  }
  function sourceButton(kind: 'html' | 'css', range: SelectorSpan | null, signal: AbortSignal) {
    const button = el(
      'button',
      range
        ? `回到 ${kind.toUpperCase()} ${range.start}–${range.end}`
        : 'implied／unlocated · 無原始範圍',
      'text-button selectors-source',
    );
    button.disabled = !range;
    button.addEventListener(
      'click',
      () => {
        if (!range) return;
        const input = kind === 'html' ? htmlInput : cssInput;
        input.focus();
        input.setSelectionRange(range.start, range.end);
      },
      { signal },
    );
    return button;
  }
  function showNode(row: StructureRow) {
    const host = get('node-detail');
    host.replaceChildren(
      el('h3', `${row.id} · ${row.kind === 'text' ? '文字節點' : '保留元素'}`),
      el('pre', row.label, 'selectors-node-label'),
      sourceButton('html', row.span, treeEvents.signal),
    );
    const match = matches?.perElement.get(row.id);
    host.append(
      el(
        'p',
        match
          ? `已命中：${match.branches.map((index) => `S${index + 1}`).join(', ')}。最高已命中 tuple ${tuple(match.highest)}，不是 cascade winner。`
          : '沒有已評估的 selector 命中這一列；不含未評估／省略的原始 DOM。',
        'help',
      ),
    );
  }
  function renderTree() {
    if (!structure || !matches) return;
    treeEvents.abort();
    treeEvents = new AbortController();
    get('node-detail').replaceChildren();
    const hit = new Set(matches.branches[selected]?.ids ?? []),
      filtered = get<HTMLSelectElement>('tree-filter').value === 'matched',
      rows = structure.rows.filter((row) => !filtered || hit.has(row.id));
    treePage = Math.min(treePage, Math.max(0, Math.ceil(rows.length / 100) - 1));
    const host = get('structure-list');
    host.replaceChildren();
    for (const row of rows.slice(treePage * 100, (treePage + 1) * 100)) {
      const record = matches.perElement.get(row.id),
        button = el('button', '', 'selectors-row');
      button.dataset.sourceNode = row.id;
      button.dataset.hit = String(hit.has(row.id));
      button.style.setProperty('--row-indent', `${Math.min(row.depth, 12) * 10}px`);
      button.append(
        el('span', hit.has(row.id) ? '● 命中' : '○', 'selectors-hit'),
        el('code', row.label),
        el(
          'small',
          `${row.id}${row.placeholder ? ' · placeholder' : ''}${row.implied ? ' · implied' : ''}${record ? ` · ${record.branches.map((i) => `S${i + 1}`).join('/')}` : ''}`,
        ),
      );
      button.addEventListener('click', () => showNode(row), { signal: treeEvents.signal });
      host.append(button);
    }
    if (!rows.length) host.append(el('p', '目前篩選沒有已評估的命中 row。', 'help'));
    const pages = get('tree-pages');
    pages.replaceChildren();
    if (rows.length > 100) {
      const previous = el('button', '上一頁', 'text-button'),
        next = el('button', '下一頁', 'text-button');
      previous.disabled = treePage === 0;
      next.disabled = (treePage + 1) * 100 >= rows.length;
      previous.addEventListener(
        'click',
        () => {
          treePage--;
          renderTree();
        },
        { signal: treeEvents.signal },
      );
      next.addEventListener(
        'click',
        () => {
          treePage++;
          renderTree();
        },
        { signal: treeEvents.signal },
      );
      pages.append(
        previous,
        el('span', `${treePage + 1}/${Math.ceil(rows.length / 100)} 頁 · ${rows.length} rows`),
        next,
      );
    }
  }
  function selectBranch(index: number) {
    selected = index;
    treePage = 0;
    detailsEvents.abort();
    detailsEvents = new AbortController();
    const branch = matches?.branches[index];
    if (!branch) {
      get('selector-detail').replaceChildren(
        el('p', '沒有可拆解的 top-level selector；請修正整份 selector list。', 'help'),
      );
      return;
    }
    for (const button of get('selector-cards').querySelectorAll<HTMLButtonElement>('button'))
      button.setAttribute('aria-pressed', String(button.dataset.branch === String(index)));
    get('selection-status').textContent = `選取 S${index + 1} · ${states[branch.state]}`;
    const host = get('selector-detail');
    host.replaceChildren(
      el('h3', `S${index + 1} · ${tuple(branch.analysis.specificity)}`),
      el('pre', branch.analysis.text, 'selectors-node-label'),
      sourceButton('css', branch.analysis.span, detailsEvents.signal),
      el(
        'p',
        `${states[branch.state]}${branch.state === 'matched' ? ` · ${branch.ids.length} elements` : ''}`,
        'result-notice',
      ),
    );
    if (branch.analysis.reason)
      host.append(el('p', `core reason: ${branch.analysis.reason}`, 'help'));
    for (const warning of branch.warnings) host.append(el('p', warning, 'selectors-warning'));
    if (branch.analysis.dynamicPseudos.length)
      host.append(
        el(
          'p',
          `動態 metadata：${branch.analysis.dynamicPseudos.join(', ')}；不模擬狀態。`,
          'help',
        ),
      );
    const flat: { item: SelectorContribution; depth: number }[] = [],
      stack = branch.analysis.contributions
        .slice()
        .reverse()
        .map((item) => ({ item, depth: 0 }));
    while (stack.length) {
      const current = stack.pop()!;
      flat.push(current);
      for (const item of current.item.children.slice().reverse())
        stack.push({ item, depth: current.depth + 1 });
    }
    const contributions = get('contributions');
    contributions.replaceChildren(el('h3', '貢獻來源 · 不重複加總巢狀 max'));
    let page = 0,
      pageEvents = new AbortController();
    detailsEvents.signal.addEventListener('abort', () => pageEvents.abort(), { once: true });
    const rows = el('div'),
      pages = el('div', '', 'selectors-pages');
    contributions.append(rows, pages);
    const render = () => {
      pageEvents.abort();
      pageEvents = new AbortController();
      rows.replaceChildren();
      pages.replaceChildren();
      for (const { item, depth } of flat.slice(page * 50, (page + 1) * 50)) {
        const row = el('div', '', 'selectors-contribution');
        row.style.setProperty('--row-indent', `${Math.min(depth, 10) * 10}px`);
        row.append(
          el('strong', `${tuple(item.specificity)} · ${contributionLabels[item.rule]}`),
          el('code', cssInput.value.slice(item.span.start, item.span.end)),
          sourceButton('css', item.span, pageEvents.signal),
        );
        rows.append(row);
      }
      if (!flat.length) rows.append(el('p', '未知／無效項目沒有可確認的貢獻樹。', 'help'));
      if (flat.length > 50) {
        const next = el(
          'button',
          page === Math.ceil(flat.length / 50) - 1 ? '回第一頁' : '下一批貢獻',
          'text-button',
        );
        next.addEventListener(
          'click',
          () => {
            page = (page + 1) % Math.ceil(flat.length / 50);
            render();
          },
          { signal: pageEvents.signal },
        );
        pages.append(el('span', `${page + 1}/${Math.ceil(flat.length / 50)} 頁`), next);
      }
    };
    render();
    renderTree();
  }
  function renderDiagnostics() {
    const host = get('diagnostics');
    host.replaceChildren();
    if (!structure?.notices.length) {
      host.append(
        el(
          'p',
          '沒有偵測到 adapter 省略／tokenizer error；樹修復可能沒有通知，仍適用 fragment 與初始狀態假設。',
          'help',
        ),
      );
      return;
    }
    const notices = structure.notices;
    let page = 0,
      pageEvents = new AbortController();
    rendering.signal.addEventListener('abort', () => pageEvents.abort(), { once: true });
    const list = el('div'),
      pages = el('div', '', 'selectors-pages');
    host.append(list, pages);
    const render = () => {
      pageEvents.abort();
      pageEvents = new AbortController();
      list.replaceChildren();
      pages.replaceChildren();
      for (const notice of notices.slice(page * 50, (page + 1) * 50)) {
        const row = el('div', '', 'selectors-diagnostic');
        row.dataset.code = notice.code;
        row.append(
          el('code', notice.code),
          el('p', notice.message),
          sourceButton('html', notice.span, pageEvents.signal),
        );
        list.append(row);
      }
      if (notices.length > 50) {
        const prev = el('button', '上一頁', 'text-button'),
          next = el('button', '下一頁', 'text-button');
        prev.disabled = page === 0;
        next.disabled = (page + 1) * 50 >= notices.length;
        prev.addEventListener(
          'click',
          () => {
            page--;
            render();
          },
          { signal: pageEvents.signal },
        );
        next.addEventListener(
          'click',
          () => {
            page++;
            render();
          },
          { signal: pageEvents.signal },
        );
        pages.append(
          prev,
          el(
            'span',
            `${page + 1}/${Math.ceil(notices.length / 50)} 頁 · ${notices.length} notices`,
          ),
          next,
        );
      }
    };
    render();
  }
  function render(compare: (a: Specificity, b: Specificity) => number) {
    if (!structure || !analysis || !matches) return;
    const known = matches.branches
      .filter((branch) => branch.analysis.specificity !== null)
      .map((branch) => branch.analysis.specificity!)
      .sort((a, b) => compare(b, a));
    get('summary').textContent =
      `${structure.elementCount} 個解析元素 ／ ${structure.rows.filter((row) => row.kind === 'element').length} 個保留元素 ／ ${matches.perElement.size} 個已命中元素 ／ ${structure.notices.length} 項 tokenizer 錯誤或省略通知。${structure.notices.length ? '部分結果，不保證原始 DOM 精確命中。' : '僅對此 body fragment／初始狀態成立；樹修復可能沒有通知。'} ${matches.slow ? '慢速比對：有單次 >200ms 或整輪預算超限；未評估不等於空命中。' : ''}`;
    if (analysis.status !== 'ok')
      get('summary').append(
        el(
          'span',
          ` Selector list ${analysis.status}: ${analysis.reason ?? 'unknown'}；未知項目不排名。`,
        ),
      );
    const cards = get('selector-cards');
    for (const [index, branch] of matches.branches.entries()) {
      const button = el('button', '', 'selectors-card');
      button.dataset.branch = String(index);
      button.dataset.state = branch.state;
      const rank = branch.analysis.specificity
        ? 1 + known.filter((value) => compare(value, branch.analysis.specificity!) > 0).length
        : null;
      button.append(
        el('span', `S${index + 1} · ${rank ? `已知權重排名 ${rank}` : '未知 · 不排名'}`),
        el('strong', tuple(branch.analysis.specificity)),
        el('code', branch.analysis.text),
        el(
          'small',
          `${states[branch.state]}${branch.state === 'matched' ? ` · ${branch.ids.length}` : ''}${branch.warnings.length ? ' · partial' : ''}`,
        ),
      );
      button.addEventListener('click', () => selectBranch(index), { signal: rendering.signal });
      cards.append(button);
    }
    renderDiagnostics();
    output.hidden = false;
    selectBranch(0);
    renderTree();
    const lines = [
      'Sid Tools / selector static inspection',
      'Text-only isolated body fragment, not rendered HTML or full cascade. Initial form states only. Names/attributes may be sensitive.',
      get('summary').textContent ?? '',
    ];
    for (const [index, branch] of matches.branches.entries()) {
      lines.push(
        `S${index + 1} ${branch.analysis.text}`,
        `specificity ${tuple(branch.analysis.specificity)} / ${states[branch.state]} / matches ${branch.ids.join(', ') || 'none or not evaluated'}`,
        ...branch.warnings,
      );
      const stack = [...branch.analysis.contributions].reverse();
      while (stack.length) {
        const item = stack.pop()!;
        lines.push(
          `${item.rule} ${tuple(item.specificity)} @${item.span.start}-${item.span.end}: ${cssInput.value.slice(item.span.start, item.span.end)}`,
        );
        stack.push(...item.children.slice().reverse());
      }
    }
    for (const row of structure.rows)
      lines.push(
        `${row.id} ${row.label}${row.placeholder ? ' [placeholder]' : ''}${row.implied ? ' [implied/unlocated]' : ''}${
          matches.perElement.has(row.id)
            ? ` [matched ${matches.perElement
                .get(row.id)!
                .branches.map((i) => `S${i + 1}`)
                .join(
                  ',',
                )}, highest ${tuple(matches.perElement.get(row.id)!.highest)}; not cascade winner]`
            : ''
        }`,
      );
    for (const notice of structure.notices)
      lines.push(
        `${notice.code}: ${notice.message} ${notice.span ? `@${notice.span.start}-${notice.span.end}` : '[unlocated]'}`,
      );
    copyText = lines.join('\n');
    status.textContent = '比對完成；選 selector 看貢獻與文字結構命中，沒有渲染輸入 HTML。';
  }
  for (const input of [htmlInput, cssInput])
    input.addEventListener('input', invalidate, { signal: events.signal });
  for (const [id, demo] of [
    ['demo', selectorDemos.logical],
    ['demo-partial', selectorDemos.partial],
    ['demo-repair', selectorDemos.repair],
  ] as const)
    get(id).addEventListener(
      'click',
      () => {
        invalidate();
        htmlInput.value = demo.html;
        cssInput.value = demo.selectors;
        status.textContent = '人工合成案例已載入，請按拆解並比對。';
      },
      { signal: events.signal },
    );
  get('run').addEventListener(
    'click',
    () => {
      invalidate();
      const token = revision;
      status.textContent = '正在離線解析與建立 inert 副本…';
      void Promise.all([import('@sid-tools/core/selectors'), import('./selectors-html')])
        .then(([core, adapter]) => {
          if (token !== revision) return;
          analysis = core.analyzeSelectors(cssInput.value);
          if (analysis.status === 'limit')
            throw new Error('Selector 超過 aggregate 限制；整份拒絕，沒有部分排名或命中。');
          structure = adapter.buildSelectorStructure(htmlInput.value);
          matches = adapter.matchSelectorBranches(structure, analysis);
          render(adapter.compareSpecificity);
        })
        .catch((issue) => {
          if (token !== revision) return;
          structure = undefined;
          analysis = undefined;
          matches = undefined;
          output.hidden = true;
          error.textContent =
            issue instanceof Error && /^(HTML|Selector|無法建立)/.test(issue.message)
              ? issue.message
              : '無法完成離線解析或比對；沒有可用的部分結果。';
          error.hidden = false;
          status.textContent = '未完成比對，請檢查限制與輸入。';
        });
    },
    { signal: events.signal },
  );
  get('tree-filter').addEventListener(
    'change',
    () => {
      treePage = 0;
      renderTree();
    },
    { signal: events.signal },
  );
  get('copy').addEventListener(
    'click',
    () => {
      if (!copyText) return;
      const token = revision,
        text = copyText;
      void (async () => {
        try {
          if (!navigator.clipboard?.writeText) throw new Error('Unavailable');
          await navigator.clipboard.writeText(text);
          if (token === revision)
            get('copy-status').textContent =
              '已複製純文字結果；內容可能敏感，不代表原始網頁或完整 cascade。';
        } catch {
          if (token !== revision) return;
          get('copy-fallback').hidden = false;
          const fallback = get<HTMLTextAreaElement>('copy-text');
          fallback.value = text;
          fallback.focus();
          fallback.select();
          get('copy-status').textContent =
            '自動複製不可用，已提供 readonly 純文字欄位；可手動複製。';
        }
      })();
    },
    { signal: events.signal },
  );
  get('clear').addEventListener(
    'click',
    () => {
      invalidate();
      htmlInput.value = '';
      cssInput.value = '';
      status.textContent = 'HTML、selectors、inert document 與結果已清除。';
      htmlInput.focus();
    },
    { signal: events.signal },
  );
  return () => {
    events.abort();
    invalidate();
    rendering.abort();
    detailsEvents.abort();
    treeEvents.abort();
    htmlInput.value = '';
    cssInput.value = '';
  };
}
