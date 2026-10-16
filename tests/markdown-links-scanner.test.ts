import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, expect, test, vi } from 'vite-plus/test';
import { parseMarkdownDocument } from '@sid-tools/core/markdown-links';
import { scan } from '../apps/markdown-links/src/scanner';
import { failed } from '../apps/markdown-links/src/model';
import { decodeReport, PROTOCOL } from '../apps/markdown-links/src/protocol';

vi.mock('@sid-tools/core/markdown-links', async (importOriginal) => {
  const original = await importOriginal<typeof import('@sid-tools/core/markdown-links')>();
  return {
    ...original,
    parseMarkdownDocument: vi.fn<typeof original.parseMarkdownDocument>(
      original.parseMarkdownDocument,
    ),
  };
});
const temporary: string[] = [];
afterEach(async () => {
  vi.mocked(parseMarkdownDocument).mockReset();
  const original = await vi.importActual<typeof import('@sid-tools/core/markdown-links')>(
    '@sid-tools/core/markdown-links',
  );
  vi.mocked(parseMarkdownDocument).mockImplementation(original.parseMarkdownDocument);
  await Promise.all(temporary.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

test.each(['markdown-parser-failed', 'invalid-source-path', 'ill-formed-unicode'])(
  'fatal no-model %s cannot resolve prior baseline findings',
  async (code) => {
    const root = await mkdtemp(path.join(tmpdir(), 'stw36-scanner-'));
    temporary.push(root);
    await writeFile(path.join(root, 'a.md'), '[x](missing.md)');
    const options = { root, ignores: [], ignoreFile: null, baseline: null, json: true };
    const baseline = await scan(options);
    expect(baseline.status).toBe('complete');
    expect(baseline.counts.broken).toBe(1);
    await writeFile(path.join(root, 'baseline.json'), JSON.stringify(baseline));
    vi.mocked(parseMarkdownDocument).mockReturnValue({
      path: 'a.md',
      status: 'partial',
      anchors: [],
      anchorCoverage: 'unknown',
      links: [],
      diagnostics: [{ code, location: null }],
    });
    const report = await scan({ ...options, baseline: 'baseline.json' });
    expect(report).toMatchObject({
      status: 'failed-coverage',
      failure: 'markdown-parser-failed',
      delta: null,
      findings: [],
    });
  },
);

test('ordinary unsupported HTML remains partial unknown, not fatal coverage', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'stw36-scanner-'));
  temporary.push(root);
  await writeFile(path.join(root, 'a.md'), '<a id="custom"></a>\n[x](missing.md)');
  const report = await scan({ root, ignores: [], ignoreFile: null, baseline: null, json: true });
  expect(report.status).toBe('complete');
  expect(report.counts.broken).toBe(1);
  expect(report.counts.unknown).toBeGreaterThan(0);
});

test('child IPC validates identity, size and strict report shape', () => {
  const envelope = { protocol: PROTOCOL, identity: 'test-id', report: failed('scan-failed') };
  const encode = (value: unknown) => JSON.stringify(value);
  expect(decodeReport(encode(envelope), 'test-id')).toEqual(envelope.report);
  expect(decodeReport(encode(envelope), 'wrong-id')).toBeNull();
  expect(decodeReport(encode({ ...envelope, protocol: 'wrong' }), 'test-id')).toBeNull();
  expect(decodeReport(encode({ ...envelope, extra: true }), 'test-id')).toBeNull();
  expect(
    decodeReport(
      encode({ ...envelope, report: { ...envelope.report, failure: 'raw\nexception' } }),
      'test-id',
    ),
  ).toBeNull();
  expect(
    decodeReport(
      encode({
        ...envelope,
        report: { ...envelope.report, delta: { added: [], resolved: ['fake'], unchanged: [] } },
      }),
      'test-id',
    ),
  ).toBeNull();
  expect(decodeReport('x'.repeat(4_000_257), 'test-id')).toBeNull();
  expect(decodeReport({}, 'test-id')).toBeNull();
});
