import html from './git-diff.html?raw';
import { selectionDemo, incompleteDemo } from './git-diff-demos';
import type {
  GitDiffReport,
  GitDiffExport,
  GitDiffDiagnosticCode,
  GitDiffHunk,
} from '@sid-tools/core/git-diff';
export { html };

const diagnosticText: Record<GitDiffDiagnosticCode, string> = {
  'size-limit': '超過 1,000,000 UTF-16 字碼單元；未解析部分檔案。',
  'line-limit': '超過 20,000 實體行；未解析部分檔案。',
  'line-length-limit': '單行超過 20,000 UTF-16 字碼單元；未解析部分檔案。',
  'unsupported-format': '不支援的 diff 格式或前言；只接受 git diff --git 子集。',
  'malformed-path': '路徑格式或 Git C 引號無效。',
  'path-mismatch': '標頭路徑不一致。',
  'unknown-header': '未知或不支援的標頭。',
  'invalid-metadata': 'Metadata 缺漏、不一致、重複或順序無效。',
  'binary-unsupported': '二進位資料不支援、不解碼；此結果不完整。',
  'invalid-hunk': 'Hunk 格式、內容或範圍無效。',
  'hunk-count-mismatch': 'Hunk 宣告與實際行數不一致，可能截斷。',
  'invalid-no-newline': 'No-newline marker 的位置不符合支援規則。',
  truncated: '輸入區塊截斷或缺少必要內容。',
  'overlapping-hunks': 'Hunk 範圍重疊或順序無效。',
};
const kinds = {
  added: '新增',
  deleted: '刪除',
  modified: '修改',
  renamed: '重新命名',
  unknown: '未知',
} as const;

