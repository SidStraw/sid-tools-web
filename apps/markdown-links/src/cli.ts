#!/usr/bin/env node
import { fork } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { LIMITS, exitCode, failed, terminalSafe, type Options, type Report } from './model';
import { decodeReport, PROTOCOL } from './protocol';

const HELP = `Markdown links — offline, read-only GFM-heading subset checker
Usage: markdown-links [--root DIR] [--ignore RULE ...] [--ignore-file PATH]
                      [--baseline PATH] [--json] [--offline] [--help]
Paths for ignore-file/baseline are explicit root-local regular files.
Default excluded trees: .git, node_modules, dist, .slim (at any depth).
External destinations are skipped; no network mode, fixes, writes or caches.
Exit: 0 no broken/unknown; 1 broken/unknown; 2 invocation/resource/coverage failure.
Heading policy: GFM subset, github-slugger 2.0.0; not full GitHub renderer parity.
`;

function options(args: string[]): Options {
  if (args.length > 100) throw new Error('invocation');
  const result: Options = { root: '.', ignores: [], ignoreFile: null, baseline: null, json: false };
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index++) {
    const flag = args[index]!;
    if (flag === '--json') result.json = true;
    else if (flag === '--offline') continue;
    else if (['--root', '--ignore', '--ignore-file', '--baseline'].includes(flag)) {
      const value = args[++index];
      if (!value || value.startsWith('--') || value.includes('\0') || value.length > 4096)
        throw new Error('invocation');
      if (flag !== '--ignore' && seen.has(flag)) throw new Error('invocation');
      seen.add(flag);
      if (flag === '--root') result.root = value;
      if (flag === '--ignore') {
        if (result.ignores.length >= 32 || value.length > 1024) throw new Error('invocation');
        result.ignores.push(value);
      }
      if (flag === '--ignore-file') result.ignoreFile = value;
      if (flag === '--baseline') result.baseline = value;
    } else throw new Error('invocation');
  }
  return result;
}

function scan(input: Options): Promise<Report> {
  return new Promise((resolve) => {
    const identity = randomUUID();
    const child = fork(new URL('./scan-worker.mjs', import.meta.url), [], {
      execArgv: [`--max-old-space-size=${LIMITS.workerMemoryMb}`, '--stack-size=4096'],
      env: {},
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      serialization: 'json',
    });
    // Native fatal errors remain in a separate process; no child output is forwarded.
    let report: Report | null = null;
    let failure: Report | null = null;
    const stop = (reason: string) => {
      failure ??= failed(reason);
      child.kill('SIGKILL');
    };
    const interrupted = () => stop('scan-interrupted');
    process.on('SIGINT', interrupted);
    process.on('SIGTERM', interrupted);
    process.on('SIGHUP', interrupted);
    const timer = setTimeout(() => stop('scan-time-limit'), LIMITS.durationMs);
    child.on('message', (message: unknown) => {
      if (report || failure) return stop('child-protocol-failed');
      report = decodeReport(message, identity);
      if (!report) stop('child-protocol-failed');
    });
    child.once('error', () => stop('child-failed'));
    // Resolve only after close: the child is reaped and IPC descriptors are closed.
    child.once('close', (code, signal) => {
      clearTimeout(timer);
      process.removeListener('SIGINT', interrupted);
      process.removeListener('SIGTERM', interrupted);
      process.removeListener('SIGHUP', interrupted);
      resolve(
        failure ?? (code === 0 && signal === null && report ? report : failed('child-failed')),
      );
    });
    child.send({ protocol: PROTOCOL, identity, input }, (error) => {
      if (error) stop('child-failed');
    });
  });
}

function print(report: Report, json: boolean): void {
  if (json)
    console.log(
      JSON.stringify(report).replace(/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/gu, (units) =>
        units
          .split('')
          .map((unit) => `\\u${unit.charCodeAt(0).toString(16).padStart(4, '0')}`)
          .join(''),
      ),
    );
  else {
    console.log(`Markdown links: ${report.status}; offline; ${report.renderer}`);
    console.log(JSON.stringify(report.counts));
    if (report.failure) console.log(`Coverage failure: ${report.failure}`);
    for (const finding of report.findings) {
      console.log(
        `${terminalSafe(finding.source)}:${finding.line ?? '?'}:${finding.column ?? '?'} ${finding.status} ${terminalSafe(finding.destination ?? '')} -> ${terminalSafe(finding.target ?? '?')} (${terminalSafe(finding.reason)})`,
      );
    }
    if (report.delta)
      console.log(
        `Baseline: ${report.delta.added.length} added, ${report.delta.resolved.length} resolved, ${report.delta.unchanged.length} unchanged`,
      );
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') {
    console.log(HELP);
    return;
  }
  let json = args.includes('--json');
  try {
    const input = options(args);
    json = input.json;
    const report = await scan(input);
    print(report, json);
    process.exitCode = exitCode(report);
  } catch {
    print(failed('invalid-invocation'), json);
    process.exitCode = 2;
  }
}

await main();
