import { expect, test, vi } from 'vite-plus/test';
import { Composer } from 'yaml';
import { parseComposeSource, COMPOSE_LIMITS } from './compose-parser.js';
test('separate adapter uses bounded YAML1.2 types, Map projection and exact original ranges', () => {
  const source = '\uFEFFservices:\r\n  "a/b~c":\r\n    image: "synthetic:1"\r\n';
  const report = parseComposeSource(source);
  expect(report.status).toBe('parsed');
  const service = report.root!.map.get('services')!.map.get('a/b~c')!;
  expect(service.keyLocation).toMatchObject({ path: '/services/a~1b~0c', line: 2, column: 3 });
  const image = service.map.get('image')!;
  expect(image.location).toMatchObject({ path: '/services/a~1b~0c/image', line: 3, column: 12 });
  expect(source.slice(image.location.start, image.location.end)).toBe('"synthetic:1"');
  expect(
    parseComposeSource('{"__proto__":null,"constructor":true}').root!.map.get('constructor')!.kind,
  ).toBe('boolean');
});
test.each([
  'a: &x 1\nb: *x',
  'a: !custom x',
  '%YAML 1.2\n---\na: x',
  'a: {<<: {b: x}}',
  '{"\\u003c\\u003c": 1}',
  '---\na: x\n---\nb: y',
  '? [x,y]\n: z',
])('unsupported YAML features never reach Composer %#', (source) => {
  const spy = vi.spyOn(Composer.prototype, 'compose');
  try {
    expect(parseComposeSource(source)).toMatchObject({ status: 'unsupported', root: null });
    expect(spy).not.toHaveBeenCalled();
  } finally {
    spy.mockRestore();
  }
});
test.each(['a: 1\na: 2', '{"a":1,"\\u0061":2}', '{200: x}', 'a: [x, y}', 'a:\n\tb: x'])(
  'invalid YAML/duplicates/key types refuse static model %#',
  (source) => {
    expect(parseComposeSource(source)).toMatchObject({ status: 'invalid', root: null });
  },
);
test('pre-Composer input/token/collection/scalar/depth bounds fail closed', () => {
  const sources = [
    ' '.repeat(COMPOSE_LIMITS.codeUnits + 1),
    'a: "' + 'x'.repeat(COMPOSE_LIMITS.scalarUnits + 1) + '"',
    '[' + '0,'.repeat(COMPOSE_LIMITS.entries) + '0]',
    '\n'.repeat(COMPOSE_LIMITS.tokenNodes + 1) + 'a: x',
    '['.repeat(50_000) + '0' + ']'.repeat(50_000),
  ];
  const spy = vi.spyOn(Composer.prototype, 'compose');
  try {
    for (const source of sources) {
      const start = performance.now(),
        report = parseComposeSource(source),
        elapsed = performance.now() - start;
      expect(report).toMatchObject({ status: 'limit', root: null });
      expect(elapsed).toBeLessThan(5000);
    }
    expect(spy).not.toHaveBeenCalled();
  } finally {
    spy.mockRestore();
  }
});
test('dynamic key paths redact expression/default text, large keys/deep paths bounded', () => {
  const report = parseComposeSource('services:\n  "${VAR:-SECRET_DEFAULT}":\n    image: x');
  expect(report.root!.map.get('services')!.map.get('${VAR:-SECRET_DEFAULT}')!.location.path).toBe(
    '/services/@dynamic:0',
  );
  expect(parseComposeSource('"' + 'x'.repeat(257) + '": x').status).toBe('limit');
  let source = '{"image":"x"}';
  for (let i = 0; i < 20; i++) source = '{"' + 'x'.repeat(128) + '":' + source + '}';
  expect(parseComposeSource(source)).toMatchObject({
    status: 'limit',
    code: 'path-budget',
    root: null,
  });
});
