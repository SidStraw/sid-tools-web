#!/usr/bin/env node
import { readFile, realpath, stat, glob } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { parseDocument } from 'yaml';
import {
  buildDependencyGraph,
  lockfileWorkspaces,
  safeWorkspacePath,
  type ManifestInput,
} from '@sid-tools/core/dependency-graph';

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    process.stdout.write(
      'Usage: dependency-graph [repo] [--include-workspace-paths]\nRead-only pnpm 9.0 graph JSON to stdout. Default: workspace paths replaced with IDs. Package names and dependency relationships remain visible; review before sharing. No scripts, network, or source files are loaded.\n',
    );
    return;
  }
  const paths = args.filter((a) => a !== '--include-workspace-paths');
  if (paths.length > 1 || paths.some((a) => a.startsWith('-')))
    throw new Error('參數無效，請使用 --help。');
  const root = await realpath(resolve(paths[0] ?? '.'));
  async function read(path: string, limit: number) {
    const file = await realpath(resolve(root, path));
    const rel = relative(root, file);
    if (rel.startsWith(`..${sep}`) || rel === '..' || rel.startsWith(sep))
      throw new Error('拒絕讀取 repo 外的檔案。');
    const info = await stat(file);
    if (!info.isFile() || info.size > limit) throw new Error('輸入不是一般檔案或超過大小限制。');
    return readFile(file, 'utf8');
  }
  const lock = await read('pnpm-lock.yaml', 8_000_000);
  const pathsInLock = lockfileWorkspaces(lock);
  const workspaceDoc = parseDocument(await read('pnpm-workspace.yaml', 1_000_000));
  if (workspaceDoc.errors.length || workspaceDoc.warnings.length)
    throw new Error('Workspace YAML 無效。');
  const config = workspaceDoc.toJS({ maxAliasCount: 0 }) as { packages?: unknown };
  if (
    !Array.isArray(config?.packages) ||
    !config.packages.every((p: unknown) => typeof p === 'string')
  )
    throw new Error('Workspace 缺少 packages glob 清單。');
  const patterns = config.packages as string[];
  if (
    patterns.some(
      (p) =>
        p.replace(/^!/, '').startsWith('/') ||
        p.includes('..') ||
        p.includes('\\') ||
        p.includes(':'),
    )
  )
    throw new Error('Workspace glob 不可超出 repo。');
  const actual = new Set(['.']);
  for await (const match of glob(
    patterns.filter((p) => !p.startsWith('!')).map((p) => `${p}/package.json`),
    {
      cwd: root,
      exclude: [
        '**/node_modules/**',
        '**/.git/**',
        ...patterns.filter((p) => p.startsWith('!')).map((p) => `${p.slice(1)}/**`),
      ],
    },
  )) {
    const path = match.replaceAll(sep, '/').replace(/\/package.json$/, '');
    if (!safeWorkspacePath(path)) throw new Error('Workspace 路徑不安全。');
    actual.add(path);
    if (actual.size > 300) throw new Error('Workspace 超過 300 個。');
  }
  const manifests: ManifestInput[] = [];
  const missing: string[] = [];
  for (const path of new Set([...pathsInLock, ...actual])) {
    try {
      manifests.push({
        path,
        value: JSON.parse(await read(`${path}/package.json`, 1_000_000)) as unknown,
      });
    } catch {
      missing.push(path);
    }
  }
  const graph = buildDependencyGraph(lock, manifests, args.includes('--include-workspace-paths'));
  if (missing.length)
    graph.diagnostics.push(
      `${missing.length} 個 manifest 不存在、格式無效、超過限制或位於 repo 外；未讀取其內容。`,
    );
  if (pathsInLock.some((p) => !actual.has(p)))
    graph.diagnostics.push('Lockfile 有 workspace 設定未選取的 importer，可能已過期。');
  const output = `${JSON.stringify(graph, null, 2)}\n`;
  if (Buffer.byteLength(output) > 8_000_000) throw new Error('報告超過瀏覽器 8 MB 上限。');
  process.stdout.write(output);
}
void main().catch(() => {
  process.stderr.write(
    '無法產生依賴圖：檢查 repo 內的 pnpm lockfile 9.0、workspace 設定、檔案限制與 --help。未輸出原始內容或路徑。\n',
  );
  process.exitCode = 1;
});
