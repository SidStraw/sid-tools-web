import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, expect, test } from 'vite-plus/test';

const execute = promisify(execFile);
const bin = path.resolve('apps/markdown-links/dist/cli.mjs');
const temporary: string[] = [];
interface CliReport {
  format: string;
  status: string;
  rootIdentity: string;
  policy: string;
  counts: { documents: number; links: number; broken: number; unknown: number; skipped: number };
  findings: {
    id: string;
    source: string;
    target: string | null;
    destination: string | null;
    status: string;
    reason: string;
    line: number | null;
    column: number | null;
  }[];
  delta: { added: string[]; resolved: string[]; unchanged: string[] } | null;
  failure: string | null;
}

async function fixture(files: Record<string, string | Buffer>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), 'stw36-cli-'));
  temporary.push(root);
  for (const [name, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, name)), { recursive: true });
    await writeFile(path.join(root, name), content);
  }
  return root;
}

async function run(root: string, args: string[] = [], json = true) {
  try {
    const result = await execute(
      process.execPath,
      [bin, '--root', root, ...(json ? ['--json'] : []), ...args],
      { env: {}, maxBuffer: 4_500_000, timeout: 35_000 },
    );
    return { code: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const result = error as Error & { code: number | string; stdout?: string; stderr?: string };
    if (typeof result.code !== 'number') throw error;
    return { code: result.code, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  }
}

function parsed(result: { stdout: string }): CliReport {
  return JSON.parse(result.stdout) as CliReport;
}

async function treeHash(root: string): Promise<string> {
  const hash = createHash('sha256');
  const walk = async (directory: string) => {
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
      a.name < b.name ? -1 : 1,
    )) {
      const full = path.join(directory, entry.name);
      hash.update(path.relative(root, full));
      hash.update(entry.isDirectory() ? 'directory' : 'file');
      if (entry.isDirectory()) await walk(full);
      else hash.update(await readFile(full));
    }
  };
  await walk(root);
  return hash.digest('hex');
}

afterEach(async () => {
  await Promise.all(temporary.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test('production ESM bin has shebang, public imports, and offline-only invocation', async () => {
  const source = await readFile(bin, 'utf8');
  expect(source.startsWith('#!/usr/bin/env node')).toBe(true);
  const worker = await readFile('apps/markdown-links/dist/scan-worker.mjs', 'utf8');
  expect(worker).toContain('@sid-tools/core/markdown-links');
  expect(worker).not.toContain('packages/core/src');
  const help = await execute(process.execPath, [bin, '--help'], { env: {} });
  expect(help.stdout).toContain('Exit: 0');
  expect(help.stdout).toContain('github-slugger 2.0.0');
  const root = await fixture({ 'a.md': '# A\n' });
  for (const flag of ['--fix', '--online', '--unknown']) {
    const result = await run(root, [flag]);
    expect(result.code).toBe(2);
    expect(parsed(result).failure).toBe('invalid-invocation');
  }
});

test('real bin resolves references/images, duplicate slugs, entities, query, percent encoding and excludes code', async () => {
  const root = await fixture({
    'a.md':
      '[ref][t]\n\n[t]: target%20file.md?view=1#hello-world-1\n\n![image](asset.bin)\n\n[unicode](target%20file.md#%E4%B8%AD%E6%96%87)\n\n[entity](target%20file.md#a--b)\n\n```md\n[not real](absent.md)\n```\n\n`[also not real](absent.md)`\n',
    'target file.md': '# Hello *World*\n# Hello World\n# 中文\n# A &amp; B\n',
    'asset.bin': Buffer.from([0xff, 0x00]),
  });
  const result = await run(root, ['--offline']);
  expect(result.code).toBe(0);
  expect(parsed(result).counts).toEqual({
    documents: 2,
    links: 4,
    broken: 0,
    unknown: 0,
    skipped: 0,
  });
});

test('source locations and normalized targets distinguish missing-file, missing-anchor and unknown', async () => {
  const root = await fixture({
    'a.md':
      '\ufeff[file](missing.md)\n[anchor](target.md#missing)\n[uncertain](html.md#custom)\n[asset](asset.bin#fragment)\n[directory](folder/)\n[invalid](%ZZ.md)\n',
    'target.md': '# Present\n',
    'html.md': '<a id="custom"></a>\n',
    'asset.bin': '',
    'folder/item.txt': '',
  });
  const result = await run(root);
  expect(result.code).toBe(1);
  const report = parsed(result);
  expect(report.findings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        source: 'a.md',
        target: 'missing.md',
        line: 1,
        column: 2,
        status: 'missing-file',
      }),
      expect.objectContaining({
        source: 'a.md',
        target: 'target.md',
        line: 2,
        status: 'missing-anchor',
      }),
      expect.objectContaining({ source: 'a.md', target: 'html.md', status: 'unknown' }),
      expect.objectContaining({
        source: 'a.md',
        target: 'asset.bin',
        reason: 'non-markdown-fragment',
      }),
      expect.objectContaining({
        source: 'a.md',
        target: 'folder',
        reason: 'directory-no-readme-inference',
      }),
    ]),
  );
  expect(report.counts.unknown).toBeGreaterThan(0);
});

