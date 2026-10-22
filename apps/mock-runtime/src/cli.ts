#!/usr/bin/env node
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, writeFile, open, rename, unlink, lstat, realpath, stat } from 'node:fs/promises';
import { resolve, dirname, basename, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { parseArgs } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import {
  compileMockContract,
  initialMockState,
  parseMockState,
  MOCK_LIMITS,
} from '@sid-tools/core/mock-runtime';
import { createMockResponder } from './engine.js';
const help = `mock-runtime CONTRACT.json --state STATE.json --seed SEED --confirm-test-data [--port 4010] [--web-root apps/web/dist]
OpenAPI 3.0.x JSON response subset. Binds 127.0.0.1 only. Mock URLs: /mock/<contract path>.
Open the printed local UI URL to select response/status and 0–5000 ms delay.
State is written only to the explicit --state file (0600); contract hash and seed must match on restart.
Stop: Ctrl-C / SIGTERM. No request logging, upstream calls, callbacks, CORS or public listening.
--confirm-test-data asserts that the contract and examples are safe test data; no automatic anonymization.
Build the shared SPA before starting. Never pass production credentials.\n`;
async function boundedFile(path: string, max: number) {
  const f = await open(path, 'r');
  try {
    if (!(await f.stat()).isFile()) throw new Error('regular-file-required');
    const b = Buffer.alloc(max + 1);
    let length = 0;
    while (length < b.length) {
      const r = await f.read(b, length, b.length - length);
      if (!r.bytesRead) break;
      length += r.bytesRead;
    }
    if (length > max) throw new Error('file-size-limit');
    try {
      return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
        b.subarray(0, length),
      );
    } catch {
      throw new Error('utf8-required');
    }
  } finally {
    await f.close();
  }
}
async function main() {
  const { values, positionals } = parseArgs({
    options: {
      state: { type: 'string' },
      seed: { type: 'string' },
      port: { type: 'string' },
      'web-root': { type: 'string' },
      'confirm-test-data': { type: 'boolean' },
      help: { type: 'boolean' },
    },
    allowPositionals: true,
    strict: true,
  });
  if (values.help) {
    process.stdout.write(help);
    return;
  }
  if (positionals.length !== 1 || !values.state || !values.seed || !values['confirm-test-data'])
    throw new Error('contract-state-seed-and-test-data-confirmation-required');
  const port = Number(values.port ?? '4010');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('invalid-port');
  const source = await boundedFile(resolve(positionals[0]!), MOCK_LIMITS.sourceBytes);
  const sourceHash = createHash('sha256').update(source).digest('hex'),
    contract = compileMockContract(source, values.seed);
  const enginePackage = createRequire(import.meta.url)('find-my-way/package.json') as {
    version: string;
  };
  if (enginePackage.version !== '9.10.0') throw new Error('router-version-mismatch');
  const respond = createMockResponder(contract);
  const webRoot = await realpath(
    values['web-root']
      ? resolve(values['web-root'])
      : fileURLToPath(new URL('../../web/dist/', import.meta.url)),
  );
  if (!(await stat(resolve(webRoot, 'tools/mock-api/index.html'))).isFile())
    throw new Error('build-web-first');
  const statePath = resolve(await realpath(dirname(resolve(values.state))), basename(values.state));
  if (statePath === (await realpath(positionals[0]!)))
    throw new Error('state-cannot-overwrite-contract');
  const lockPath = statePath + '.lock',
    lock = await open(lockPath, 'wx', 0o600);
  await lock.close();
  let state = initialMockState(contract, sourceHash),
    origin = '',
    active = 0,
    saving = false;
  const lifetime = new AbortController();
  const server = createServer((req, res) => {
    void handle(req, res).catch(() => {
      if (!res.headersSent) send(res, 500, { error: 'request-failed' });
      else res.destroy();
    });
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  server.maxHeadersCount = 32;
  async function persist(next: typeof state) {
    const temp = `${statePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temp, JSON.stringify(next, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      await rename(temp, statePath);
    } finally {
      await unlink(temp).catch(() => {});
    }
  }
  function send(res: ServerResponse, status: number, value: unknown) {
    res.writeHead(status, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow',
    });
    res.end(JSON.stringify(value));
  }
  async function body(req: IncomingMessage, limit: number) {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      size += b.length;
      if (size > limit) throw new Error('body-size-limit');
      chunks.push(b);
    }
    return Buffer.concat(chunks).toString('utf8');
  }
  async function handle(req: IncomingMessage, res: ServerResponse) {
    if (
      req.headers.host !== origin.slice(7) ||
      (req.headers.origin !== undefined && req.headers.origin !== origin)
    ) {
      send(res, 403, { error: 'local-origin-required' });
      req.resume();
      return;
    }
    if (++active > 32) {
      active--;
      send(res, 429, { error: 'concurrency-limit' });
      req.resume();
      return;
    }
    res.once('close', () => {
      active--;
    });
    if (!req.url?.startsWith('/') || req.url.length > 4096) {
      send(res, 400, { error: 'invalid-url' });
      req.resume();
      return;
    }
    const url = new URL(req.url, origin);
    if (url.pathname === '/__sidtools/state') {
      if (req.method === 'GET') {
        req.resume();
        send(res, 200, {
          state,
          choices: contract.choices,
          notices: contract.notices,
          engine: { name: 'find-my-way', version: enginePackage.version },
          mockBase: origin + '/mock',
        });
        return;
      }
      if (
        req.method !== 'POST' ||
        req.headers['x-sidtools-control'] !== '1' ||
        req.headers['content-type'] !== 'application/json'
      ) {
        send(res, 403, { error: 'explicit-json-control-required' });
        req.resume();
        return;
      }
      let candidate: typeof state;
      try {
        candidate = parseMockState(
          JSON.parse(await body(req, MOCK_LIMITS.stateBytes)) as unknown,
          contract,
          sourceHash,
        );
      } catch {
        send(res, 400, { error: 'invalid-state' });
        return;
      }
      if (saving || candidate.revision !== state.revision) {
        send(res, 409, { error: 'state-changed-reload' });
        return;
      }
      if (state.revision >= Number.MAX_SAFE_INTEGER) {
        send(res, 409, { error: 'revision-exhausted' });
        return;
      }
      saving = true;
      try {
        candidate.revision++;
        await persist(candidate);
        state = candidate;
        send(res, 200, { state });
      } finally {
        saving = false;
      }
      return;
    }
    if (url.pathname.startsWith('/mock/')) {
      try {
        await body(req, 65_536);
      } catch {
        if (!res.destroyed) send(res, 413, { error: 'request-size-limit' });
        return;
      }
      const snapshot = state;
      const result = respond(snapshot, req.method ?? '', url.pathname.slice(5));
      if (result.delayMs) await delay(result.delayMs, undefined, { signal: lifetime.signal });
      if (res.destroyed) return;
      res.writeHead(result.status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'x-robots-tag': 'noindex, nofollow',
        ...result.headers,
      });
      res.end(result.body);
      return;
    }
    req.resume();
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, { error: 'method-not-allowed' });
      return;
    }
    let path: string;
    try {
      path = decodeURIComponent(url.pathname);
    } catch {
      send(res, 400, { error: 'invalid-path' });
      return;
    }
    if (path.includes('\0') || path.includes('\\')) {
      send(res, 400, { error: 'invalid-path' });
      return;
    }
    const requested = resolve(webRoot, '.' + path, path.endsWith('/') ? 'index.html' : '.');
    let file: string;
    try {
      file = await realpath(requested);
    } catch {
      send(res, 404, { error: 'not-found' });
      return;
    }
    if (!file.startsWith(webRoot + sep)) {
      send(res, 403, { error: 'path-outside-web-root' });
      return;
    }
    const types: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.wasm': 'application/wasm',
    };
    const type = types[extname(file)];
    if (!type || !(await stat(file)).isFile()) {
      send(res, 404, { error: 'not-found' });
      return;
    }
    let content: string | Buffer = await readFile(file);
    if (extname(file) === '.html')
      content = content.toString('utf8').replace(/connect-src [^;]+;/, "connect-src 'self';");
    res.writeHead(200, {
      'content-type': type,
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow',
    });
    res.end(req.method === 'HEAD' ? undefined : content);
  }
  try {
    try {
      const info = await lstat(statePath);
      if (!info.isFile() || info.isSymbolicLink()) throw new Error('state-regular-file-required');
      const saved = await boundedFile(statePath, MOCK_LIMITS.stateBytes);
      let parsed: unknown;
      try {
        parsed = JSON.parse(saved);
      } catch {
        throw new Error('invalid-state-json');
      }
      state = parseMockState(parsed, contract, sourceHash);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      await persist(state);
    }
    await new Promise<void>((ok, fail) => {
      server.once('error', fail);
      server.listen(port, '127.0.0.1', () => {
        server.off('error', fail);
        ok();
      });
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('listen-failed');
    origin = `http://127.0.0.1:${address.port}`;
    process.stdout.write(
      JSON.stringify({
        event: 'ready',
        origin,
        url: origin + '/tools/mock-api/',
        mockBase: origin + '/mock',
        host: address.address,
        sourceHash,
        engine: 'find-my-way 9.10.0',
        stop: 'Ctrl-C / SIGTERM',
      }) + '\n',
    );
    await new Promise<void>((done) => {
      const stop = () => {
        process.off('SIGINT', stop);
        process.off('SIGTERM', stop);
        lifetime.abort();
        server.closeAllConnections();
        server.close(() => done());
      };
      process.once('SIGINT', stop);
      process.once('SIGTERM', stop);
    });
  } finally {
    lifetime.abort();
    server.closeAllConnections();
    if (server.listening) await new Promise<void>((done) => server.close(() => done()));
    await unlink(lockPath);
  }
}
main().catch((error: unknown) => {
  process.stderr.write(
    `Mock runtime refused: ${error instanceof Error ? error.message : 'unknown-error'}\nUse --help for the supported scope.\n`,
  );
  process.exitCode = 1;
});
