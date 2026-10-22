import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import type { MockChoice, MockState } from '@sid-tools/core/mock-runtime';
export interface MockSnapshot {
  state: MockState;
  choices: MockChoice[];
  notices: string[];
  mockBase: string;
}
export async function startMock(file: string, state: string, extra: string[] = []) {
  const child = spawn(
    process.execPath,
    [
      resolve('apps/mock-runtime/dist/cli.mjs'),
      file,
      '--state',
      state,
      '--seed',
      'test-42',
      '--confirm-test-data',
      '--port',
      '0',
      ...extra,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  let stdout = '',
    stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (part: string) => {
    stderr += part;
  });
  const ready = await new Promise<{ origin: string; url: string; host: string }>((ok, fail) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      fail(new Error('Mock startup timeout'));
    }, 15_000);
    const finish = () => clearTimeout(timeout);
    child.once('error', (error) => {
      finish();
      fail(error);
    });
    child.once('exit', () => {
      finish();
      fail(new Error(`Mock startup failed: ${stderr}`));
    });
    child.stdout.on('data', (part: string) => {
      stdout += part;
      if (stdout.includes('\n')) {
        finish();
        try {
          ok(JSON.parse(stdout.split('\n')[0]!) as { origin: string; url: string; host: string });
        } catch (error) {
          child.kill();
          fail(error);
        }
      }
    });
  });
  async function stop() {
    if (child.exitCode !== null || child.signalCode !== null) return;
    await new Promise<void>((done) => {
      const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
      child.once('exit', () => {
        clearTimeout(timer);
        done();
      });
      child.kill('SIGTERM');
    });
  }
  return {
    ...ready,
    stop,
    output: () => ({ stdout, stderr }),
    snapshot: async () =>
      (await (await fetch(ready.origin + '/__sidtools/state')).json()) as MockSnapshot,
  };
}
export function saveMock(origin: string, state: MockState, headers: Record<string, string> = {}) {
  return fetch(origin + '/__sidtools/state', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-sidtools-control': '1', ...headers },
    body: JSON.stringify(state),
  });
}
