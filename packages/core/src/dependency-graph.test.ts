import { describe, it, expect } from 'vite-plus/test';
import {
  buildDependencyGraph,
  dependencyPaths,
  dependencyVariants,
  parseDependencyReport,
  lockfileWorkspaces,
} from './dependency-graph';
const lock = `lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      app: {specifier: 'workspace:*', version: 'link:apps/private'}
  apps/private:
    dependencies:
      lib: {specifier: '1', version: '1.0.0(host@2.0.0)'}
      alias: {specifier: 'npm:lib@1', version: 'lib@1.0.0(host@3.0.0)'}
packages:
  lib@1.0.0: {}
  leaf@1.0.0: {}
  leaf@2.0.0: {}
snapshots:
  lib@1.0.0(host@2.0.0):
    dependencies: {leaf: '1.0.0'}
  lib@1.0.0(host@3.0.0):
    dependencies: {leaf: '2.0.0'}
  leaf@1.0.0:
    dependencies: {lib: '1.0.0(host@2.0.0)'}
  leaf@2.0.0: {}
`;
const manifests = [
  { path: '.', value: { dependencies: { app: 'workspace:*' } } },
  { path: 'apps/private', value: { dependencies: { lib: '1', alias: 'npm:lib@1' } } },
];
describe('pnpm evidence graph', () => {
  it('resolves workspace links, aliases and cyclic indirect paths with line and manifest evidence', () => {
    const graph = buildDependencyGraph(lock, manifests);
    expect(graph.diagnostics).toEqual([]);
    const target = graph.nodes.find((n) => n.name === 'leaf' && n.version === '1.0.0')!;
    const paths = dependencyPaths(graph, target.id);
    expect(paths.map((p) => p.edges.length)).toEqual([3, 2]);
    expect(paths[0]!.edges.map((e) => e.name)).toEqual(['app', 'lib', 'leaf']);
    expect(paths[0]!.edges[0]!.source).toBe('pnpm-lock.yaml:document-1:line-5');
    expect(paths[0]!.edges[0]!.manifest).toBe('w0/package.json#/dependencies/app');
    expect(graph.edges.every((e) => e.to !== null)).toBe(true);
    expect(JSON.stringify(graph)).not.toContain('apps/private');
    expect(buildDependencyGraph(lock, manifests, true).nodes[1]!.name).toBe('apps/private');
  });
  it('separates a single version with different peers from real multi-version duplication', () => {
    const groups = dependencyVariants(buildDependencyGraph(lock, manifests));
    expect(groups.find((g) => g.name === 'lib')?.versions).toEqual(['1.0.0']);
    expect(groups.find((g) => g.name === 'lib')?.nodes.map((n) => n.peers)).toEqual([
      '(host@2.0.0)',
      '(host@3.0.0)',
    ]);
    expect(groups.find((g) => g.name === 'leaf')?.versions).toEqual(['1.0.0', '2.0.0']);
  });
  it('reads the last document in the actual pnpm boot+project format', () => {
    const input = `---\nlockfileVersion: '9.0'\nimporters:\n  .:\n    packageManagerDependencies: {}\npackages: {}\nsnapshots: {}\n---\n${lock}`;
    expect(lockfileWorkspaces(input)).toEqual(['.', 'apps/private']);
    expect(buildDependencyGraph(input, manifests).edges[0]?.source).toContain('document-2');
    expect(() => buildDependencyGraph(`${lock}\n---\n${lock}`, manifests)).toThrow('boot/env');
  });
  it('marks missing snapshots, metadata, manifests and stale declarations without leaking secret URLs', () => {
    const input = lock.replace(
      "version: '1.0.0(host@2.0.0)'",
      "version: 'https://token:secret@example.com/private.tgz'",
    );
    const graph = buildDependencyGraph(input, [
      { path: '.', value: { dependencies: { extra: '1' } } },
    ]);
    expect(graph.edges.some((e) => e.to === null)).toBe(true);
    expect(graph.diagnostics.join(' ')).toContain('缺少 manifest');
    expect(graph.diagnostics.join(' ')).toContain('不一致');
    expect(graph.diagnostics.join(' ')).toContain('未鎖定');
    expect(JSON.stringify(graph)).not.toContain('secret');
  });
  it('rejects unsupported versions, duplicate keys, aliases, unsafe importers and malformed reports', () => {
    expect(() => buildDependencyGraph(lock.replace("'9.0'", "'6.0'"), [])).toThrow('9.0');
    expect(() => buildDependencyGraph(lock.replace('apps/private:', '../private:'), [])).toThrow(
      '路徑',
    );
    expect(() => buildDependencyGraph(`${lock}\nimporters: {}`, [])).toThrow('YAML');
    expect(() =>
      buildDependencyGraph(lock.replace('leaf@2.0.0: {}', 'leaf@2.0.0: &a {foo: *a}'), []),
    ).toThrow('alias');
    const graph = buildDependencyGraph(lock, manifests);
    expect(parseDependencyReport(JSON.stringify(graph))).toEqual(graph);
    graph.edges[0]!.to = 'nonexistent';
    expect(() => parseDependencyReport(JSON.stringify(graph))).toThrow('邊');
  });
});
