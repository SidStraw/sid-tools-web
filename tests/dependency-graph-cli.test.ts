import { it, expect } from 'vite-plus/test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseDependencyReport, dependencyPaths } from '@sid-tools/core/dependency-graph';
const cli = resolve('apps/dependency-graph/dist/cli.mjs');
it('reads the real repository as a multi-document pnpm graph with no absolute or private workspace paths', () => {
  const text = execFileSync(process.execPath, [cli, '.'], { encoding: 'utf8' });
  const graph = parseDependencyReport(text);
  expect(graph.nodes.filter((n) => n.kind === 'workspace').length).toBeGreaterThanOrEqual(5);
  expect(graph.diagnostics).toEqual([]);
  const yaml = graph.nodes.find((n) => n.name === 'yaml' && n.version === '2.9.1')!;
  expect(dependencyPaths(graph, yaml.id).length).toBeGreaterThan(1);
  expect(text).not.toContain(process.cwd());
  expect(text).not.toContain('apps/dependency-graph');
});
it('does not execute scripts, read escaped manifests, or include sensitive resolution values', () => {
  const dir = mkdtempSync(join(tmpdir(), 'stw-graph-'));
  try {
    mkdirSync(join(dir, 'repo'));
    mkdirSync(join(dir, 'outside'));
    mkdirSync(join(dir, 'repo/apps'));
    writeFileSync(
      join(dir, 'outside/package.json'),
      JSON.stringify({ dependencies: { secret: 'TOPSECRET' } }),
    );
    symlinkSync(join(dir, 'outside'), join(dir, 'repo/apps/private'));
    writeFileSync(
      join(dir, 'repo/package.json'),
      JSON.stringify({ scripts: { postinstall: 'exit 99' } }),
    );
    writeFileSync(join(dir, 'repo/pnpm-workspace.yaml'), 'packages:\n  - apps/*\n');
    writeFileSync(
      join(dir, 'repo/pnpm-lock.yaml'),
      "lockfileVersion: '9.0'\nimporters:\n  .: {}\n  apps/private: {}\npackages: {}\nsnapshots: {}\n",
    );
    const text = execFileSync(process.execPath, [cli, join(dir, 'repo')], { encoding: 'utf8' });
    expect(parseDependencyReport(text).diagnostics.join(' ')).toContain('manifest');
    expect(text).not.toContain('TOPSECRET');
    expect(text).not.toContain(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
