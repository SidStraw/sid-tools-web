import html from './env-check.html?raw';
import type { EnvComparison, EnvDiagnosticCode, EnvDiagnostic } from '@sid-tools/core/env-check';
export { html };

const messages: Record<EnvDiagnosticCode, string> = {
  'size-limit': '超過每份 200,000 個 UTF-16 字碼單元限制；此份未解析。',
  'line-limit': '超過每份 5,000 個實體行限制；此份未解析。',
  'line-length-limit': '超過每行 10,000 個 UTF-16 字碼單元限制；此份未解析。',
  'invalid-assignment': '無法辨識指定式；請使用合法鍵名與 KEY=value。',
  'invalid-control': '含有不支援的控制字元；請使用 LF／CRLF 換行。',
  'unterminated-quote': '引號或 PEM／PGP／OpenSSH 區塊未結束；後續行都視為此值的一部分。',
  'trailing-content': '結束引號後只接受空白、tab 或 # 註解。',
  'unsupported-syntax':
    '不支援的語法或跳脫；多行 PEM／PGP／OpenSSH 必須加引號，請依下方 dotenv 子集規則修正。',
  'unsupported-interpolation': '不支援變數插值、命令替換或反引號；未執行或展開。',
  duplicate: '同份檔案的鍵重複出現；不猜測哪一筆優先。',
  empty: '鍵存在，但值為空字串；這不是缺漏。',
  missing: '範本有此鍵，但待檢查檔缺漏；位置指向範本。',
  extra: '待檢查檔有此鍵，範本未宣告。',
};
const labels: Record<EnvDiagnosticCode, string> = {
  'size-limit': '大小超限',
  'line-limit': '行數超限',
  'line-length-limit': '單行超限',
  'invalid-assignment': '格式錯誤',
  'invalid-control': '控制字元',
  'unterminated-quote': '未結束區塊／引號',
  'trailing-content': '引號後有內容',
  'unsupported-syntax': '不支援語法',
  'unsupported-interpolation': '不支援插值',
  duplicate: '重複鍵',
  empty: '空字串',
  missing: '缺漏鍵',
  extra: '多餘鍵',
};
const sampleTemplate =
  '# 合成示範，不是真實憑證\nAPP_NAME=demo\nAPI_URL="https://example.invalid/api?a=b#fragment"\nAPI_TOKEN=replace-me\nNOTES="first line\nsecond line"';
const demos = {
  demo: {
    title: '正常',
    candidate: sampleTemplate.replace('APP_NAME=demo', 'APP_NAME=production-demo'),
  },
  'demo-missing': {
    title: '缺漏與空值',
    candidate:
      '# 缺少 API_TOKEN；API_URL 存在但為空\nAPP_NAME=demo\nAPI_URL=""\nNOTES="ready"\nEXTRA_FLAG=yes',
  },
  'demo-duplicate': { title: '重複鍵', candidate: sampleTemplate + '\nAPP_NAME=another-demo' },
  'demo-malformed': {
    title: '格式錯誤',
    candidate:
      'APP_NAME=demo\nAPI_URL=${HOST}/api\nAPI_TOKEN="demo" trailing\nNOTES="not closed\nstill part of NOTES',
  },
} as const;

