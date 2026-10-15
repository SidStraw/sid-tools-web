import { expect, test, vi } from 'vite-plus/test';
import { Composer, Parser } from 'yaml';
import { parseOpenApiSource, OAS_PARSE_LIMITS } from './openapi-parser.js';

test('installed Parser/Composer API composes only accepted tokens and preserves scalar source precision', () => {
  expect(typeof Parser).toBe('function');
  expect(typeof Composer).toBe('function');
  const report = parseOpenApiSource(
    '{"n":1E400,"i":12345678901234567890,"decimal":1.10,"quoted":"1"}',
  );
  expect(report.status).toBe('valid');
  expect(report.root?.map.get('n')).toMatchObject({ kind: 'number', text: '1e400' });
  expect(report.root?.map.get('i')?.text).toBe('1234567890123456789e1');
  expect(report.root?.map.get('decimal')?.text).toBe('11e-1');
  expect(report.root?.map.get('quoted')).toMatchObject({ kind: 'string', text: '1' });
});

test.each([
  '%YAML 1.2\n---\na: 1',
  '%TAG !e! tag:x:\n---\na: x',
  'a: &x 1\nb: *x',
  'a: !custom x',
  'a: [*x]',
  '? [a, b]\n: x',
  'a: { <<: x }',
  '{"\\u003c\\u003c": {a: 1}}',
  '---\na: 1\n---\nb: 2',
])('forbidden syntax rejects before Composer: %s', (source) => {
  const spy = vi.spyOn(Composer.prototype, 'compose');
  try {
    expect(parseOpenApiSource(source).status).toBe('invalid');
    expect(spy).not.toHaveBeenCalled();
  } finally {
    spy.mockRestore();
  }
});

test.each([
  '{200: a, "200": b}',
  '{0xC8: a, "200": b}',
  'a: 1\na: 2',
  '{true: x}',
  '{null: x}',
  '? {a: b}\n: x',
])('normalized keys/prototype-safe projection rejects ambiguity %s', (source) => {
  expect(parseOpenApiSource(source)).toMatchObject({ status: 'invalid', root: null });
});

test('string keys __proto__/constructor remain Map data; decimal/hex/octal compare exactly', () => {
  const result = parseOpenApiSource('__proto__: 0x10\nconstructor: 0o20\ndecimal: 16.00');
  expect(result.status).toBe('valid');
  expect([...result.root!.map.keys()]).toEqual(['__proto__', 'constructor', 'decimal']);
  expect([...result.root!.map.values()].map((n) => n.text)).toEqual(['16e0', '16e0', '16e0']);
});

test('UTF16 ranges preserve BOM, CRLF and escaped pointer names without normalizing source', () => {
  const source = '\uFEFFa:\r\n  "x/y~z": "你好"\r\n';
  const result = parseOpenApiSource(source);
  expect(result.status).toBe('valid');
  const value = result.root!.map.get('a')!.map.get('x/y~z')!;
  expect(value.location).toMatchObject({ pointer: '/a/x~1y~0z', line: 2, column: 12 });
  expect(source.slice(value.location.start, value.location.end)).toBe('"你好"');
});

test('hostile 5000/50000 flow nesting and deep block tokens never reach recursive Composer', () => {
  const spy = vi.spyOn(Composer.prototype, 'compose');
  try {
    for (const depth of [5000, 50_000]) {
      const text = '['.repeat(depth) + '0' + ']'.repeat(depth);
      const start = performance.now(),
        report = parseOpenApiSource(text),
        elapsed = performance.now() - start;
      expect(report).toMatchObject({ status: 'limit', root: null });
      expect(elapsed).toBeLessThan(5_000);
      console.info(
        `OpenAPI preflight flow depth ${depth}, ${text.length} code units: ${elapsed.toFixed(1)}ms; Composer calls ${spy.mock.calls.length}`,
      );
    }
    const block = Array.from({ length: 600 }, (_, i) => ' '.repeat(i * 2) + 'a:\n').join('');
    expect(parseOpenApiSource(block)).toMatchObject({ status: 'limit', root: null });
    expect(spy).not.toHaveBeenCalled();
  } finally {
    spy.mockRestore();
  }
}, 20_000);

test('input/scalar/entry/token budgets all reject before Composer', () => {
  const spy = vi.spyOn(Composer.prototype, 'compose');
  try {
    for (const source of [
      ' '.repeat(OAS_PARSE_LIMITS.codeUnits + 1),
      'a: "' + 'x'.repeat(OAS_PARSE_LIMITS.scalar + 1) + '"',
      '[' + '0,'.repeat(OAS_PARSE_LIMITS.entries) + '0]',
      '\n'.repeat(OAS_PARSE_LIMITS.nodes + 1) + 'a: 1',
    ]) {
      expect(parseOpenApiSource(source)).toMatchObject({ status: 'limit', root: null });
    }
    expect(spy).not.toHaveBeenCalled();
  } finally {
    spy.mockRestore();
  }
});

test('YAML1.2 strings/booleans, nonfinite/exponent safeguards and tabs/malformed data are honest', () => {
  const parsed = parseOpenApiSource('a: yes\nb: true\nc: .inf\nd: 1e9999999');
  expect(parsed.root!.map.get('a')?.kind).toBe('string');
  expect(parsed.root!.map.get('b')?.kind).toBe('boolean');
  expect(parsed.root!.map.get('c')?.kind).toBe('nonfinite');
  expect(parsed.root!.map.get('d')?.kind).toBe('nonfinite');
  expect(parseOpenApiSource('a:\n\tb: c').status).toBe('invalid');
  expect(parseOpenApiSource('{a: [1, 2}').status).toBe('invalid');
});

test('numeric map-key expansion has a separate bounded allocation policy', () => {
  expect(parseOpenApiSource('{1e400: x}')).toMatchObject({ status: 'limit', root: null });
  expect(parseOpenApiSource('{1.10: x, "1.1": y}').status).toBe('invalid');
  expect(parseOpenApiSource('{0o310: x, "200": y}').status).toBe('invalid');
});

test.each(['map', 'seq'] as const)(
  'single %s with 10001 entries rejects before Composer',
  (kind) => {
    const source =
      kind === 'map'
        ? '{' + Array.from({ length: 10_001 }, (_, i) => `"k${i}":0`).join(',') + '}'
        : '[' + Array.from({ length: 10_001 }, () => '0').join(',') + ']';
    const spy = vi.spyOn(Composer.prototype, 'compose');
    try {
      expect(parseOpenApiSource(source)).toMatchObject({
        status: 'limit',
        root: null,
        issues: [{ code: 'entry-limit' }],
      });
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  },
);

test('entry allowance is per collection; global token objects still reject before Composer', () => {
  const accepted =
    '[' + Array.from({ length: 6 }, () => '[' + '0,'.repeat(1999) + '0]').join(',') + ']';
  expect(parseOpenApiSource(accepted).status).toBe('valid');
  const spy = vi.spyOn(Composer.prototype, 'compose');
  try {
    expect(parseOpenApiSource('\n'.repeat(OAS_PARSE_LIMITS.nodes + 1) + 'a: 1')).toMatchObject({
      status: 'limit',
      root: null,
      issues: [{ code: 'token-node-limit' }],
    });
    expect(spy).not.toHaveBeenCalled();
  } finally {
    spy.mockRestore();
  }
});