export function mount(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const input = get<HTMLTextAreaElement>('patch'),
    output = get('output'),
    result = get('result'),
    status = get('status'),
    error = get('error');
  const preview = get('preview'),
    previewRun = get<HTMLButtonElement>('preview-run'),
    selectionError = get('selection-error');
  const jsonButton = get<HTMLButtonElement>('export'),
    textButton = get<HTMLButtonElement>('export-text');
  const events = new AbortController();
  let reviewEvents = new AbortController();
  let revision = 0,
    report: GitDiffReport | undefined,
    selectedExport: GitDiffExport | undefined;
  let engine: typeof import('@sid-tools/core/git-diff') | undefined;
  const fileIds = new Set<string>(),
    hunkIds = new Set<string>(),
    urls = new Set<string>();
  function el<K extends keyof HTMLElementTagNameMap>(tag: K, text: string, className = '') {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
  }
  function clearPreview() {
    selectedExport = undefined;
    preview.hidden = true;
    get('preview-patch').textContent = '';
    get('preview-json').textContent = '';
    get('preview-scope').textContent = '';
    jsonButton.disabled = true;
    textButton.disabled = true;
    selectionError.hidden = true;
    for (const url of urls) URL.revokeObjectURL(url);
    urls.clear();
  }
  function updateSelection() {
    clearPreview();
    previewRun.disabled = fileIds.size === 0;
    get('selection-status').textContent = fileIds.size
      ? `已選 ${fileIds.size} 個檔案、${hunkIds.size} 個 hunk。內容檔仍須選 hunk 才會帶出。`
      : '尚未選取任何檔案或 hunk。';
  }
  function invalidate() {
    reviewEvents.abort();
    reviewEvents = new AbortController();
    revision++;
    report = undefined;
    fileIds.clear();
    hunkIds.clear();
    result.replaceChildren();
    output.hidden = true;
    error.hidden = true;
    updateSelection();
    status.textContent = '輸入已更新，舊選取與預覽已清除，請重新檢視。';
  }
  function sourceButton(line: number) {
    const button = el('button', `原始 diff 第 ${line} 行`, 'text-button diff-source');
    button.addEventListener(
      'click',
      () => {
        const lines = input.value.split('\n');
        const start = lines.slice(0, line - 1).reduce((n, text) => n + text.length + 1, 0);
        input.focus();
        input.setSelectionRange(
          Math.min(start, input.value.length),
          Math.min(start + (lines[line - 1]?.length ?? 0), input.value.length),
        );
      },
      { signal: reviewEvents.signal },
    );
    return button;
  }
  function checkbox(text: string, disabled: boolean, change: (checked: boolean) => void) {
    const label = el('label', '', 'diff-select'),
      box = el('input', '');
    box.type = 'checkbox';
    box.disabled = disabled;
    box.addEventListener('change', () => change(box.checked), { signal: reviewEvents.signal });
    label.append(box, el('span', text));
    return { label, box };
  }
  function hunkBody(hunk: GitDiffHunk) {
    const wrap = el('div', '', 'diff-code-area'),
      scroll = el('div', '', 'diff-code-scroll');
    scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region');
    scroll.setAttribute(
      'aria-label',
      `Hunk 第 ${hunk.sourceLine} 行程式碼，含原始 diff 與舊新行號`,
    );
    const table = el('table', '', 'diff-code-table'),
      head = el('thead', ''),
      header = el('tr', '');
    for (const text of ['diff 行', '舊行', '新行', '內容（含原始前綴）']) {
      const th = el('th', text);
      th.scope = 'col';
      header.append(th);
    }
    head.append(header);
    const body = el('tbody', '');
    table.append(head, body);
    scroll.append(table);
    let index = 0;
    const controls = el('div', '', 'diff-code-pagination'),
      previous = el('button', '上一段', 'text-button'),
      next = el('button', '下一段', 'text-button'),
      page = el('span', '');
    page.setAttribute('aria-live', 'polite');
    function renderLines() {
      body.replaceChildren(
        ...hunk.lines.slice(index, index + 200).map((line) => {
          const tr = el('tr', '', `diff-line-${line.kind}`);
          for (const text of [
            String(line.sourceLine),
            line.oldLine === null ? '—' : String(line.oldLine),
            line.newLine === null ? '—' : String(line.newLine),
            line.text,
          ])
            tr.append(el('td', text));
          return tr;
        }),
      );
      previous.disabled = index === 0;
      next.disabled = index + 200 >= hunk.lines.length;
      page.textContent = `${index + 1}–${Math.min(index + 200, hunk.lines.length)} / ${hunk.lines.length} 行`;
    }
    previous.addEventListener(
      'click',
      () => {
        index -= 200;
        renderLines();
      },
      { signal: reviewEvents.signal },
    );
    next.addEventListener(
      'click',
      () => {
        index += 200;
        renderLines();
      },
      { signal: reviewEvents.signal },
    );
    controls.append(previous, page, next);
    wrap.append(scroll);
    if (hunk.lines.length > 200) wrap.append(controls);
    renderLines();
    return wrap;
  }
  function render(data: GitDiffReport) {
    const summary = data.summary;
    result.append(
      el(
        'p',
        summary.complete
          ? summary.files
            ? '已解析支援的變更；請由下方明確選取要匯出的內容。'
            : '沒有檔案變更。請貼上非空白的 Git diff。'
          : '輸入不完整：下方僅為已觀察統計，不代表全部變更。不完整檔案不可匯出；其餘完整檔案仍可逐一選取。',
        summary.complete ? 'diff-outcome' : 'result-notice',
      ),
    );
    const counts = el('div', '', 'diff-counts');
    for (const [title, count] of [
      ['已觀察檔案', summary.files],
      ['Hunks', summary.hunks],
      ['新增行', `+${summary.addedLines}`],
      ['刪除行', `−${summary.deletedLines}`],
    ] as const) {
      const card = el('div', '', 'diff-count');
      card.append(el('strong', String(count)), el('span', title));
      counts.append(card);
    }
    result.append(counts);
    if (data.diagnostics.length) {
      const diagnostics = el('details', '', 'diff-diagnostics');
      diagnostics.open = true;
      diagnostics.append(el('summary', `不完整診斷 · ${data.diagnostics.length}`));
      // Native disclosure keeps all static source-located diagnostics available without echoing input.
      for (const issue of data.diagnostics) {
        const row = el('div', '', 'diff-diagnostic');
        row.dataset.code = issue.code;
        row.append(sourceButton(issue.sourceLine), el('span', diagnosticText[issue.code]));
        diagnostics.append(row);
      }
      result.append(diagnostics);
    }
    const layout = el('div', '', 'diff-review-layout'),
      nav = el('aside', '', 'diff-file-nav'),
      files = el('div', '', 'diff-files');
    nav.setAttribute('aria-label', '檔案導覽');
    nav.append(el('h3', '檔案導覽'));
    for (const [fileIndex, file] of data.files.entries()) {
      const card = el('article', '', 'diff-file');
      card.dataset.fileId = file.id;
      const path =
        file.kind === 'renamed'
          ? `${JSON.stringify(file.oldPath)} → ${JSON.stringify(file.newPath)}`
          : (JSON.stringify(file.newPath ?? file.oldPath) ?? '（無法辨識路徑）');
      const heading = el('h3', path);
      heading.tabIndex = -1;
      const navigate = el('button', `${kinds[file.kind]} · ${path}`, 'diff-nav-button');
      navigate.addEventListener(
        'click',
        () => {
          heading.scrollIntoView({ block: 'start' });
          heading.focus({ preventScroll: true });
        },
        { signal: reviewEvents.signal },
      );
      nav.append(navigate);
      const head = el('div', '', 'diff-file-heading');
      head.append(
        el('span', `${kinds[file.kind]}${!file.complete ? ' · 不完整' : ''}`, 'diff-kind'),
        sourceButton(file.sourceLine),
      );
      const fileControl = checkbox('納入此檔案（不自動選取 hunk）', !file.complete, (checked) => {
        if (checked) fileIds.add(file.id);
        else {
          fileIds.delete(file.id);
          for (const hunk of file.hunks) hunkIds.delete(hunk.id);
        }
        for (const control of card.querySelectorAll<HTMLInputElement>('input[data-hunk-id]')) {
          control.disabled = !checked;
          if (!checked) control.checked = false;
        }
        updateSelection();
      });
      fileControl.box.dataset.fileId = file.id;
      card.append(
        head,
        heading,
        el(
          'p',
          `${file.hunks.length} 個 hunk · 已觀察 +${file.addedLines} / −${file.deletedLines} 行`,
          'help',
        ),
        fileControl.label,
      );
      if (!file.complete)
        card.append(
          el(
            'p',
            file.binary
              ? '二進位或不支援內容：僅檢視，不可納入匯出。'
              : '此檔案不完整：請修正原始輸入後再匯出。',
            'help',
          ),
        );
      if (!file.hunks.length && file.complete)
        card.append(
          el('p', '僅 metadata 變更：明確選取此檔案即可納入摘錄；原 mode 不會帶出。', 'help'),
        );
      for (const [hunkIndex, hunk] of file.hunks.entries()) {
        const block = el('section', '', 'diff-hunk');
        block.dataset.hunkId = hunk.id;
        const hunkControl = checkbox(
          `納入 hunk · diff 第 ${hunk.sourceLine} 行`,
          true,
          (checked) => {
            if (checked) hunkIds.add(hunk.id);
            else hunkIds.delete(hunk.id);
            updateSelection();
          },
        );
        hunkControl.box.dataset.hunkId = hunk.id;
        block.append(hunkControl.label, sourceButton(hunk.sourceLine));
        const details = el('details', '', 'diff-hunk-details');
        details.append(
          el(
            'summary',
            `展開 hunk · 舊 ${hunk.oldStart},${hunk.oldCount} → 新 ${hunk.newStart},${hunk.newCount} · +${hunk.addedLines} / −${hunk.deletedLines}${hunk.complete ? '' : ' · 不完整'}`,
          ),
        );
        let loaded = false;
        const loadBody = () => {
          if (!loaded && details.open) {
            details.append(hunkBody(hunk));
            loaded = true;
          }
        };
        details.addEventListener('toggle', loadBody, { signal: reviewEvents.signal });
        if (fileIndex === 0 && hunkIndex === 0) {
          details.open = true;
          loadBody();
        }
        block.append(details);
        card.append(block);
      }
      files.append(card);
    }
    layout.append(nav, files);
    result.append(layout);
    output.hidden = false;
  }
  input.addEventListener('input', invalidate, { signal: events.signal });
  for (const [id, sample] of [
    ['demo', selectionDemo],
    ['demo-invalid', incompleteDemo],
  ] as const)
    get(id).addEventListener(
      'click',
      () => {
        invalidate();
        input.value = sample;
        status.textContent = '合成示範已載入，請按檢視。';
      },
      { signal: events.signal },
    );
  get('clear').addEventListener(
    'click',
    () => {
      invalidate();
      input.value = '';
      status.textContent = '內容、選取與預覽已清除。';
      input.focus();
    },
    { signal: events.signal },
  );
  get('run').addEventListener(
    'click',
    () => {
      invalidate();
      const token = revision;
      status.textContent = '正在檢視…';
      void import('@sid-tools/core/git-diff')
        .then((module) => {
          if (token !== revision) return;
          engine = module;
          const parsed = module.parseGitDiff(input.value);
          report = parsed;
          render(parsed);
          status.textContent = `已觀察 ${parsed.summary.files} 個檔案、${parsed.summary.hunks} 個 hunk。${parsed.summary.complete ? '預設不選取。' : '輸入不完整。'}`;
        })
        .catch(() => {
          if (token !== revision) return;
          error.textContent = '檢視工具載入或解析失敗，請重試；未回傳原始輸入。';
          error.hidden = false;
          status.textContent = '未產生結果。';
        });
    },
    { signal: events.signal },
  );
  get('deselect').addEventListener(
    'click',
    () => {
      fileIds.clear();
      hunkIds.clear();
      for (const box of result.querySelectorAll<HTMLInputElement>('input[type=checkbox]')) {
        box.checked = false;
        if (box.dataset.hunkId) box.disabled = true;
      }
      updateSelection();
    },
    { signal: events.signal },
  );
  previewRun.addEventListener(
    'click',
    () => {
      clearPreview();
      if (!report || !engine) return;
      try {
        const selection = engine.exportGitDiffSelection(report, {
          fileIds: [...fileIds],
          hunkIds: [...hunkIds],
        });
        if (!selection.files.length) {
          selectionError.textContent =
            '尚無可匯出的內容。內容檔請明確選取檔案與至少一個 hunk；純 metadata 檔只需選檔案。';
          selectionError.hidden = false;
          return;
        }
        selectedExport = selection;
        get('preview-patch').textContent = selection.patch;
        get('preview-json').textContent = JSON.stringify(selection, null, 2);
        get('preview-scope').textContent =
          `${selection.summary.files} 個選取檔案、${selection.summary.hunks} 個 hunk，+${selection.summary.addedLines} / −${selection.summary.deletedLines} 行。${report.summary.complete ? '' : '原始輸入仍不完整；這裡只預覽選取的完整檔案。'}請檢查下方實際內容再下載。`;
        preview.hidden = false;
        jsonButton.disabled = false;
        textButton.disabled = false;
        status.textContent = '選取摘錄預覽已更新，請確認後下載。';
      } catch {
        selectionError.textContent = '選取無效或含不完整檔案，無法匯出。請重新檢視並選取完整內容。';
        selectionError.hidden = false;
      }
    },
    { signal: events.signal },
  );
  for (const [button, json] of [
    [jsonButton, true],
    [textButton, false],
  ] as const)
    button.addEventListener(
      'click',
      () => {
        if (!selectedExport) return;
        for (const previousUrl of urls) URL.revokeObjectURL(previousUrl);
        urls.clear();
        const content = json ? JSON.stringify(selectedExport, null, 2) : selectedExport.patch;
        const url = URL.createObjectURL(
          new Blob([content], { type: json ? 'application/json' : 'text/plain;charset=utf-8' }),
        );
        urls.add(url);
        const link = document.createElement('a');
        link.href = url;
        link.download = json ? 'git-review-selection.json' : 'git-review-extract.txt';
        link.click();
        status.textContent = '已下載明確選取的審查摘錄；不是完整或可直接套用的 patch。';
      },
      { signal: events.signal },
    );
  return () => {
    events.abort();
    invalidate();
    input.value = '';
    engine = undefined;
  };
}