export function mount(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const template = get<HTMLTextAreaElement>('template'),
    candidate = get<HTMLTextAreaElement>('candidate');
  const output = get('output'),
    result = get('result'),
    status = get('status'),
    error = get('error'),
    reveal = get<HTMLButtonElement>('reveal');
  const events = new AbortController();
  let revision = 0,
    report: EnvComparison | undefined,
    downloadUrl: string | undefined;
  function mask(visible: boolean) {
    for (const input of [template, candidate]) input.classList.toggle('env-masked', !visible);
    reveal.setAttribute('aria-pressed', String(visible));
    reveal.textContent = visible ? '隱藏輸入明文' : '顯示輸入明文';
    get('mask-help').textContent = visible
      ? '目前顯示明文；請留意周圍與螢幕分享。按「隱藏輸入明文」可恢復遮蔽；報告列出鍵名，分享前請檢查。'
      : '輸入已遮蔽（含鍵名、值與註解），仍可直接貼上或編輯。遮蔽只是視覺保護，不是加密；明文暫存在本頁記憶體。';
  }
  function invalidate() {
    revision++;
    report = undefined;
    output.hidden = true;
    result.replaceChildren();
    error.hidden = true;
    status.textContent = '輸入已更新，請重新檢查。';
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = undefined;
  }
  function el<K extends keyof HTMLElementTagNameMap>(tag: K, text: string, className = '') {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
  }
  function lines(values: number[]) {
    return values.length
      ? values.slice(0, 10).join('、') +
          (values.length > 10 ? `（另 ${values.length - 10} 處，完整位置見下載）` : '')
      : '無';
  }
  function locationButton(issue: EnvDiagnostic) {
    const source = issue.code === 'missing' ? 'template' : issue.source;
    const label = source === 'template' ? '範本' : '待檢查檔';
    const button = el(
      'button',
      `${label} 第 ${issue.line}${issue.endLine !== issue.line ? `–${issue.endLine}` : ''} 行`,
      'text-button env-location',
    );
    button.addEventListener(
      'click',
      () => {
        const input = source === 'template' ? template : candidate;
        const text = input.value.split('\n');
        const start = text
          .slice(0, issue.line - 1)
          .reduce((length, line) => length + line.length + 1, 0);
        const end =
          text.slice(0, issue.endLine).reduce((length, line) => length + line.length + 1, 0) - 1;
        input.focus();
        input.setSelectionRange(
          Math.min(start, input.value.length),
          Math.min(end, input.value.length),
        );
      },
      { signal: events.signal },
    );
    return button;
  }
  function paginated<T>(items: T[], heading: string, render: (item: T) => HTMLElement) {
    const section = el('section', '', 'env-findings');
    section.setAttribute('aria-label', heading);
    section.append(el('h3', `${heading} · ${items.length}`));
    const rows = el('div', '', 'env-rows'),
      controls = el('div', '', 'env-pagination');
    const previous = el('button', '上一頁', 'text-button'),
      next = el('button', '下一頁', 'text-button'),
      page = el('span', '');
    previous.type = 'button';
    next.type = 'button';
    page.setAttribute('aria-live', 'polite');
    let index = 0;
    function update() {
      rows.replaceChildren(...items.slice(index, index + 100).map(render));
      page.textContent = `${index + 1}–${Math.min(index + 100, items.length)} / ${items.length} 筆`;
      previous.disabled = index === 0;
      next.disabled = index + 100 >= items.length;
    }
    previous.addEventListener(
      'click',
      () => {
        index -= 100;
        update();
      },
      { signal: events.signal },
    );
    next.addEventListener(
      'click',
      () => {
        index += 100;
        update();
      },
      { signal: events.signal },
    );
    controls.append(previous, page, next);
    section.append(rows);
    if (items.length > 100) section.append(controls);
    update();
    return section;
  }
  function render(data: EnvComparison) {
    const s = data.summary;
    const total = s.missing + s.extra + s.duplicate + s.empty + s.errors;
    result.append(
      el(
        'p',
        !s.comparisonPerformed
          ? '超過限制：未進行缺漏／多餘比對。請縮小輸入後重試。'
          : !s.complete
            ? '暫定結果：有格式或不支援語法，請修正後重新檢查。'
            : !s.templateKeys
              ? '範本沒有可辨識的鍵：目前無法確認必要設定，請先加入專案範本。'
              : total
                ? '預檢完成：仍有以下項目需要確認。'
                : '未發現問題：兩份設定的鍵完整，且符合支援的語法。',
        !s.complete ? 'result-notice' : 'env-outcome',
      ),
    );
    const counts = el('div', '', 'env-counts');
    for (const [title, value] of [
      ['缺漏鍵', s.comparisonPerformed ? s.missing : '未比對'],
      ['多餘鍵', s.comparisonPerformed ? s.extra : '未比對'],
      ['重複鍵', s.duplicate],
      ['空字串', s.empty],
      ['語法／限制', s.errors],
    ] as const) {
      const card = el('div', '', 'env-count');
      card.append(el('strong', String(value)), el('span', title));
      counts.append(card);
    }
    result.append(counts);
    if (data.diagnostics.length)
      result.append(
        paginated(data.diagnostics, '問題與原始位置', (issue) => {
          const card = el('article', '', 'env-finding');
          card.dataset.code = issue.code;
          const heading = el('div', '', 'env-finding-heading');
          heading.append(
            el('span', labels[issue.code], 'env-issue-label'),
            el('code', issue.key ?? '（未辨識鍵名）'),
            locationButton(issue),
          );
          card.append(heading, el('p', messages[issue.code]));
          if (issue.relatedLines.length)
            card.append(
              el(
                'p',
                `${issue.code === 'missing' ? '範本出現行' : '首次出現行'}：${lines(issue.relatedLines)}`,
                'help',
              ),
            );
          return card;
        }),
      );
    const inventory = el('details', '', 'env-key-inventory');
    inventory.append(
      el(
        'summary',
        `鍵名清單 · 範本 ${s.templateKeys}／待檢查 ${s.candidateKeys}（只列已辨識鍵名）`,
      ),
    );
    inventory.append(
      paginated(data.keys, '鍵名與出現行號', (key) => {
        const row = el('div', '', 'env-key-row');
        row.append(
          el('code', key.key),
          el('span', `範本：${lines(key.templateLines)} ｜ 待檢查：${lines(key.candidateLines)}`),
        );
        return row;
      }),
    );
    result.append(inventory);
    output.hidden = false;
  }
  for (const input of [template, candidate])
    input.addEventListener('input', invalidate, { signal: events.signal });
  reveal.addEventListener('click', () => mask(reveal.getAttribute('aria-pressed') !== 'true'), {
    signal: events.signal,
  });
  for (const [id, demo] of Object.entries(demos))
    get(id).addEventListener(
      'click',
      () => {
        invalidate();
        mask(false);
        template.value = sampleTemplate;
        candidate.value = demo.candidate;
        status.textContent = `已載入「${demo.title}」合成範例，請按檢查。`;
      },
      { signal: events.signal },
    );
  get('clear').addEventListener(
    'click',
    () => {
      invalidate();
      template.value = '';
      candidate.value = '';
      mask(false);
      status.textContent = '內容已清除，輸入已恢復遮蔽。';
      template.focus();
    },
    { signal: events.signal },
  );
  get('run').addEventListener(
    'click',
    () => {
      invalidate();
      const token = revision;
      // Read input only after the engine arrives, so a cancelled load retains no input snapshot.
      status.textContent = '正在檢查…';
      void import('@sid-tools/core/env-check')
        .then(({ compareEnv }) => {
          if (token !== revision) return;
          const data = compareEnv(template.value, candidate.value);
          report = data;
          render(data);
          status.textContent = `已檢查：${data.diagnostics.length} 個問題。${data.summary.complete ? '' : '結果不完整，請先修正。'}`;
        })
        .catch(() => {
          if (token !== revision) return;
          error.textContent = '工具載入或檢查失敗，請重試。未輸出輸入內容。';
          error.hidden = false;
          status.textContent = '未產生結果。';
        });
    },
    { signal: events.signal },
  );
  get('export').addEventListener(
    'click',
    () => {
      if (!report) return;
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      const data = {
        format: 'sid-tools/env-check/v1',
        summary: report.summary,
        keys: report.keys,
        // Full occurrence lists live once in keys, avoiding quadratic JSON for repeated duplicates.
        diagnostics: report.diagnostics.map(({ source, code, key, line, endLine }) => ({
          source,
          code,
          key,
          line,
          endLine,
        })),
        supportRules: report.supportRules,
        limits: report.limits,
        diagnosticDescriptions: messages,
        locationRule:
          'Missing diagnostics have source=candidate but refer to template lines; all other locations refer to source.',
      };
      downloadUrl = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'env-check-report.json';
      link.click();
      status.textContent = '已下載鍵名報告；分享前請檢查鍵名是否含有秘密片段。';
    },
    { signal: events.signal },
  );
  return () => {
    events.abort();
    invalidate();
    template.value = '';
    candidate.value = '';
    mask(false);
  };
}