test('no network requests, including local HTTP canary and protocol-relative URLs', async () => {
  let requests = 0;
  const server = createServer((_request, response) => {
    requests++;
    response.end('synthetic');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No canary port');
    const root = await fixture({
      'a.md': `[external](http://127.0.0.1:${address.port}/synthetic)\n[relative](//127.0.0.1:${address.port}/other)\n[mail](mailto:test@example.test)\n[credentials](http://synthetic-user:synthetic-secret@127.0.0.1:${address.port}/private)\n`,
    });
    const result = await run(root);
    expect(result.code).toBe(0);
    expect(parsed(result).counts.skipped).toBe(4);
    expect(result.stdout).not.toContain('synthetic-secret');
    expect(parsed(result).findings.every((finding) => finding.status === 'external-skipped')).toBe(
      true,
    );
    expect(requests).toBe(0);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('prunes defaults and explicit gitignore rules; ignored targets are skips not missing', async () => {
  const root = await fixture({
    'a.md': '[hidden](hidden/no.md)\n[default](node_modules/no.md)\n[slim](.slim/no.md)\n',
    'hidden/bad.md': '[bad](missing.md)',
    'dist/bad.md': '[bad](missing.md)',
    '.git/bad.md': '[bad](missing.md)',
    '.slim/bad.md': '[bad](missing.md)',
    'node_modules/bad.md': '[bad](missing.md)',
    'rules.ignore': 'hidden/\n',
  });
  const result = await run(root, [
    '--ignore-file',
    'rules.ignore',
    '--ignore',
    '*.tmp',
    '--ignore',
    '!node_modules/',
  ]);
  expect(result.code).toBe(0);
  expect(parsed(result).counts.documents).toBe(1);
  expect(parsed(result).findings.map((finding) => finding.status)).toEqual([
    'ignored-skipped',
    'ignored-skipped',
    'ignored-skipped',
  ]);
});

test('does not implicitly read repository .gitignore', async () => {
  const root = await fixture({ '.gitignore': 'bad.md\n', 'bad.md': '[broken](missing.md)' });
  expect((await run(root)).code).toBe(1);
  expect((await run(root, ['--ignore-file', '.gitignore'])).code).toBe(0);
});

test('symlink files/directories and escaped targets stay unknown without outside content leakage', async () => {
  const outside = await fixture({ 'outside.md': '# synthetic-private-outside\n' });
  const root = await fixture({
    'a.md':
      '[link](linked.md#synthetic-private-outside)\n[dir](linked-dir/outside.md)\n[escape](../outside.md)\n[encoded](%2e%2e/outside.md)\n',
  });
  await symlink(path.join(outside, 'outside.md'), path.join(root, 'linked.md'));
  await symlink(outside, path.join(root, 'linked-dir'), 'dir');
  const result = await run(root);
  expect(result.code).toBe(1);
  expect(parsed(result).findings.some((finding) => finding.status === 'missing-file')).toBe(false);
  expect(
    parsed(result).findings.filter((finding) => finding.reason === 'symlink-or-special-target'),
  ).toHaveLength(2);
  const rejected = await run(root, ['--ignore-file', 'linked.md']);
  expect(rejected.code).toBe(2);
  expect(parsed(rejected).failure).toBe('symlink-path');
});

test('explicit policy/baseline files must be contained regular files', async () => {
  const root = await fixture({ 'a.md': '# A\n' });
  for (const args of [
    ['--ignore-file', '../outside'],
    ['--baseline', '/etc/passwd'],
    ['--ignore-file', '.'],
  ]) {
    const result = await run(root, args);
    expect(result.code).toBe(2);
    expect(parsed(result).status).toBe('failed-coverage');
    expect(result.stderr).toBe('');
  }
});

test('baseline full recheck invalidates unchanged inbound source when target anchors change', async () => {
  const root = await fixture({
    'a.md': '[anchor](target.md#present)\n[broken](missing.md)',
    'target.md': '# Present\n',
  });
  const first = await run(root);
  expect(first.code).toBe(1);
  await writeFile(path.join(root, 'baseline.json'), first.stdout);
  const same = parsed(await run(root, ['--baseline', 'baseline.json']));
  expect(same.delta).toEqual({
    added: [],
    resolved: [],
    unchanged: [parsed(first).findings[0]!.id],
  });
  await writeFile(path.join(root, 'target.md'), '# Renamed\n');
  const changed = parsed(await run(root, ['--baseline', 'baseline.json']));
  expect(changed.findings.some((finding) => finding.status === 'missing-anchor')).toBe(true);
  expect(changed.delta?.added).toHaveLength(1);
  expect(changed.delta?.unchanged).toHaveLength(1);
  await writeFile(path.join(root, 'missing.md'), '# Exists\n');
  await writeFile(path.join(root, 'target.md'), '# Present\n');
  const fixed = await run(root, ['--baseline', 'baseline.json']);
  expect(fixed.code).toBe(0);
  expect(parsed(fixed).delta?.resolved).toHaveLength(1);
});

test('baseline root/policy mismatches and malformed schemas refuse false resolved deltas', async () => {
  const root = await fixture({ 'a.md': '[broken](missing.md)' });
  const first = await run(root);
  await writeFile(path.join(root, 'baseline.json'), first.stdout);
  const mismatch = await run(root, ['--baseline', 'baseline.json', '--ignore', 'a.md']);
  expect(mismatch.code).toBe(2);
  expect(parsed(mismatch).failure).toBe('baseline-scope-mismatch');
  expect(parsed(mismatch).delta).toBeNull();
  const other = await fixture({ 'baseline.json': first.stdout });
  expect(parsed(await run(other, ['--baseline', 'baseline.json'])).failure).toBe(
    'baseline-scope-mismatch',
  );
  for (const text of [
    '{',
    '{}',
    JSON.stringify({ ...parsed(first), findings: [{}] }),
    JSON.stringify({ ...parsed(first), format: 'future' }),
    JSON.stringify({ ...parsed(first), status: 'failed-coverage' }),
  ]) {
    await writeFile(path.join(root, 'baseline.json'), text);
    const result = await run(root, ['--baseline', 'baseline.json']);
    expect(result.code).toBe(2);
    expect(parsed(result).delta).toBeNull();
  }
});

test('invalid UTF-8 and oversized source/policy/baseline never yield empty success', async () => {
  for (const files of [
    { 'bad.md': Buffer.from([0xff, 0xfe]) },
    { 'big.md': 'x'.repeat(512_001) },
  ]) {
    const root = await fixture(files);
    const result = await run(root);
    expect(result.code).toBe(2);
    expect(parsed(result).status).toBe('failed-coverage');
    expect(parsed(result).delta).toBeNull();
  }
  const root = await fixture({ rules: 'x'.repeat(32_001), 'baseline.json': 'x'.repeat(4_000_001) });
  expect((await run(root, ['--ignore-file', 'rules'])).code).toBe(2);
  expect((await run(root, ['--baseline', 'baseline.json'])).code).toBe(2);
  expect((await run(path.join(root, 'missing'))).code).toBe(2);
});

test('terminal controls are escaped in human and JSON output without source excerpts/raw exceptions', async () => {
  const root = await fixture({
    'control\u202e.md':
      '[broken](missing%1B%5B31m.md)\nsynthetic-private-source-excerpt\n[other](missing%E2%80%AE.md)',
  });
  const human = await run(root, [], false);
  expect(human.code).toBe(1);
  expect(human.stdout).not.toContain('\u001b');
  expect(human.stdout).not.toContain('\u202e');
  expect(human.stdout).not.toContain('synthetic-private-source-excerpt');
  const json = await run(root);
  expect(json.stdout).not.toContain('\u001b');
  expect(json.stdout).not.toContain('\u202e');
  expect(parsed(json).findings[0]?.source).toBe('control\u202e.md');
});

test('actual bin no-model source failure cannot resolve a prior baseline broken link', async () => {
  const root = await fixture({ 'a.md': '[broken](missing.md)' });
  const first = await run(root);
  expect(first.code).toBe(1);
  expect(parsed(first).counts.broken).toBe(1);
  await writeFile(path.join(root, 'baseline.json'), first.stdout);
  await writeFile(path.join(root, 'a.md'), '# Former link no longer present\n');
  await writeFile(path.join(root, 'invalid\u001b.md'), '[x](missing.md)');
  const result = await run(root, ['--baseline', 'baseline.json']);
  expect(result.code).toBe(2);
  expect(parsed(result)).toMatchObject({
    status: 'failed-coverage',
    failure: 'markdown-parser-failed',
    delta: null,
  });
  expect(result.stderr).toBe('');
  expect(result.stdout).not.toContain('\u001b');
});

test('AC4 read-only runs have identical tree hashes and reject fixes without overwriting files', async () => {
  const root = await fixture({
    'a.md': '[broken](missing.md)\n',
    'existing.json': 'synthetic-original',
    'asset.bin': Buffer.from([1, 2, 3]),
  });
  const before = await treeHash(root);
  expect((await run(root)).code).toBe(1);
  expect((await run(root, ['--fix'])).code).toBe(2);
  expect(await treeHash(root)).toBe(before);
  console.info(
    `STW36 AC4 tree SHA-256 before=${before} after=${await treeHash(root)}; normal exit1/fix rejected exit2; unchanged`,
  );
  expect(await readdir(root)).toEqual(
    expect.arrayContaining(['a.md', 'existing.json', 'asset.bin']),
  );
});

test('adversarial synchronous parsing is contained by the independently terminable child', async () => {
  const root = await fixture({ 'hostile.md': '*_'.repeat(45_000) + 'x' + '_*'.repeat(45_000) });
  const started = performance.now();
  const result = await run(root);
  const elapsed = performance.now() - started;
  expect(result.code).toBe(2);
  const report = parsed(result);
  expect(report.status).toBe('failed-coverage');
  expect(report.delta).toBeNull();
  expect(['scan-time-limit', 'child-failed', 'parser-limit']).toContain(report.failure);
  expect(result.stderr).toBe('');
  expect(elapsed).toBeLessThan(34_000);
  console.info(
    `STW36 adversarial child observation: ${report.failure}, ${elapsed.toFixed(0)}ms, exit2; not valid empty`,
  );
}, 40_000);

test('short nested-blockquote native parser failure cannot abort or leak diagnostics from the CLI', async () => {
  const source = '> '.repeat(12_000) + '[x](missing.md)';
  expect(source).toHaveLength(24_015);
  const root = await fixture({ 'hostile.md': source });
  const result = await run(root);
  expect(result.code).toBe(2);
  expect(parsed(result)).toMatchObject({ status: 'failed-coverage', delta: null });
  expect(['child-failed', 'parser-limit', 'markdown-parser-failed', 'scan-time-limit']).toContain(
    parsed(result).failure,
  );
  expect(result.stderr).toBe('');
  expect(result.stdout).not.toMatch(
    /FATAL|heap out of memory|SIGABRT|core dumped|coredump|Stacktrace|0x[0-9a-f]+/i,
  );
  console.info(
    `STW36 short blockquote child observation: ${parsed(result).failure}, exit2, stderr=0 bytes; parent survived`,
  );
}, 40_000);

test('pruned directory targets retain ignore semantics with slash, no slash and descendants', async () => {
  const root = await fixture({
    'a.md':
      '[a](hidden/)\n[b](hidden)\n[c](hidden/no.md)\n[d](nested/hidden/)\n[e](nested/hidden)\n[f](nested/hidden/no.md)\n[file](other/hidden)\n',
    'hidden/bad.md': '[x](missing.md)',
    'nested/hidden/bad.md': '[x](missing.md)',
    'other/hidden': 'regular asset',
  });
  const result = await run(root, ['--ignore', 'hidden/']);
  expect(result.code).toBe(0);
  expect(parsed(result).counts).toMatchObject({ documents: 1, links: 7, skipped: 6 });
  expect(parsed(result).findings).toHaveLength(6);
  expect(parsed(result).findings.every((finding) => finding.status === 'ignored-skipped')).toBe(
    true,
  );
});

test('terminal directory syntax cannot silently pass against a regular file; ignore classification wins', async () => {
  const root = await fixture({
    'a.md':
      '[a](target.md/)\n[b](target.md/.)\n[c](target.md/sub/..)\n[d](hidden/)\n[e](target.md/%2e)\n[f](target.md/sub/%2e%2e)\n',
    'target.md': '# Target\n',
    'hidden/a.md': '[x](missing.md)',
  });
  const result = await run(root, ['--ignore', 'hidden/']);
  expect(result.code).toBe(1);
  expect(parsed(result).status).toBe('complete');
  expect(parsed(result).findings.filter((finding) => finding.status === 'unknown')).toHaveLength(5);
  expect(
    parsed(result).findings.filter((finding) => finding.status === 'ignored-skipped'),
  ).toHaveLength(1);
  expect(
    parsed(result)
      .findings.filter((finding) => finding.status === 'unknown')
      .every((finding) => finding.reason === 'directory-syntax-for-regular-file'),
  ).toBe(true);
});
