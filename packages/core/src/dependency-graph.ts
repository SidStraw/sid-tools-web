import { parseAllDocuments, LineCounter } from 'yaml';

export const GRAPH_LIMITS = { bytes: 8_000_000, nodes: 12_000, edges: 60_000, workspaces: 300 };
export type DependencyNode = {
  id: string;
  kind: 'workspace' | 'package';
  name: string;
  version: string;
  peers: string;
};
export type DependencyEdge = {
  from: string;
  to: string | null;
  name: string;
  kind: string;
  source: string;
  manifest: string | null;
};
export type DependencyGraph = {
  format: 'sid-tools-dependencies-v1';
  engine: 'pnpm-lock-9';
  paths: 'redacted' | 'relative';
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  diagnostics: string[];
};
export type ManifestInput = { path: string; value: unknown };
function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
const groups = ['dependencies', 'devDependencies', 'optionalDependencies'] as const;
const packageName = /^(?:@[a-zA-Z0-9_.-]+\/)?[a-zA-Z0-9_.-]+$/;
const packageKey =
  /^((?:@[a-zA-Z0-9_.-]+\/)?[a-zA-Z0-9_.-]+)@(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?)([a-zA-Z0-9_@./()+-]*)$/;
function validPeers(value: string) {
  let remaining = value;
  const group =
    /\((?:@[a-zA-Z0-9_.-]+\/)?[a-zA-Z0-9_.-]+@\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?(?:\+[a-zA-Z0-9.-]+)?\)/g;
  for (let i = 0; i < 32 && remaining; i++) {
    const next = remaining.replace(group, '');
    if (next === remaining) return false;
    remaining = next;
  }
  return !remaining;
}
export function safeWorkspacePath(path: string) {
  return (
    path === '.' ||
    (path.length < 500 &&
      !path.startsWith('/') &&
      !path.includes('\\') &&
      !path.includes(':') &&
      !path.split('/').some((part) => !part || part === '..' || part === '.') &&
      !path.split('').some((char) => char.charCodeAt(0) < 32))
  );
}
function readLock(text: string) {
  if (new TextEncoder().encode(text).length > GRAPH_LIMITS.bytes)
    throw new Error('Lockfile 超過 8 MB。');
  const lines = new LineCounter();
  const docs = parseAllDocuments(text, { lineCounter: lines, uniqueKeys: true });
  if (!docs.length || docs.length > 2)
    throw new Error('只支援一或兩份 YAML 文件的 pnpm lockfile 9.0。');
  const values = docs.map((doc) => {
    if (doc.errors.length || doc.warnings.length)
      throw new Error('Lockfile YAML 無效或含不支援標籤。');
    try {
      return object(doc.toJS({ maxAliasCount: 0 }));
    } catch {
      throw new Error('Lockfile 不支援 YAML alias。');
    }
  });
  for (const value of values)
    if (value.lockfileVersion !== '9.0') throw new Error('只支援 pnpm lockfileVersion 9.0。');
  if (values.length === 2) {
    const boot = object(object(values[0]?.importers)['.']);
    if (
      !('packageManagerDependencies' in boot || 'configDependencies' in boot) ||
      groups.some((g) => g in boot)
    )
      throw new Error('第一份 YAML 必須為 pnpm boot/env lockfile。');
  }
  const doc = docs.at(-1)!;
  const value = values.at(-1)!;
  if (
    ['importers', 'snapshots', 'packages'].some(
      (key) => !value[key] || typeof value[key] !== 'object' || Array.isArray(value[key]),
    )
  )
    throw new Error('Lockfile 缺少 importers、packages 或 snapshots。');
  const importers = object(value.importers);
  if (!Object.keys(importers).length || Object.keys(importers).length > GRAPH_LIMITS.workspaces)
    throw new Error('Workspace 數量須為 1–300。');
  if (Object.keys(importers).some((path) => !safeWorkspacePath(path)))
    throw new Error('Workspace 路徑不安全。');
  function source(path: string[]) {
    const node = doc.getIn(path, true) as { range?: [number, number, number] } | undefined;
    return `pnpm-lock.yaml:document-${docs.length}:line-${lines.linePos(node?.range?.[0] ?? 0).line}`;
  }
  return { value, importers, source };
}
export function lockfileWorkspaces(text: string): string[] {
  return Object.keys(readLock(text).importers).sort();
}
export function buildDependencyGraph(
  text: string,
  manifests: ManifestInput[],
  includePaths = false,
): DependencyGraph {
  const { value, importers, source } = readLock(text);
  const report: DependencyGraph = {
    format: 'sid-tools-dependencies-v1',
    engine: 'pnpm-lock-9',
    paths: includePaths ? 'relative' : 'redacted',
    nodes: [],
    edges: [],
    diagnostics: [],
  };
  const snapshots = object(value.snapshots),
    packages = object(value.packages);
  const workspaceIds = new Map<string, string>();
  const snapshotIds = new Map<string, string>();
  const warn = (message: string) => {
    if (report.diagnostics.length < 200) report.diagnostics.push(message);
  };
  for (const [index, path] of Object.keys(importers).sort().entries()) {
    const id = `w${index}`;
    workspaceIds.set(path, id);
    report.nodes.push({
      id,
      kind: 'workspace',
      name: includePaths ? path : `workspace-${index}`,
      version: '',
      peers: '',
    });
  }
  for (const key of Object.keys(snapshots).sort()) {
    if (report.nodes.length >= GRAPH_LIMITS.nodes) throw new Error('圖超過 12,000 節點。');
    const parts = packageKey.exec(key);
    if (!parts || key.length > 1500 || !validPeers(parts[3] ?? '')) {
      warn(`${source(['snapshots', key])}：不支援的套件識別（已隱藏值）。`);
      continue;
    }
    const [, name = '', version = '', peers = ''] = parts;
    if (!Object.hasOwn(packages, `${name}@${version}`))
      warn(`${source(['snapshots', key])}：缺少 package metadata。`);
    const id = `p${snapshotIds.size}`;
    snapshotIds.set(key, id);
    report.nodes.push({ id, kind: 'package', name, version, peers });
  }
  function target(name: string, ref: unknown, ownerPath?: string): string | null {
    if (typeof ref !== 'string') return null;
    if (ownerPath !== undefined && ref.startsWith('link:')) {
      const parts = ownerPath === '.' ? [] : ownerPath.split('/');
      for (const part of ref.slice(5).split('/')) {
        if (part === '.' || part === '') continue;
        if (part === '..') {
          if (!parts.length) return null;
          parts.pop();
        } else parts.push(part);
      }
      return workspaceIds.get(parts.join('/') || '.') ?? null;
    }
    return snapshotIds.get(`${name}@${ref}`) ?? snapshotIds.get(ref) ?? null;
  }
  function add(
    from: string,
    name: string,
    ref: unknown,
    kind: string,
    origin: string,
    manifest: string | null,
    ownerPath?: string,
  ) {
    if (report.edges.length >= GRAPH_LIMITS.edges) throw new Error('圖超過 60,000 條邊。');
    const to = target(name, ref, ownerPath);
    report.edges.push({
      from,
      to,
      name: packageName.test(name) ? name : '(unsupported name)',
      kind,
      source: origin,
      manifest,
    });
    if (!to) warn(`${origin}：無法解析依賴；已隱藏原始來源值。`);
  }
  for (const [key, from] of snapshotIds) {
    const snapshot = snapshots[key];
    if (snapshot !== object(snapshot))
      warn(`${source(['snapshots', key])}：snapshot 結構無效，依賴不完整。`);
    for (const group of ['dependencies', 'optionalDependencies']) {
      const field = object(snapshot)[group];
      if (field !== undefined && field !== object(field))
        warn(`${source(['snapshots', key, group])}：依賴清單結構無效。`);
      const deps = object(field);
      for (const [name, ref] of Object.entries(deps))
        add(from, name, ref, group, source(['snapshots', key, group, name]), null);
    }
  }
  for (const [path, from] of workspaceIds) {
    const manifest = manifests.find((item) => item.path === path);
    if (!manifest) warn(`${from}：缺少 manifest，未檢查宣告同步。`);
    const importer = object(importers[path]);
    for (const group of groups) {
      const locked = object(importer[group]);
      const declared = object(object(manifest?.value)[group]);
      for (const [name, entry] of Object.entries(locked)) {
        const origin = source(['importers', path, group, name]);
        const edgeManifest =
          manifest && packageName.test(name)
            ? `${includePaths ? path : from}/package.json#/${group}/${name.replaceAll('~', '~0').replaceAll('/', '~1')}`
            : null;
        add(from, name, object(entry).version, group, origin, edgeManifest, path);
        if (manifest && declared[name] !== object(entry).specifier)
          warn(`${origin}：manifest 宣告與 lockfile 不一致，結果可能過期。`);
      }
      for (const name of Object.keys(declared))
        if (!Object.hasOwn(locked, name)) warn(`${from}/package.json：有未鎖定的 ${group} 宣告。`);
    }
  }
  for (const manifest of manifests)
    if (!workspaceIds.has(manifest.path))
      warn('Workspace 設定找到 lockfile 未收錄的 manifest；請更新 lockfile。');
  if (report.diagnostics.length === 200)
    report.diagnostics.push('診斷已達上限，可能仍有其他不完整資料。');
  return report;
}
export function dependencyVariants(graph: DependencyGraph) {
  const groups = new Map<string, DependencyNode[]>();
  for (const node of graph.nodes)
    if (node.kind === 'package') {
      const list = groups.get(node.name) ?? [];
      list.push(node);
      groups.set(node.name, list);
    }
  return [...groups]
    .filter(([, nodes]) => nodes.length > 1)
    .map(([name, nodes]) => ({ name, versions: [...new Set(nodes.map((n) => n.version))], nodes }));
}
/** One shortest evidence path per workspace; cycles are traversed at most once. */
export function dependencyPaths(graph: DependencyGraph, targetId: string) {
  const incoming = new Map<string, DependencyEdge[]>();
  for (const edge of graph.edges)
    if (edge.to) {
      const list = incoming.get(edge.to) ?? [];
      list.push(edge);
      incoming.set(edge.to, list);
    }
  const toward = new Map<string, DependencyEdge>(),
    seen = new Set([targetId]),
    queue = [targetId];
  for (let i = 0; i < queue.length; i++)
    for (const edge of incoming.get(queue[i]!) ?? []) {
      if (seen.has(edge.from)) continue;
      seen.add(edge.from);
      toward.set(edge.from, edge);
      queue.push(edge.from);
    }
  return graph.nodes
    .filter((n) => n.kind === 'workspace' && seen.has(n.id))
    .map((workspace) => {
      const edges: DependencyEdge[] = [];
      let id = workspace.id;
      while (id !== targetId) {
        const edge = toward.get(id)!;
        edges.push(edge);
        id = edge.to!;
      }
      return { workspace, edges };
    });
}
export function parseDependencyReport(text: string): DependencyGraph {
  if (new TextEncoder().encode(text).length > GRAPH_LIMITS.bytes)
    throw new Error('報告超過 8 MB。');
  const raw = object(JSON.parse(text));
  if (
    raw.format !== 'sid-tools-dependencies-v1' ||
    raw.engine !== 'pnpm-lock-9' ||
    !['redacted', 'relative'].includes(String(raw.paths))
  )
    throw new Error('不支援的報告格式。');
  if (
    !Array.isArray(raw.nodes) ||
    raw.nodes.length > GRAPH_LIMITS.nodes ||
    !Array.isArray(raw.edges) ||
    raw.edges.length > GRAPH_LIMITS.edges ||
    !Array.isArray(raw.diagnostics) ||
    raw.diagnostics.length > 203
  )
    throw new Error('報告結構或數量無效。');
  const string = (value: unknown): value is string =>
    typeof value === 'string' && value.length <= 2000;
  const ids = new Set<string>();
  for (const value of raw.nodes) {
    const n = object(value);
    if (
      !string(n.id) ||
      ids.has(String(n.id)) ||
      !['workspace', 'package'].includes(String(n.kind)) ||
      !string(n.name) ||
      !string(n.version) ||
      !string(n.peers)
    )
      throw new Error('節點資料無效。');
    ids.add(String(n.id));
  }
  for (const value of raw.edges) {
    const e = object(value);
    if (
      !string(e.from) ||
      !ids.has(e.from) ||
      (e.to !== null && (!string(e.to) || !ids.has(e.to))) ||
      !string(e.name) ||
      !string(e.kind) ||
      !string(e.source) ||
      (e.manifest !== null && !string(e.manifest))
    )
      throw new Error('邊或來源資料無效。');
  }
  if (!raw.diagnostics.every(string)) throw new Error('診斷資料無效。');
  return raw as unknown as DependencyGraph;
}
