import { test, expect } from 'vite-plus/test';
import { readFileSync, writeFileSync, rmSync, readdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  createUnusedBaseline,
  parseUnusedReport,
  parseUnusedBaseline,
  reviewUnused,
} from '@sid-tools/core/unused-review';
import { unusedFixture, runUnused } from './helpers/unused-fixture';
const digest = (root: string) =>
  Object.fromEntries(
    readdirSync(root, { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => {
        const p = join(e.parentPath, e.name);
        return [p, createHash('sha256').update(readFileSync(p)).digest('hex')];
      }),
  );
test('pinned Knip really analyzes sources, respects literal dynamic imports and public entries, and does not modify repo files', () => {
  const f = unusedFixture();
  try {
    const before = digest(f.root),
      report = f.scan();
    expect(digest(f.root)).toEqual(before);
    expect(report.engine).toEqual({ name: 'knip', version: '6.42.1' });
    expect(report.settings.declared[0]?.entry).toEqual(['src/index.ts']);
    expect(
      report.findings.some((i) => i.name === 'unusedExport' && i.line === 2 && i.sourceHash),
    ).toBe(true);
    expect(report.findings.some((i) => i.file === 'src/unused.ts')).toBe(true);
    expect(report.findings.some((i) => i.name === 'not-needed' && i.file === 'package.json')).toBe(
      true,
    );
    expect(report.findings.some((i) => i.file === 'src/dynamic.ts' || i.name === 'publicApi')).toBe(
      false,
    );
    expect(JSON.stringify(report)).not.toContain(f.root);
    expect(JSON.stringify(report)).not.toContain('loaded dynamically');
    expect(f.scan().settings.fingerprint).toBe(report.settings.fingerprint);
    writeFileSync(
      join(f.root, 'knip.json'),
      JSON.stringify({ entry: ['src/index.ts', 'src/runtime.ts'], project: ['src/**/*.ts'] }),
    );
    const changed = f.scan();
    expect(changed.findings.some((i) => i.file === 'src/runtime.ts')).toBe(false);
    const review = reviewUnused(changed, createUnusedBaseline(report));
    expect(review.comparable).toBe(false);
    expect(review.rows.every((r) => r.status === 'review-needed')).toBe(true);
  } finally {
    f.cleanup();
  }
});
test('baseline reasons survive unchanged sources, new/removed/changed are separate, and CLI exit codes preserve review gates', () => {
  const f = unusedFixture();
  try {
    const first = f.scan(),
      target = first.findings.find((i) => i.name === 'unusedExport')!;
    const baseline = createUnusedBaseline(first, [
      { id: target.id, reason: 'Retain until public API review' },
    ]);
    expect(
      reviewUnused(first, baseline).rows.find((r) => r.finding.id === target.id),
    ).toMatchObject({ status: 'accepted', reason: 'Retain until public API review' });
    writeFileSync(join(f.root, 'src/new.ts'), "console.log('new unused file');\n");
    rmSync(join(f.root, 'src/unused.ts'));
    const second = f.scan(),
      review = reviewUnused(second, baseline);
    expect(review.comparable).toBe(true);
    expect(review.rows.find((r) => r.finding.file === 'src/new.ts')?.status).toBe('new');
    expect(review.rows.find((r) => r.finding.file === 'src/unused.ts')?.status).toBe('resolved');
    expect(review.rows.find((r) => r.finding.id === target.id)?.status).toBe('accepted');
    writeFileSync(
      join(f.root, 'src/used.ts'),
      "export const used = 2;\nexport const unusedExport = 'changed';\n",
    );
    const third = f.scan();
    expect(
      reviewUnused(third, baseline).rows.find((r) => r.finding.id === target.id),
    ).toMatchObject({ status: 'changed', reason: null });
    const reportPath = join(f.dir, 'report.json'),
      basePath = join(f.dir, 'baseline.json'),
      decisionsPath = join(f.dir, 'decisions.json');
    writeFileSync(reportPath, JSON.stringify(first));
    writeFileSync(basePath, JSON.stringify(baseline));
    expect(runUnused(['review', reportPath, '--baseline', basePath]).status).toBe(2);
    writeFileSync(
      decisionsPath,
      JSON.stringify(
        first.findings.map((i) => ({
          id: i.id,
          reason: 'Accepted fixture issue for integration test',
        })),
      ),
    );
    const saved = runUnused(['baseline', reportPath, '--accept', decisionsPath]);
    expect(saved.status).toBe(0);
    writeFileSync(basePath, saved.stdout);
    expect(runUnused(['review', reportPath, '--baseline', basePath]).status).toBe(0);
    writeFileSync(reportPath, JSON.stringify({ ...first, scope: 'another-repo' }));
    expect(runUnused(['review', reportPath, '--baseline', basePath]).status).toBe(3);
    expect(parseUnusedBaseline(saved.stdout).accepted).toHaveLength(first.findings.length);
  } finally {
    f.cleanup();
  }
});
test('invalid evidence, empty acceptance reasons, symlink escapes and dangerous options do not produce successful reports', () => {
  const f = unusedFixture();
  try {
    const report = f.scan(),
      target = report.findings[0]!;
    expect(() => createUnusedBaseline(report, [{ id: target.id, reason: ' ' }])).toThrow(/理由/);
    expect(() => parseUnusedReport(JSON.stringify({ ...report, settings: {} }))).toThrow(
      /metadata/,
    );
    expect(() => parseUnusedReport(' '.repeat(8_000_001))).toThrow(/8 MB/);
    const bad = structuredClone(report);
    bad.findings[0]!.sourceHash = null;
    expect(() =>
      createUnusedBaseline(bad, [{ id: target.id, reason: 'cannot verify source' }]),
    ).toThrow(/來源/);
    const baseline = createUnusedBaseline(report, [{ id: target.id, reason: 'test' }]);
    baseline.accepted[0]!.sourceHash = '0'.repeat(64);
    expect(() => parseUnusedBaseline(JSON.stringify(baseline))).toThrow(/來源/);
    writeFileSync(join(f.dir, 'outside.json'), JSON.stringify({ entry: ['src/index.ts'] }));
    symlinkSync(join(f.dir, 'outside.json'), join(f.root, 'escaped.json'));
    const escaped = runUnused(['scan', f.root, '--config', 'escaped.json', '--scope', 'fixture']);
    expect(escaped.status).toBe(1);
    expect(escaped.stdout).toBe('');
    const unsafe = runUnused([
      'scan',
      f.root,
      '--config',
      'knip.json',
      '--scope',
      'fixture',
      '--fix',
    ]);
    expect(unsafe.status).toBe(1);
    expect(unsafe.stdout).toBe('');
    writeFileSync(join(f.root, 'knip.json'), JSON.stringify({ entry: 123 }));
    const engineFailure = runUnused([
      'scan',
      f.root,
      '--config',
      'knip.json',
      '--scope',
      'fixture',
    ]);
    expect(engineFailure.status).toBe(1);
    expect(engineFailure.stdout).toBe('');
    writeFileSync(join(f.root, 'knip.json'), '{invalid SECRET INPUT');
    const failure = runUnused(['scan', f.root, '--config', 'knip.json', '--scope', 'fixture']);
    expect(failure.status).toBe(1);
    expect(failure.stdout).toBe('');
    expect(failure.stderr).not.toContain('SECRET');
  } finally {
    f.cleanup();
  }
});
