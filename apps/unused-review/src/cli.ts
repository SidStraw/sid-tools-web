#!/usr/bin/env node
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, relative, dirname, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import {
  UNUSED_TYPES,
  UNUSED_WARNINGS,
  unusedId,
  parseUnusedReport,
  parseUnusedBaseline,
  createUnusedBaseline,
  reviewUnused,
  type UnusedReport,
  type UnusedSettings,
  type UnusedType,
} from '@sid-tools/core/unused-review';
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const inside = (root: string, file: string) => {
  const r = relative(root, file);
  return !isAbsolute(r) && r !== '..' && !r.startsWith(`..${sep}`);
};
const rel = (root: string, file: string) => relative(root, file).replaceAll('\\', '/') || '.';
const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
async function read(path: string, limit = 8_000_000) {
  const s = await stat(path);
  if (!s.isFile() || s.size > limit) throw new Error('invalid file');
  return readFile(path, 'utf8');
}
async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: 'boolean' },
      config: { type: 'string' },
      scope: { type: 'string' },
      context: { type: 'string', multiple: true },
      baseline: { type: 'string' },
      accept: { type: 'string' },
    },
  });
  if (values.help) {
    process.stdout.write(
      'Usage:\n  unused-review scan REPO --config knip.json --scope PROJECT [--context FILE ...]\n  unused-review baseline REPORT [--accept decisions.json]\n  unused-review review REPORT [--baseline BASELINE]\nScan runs pinned Knip in a trusted local repo. JS/TS plugin configs may execute. No fix/remove/cache flags. Adapter writes JSON to stdout, not reports or source files. Loaded project configs may have side effects.\nBaseline decisions: [{"id":"finding ID", "reason":"review reason"}]. No automatic acceptance.\nExit 0: report created / review has no open issues; 2: open candidates; 3: incompatible baseline; 1: input or analysis failure. Files <=8 MB; scan timeout 90 seconds.\n',
    );
    return;
  }
  const [command, input] = positionals;
  if (positionals.length !== 2 || !input) throw new Error('arguments');
  let output: unknown;
  if (command === 'scan') {
    if (
      !values.config ||
      !values.scope?.trim() ||
      values.scope.length > 2000 ||
      values.baseline ||
      values.accept
    )
      throw new Error('scan arguments');
    const root = await realpath(resolve(input));
    const configPath = await realpath(resolve(root, values.config));
    if (!inside(root, configPath) || !configPath.endsWith('.json'))
      throw new Error('JSON config required');
    const configText = await read(configPath, 1_000_000),
      config: unknown = JSON.parse(configText);
    if (!object(config)) throw new Error('config');
    const manifestPath = resolve(
      dirname(fileURLToPath(import.meta.resolve('knip'))),
      '../package.json',
    );
    const manifest = JSON.parse(await read(manifestPath)) as {
      name: string;
      version: string;
      bin: { knip: string };
    };
    if (manifest.name !== 'knip' || manifest.version !== '6.42.1')
      throw new Error('unsupported engine');
    const engineArgs = [
      '--config',
      configPath,
      '--reporter',
      'json',
      '--reporter',
      fileURLToPath(new URL('./context-reporter.mjs', import.meta.url)),
      '--include',
      'files,dependencies,exports,types,nsExports,nsTypes,enumMembers,namespaceMembers',
      '--no-progress',
      '--no-config-hints',
    ];
    const run = spawnSync(
      process.execPath,
      [resolve(dirname(manifestPath), manifest.bin.knip), ...engineArgs],
      { cwd: root, encoding: 'utf8', timeout: 90_000, maxBuffer: 16_000_000 },
    );
    if (run.error || run.signal || (run.status !== 0 && run.status !== 1))
      throw new Error('engine failed');
    const lines = run.stdout.trim().split('\n');
    if (lines.length !== 2) throw new Error('unexpected engine output');
    const native: unknown = JSON.parse(lines[0]!),
      metadata: unknown = JSON.parse(lines[1]!);
    if (
      !object(native) ||
      !Array.isArray(native.issues) ||
      !object(metadata) ||
      metadata.kind !== 'sid-tools-knip-context-v1' ||
      metadata.failed ||
      !Array.isArray(metadata.workspaces) ||
      !metadata.workspaces.every((x) => typeof x === 'string') ||
      !object(metadata.plugins) ||
      !Array.isArray(metadata.hints)
    )
      throw new Error('engine metadata');
    if ((await read(configPath)) !== configText) throw new Error('config changed during scan');
    const declared: UnusedSettings['declared'] = [];
    const patterns = (x: unknown) =>
      x === undefined
        ? ['(Knip default)']
        : typeof x === 'string'
          ? [x]
          : Array.isArray(x) && x.every((v) => typeof v === 'string')
            ? (x as string[])
            : (() => {
                throw new Error('entry/project patterns');
              })();
    for (const [workspace, settings] of (object(config.workspaces)
      ? Object.entries(config.workspaces)
      : [['.', config]]) as [string, unknown][]) {
      if (object(settings))
        declared.push({
          workspace,
          entry: patterns(settings.entry),
          project: patterns(settings.project),
        });
    }
    const warnings = [
      ...UNUSED_WARNINGS,
      'sourceHash 是分析後讀取的檔案摘要；請在穩定工作目錄執行，不是原子快照。',
    ];
    const names = new Set<string>([
      rel(root, configPath),
      'pnpm-lock.yaml',
      'pnpm-workspace.yaml',
      'package-lock.json',
      'yarn.lock',
      ...(values.context ?? []),
    ]);
    for (const workspace of metadata.workspaces as string[])
      for (const name of [
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'vite.config.js',
        'vite.config.mjs',
      ])
        names.add(rel(root, resolve(root, workspace, name)));
    const contextFiles: UnusedSettings['contextFiles'] = [];
    for (const name of [...names].sort()) {
      let path: string;
      try {
        path = await realpath(resolve(root, name));
      } catch {
        if ((values.context ?? []).includes(name)) throw new Error('missing explicit context');
        else continue;
      }
      if (!inside(root, path)) throw new Error('context outside repo');
      contextFiles.push({ path: rel(root, path), sha256: hash(await read(path)) });
    }
    const settings: UnusedSettings = {
      configPath: rel(root, configPath),
      configHash: hash(configText),
      node: process.version,
      fingerprint: '',
      workspaces: metadata.workspaces as string[],
      plugins: metadata.plugins as Record<string, string[]>,
      declared,
      contextFiles,
    };
    settings.fingerprint = hash(
      JSON.stringify({
        adapter: 1,
        engine: manifest.version,
        mode: 'all',
        include: engineArgs[7],
        settings,
      }),
    );
    const findings: UnusedReport['findings'] = [],
      sourceHashes = new Map<string, string | null>();
    for (const group of native.issues) {
      if (!object(group) || typeof group.file !== 'string') throw new Error('native file');
      const file = group.file;
      if (!sourceHashes.has(file)) {
        let sourceHash: string | null = null;
        try {
          const path = await realpath(resolve(root, file));
          if (inside(root, path)) sourceHash = hash(await read(path));
        } catch {
          /* Missing source stays unknown. */
        }
        sourceHashes.set(file, sourceHash);
      }
      for (const [type, items] of Object.entries(group)) {
        if (type === 'file' || type === 'owners') continue;
        if (!Array.isArray(items)) throw new Error('native issues');
        if (!UNUSED_TYPES.includes(type as UnusedType)) {
          if (items.length) throw new Error('unsupported issue type');
          continue;
        }
        for (const item of items) {
          if (
            !object(item) ||
            typeof item.name !== 'string' ||
            (item.namespace !== undefined && typeof item.namespace !== 'string')
          )
            throw new Error('native symbol');
          const namespace = (item.namespace as string | undefined) ?? '';
          findings.push({
            id: unusedId(type, file, item.name, namespace),
            type: type as UnusedType,
            file,
            name: item.name,
            namespace,
            line: typeof item.line === 'number' ? item.line : null,
            col: typeof item.col === 'number' ? item.col : null,
            sourceHash: sourceHashes.get(file) ?? null,
            reason: `Knip ${manifest.version} 在已記錄的 entry/project 與 plugin 條件下回報 ${type} 候選；未證明可安全刪除。`,
          });
        }
      }
    }
    if (metadata.hints.length)
      warnings.push(
        `Knip 有 ${metadata.hints.length} 則設定提示；請用原生 Knip 檢查入口／忽略條件，候選不可直接當作刪除清單。`,
      );
    output = parseUnusedReport(
      JSON.stringify({
        format: 'sid-tools-unused-v1',
        engine: { name: 'knip', version: manifest.version },
        scope: values.scope.trim(),
        settings,
        findings,
        warnings,
      }),
    );
  } else {
    if (values.config || values.scope || values.context) throw new Error('unexpected scan options');
    const report = parseUnusedReport(await read(resolve(input)));
    if (command === 'baseline') {
      if (values.baseline) throw new Error('baseline arguments');
      const decisions: unknown = values.accept
        ? JSON.parse(await read(resolve(values.accept)))
        : [];
      if (
        !Array.isArray(decisions) ||
        !decisions.every(
          (d) => object(d) && typeof d.id === 'string' && typeof d.reason === 'string',
        )
      )
        throw new Error('decisions');
      output = createUnusedBaseline(report, decisions as { id: string; reason: string }[]);
    } else if (command === 'review') {
      if (values.accept) throw new Error('review arguments');
      const review = reviewUnused(
        report,
        values.baseline ? parseUnusedBaseline(await read(resolve(values.baseline))) : null,
      );
      output = {
        format: 'sid-tools-unused-review-v1',
        engine: report.engine,
        scope: report.scope,
        settings: report.settings,
        warnings: report.warnings,
        ...review,
      };
      process.exitCode = !review.comparable
        ? 3
        : review.rows.some((r) => r.status !== 'accepted' && r.status !== 'resolved')
          ? 2
          : 0;
    } else throw new Error('unknown command');
  }
  process.stdout.write(JSON.stringify(output, null, 2) + '\n');
}
void main().catch(() => {
  process.stderr.write(
    '無法完成：請確認 --help、JSON 格式、路徑／大小限制及 Knip 設定。分析失敗或設定不完整時不輸出成功報告；未回顯原始輸入或引擎日誌。\n',
  );
  process.exitCode = 1;
});
