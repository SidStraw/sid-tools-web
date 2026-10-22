import { test, expect } from 'vite-plus/test';
import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { compareBundles, parseBundleReport } from '@sid-tools/core/bundle-diff';
import { buildBundlePair } from './helpers/bundle-build';

test('real Vite builds retain file measurements, module attribution, hash identity, and CLI decisions', async () => {
  const pair = await buildBundlePair();
  try {
    const { before, after } = pair;
    for (const asset of after.assets) {
      const bytes = await readFile(join(pair.root, 'dist', asset.file));
      expect(asset.bytes).toEqual({
        raw: bytes.length,
        gzip: gzipSync(bytes, { level: 9 }).length,
        brotli: brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } })
          .length,
      });
      expect(asset.sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
    }
    expect(after.environment.configHash).toBeTruthy();
    expect(after.environment.bundler).not.toContain('undefined');
    expect(after.assets.some((a) => a.dynamicEntry)).toBe(true);
    expect(after.assets.find((a) => a.file === 'index.html')?.entry).toBe(true);
    expect(after.assets.flatMap((a) => a.modules).some((m) => m.package === 'sample-package')).toBe(
      true,
    );
    expect(JSON.stringify(after)).not.toContain(pair.dir);
    expect(JSON.stringify(after)).not.toContain('package contribution');
    const diff = compareBundles(before, after, { metric: 'raw', limit: 0 });
    expect(diff.comparable).toBe(true);
    expect(diff.budget?.status).toBe('exceeded');
    expect(
      diff.assets.some((a) => a.status === 'changed' && a.before?.file !== a.after?.file),
    ).toBe(true);
    expect(
      diff.modules.some((m) => m.id.endsWith('main.js') && m.delta !== null && m.delta > 0),
    ).toBe(true);
    const run = (args: string[]) =>
      spawnSync(process.execPath, [resolve('apps/bundle-diff/dist/cli.mjs'), ...args], {
        encoding: 'utf8',
      });
    const args = [join(pair.dir, 'base.json'), join(pair.dir, 'candidate.json')];
    expect(run(args).status).toBe(0);
    expect(run([...args, '--budget', '0']).status).toBe(2);
    expect(run([...args, '--metric', 'invalid']).status).toBe(1);
    expect(JSON.parse(run(args).stdout).assets).toEqual(diff.assets);
  } finally {
    await pair.cleanup();
  }
});

test('incompatible metadata, ambiguous identities and unknown lengths remain explicit', async () => {
  const pair = await buildBundlePair();
  try {
    const after = structuredClone(pair.after);
    after.environment.configHash = 'different';
    const unknown = after.assets.flatMap((a) => a.modules)[0]!;
    unknown.renderedLength = null;
    const copied = structuredClone(after.assets[0]!);
    copied.file += '.duplicate';
    after.assets.push(copied);
    const diff = compareBundles(pair.before, after, { metric: 'gzip', limit: 1_000_000 });
    expect(diff.comparable).toBe(false);
    expect(diff.budget?.status).toBe('not-evaluated');
    expect(diff.reasons.join(' ')).toContain('configHash');
    expect(diff.assets.filter((a) => a.status === 'ambiguous').every((a) => a.delta === null)).toBe(
      true,
    );
    expect(diff.modules.find((m) => m.id === unknown.id)?.delta).toBeNull();
    const missing = parseBundleReport(JSON.stringify({ ...pair.after, environment: {} }));
    expect(compareBundles(pair.before, missing).reasons).toHaveLength(12);
    const total = compareBundles(pair.before, pair.after).totals.after.gzip;
    expect(
      compareBundles(pair.before, pair.after, { metric: 'gzip', limit: total }).budget?.status,
    ).toBe('pass');
    expect(
      compareBundles(pair.before, pair.after, { metric: 'gzip', limit: total - 1 }).budget?.status,
    ).toBe('exceeded');
    expect(() =>
      parseBundleReport(
        JSON.stringify({ ...pair.after, assets: [pair.after.assets[0], pair.after.assets[0]] }),
      ),
    ).toThrow(/產物|8 MB/);
    expect(() => parseBundleReport(' '.repeat(8_000_001))).toThrow(/產物|8 MB/);
    expect(() =>
      parseBundleReport(
        JSON.stringify({
          ...pair.after,
          assets: [{ ...pair.after.assets[0], bytes: { raw: -1, gzip: 0, brotli: 0 } }],
        }),
      ),
    ).toThrow(/產物|8 MB/);
  } finally {
    await pair.cleanup();
  }
});

test('changed native build configuration is incomparable and existing reports cannot be overwritten', async () => {
  const pair = await buildBundlePair();
  try {
    await writeFile(
      pair.configFile,
      "export default { build: { target: 'es2020', minify: true } };",
    );
    const changed = await pair.run('changed-config');
    const comparison = compareBundles(pair.before, changed);
    expect(comparison.comparable).toBe(false);
    expect(comparison.reasons.join(' ')).toMatch(/target/);
    expect(comparison.reasons.join(' ')).toMatch(/configHash/);
    const cli = spawnSync(
      process.execPath,
      [
        resolve('apps/bundle-diff/dist/cli.mjs'),
        join(pair.dir, 'base.json'),
        join(pair.dir, 'changed-config.json'),
        '--budget',
        '1000000',
      ],
      { encoding: 'utf8' },
    );
    expect(cli.status).toBe(3);
    expect(JSON.parse(cli.stdout).budget.status).toBe('not-evaluated');
    await expect(pair.run('fixture/dist/exposed')).rejects.toThrow(/outDir/);
    const original = await readFile(join(pair.dir, 'candidate.json'), 'utf8');
    await expect(pair.run('candidate')).rejects.toThrow(/EEXIST|exist/);
    expect(await readFile(join(pair.dir, 'candidate.json'), 'utf8')).toBe(original);
  } finally {
    await pair.cleanup();
  }
});
