export function mountTools(root: HTMLElement) {
  const asText = (v: unknown): string => (typeof v === 'string' ? v : (JSON.stringify(v) ?? ''));
  function el<T extends HTMLElement>(id: string): T {
    const node = root.querySelector<T>(`#${id}`);
    if (!node) throw new Error(`Missing ${id}`);
    return node as T;
  }
  const tool = document.body.dataset.tool ?? '';
  let disposed = false;
  const value = (id: string) => el<HTMLInputElement | HTMLTextAreaElement>(id).value;
  const set = (id: string, v: string) => {
    el<HTMLInputElement | HTMLTextAreaElement>(id).value = v;
  };
  let worker: Worker | undefined,
    timer: ReturnType<typeof setTimeout> | undefined,
    exported = '';
  const run = el<HTMLButtonElement>('run');
  function invalidate() {
    worker?.terminate();
    worker = undefined;
    clearTimeout(timer);
    run.disabled = false;
    exported = '';
    el('output').hidden = true;
    el('result').replaceChildren();
    el('error').hidden = true;
    el('status').textContent = '輸入已更新，請重新執行。';
  }
  function error(message: string) {
    el('error').textContent = message;
    el('error').hidden = false;
    el('status').textContent = '請修正輸入後重試。';
  }
  function node(tag: string, text: string, parent: HTMLElement = el('result'), className = '') {
    const n = document.createElement(tag);
    n.textContent = text;
    n.className = className;
    parent.append(n);
    return n;
  }
  function table(headers: string[], rows: unknown[][], parent: HTMLElement = el('result')) {
    const wrap = node('div', '', parent, 'table-scroll'),
      t = node('table', '', wrap, 'result-table'),
      head = node('thead', '', t),
      h = node('tr', '', head);
    for (const header of headers) {
      const cell = node('th', header, h);
      cell.setAttribute('scope', 'col');
    }
    const body = node('tbody', '', t);
    for (const row of rows) {
      const tr = node('tr', '', body);
      for (const cell of row)
        node(
          'td',
          cell === null || cell === undefined
            ? '無法取得'
            : typeof cell === 'string'
              ? cell
              : JSON.stringify(cell, null, 2),
          tr,
        );
    }
  }
  type Row = Record<string, unknown>;
  function render(json: string) {
    const data = JSON.parse(json) as Record<string, unknown>;
    el('result').replaceChildren();
    if (tool === 'lighthouse') {
      for (const warning of data.warnings as string[])
        node('p', warning, el('result'), 'result-notice');
      node('h3', '測試條件');
      const conditions = data.conditions as { before: Row; after: Row };
      table(
        ['條件', '比較前', '比較後'],
        Object.keys(conditions.before).map((key) => [
          key,
          conditions.before[key],
          conditions.after[key],
        ]),
      );
      node('h3', '分類分數（0–100）');
      table(
        ['分類', '前', '後', '差值（後 − 前）'],
        (data.categories as Row[]).map((r) => [r.title, r.before, r.after, r.delta]),
      );
      node('h3', '核心指標');
      const auditRows = (rows: Row[]) =>
        rows.map((r) => {
          const a = r.before as Row,
            b = r.after as Row;
          return [
            r.title,
            a.numericValue === null
              ? (a.displayValue ?? (a.score === null ? '無法取得' : `分數 ${asText(a.score)}`))
              : `${asText(a.numericValue)} ${asText(a.numericUnit ?? '')}`,
            b.numericValue === null
              ? (b.displayValue ?? (b.score === null ? '無法取得' : `分數 ${asText(b.score)}`))
              : `${asText(b.numericValue)} ${asText(b.numericUnit ?? '')}`,
            r.delta,
            `${String(a.mode)} → ${String(b.mode)}`,
          ];
        });
      table(['指標', '前', '後', '原始數值差', '狀態'], auditRows(data.metrics as Row[]));
      const audits = data.audits as Row[],
        changed = audits.filter((r) => r.changed);
      const detail = node('details', '');
      node('summary', `稽核變化 ${changed.length} / ${audits.length} 項（點開查看）`, detail);
      table(['稽核', '前', '後', '原始數值差', '狀態'], auditRows(changed), detail);
    } else if (tool === 'json-diff') {
      node('p', String(data.summary), el('result'), 'result-summary');
      const ignored = data.ignoredPaths as string[],
        rules = data.ignoreRules as string[],
        conflicts = data.conflicts as string[];
      node('h3', `忽略預覽：${ignored.length} 個實際路徑`);
      node(
        'p',
        rules.length
          ? `規則：${rules.join('、')}\n實際忽略：${ignored.join('、') || '無匹配'}`
          : '未設定忽略規則。',
        el('result'),
        'result-detail',
      );
      for (const c of conflicts) node('p', c, el('result'), 'result-notice');
      const names: Record<string, string> = {
        added: '新增',
        removed: '刪除',
        type: '型別變更',
        value: '值變更',
      };
      table(
        ['路徑', '類型', '前', '後'],
        (data.changes as Row[]).map((r) => [
          r.path || '/',
          names[String(r.type)],
          Object.hasOwn(r, 'before') ? (r.before === null ? 'null' : r.before) : '（不存在）',
          Object.hasOwn(r, 'after') ? (r.after === null ? 'null' : r.after) : '（不存在）',
        ]),
      );
    } else {
      node('p', String(data.rules), el('result'), 'result-notice');
      node('p', `從 ${String(data.start)} 之後的 10 次執行；同一列為同一時刻。`);
      node('p', (data.describe as string[]).join('\n'), el('result'), 'result-detail');
      table(
        [String(data.zone), String(data.displayZone), 'UTC'],
        (data.times as Row[]).map((r) => [r.schedule, r.local, r.utc]),
      );
      exported = [
        `Cron: ${String(data.expression)}`,
        `排程時區: ${String(data.zone)}`,
        `對照時區: ${String(data.displayZone)}`,
        `起算 UTC: ${String(data.start)}`,
        String(data.rules),
        ...(data.describe as string[]),
        '',
        ...(data.times as Row[]).map(
          (r) => `${String(r.utc)} | ${String(r.schedule)} | ${String(r.local)}`,
        ),
      ].join('\n');
    }
    el('output').hidden = false;
    el('status').textContent = '處理完成，結果僅保留於目前頁面。';
  }
  for (const input of root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'input:not([type=file]),textarea',
  ))
    input.addEventListener('input', invalidate);
  for (const side of ['before', 'after']) {
    const fileInput = root.querySelector(`#${side}-file`) as HTMLInputElement | null;
    fileInput?.addEventListener('change', () => {
      invalidate();
      const file = fileInput.files?.[0];
      set(side, '');
      el(`${side}-name`).textContent = '';
      if (!file) return;
      if (file.size > (tool === 'lighthouse' ? 10_000_000 : 2_000_000)) {
        error('檔案超出大小限制。');
        fileInput.value = '';
        return;
      }
      void file
        .text()
        .then((text) => {
          if (disposed || fileInput.files?.[0] !== file || value(side)) return;
          invalidate();
          set(side, text);
          el(`${side}-name`).textContent = file.name;
        })
        .catch(() => {
          if (!disposed && fileInput.files?.[0] === file) error('無法讀取檔案。');
        });
    });
  }
  run.addEventListener('click', () => {
    invalidate();
    run.disabled = true;
    el('status').textContent = '在本機處理中…';
    const args =
      tool === 'cron'
        ? ['expression', 'zone', 'display-zone', 'start-time'].map(value)
        : [
            value('before'),
            value('after'),
            ...(tool === 'json-diff' ? [value('ignore'), value('array-key').trim()] : []),
          ];
    worker = new Worker(new URL('./tools.worker.ts', import.meta.url), { type: 'module' });
    const done = () => {
      worker?.terminate();
      worker = undefined;
      clearTimeout(timer);
      run.disabled = false;
    };
    worker.onmessage = (
      event: MessageEvent<{ ok: boolean; json?: string; view?: string; error?: string }>,
    ) => {
      done();
      if (!event.data.ok || !event.data.json) {
        error(event.data.error ?? '處理失敗。');
        return;
      }
      exported = event.data.json;
      render(event.data.view ?? exported);
    };
    worker.onerror = () => {
      done();
      error('背景處理失敗，請重新載入頁面。');
    };
    timer = setTimeout(() => {
      done();
      error('處理超過 20 秒，已停止；請縮小輸入或調整排程。');
    }, 20_000);
    worker.postMessage({ tool, args });
  });
  el('clear').addEventListener('click', () => {
    invalidate();
    for (const input of root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input,textarea',
    ))
      input.value = '';
    for (const side of ['before', 'after']) {
      const n = root.querySelector(`#${side}-name`);
      if (n) n.textContent = '';
    }
    el('status').textContent = '資料已清除。';
  });
  el('export').addEventListener('click', () => {
    if (!exported) return;
    const url = URL.createObjectURL(
      new Blob([exported], {
        type: tool === 'cron' ? 'text/plain;charset=utf-8' : 'application/json',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `sid-tools-${tool}.${tool === 'cron' ? 'txt' : 'json'}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  root.querySelector('#copy')?.addEventListener('click', () => {
    if (!exported) return;
    void navigator.clipboard
      .writeText(exported)
      .then(() => {
        if (!disposed) el('status').textContent = '已複製排程與時區。';
      })
      .catch(() => {
        if (!disposed) el('status').textContent = '瀏覽器不允許複製，請使用下載排程 TXT。';
      });
  });
  el('demo').addEventListener('click', () => {
    invalidate();
    if (tool === 'cron') {
      set('expression', '30 2 * * *');
      set('zone', 'America/New_York');
      set('display-zone', 'Asia/Taipei');
      set('start-time', '2026-03-07T00:00:00Z');
    } else if (tool === 'json-diff') {
      set(
        'before',
        '{\n  "items": [{"id": 9007199254740993, "name": "初版", "updatedAt": "昨天"}],\n  "enabled": true\n}',
      );
      set(
        'after',
        '{\n  "enabled": "true",\n  "items": [{"id": 9007199254740993, "name": "新版", "updatedAt": "今天"}]\n}',
      );
      set('ignore', '/items/*/updatedAt');
      set('array-key', 'id');
    } else {
      const report = {
        lighthouseVersion: '12.6.1',
        requestedUrl: 'https://example.com/',
        finalUrl: 'https://example.com/',
        fetchTime: '2026-01-01T00:00:00Z',
        configSettings: {
          formFactor: 'mobile',
          throttlingMethod: 'simulate',
          throttling: { cpuSlowdownMultiplier: 4 },
          screenEmulation: { mobile: true },
        },
        categories: { performance: { title: 'Performance', score: 0.65 } },
        audits: {
          'largest-contentful-paint': {
            title: 'Largest Contentful Paint',
            score: 0.5,
            numericValue: 3200,
            numericUnit: 'millisecond',
            scoreDisplayMode: 'numeric',
          },
        },
      };
      set('before', JSON.stringify(report, null, 2));
      report.categories.performance.score = 0.8;
      report.audits['largest-contentful-paint'].numericValue = 2400;
      set('after', JSON.stringify(report, null, 2));
    }
    el('status').textContent = '已載入人造示範，按執行查看結果。';
  });
  if (tool === 'cron') {
    set('start-time', new Date().toISOString());
    set('display-zone', Intl.DateTimeFormat().resolvedOptions().timeZone);
  }
  return () => {
    disposed = true;
    invalidate();
    for (const input of root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input,textarea',
    ))
      input.value = '';
  };
}
