import html from './semver.html?raw';
import type { SemverComparison } from '@sid-tools/core/semver';
export { html };

export function mount(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const versions = get<HTMLTextAreaElement>('versions'),
    a = get<HTMLInputElement>('range-a'),
    b = get<HTMLInputElement>('range-b');
  const output = get('output'),
    result = get('result'),
    error = get('error'),
    status = get('status');
  const events = new AbortController();
  let revision = 0,
    comparison: SemverComparison | undefined,
    downloadUrl: string | undefined;
  function invalidate() {
    revision++;
    comparison = undefined;
    output.hidden = true;
    result.replaceChildren();
    error.hidden = true;
    status.textContent = '輸入已更新，請重新比較。';
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    downloadUrl = undefined;
  }
  function element<K extends keyof HTMLElementTagNameMap>(tag: K, text: string, className = '') {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
  }
  function render(data: SemverComparison) {
    const counts = element('div', '', 'semver-counts');
    for (const [title, count, kind] of [
      ['新增匹配', data.added.length, 'added'],
      ['移除匹配', data.removed.length, 'removed'],
      ['維持不變', data.rows.length - data.added.length - data.removed.length, 'unchanged'],
    ] as const) {
      const card = element('div', '', `semver-count ${kind}`);
      card.append(element('strong', String(count)), element('span', title));
      counts.append(card);
    }
    result.append(counts);
    const normalization = element('div', '', 'semver-normalized');
    normalization.append(
      element('p', `A → ${data.ranges.normalizedBefore}`),
      element('p', `B → ${data.ranges.normalizedAfter}`),
    );
    result.append(normalization, element('h3', '逐筆匹配與變更理由'));
    const list = element('div', '', 'semver-rows');
    const labels = { added: '新增匹配', removed: '移除匹配', unchanged: '維持不變' };
    for (const row of data.rows) {
      const card = element('article', '', `semver-row ${row.change}`);
      const heading = element('div', '', 'semver-row-heading');
      heading.append(
        element('code', row.version),
        element('span', labels[row.change], 'semver-change'),
      );
      const reasons = element('div', '', 'semver-reasons');
      for (const [name, decision] of [
        ['A', row.before],
        ['B', row.after],
      ] as const) {
        const reason = element('div', '', decision.matches ? 'semver-match' : 'semver-no-match');
        reason.append(
          element('strong', `${name} · ${decision.matches ? '匹配' : '不匹配'}`),
          element('p', decision.reason),
        );
        reasons.append(reason);
      }
      card.append(heading, reasons);
      list.append(card);
    }
    result.append(list);
    output.hidden = false;
  }
  root.addEventListener('input', invalidate, { signal: events.signal });
  get('demo').addEventListener(
    'click',
    () => {
      invalidate();
      versions.value =
        '0.0.3\n0.2.3\n0.2.9\n0.3.0-alpha.1\n0.3.0-beta.1\n0.3.0-beta.2\n0.3.0\n0.3.5\n0.4.0-beta.1\n1.0.0';
      a.value = '^0.2.3';
      b.value = '^0.3.0-beta.1';
      status.textContent = '示範已載入：觀察 0.x 邊界與 prerelease 的去留。';
    },
    { signal: events.signal },
  );
  get('clear').addEventListener(
    'click',
    () => {
      invalidate();
      versions.value = '';
      a.value = '';
      b.value = '';
      status.textContent = '資料已清除。';
      versions.focus();
    },
    { signal: events.signal },
  );
  get('run').addEventListener(
    'click',
    () => {
      invalidate();
      const token = revision;
      const input = [versions.value, a.value, b.value] as const;
      status.textContent = '正在比較…';
      void import('@sid-tools/core/semver')
        .then(({ compareSemver }) => {
          if (token !== revision) return;
          const data = compareSemver(...input);
          comparison = data;
          render(data);
          status.textContent = `已比較 ${data.rows.length} 筆：新增 ${data.added.length}、移除 ${data.removed.length}。`;
        })
        .catch((cause: unknown) => {
          if (token !== revision) return;
          error.textContent = cause instanceof Error ? cause.message : '比較失敗，請重試。';
          error.hidden = false;
          status.textContent = '未產生結果，請修正輸入。';
        });
    },
    { signal: events.signal },
  );
  get('export').addEventListener(
    'click',
    () => {
      if (!comparison) return;
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      downloadUrl = URL.createObjectURL(
        new Blob([JSON.stringify(comparison, null, 2)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'semver-comparison.json';
      link.click();
      status.textContent = '已下載比較 JSON，包含輸入、規則與原因。';
    },
    { signal: events.signal },
  );
  return () => {
    events.abort();
    invalidate();
    versions.value = '';
    a.value = '';
    b.value = '';
  };
}
