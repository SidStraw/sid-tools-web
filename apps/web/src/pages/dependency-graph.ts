import html from './dependency-graph.html?raw';
import {
  dependencyPaths,
  dependencyVariants,
  type DependencyGraph,
} from '@sid-tools/core/dependency-graph';
export { html };
export function mount(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const file = get<HTMLInputElement>('report-file'),
    query = get<HTMLInputElement>('query'),
    select = get<HTMLSelectElement>('node');
  const events = new AbortController();
  let graph: DependencyGraph | undefined,
    worker: Worker | undefined,
    revision = 0;
  function node(tag: string, text: string) {
    const el = document.createElement(tag);
    el.textContent = text;
    return el;
  }
  function paged<T>(container: HTMLElement, items: T[], renderItem: (item: T) => HTMLElement) {
    let offset = 0;
    const more = document.createElement('button');
    more.className = 'button secondary';
    function next() {
      more.remove();
      for (const item of items.slice(offset, offset + 100)) container.append(renderItem(item));
      offset += 100;
      if (offset < items.length) {
        more.textContent = `顯示更多（還有 ${items.length - offset} 筆）`;
        container.append(more);
      }
    }
    more.onclick = next;
    next();
  }
  function clear() {
    revision++;
    worker?.terminate();
    worker = undefined;
    graph = undefined;
    file.value = '';
    query.value = '';
    for (const id of ['detail', 'variants', 'diagnostics', 'node']) get(id).replaceChildren();
    get('output').hidden = true;
    get('error').hidden = true;
    get('status').textContent = '資料已清除。';
  }
  function detail() {
    const output = get('detail');
    output.replaceChildren();
    if (!graph) return;
    const data = graph,
      selected = data.nodes.find((n) => n.id === select.value);
    if (!selected) return;
    const names = new Map(
      data.nodes.map((n) => [n.id, `${n.name}${n.version ? `@${n.version}${n.peers}` : ''}`]),
    );
    output.append(node('h3', names.get(selected.id)!));
    const paths = dependencyPaths(data, selected.id);
    output.append(node('h4', `引入的 workspace（${paths.length}）`));
    if (!paths.length)
      output.append(node('p', '沒有可解析的 workspace 路徑；可能是孤立 snapshot 或資料不完整。'));
    for (const path of paths) {
      const article = document.createElement('details');
      article.append(
        node(
          'summary',
          `${path.workspace.name} · ${path.edges.length <= 1 ? '直接／本身' : '間接'} · ${path.edges.length} 步`,
        ),
      );
      let loaded = false;
      article.ontoggle = () => {
        if (!article.open || loaded) return;
        loaded = true;
        const list = node('ol', '');
        article.append(list);
        paged(list, path.edges, (edge) =>
          node(
            'li',
            `${names.get(edge.from)} → ${names.get(edge.to!)} · ${edge.kind} · ${edge.source}${edge.manifest ? ` · ${edge.manifest}` : ''}`,
          ),
        );
      };
      output.append(article);
    }
    const edges = data.edges.filter((e) => e.from === selected.id);
    output.append(node('h4', `直接依賴（${edges.length}）`));
    const list = node('ul', '');
    paged(list, edges, (edge) =>
      node(
        'li',
        `${edge.name} → ${edge.to ? names.get(edge.to) : '未解析'} · ${edge.kind} · ${edge.source}${edge.manifest ? ` · ${edge.manifest}` : ''}`,
      ),
    );
    output.append(list);
  }
  function options() {
    select.replaceChildren();
    if (!graph) return;
    for (const n of graph.nodes
      .filter((n) =>
        `${n.name}@${n.version}${n.peers}`.toLowerCase().includes(query.value.toLowerCase()),
      )
      .slice(0, 200)) {
      const option = document.createElement('option');
      option.value = n.id;
      option.textContent = `${n.name}${n.version ? `@${n.version}${n.peers}` : ''}`;
      select.append(option);
    }
    detail();
  }
  function render(data: DependencyGraph) {
    graph = data;
    get('output').hidden = false;
    get('summary').textContent =
      `${data.nodes.length} 節點 · ${data.edges.length} 條邊 · 路徑${data.paths === 'redacted' ? '已隱藏' : '包含相對路徑'}`;
    get('diagnostics').replaceChildren(...data.diagnostics.map((d) => node('p', d)));
    const variants = dependencyVariants(data);
    get('variants').replaceChildren(
      ...variants.map((v) =>
        node(
          'p',
          `${v.name} · ${v.versions.length > 1 ? `多版本 ${v.versions.join(', ')}` : `單一版本 ${v.versions[0]}`} · ${v.nodes.length} 個解析 context：${v.nodes.map((n) => `${n.version}${n.peers}`).join(' / ')}`,
        ),
      ),
    );
    if (!variants.length) get('variants').append(node('p', '報告中沒有同名多個解析 context。'));
    options();
    get('status').textContent = `已載入報告；${data.diagnostics.length} 則診斷。`;
  }
  file.addEventListener(
    'change',
    () => {
      const selected = file.files?.[0];
      clear();
      if (!selected) return;
      if (selected.size > 8_000_000) {
        get('error').hidden = false;
        get('error').textContent = '檔案超過 8 MB。';
        return;
      }
      const token = revision;
      get('status').textContent = '正在載入報告…';
      void selected
        .text()
        .then((text) => {
          if (token !== revision) return;
          worker = new Worker(new URL('./dependency-graph.worker.ts', import.meta.url), {
            type: 'module',
          });
          const fail = () => {
            if (token !== revision) return;
            worker?.terminate();
            worker = undefined;
            get('error').hidden = false;
            get('error').textContent = '報告格式無效、不支援或超過限制。';
            get('status').textContent = '未載入報告。';
          };
          worker.onerror = fail;
          worker.onmessage = (event: MessageEvent<{ ok: boolean; graph: DependencyGraph }>) => {
            if (token !== revision) return;
            if (event.data.ok) {
              render(event.data.graph);
              worker?.terminate();
              worker = undefined;
            } else fail();
          };
          worker.postMessage(text);
        })
        .catch(() => {
          if (token === revision) {
            get('error').hidden = false;
            get('error').textContent = '無法讀取檔案。';
          }
        });
    },
    { signal: events.signal },
  );
  get('demo').addEventListener(
    'click',
    () => {
      clear();
      render({
        format: 'sid-tools-dependencies-v1',
        engine: 'pnpm-lock-9',
        paths: 'redacted',
        nodes: [
          { id: 'w0', kind: 'workspace', name: 'workspace-0', version: '', peers: '' },
          { id: 'p0', kind: 'package', name: 'parser', version: '1.0.0', peers: '(host@2.0.0)' },
          { id: 'p1', kind: 'package', name: 'parser', version: '1.0.0', peers: '(host@3.0.0)' },
          { id: 'p2', kind: 'package', name: 'utility', version: '1.0.0', peers: '' },
          { id: 'p3', kind: 'package', name: 'utility', version: '2.0.0', peers: '' },
        ],
        edges: [
          {
            from: 'w0',
            to: 'p0',
            name: 'parser',
            kind: 'dependencies',
            source: 'pnpm-lock.yaml:document-1:line-6',
            manifest: 'w0/package.json#/dependencies/parser',
          },
          {
            from: 'w0',
            to: 'p1',
            name: 'parser-next',
            kind: 'devDependencies',
            source: 'pnpm-lock.yaml:document-1:line-9',
            manifest: 'w0/package.json#/devDependencies/parser-next',
          },
          {
            from: 'p0',
            to: 'p2',
            name: 'utility',
            kind: 'dependencies',
            source: 'pnpm-lock.yaml:document-1:line-20',
            manifest: null,
          },
          {
            from: 'p1',
            to: 'p3',
            name: 'utility',
            kind: 'dependencies',
            source: 'pnpm-lock.yaml:document-1:line-24',
            manifest: null,
          },
        ],
        diagnostics: ['此為合成教學樣本；真實專案請載入 CLI 報告。'],
      });
    },
    { signal: events.signal },
  );
  get('clear').addEventListener('click', clear, { signal: events.signal });
  query.addEventListener('input', options, { signal: events.signal });
  select.addEventListener('change', detail, { signal: events.signal });
  return () => {
    events.abort();
    clear();
  };
}
