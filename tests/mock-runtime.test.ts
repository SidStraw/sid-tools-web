import { describe, it, expect } from 'vite-plus/test';
import {
  readFile,
  mkdtemp,
  writeFile,
  rm,
  stat,
  access,
  rename,
  mkdir,
  readdir,
} from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createServer, request } from 'node:http';
import {
  compileMockContract,
  initialMockState,
  parseMockState,
} from '@sid-tools/core/mock-runtime';
import { startMock, saveMock } from './helpers/mock-runtime';
const fixture = resolve('tests/fixtures/mock-runtime/contract.json');
const source = async () => JSON.stringify(JSON.parse(await readFile(fixture, 'utf8')) as unknown);
describe('mock contract boundary', () => {
  it('generates independently validated fixed and seeded choices, rejects incompatible persisted settings', async () => {
    const c = compileMockContract(await source(), 'a'),
      same = compileMockContract(await source(), 'a'),
      other = compileMockContract(await source(), 'b');
    expect(c).toEqual(same);
    expect(c.choices).toHaveLength(4);
    expect(c.choices.find((v) => v.path === '/orders')!.fixtureJson).not.toBe(
      other.choices.find((v) => v.path === '/orders')!.fixtureJson,
    );
    const state = initialMockState(c, 'hash');
    expect(parseMockState(state, c, 'hash')).toEqual(state);
    expect(() => parseMockState(state, c, 'other')).toThrow('mismatch');
    for (const changed of [
      { ...state, seed: 'other' },
      { ...state, settings: [] },
      { ...state, settings: state.settings.map((s) => ({ ...s, delayMs: 5001 })) },
      { ...state, settings: state.settings.map((s) => ({ ...s, choice: 'no' })) },
    ])
      expect(() => parseMockState(changed, c, 'hash')).toThrow(/state|setting/);
  });
  it('rejects external, missing, recursive references, unsupported schemas and invalid examples without fetching', async () => {
    const base = await source();
    for (const ref of ['https://example.invalid/schema', '#/components/schemas/missing']) {
      expect(() =>
        compileMockContract(base.replace('"type":"integer"', `"$ref":${JSON.stringify(ref)}`), 'a'),
      ).toThrow(/reference/);
    }
    expect(() => compileMockContract(base.replace('3.0.3', '3.1.0'), 'a')).toThrow(/unsupported/);
    expect(() =>
      compileMockContract(
        base.replace('"type":"integer"', '"type":"integer","format":"int64"'),
        'a',
      ),
    ).toThrow(/fixture-refused/);
    expect(() => compileMockContract(base.replace('"id":1', '"id":"bad"'), 'a')).toThrow(
      /fixture-refused/,
    );
    expect(() => compileMockContract('x'.repeat(524289), 'a')).toThrow('source-size-limit');
    expect(() =>
      compileMockContract(base.replace('"200":{', '"204":{"description":"empty"},"200":{'), 'a'),
    ).toThrow('bodyless-unsupported');
    expect(() => compileMockContract(base.replace('"200":{', '"default":{'), 'a')).toThrow(
      'status-unsupported',
    );
    expect(() =>
      compileMockContract(base.replaceAll('application/json', 'text/plain'), 'a'),
    ).toThrow(/contract|unsupported/);
    expect(() => compileMockContract(base.replace('/pets/{id}', '/pets/{id}/{id}'), 'a')).toThrow(
      'route-template-unsupported',
    );
    const recursive = JSON.parse(base) as {
      components: unknown;
      paths: Record<
        string,
        { get: { responses: Record<string, { content: Record<string, { schema: unknown }> }> } }
      >;
    };
    recursive.components = {
      schemas: {
        Loop: { type: 'object', properties: { self: { $ref: '#/components/schemas/Loop' } } },
      },
    };
    recursive.paths['/pets/{id}']!.get.responses['200']!.content['application/json']!.schema = {
      $ref: '#/components/schemas/Loop',
    };
    expect(() => compileMockContract(JSON.stringify(recursive), 'a')).toThrow(/fixture-refused/);
  });
});
it('real HTTP: route, example/status changes, delay, persistence across processes, Host/Origin and no upstream', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'stw24-')),
    statePath = join(dir, 'state.json'),
    contractPath = join(dir, 'contract.json');
  let hits = 0;
  const canary = createServer((_req, res) => {
    hits++;
    res.end('must not call');
  });
  await new Promise<void>((done) => canary.listen(0, '127.0.0.1', done));
  const address = canary.address();
  if (!address || typeof address === 'string') throw new Error('canary');
  await writeFile(
    contractPath,
    (await source()).replace(
      'https://never-call.example.invalid',
      `http://127.0.0.1:${address.port}`,
    ),
  );
  let runtime: Awaited<ReturnType<typeof startMock>> | undefined;
  try {
    runtime = await startMock(contractPath, statePath);
    const origin = runtime.origin;
    expect(runtime.host).toBe('127.0.0.1');
    let snapshot = await runtime.snapshot();
    const first = await fetch(origin + '/mock/pets/42');
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ id: 1, name: 'Mochi' });
    const seeded = await (
      await fetch(origin + '/mock/orders', {
        method: 'POST',
        body: 'ignored-secret',
        headers: { authorization: 'Bearer do-not-log' },
      })
    ).text();
    expect((await fetch(origin + '/mock/missing')).status).toBe(404);
    expect((await fetch(origin + '/mock/pets/42', { method: 'DELETE' })).status).toBe(404);
    expect(
      (await fetch(origin + '/__sidtools/state', { headers: { origin: 'https://evil.invalid' } }))
        .status,
    ).toBe(403);
    const badHost = await new Promise<number | undefined>((ok, fail) => {
      const r = request(
        origin + '/__sidtools/state',
        { headers: { host: 'evil.invalid' } },
        (res) => {
          res.resume();
          ok(res.statusCode);
        },
      );
      r.on('error', fail);
      r.end();
    });
    expect(badHost).toBe(403);
    expect(
      (
        await fetch(origin + '/__sidtools/state', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(snapshot.state),
        })
      ).status,
    ).toBe(403);
    const second = snapshot.choices.find((c) => c.example === 'second')!;
    snapshot.state.settings.find((s) => s.operation === second.operation)!.choice = second.id;
    expect((await saveMock(origin, snapshot.state)).status).toBe(200);
    const alternate = await fetch(origin + '/mock/pets/42?__server=http://evil.invalid', {
      headers: { prefer: 'dynamic=true, code=500', accept: 'text/html' },
    });
    expect(await alternate.json()).toEqual({ id: 2, name: '<img src=x onerror=alert(1)>' });
    expect((await saveMock(origin, snapshot.state)).status).toBe(409);
    snapshot = await runtime.snapshot();
    const error = snapshot.choices.find((c) => c.status === '503')!;
    Object.assign(
      snapshot.state.settings.find((s) => s.operation === error.operation)!,
      { choice: error.id, delayMs: 180 },
    );
    expect((await saveMock(origin, snapshot.state)).status).toBe(200);
    const start = performance.now();
    const delayed = await fetch(origin + '/mock/pets/42');
    expect(delayed.status).toBe(503);
    expect(await delayed.json()).toEqual({ error: 'try-again' });
    expect(performance.now() - start).toBeGreaterThanOrEqual(160);
    const before = await readFile(statePath, 'utf8');
    snapshot = await runtime.snapshot();
    snapshot.state.settings[0]!.delayMs = -1;
    expect((await saveMock(origin, snapshot.state)).status).toBe(400);
    expect(await readFile(statePath, 'utf8')).toBe(before);
    expect((await stat(statePath)).mode & 0o777).toBe(0o600);
    // Force an atomic rename failure: the server must preserve its previous in-memory settings.
    const unchanged = (await runtime.snapshot()).state;
    await rename(statePath, statePath + '.backup');
    await mkdir(statePath);
    const savingFailure = await saveMock(origin, unchanged);
    expect(savingFailure.status).toBe(500);
    expect((await runtime.snapshot()).state).toEqual(unchanged);
    expect((await readdir(dir)).some((name) => name.endsWith('.tmp'))).toBe(false);
    await rm(statePath, { recursive: true });
    await rename(statePath + '.backup', statePath);

    const html = await (await fetch(runtime.url)).text();
    expect(html).toContain("connect-src 'self';");
    expect(html).toContain('mock-connect');
    expect(
      (await fetch(origin + '/__sidtools/state')).headers.get('access-control-allow-origin'),
    ).toBeNull();
    expect(runtime.output().stdout + runtime.output().stderr).not.toContain('do-not-log');
    expect(runtime.output().stderr).toBe('');
    await runtime.stop();
    await expect(fetch(origin + '/mock/pets/42')).rejects.toThrow(/fetch failed/);
    await expect(access(statePath + '.lock')).rejects.toThrow(/ENOENT/);
    runtime = await startMock(contractPath, statePath);
    expect((await runtime.snapshot()).state).toEqual(JSON.parse(before));
    expect((await fetch(runtime.origin + '/mock/pets/42')).status).toBe(503);
    expect(await (await fetch(runtime.origin + '/mock/orders', { method: 'POST' })).text()).toBe(
      seeded,
    );
    expect(hits).toBe(0);
  } finally {
    await runtime?.stop();
    await new Promise<void>((done) => canary.close(() => done()));
    await rm(dir, { recursive: true, force: true });
  }
}, 20_000);
it('refuses missing confirmation, incompatible state and second writer without overwriting', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'stw24-refuse-')),
    state = join(dir, 'state.json');
  let runtime: Awaited<ReturnType<typeof startMock>> | undefined;
  const cli = (args: string[]) =>
    spawnSync(process.execPath, [resolve('apps/mock-runtime/dist/cli.mjs'), ...args], {
      encoding: 'utf8',
      timeout: 5000,
    });
  try {
    expect(cli([fixture, '--state', state, '--seed', 'test-42']).status).toBe(1);
    runtime = await startMock(fixture, state);
    const saved = await readFile(state, 'utf8');
    const duplicate = cli([
      fixture,
      '--state',
      state,
      '--seed',
      'test-42',
      '--confirm-test-data',
      '--port',
      '0',
    ]);
    expect(duplicate.status).toBe(1);
    expect(duplicate.stderr).toContain('EEXIST');
    expect(await readFile(state, 'utf8')).toBe(saved);
    await runtime.stop();
    const mismatch = cli([
      fixture,
      '--state',
      state,
      '--seed',
      'other',
      '--confirm-test-data',
      '--port',
      '0',
    ]);
    expect(mismatch.status).toBe(1);
    expect(mismatch.stderr).toContain('mismatch');
    expect(await readFile(state, 'utf8')).toBe(saved);
    await expect(access(state + '.lock')).rejects.toThrow(/ENOENT/);
  } finally {
    await runtime?.stop();
    await rm(dir, { recursive: true, force: true });
  }
}, 15_000);
