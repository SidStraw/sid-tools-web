// Isolated, checksum-verified research dependency; never changes package.json or globals.
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const metadata = JSON.parse(
  readFileSync(new URL('./compiler-source.json', import.meta.url), 'utf8'),
);
if (
  metadata.name !== 'typescript' ||
  metadata.version !== '5.9.3' ||
  metadata.dist.tarball !== 'https://registry.npmjs.org/typescript/-/typescript-5.9.3.tgz'
)
  throw Error('Unexpected compiler source');
const response = await fetch(metadata.dist.tarball, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw Error(`Download failed: ${response.status}`);
const data = Buffer.from(await response.arrayBuffer());
if (
  data.length > 16_000_000 ||
  'sha512-' + createHash('sha512').update(data).digest('base64') !== metadata.dist.integrity
)
  throw Error('Compiler integrity mismatch');
const dir = mkdtempSync(join(tmpdir(), 'stw21-typescript-5.9.3-')),
  archive = join(dir, 'typescript.tgz');
writeFileSync(archive, data);
execFileSync('tar', ['-xzf', archive, '-C', dir]);
console.log(join(dir, 'package'));
