#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { chmod, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createDockerReport,
  parseDockerReport,
  compareDockerReports,
  HADOLINT_VERSION,
  DOCKERFILE_LIMIT,
  DOCKER_REPORT_LIMIT,
} from '@sid-tools/core/dockerfile-review';
const binaries: Record<string, [string, string]> = {
  'darwin-arm64': [
    'hadolint-macos-arm64',
    '5c09f3213f8e40406abe048233d985eebef336d4a6a20021be47fadb6cf480a2',
  ],
  'darwin-x64': [
    'hadolint-macos-x86_64',
    'ffe9bb18b23d5ed1eae50237aecdbb523d016e96da0bd4e7aa432040acfc3fde',
  ],
  'linux-arm64': [
    'hadolint-linux-arm64',
    'f6198ef8090f404dbb771abfee086eb8c48ac177f30da7fd3510aca35b344b5d',
  ],
  'linux-x64': [
    'hadolint-linux-x86_64',
    'c7187db94eeeeca956519a6af171adc31453941a1e777961f6e680f697c8c507',
  ],
};
const folder = fileURLToPath(
  new URL(`../../../.cache/hadolint/${HADOLINT_VERSION}/`, import.meta.url),
);
const binary = join(folder, 'hadolint');
const platform = binaries[`${process.platform}-${process.arch}`];
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
async function verified() {
  if (!platform) throw new Error('Unsupported platform; supported: macOS/Linux arm64/x64.');
  const stat = await lstat(binary);
  if (!stat.isFile() || stat.size > 120_000_000 || digest(await readFile(binary)) !== platform[1])
    throw new Error('Hadolint checksum mismatch; run install explicitly.');
}
async function install() {
  if (!platform) throw new Error('Unsupported platform.');
  try {
    await verified();
    console.log(`Hadolint ${HADOLINT_VERSION} verified in project cache.`);
    return;
  } catch {
    /* explicit install can replace a corrupt cache */
  }
  const response = await fetch(
    `https://github.com/hadolint/hadolint/releases/download/v${HADOLINT_VERSION}/${platform[0]}`,
    { signal: AbortSignal.timeout(90_000) },
  );
  if (!response.ok || !response.body) throw new Error('Hadolint download failed.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 120_000_000) throw new Error('Hadolint download limit.');
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  if (digest(bytes) !== platform[1]) throw new Error('Downloaded checksum mismatch.');
  await mkdir(folder, { recursive: true });
  const temp = `${binary}.${process.pid}.tmp`;
  try {
    await writeFile(temp, bytes, { flag: 'wx', mode: 0o755 });
    await chmod(temp, 0o755);
    await rename(temp, binary);
  } finally {
    await rm(temp, { force: true });
  }
  await verified();
  console.log(`Installed Hadolint ${HADOLINT_VERSION} in project cache.`);
}
async function input(path: string, limit: number) {
  const stat = await lstat(path);
  if (!stat.isFile() || stat.size > limit) throw new Error('Input must be a bounded regular file.');
  const bytes = await readFile(path);
  if (bytes.length > limit) throw new Error('Input limit.');
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
function run(args: string[], cwd: string, stdin = ''): Promise<string> {
  return new Promise((ok, fail) => {
    const child = execFile(
      binary,
      args,
      {
        cwd,
        env: { LANG: 'C.UTF-8' },
        timeout: 15_000,
        killSignal: 'SIGKILL',
        maxBuffer: 2_000_000,
        encoding: 'utf8',
      },
      (error, stdout) => {
        if (error) fail(new Error('Hadolint failed or exceeded limits; no report produced.'));
        else ok(stdout);
      },
    );
    child.stdin?.on('error', () => {});
    child.stdin?.end(stdin);
  });
}
async function main() {
  const [command, file, ...rest] = process.argv.slice(2);
  if (command === 'install' && file === undefined) {
    await install();
    return;
  }
  if (!['scan', 'review'].includes(command ?? '') || !file || rest.length % 2)
    throw new Error(
      'Usage: dockerfile-review install | scan Dockerfile [--out NEW.json] | review REPORT.json [--baseline OLD.json] [--out NEW.json]',
    );
  const options = new Map<string, string>();
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i]!,
      value = rest[i + 1]!;
    if (
      !['--out', ...(command === 'review' ? ['--baseline'] : [])].includes(key) ||
      options.has(key) ||
      value.startsWith('--')
    )
      throw new Error('Invalid option.');
    options.set(key, value);
  }
  let result: unknown;
  if (command === 'scan') {
    const source = await input(file, DOCKERFILE_LIMIT);
    // Validate before spawning. Never interpret Dockerfile instructions or import user configuration.
    await createDockerReport(basename(file), source, []);
    await verified();
    const temp = await mkdtemp(join(tmpdir(), 'sidtools-hadolint-'));
    try {
      await writeFile(join(temp, 'config.yaml'), '{}\n');
      const version = await run(['--version'], temp);
      if (version.trim() !== `Haskell Dockerfile Linter ${HADOLINT_VERSION}`)
        throw new Error('Hadolint version mismatch.');
      const raw = await run(
        [
          '--config',
          join(temp, 'config.yaml'),
          '--format',
          'json',
          '--no-fail',
          '--no-color',
          '--disable-ignore-pragma',
          '-',
        ],
        temp,
        source,
      );
      result = await createDockerReport(basename(file), source, JSON.parse(raw) as unknown);
    } finally {
      await rm(temp, { recursive: true, force: true });
    }
  } else {
    const report = await parseDockerReport(await input(file, DOCKER_REPORT_LIMIT));
    const previous = options.has('--baseline')
      ? await parseDockerReport(await input(options.get('--baseline')!, DOCKER_REPORT_LIMIT))
      : undefined;
    result = {
      format: 'sid-tools-dockerfile-comparison-v1',
      report,
      comparison: compareDockerReports(report, previous),
    };
  }
  const text = JSON.stringify(result, null, 2) + '\n';
  if (Buffer.byteLength(text) > DOCKER_REPORT_LIMIT) throw new Error('Output limit.');
  if (options.has('--out'))
    await writeFile(options.get('--out')!, text, { flag: 'wx', mode: 0o600 });
  else process.stdout.write(text);
}
void main().catch(() => {
  // Input, source paths and native diagnostics can contain secrets. Do not echo them on failures.
  console.error(
    'Dockerfile review failed. Check command, regular-file input/limits, report format and verified local Hadolint installation. No successful report was produced.',
  );
  process.exitCode = 2;
});
