#!/usr/bin/env node
import { readFile, stat } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { compareBundles, parseBundleReport, type ByteMetric } from '@sid-tools/core/bundle-diff';
async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: 'boolean' },
      metric: { type: 'string', default: 'gzip' },
      budget: { type: 'string' },
    },
  });
  if (values.help) {
    process.stdout.write(
      'Usage: bundle-diff base.json candidate.json [--metric raw|gzip|brotli] [--budget BYTES]\nReads reports only. Budget covers sum of emitted outputs, not page traffic. Exit 0: comparable/pass; 2: exceeded; 3: incomparable; 1: invalid input.\n',
    );
    return;
  }
  if (
    positionals.length !== 2 ||
    !['raw', 'gzip', 'brotli'].includes(values.metric) ||
    (values.budget !== undefined && !/^\d+$/.test(values.budget))
  )
    throw new Error('invalid arguments');
  const read = async (path: string) => {
    const info = await stat(path);
    if (!info.isFile() || info.size > 8_000_000) throw new Error('limit');
    return parseBundleReport(await readFile(path, 'utf8'));
  };
  const [before, after] = await Promise.all(positionals.map(read));
  const result = compareBundles(
    before!,
    after!,
    values.budget === undefined
      ? null
      : { metric: values.metric as ByteMetric, limit: Number(values.budget) },
  );
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = !result.comparable ? 3 : result.budget?.status === 'exceeded' ? 2 : 0;
}
void main().catch(() => {
  process.stderr.write(
    '無法比較：請確認參數、報告格式與 8 MB 限制。使用 --help 查看用法；未輸出原始輸入。\n',
  );
  process.exitCode = 1;
});
