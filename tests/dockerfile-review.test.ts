import { expect, test } from 'vite-plus/test';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  parseDockerReport,
  compareDockerReports,
  createDockerReport,
} from '@sid-tools/core/dockerfile-review';
const cli = resolve('apps/dockerfile-review/dist/cli.mjs');
const fixture = resolve('tests/fixtures/dockerfile-review');
function run(args: string[], extra: Record<string, string> = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: 'utf8',
    timeout: 30_000,
    env: { ...process.env, ...extra },
  });
}
test('official Hadolint binary produces pinned public Dockerfile findings and ignores global environment overrides', async () => {
  const before = readFileSync(join(fixture, 'Dockerfile'));
  const result = run(['scan', join(fixture, 'Dockerfile')], {
    HADOLINT_IGNORE: 'DL3008,DL4006,SC2155,SC2086',
    HADOLINT_FORMAT: 'tty',
    HADOLINT_NOFAIL: '0',
  });
  expect(result.status).toBe(0);
  expect(result.stderr).toBe('');
  const report = await parseDockerReport(result.stdout);
  const expected = await parseDockerReport(readFileSync(join(fixture, 'report.json'), 'utf8'));
  expect(report).toEqual(expected);
  expect(report.findings).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: 'DL3008', line: 8 }),
      expect.objectContaining({ code: 'DL4006', line: 61 }),
    ]),
  );
  expect(report.imageScan).toBe('NOT RUN');
  expect(report.imageBuild).toBe('NOT RUN');
  expect(readFileSync(join(fixture, 'Dockerfile'))).toEqual(before);
});
test('real scans compare a controlled fix, require reasons and invalidate them when source changes without executing instructions', async () => {
  const temp = mkdtempSync(join(tmpdir(), 'stw32-'));
  try {
    const file = join(temp, 'Dockerfile'),
      canary = join(temp, 'executed');
    const source = `FROM alpine:latest\n# hadolint ignore=DL3003\nRUN cd /tmp && touch ${canary}\nCMD ["true"]\n`;
    writeFileSync(file, source);
    writeFileSync(join(temp, '.hadolint.yaml'), 'ignored: [DL3003, DL3007]\n');
    const a = run(['scan', file]);
    expect(a.status).toBe(0);
    const first = await parseDockerReport(a.stdout);
    expect(first.findings.some((f) => f.code === 'DL3003')).toBe(true);
    expect(existsSync(canary)).toBe(false);
    const f = first.findings.find((f) => f.code === 'DL3007')!;
    first.annotations = [{ id: f.id, reason: 'Test tag retained for controlled fixture only.' }];
    const baseline = join(temp, 'baseline.json');
    writeFileSync(baseline, JSON.stringify(first));
    const reloaded = await parseDockerReport(readFileSync(baseline, 'utf8'));
    expect(
      compareDockerReports(reloaded, first).rows.find((r) => r.finding.id === f.id)?.reason,
    ).toContain('controlled');
    writeFileSync(file, source.replace('RUN cd /tmp && touch', 'WORKDIR /tmp\nRUN touch'));
    const b = run(['scan', file]);
    expect(b.status).toBe(0);
    const second = await parseDockerReport(b.stdout),
      delta = compareDockerReports(second, reloaded);
    expect(delta.removed.some((f) => f.code === 'DL3003')).toBe(true);
    expect(second.findings.some((f) => f.code === 'DL3003')).toBe(false);
    expect(delta.invalidatedAnnotations).toBe(1);
    expect(delta.rows.every((r) => r.reason === null)).toBe(true);
    expect(existsSync(canary)).toBe(false);
    const current = join(temp, 'current.json');
    writeFileSync(current, b.stdout);
    const review = run(['review', current, '--baseline', baseline]);
    expect(review.status).toBe(0);
    expect(JSON.parse(review.stdout).comparison.invalidatedAnnotations).toBe(1);
    const overwrite = run(['scan', file, '--out', baseline]);
    expect(overwrite.status).toBe(2);
    expect(await parseDockerReport(readFileSync(baseline, 'utf8'))).toEqual(reloaded);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
test('bad reports cannot forge digest, version, positions, missing scan evidence or annotations', async () => {
  const report = await parseDockerReport(readFileSync(join(fixture, 'report.json'), 'utf8'));
  for (const altered of [
    { ...report, source: { ...report.source, text: report.source.text + '# changed' } },
    { ...report, engine: { ...report.engine, version: '1.0.0' } },
    { ...report, imageScan: 'PASS' },
    { ...report, findings: [{ ...report.findings[0], line: 99999 }] },
    { ...report, annotations: [{ id: report.findings[0]!.id, reason: '  ' }] },
    { ...report, annotations: [{ id: 'unknown', reason: 'No' }] },
    { ...report, findings: [report.findings[0], report.findings[0]] },
  ])
    await expect(parseDockerReport(JSON.stringify(altered))).rejects.toThrow(
      /digest|Unsupported|Invalid|Unknown|Duplicate|limit/,
    );
  await expect(createDockerReport('../Dockerfile', 'FROM alpine\n', [])).rejects.toThrow(
    /digest|Unsupported|Invalid|Unknown|Duplicate|limit/,
  );
  await expect(parseDockerReport('x'.repeat(2_000_001))).rejects.toThrow(
    /digest|Unsupported|Invalid|Unknown|Duplicate|limit/,
  );
});
test('invalid UTF-8, oversize, symlinks, unknown options fail with no successful report or source leak', () => {
  const temp = mkdtempSync(join(tmpdir(), 'stw32-invalid-'));
  try {
    const file = join(temp, 'Dockerfile'),
      link = join(temp, 'link');
    writeFileSync(file, Buffer.from([0xff, 0xfe]));
    expect(run(['scan', file]).status).toBe(2);
    writeFileSync(file, '# PRIVATE_CANARY\n' + 'x'.repeat(128_001));
    const large = run(['scan', file]);
    expect(large.status).toBe(2);
    expect(large.stdout).toBe('');
    expect(large.stderr).not.toContain('PRIVATE_CANARY');
    symlinkSync(file, link);
    expect(run(['scan', link]).status).toBe(2);
    expect(run(['scan', file, '--build', 'true']).status).toBe(2);
    writeFileSync(file, 'not a docker instruction\n');
    const syntax = run(['scan', file]);
    expect(syntax.status).toBe(0);
    expect(JSON.parse(syntax.stdout).findings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'DL1000', level: 'error' })]),
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
