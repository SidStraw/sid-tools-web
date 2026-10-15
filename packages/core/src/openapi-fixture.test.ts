import { expect, test, vi } from 'vite-plus/test';
import { Composer } from 'yaml';
import {
  inspectOpenApiFixtures,
  generateOpenApiFixture,
  validateOpenApiFixture,
  exportOpenApiFixture,
  exportOpenApiFixtureSummary,
  OPENAPI_FIXTURE_LIMITS,
  type OpenApiFixtureOptions,
} from './openapi-fixture.js';
const options: OpenApiFixtureOptions = {
  method: 'GET',
  path: '/items',
  status: '200',
  mediaType: 'application/json',
  seed: 'fixture-test',
  sourceConfirmedSynthetic: true,
};
const document = (schema: unknown, media: object = {}, components?: object) => ({
  openapi: '3.0.3',
  info: { title: 'Synthetic', version: '1' },
  paths: {
    '/items': {
      get: {
        responses: {
          '200': {
            description: 'Synthetic',
            content: { 'application/json': { schema, ...media } },
          },
        },
      },
    },
  },
  ...(components ? { components } : {}),
});
const doc = (schema: unknown, media: object = {}, components?: object) =>
  JSON.stringify(document(schema, media, components));
const run = (schema: unknown, media: object = {}, overrides: Partial<OpenApiFixtureOptions> = {}) =>
  generateOpenApiFixture(doc(schema, media), { ...options, ...overrides });

test('inspection lists only actual sorted JSON operation/status/media/example identities, never document values', () => {
  const source = JSON.stringify({
    ...document({ type: 'string' }),
    paths: {
      '/z': {
        post: {
          responses: {
            default: {
              description: 'ok',
              content: {
                'application/problem+json;profile=AbC': {
                  schema: { type: 'string' },
                  examples: { z: { value: 'SECRET_VALUE' }, a: { value: 'OTHER_VALUE' } },
                },
                'text/plain': {},
                'application/*+json': {},
              },
            },
          },
        },
      },
      '/items': document({ type: 'string' }).paths['/items'],
    },
  });
  const report = inspectOpenApiFixtures(source);
  expect(report.status).toBe('ready');
  expect(report.selections.map((s) => [s.method, s.path, s.status, s.mediaType])).toEqual([
    ['GET', '/items', '200', 'application/json'],
    ['POST', '/z', 'default', 'application/problem+json;profile=AbC'],
  ]);
  expect(report.selections[1]!.examples.map((e) => e.name)).toEqual(['a', 'z']);
  expect(JSON.stringify(report)).not.toMatch(/SECRET_VALUE|OTHER_VALUE|"schema":|"map":/);
  expect(structuredClone(report)).toEqual(report);
});
test('confirmation is explicit and required for generation/validation/download, not inspection', () => {
  const source = doc({ type: 'string' }, { example: 'synthetic-only' });
  expect(inspectOpenApiFixtures(source).status).toBe('ready');
  const report = generateOpenApiFixture(source, { ...options, sourceConfirmedSynthetic: false });
  expect(report).toMatchObject({
    status: 'confirmation-required',
    fixtureJson: null,
    validation: { status: 'not-run' },
    provenance: [],
  });
  expect(exportOpenApiFixture(report)).toBeNull();
  expect(
    validateOpenApiFixture(source, { ...options, sourceConfirmedSynthetic: false }, '"x"')
      .fixtureJson,
  ).toBeNull();
});
test('valid media example first, then schema example, then seeded generation; defaults not implicit examples', () => {
  const report = run(
    { type: 'string', example: 'SCHEMA_SYNTHETIC', default: 'DEFAULT_SYNTHETIC' },
    { example: 'MEDIA_SYNTHETIC' },
  );
  expect(report).toMatchObject({
    status: 'ready',
    fixtureJson: '"MEDIA_SYNTHETIC"',
    validation: { status: 'passed' },
  });
  expect(report.provenance.map((p) => [p.kind, p.outcome])).toEqual([['media-example', 'used']]);
  const fallback = run(
    { type: 'string', minLength: 2, example: 'SCHEMA_SYNTHETIC' },
    { example: 123 },
  );
  expect(fallback.fixtureJson).toBe('"SCHEMA_SYNTHETIC"');
  expect(fallback.provenance.map((p) => [p.kind, p.outcome])).toEqual([
    ['media-example', 'rejected'],
    ['schema-example', 'used'],
  ]);
  expect(fallback.issues.some((i) => i.code === 'example-invalid-fallback')).toBe(true);
  const generated = run(
    { type: 'string', minLength: 3, maxLength: 3, default: 'SECRET_DEFAULT', example: false },
    { example: 1 },
  );
  expect(generated.status).toBe('ready');
  expect(generated.provenance.map((p) => p.outcome)).toEqual(['rejected', 'rejected', 'used']);
  expect(generated.issues.some((i) => i.code === 'default-not-an-example')).toBe(true);
  expect(generated.fixtureJson).not.toContain('SECRET_DEFAULT');
});
test('named example sorted default or explicit name; named local refs retain use and value definition', () => {
  const media = { examples: { z: { value: 'Z' }, a: { $ref: '#/components/examples/A' } } };
  const source = doc({ type: 'string' }, media, { examples: { A: { value: 'A' } } });
  const report = generateOpenApiFixture(source, options);
  expect(report.fixtureJson).toBe('"A"');
  expect(report.provenance[0]).toMatchObject({
    kind: 'named-example',
    use: { pointer: '/paths/~1items/get/responses/200/content/application~1json/examples/a' },
    definition: { pointer: '/components/examples/A/value' },
  });
  expect(generateOpenApiFixture(source, { ...options, exampleName: 'z' }).fixtureJson).toBe('"Z"');
  expect(generateOpenApiFixture(source, { ...options, exampleName: 'absent' }).status).toBe(
    'invalid',
  );
});
test.each([
  [{ example: 'x', examples: { x: { value: 'x' } } }, 'invalid'],
  [{ examples: { x: { value: 'x', externalValue: 'https://never.test' } } }, 'invalid'],
  [{ examples: { x: { externalValue: 'https://never.test' } } }, 'unsupported'],
  [{ examples: { x: {} } }, 'invalid'],
  [{ examples: [] }, 'invalid'],
] as const)('malformed/external example policy fails closed %#', (media, status) => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  try {
    expect(run({ type: 'string' }, media)).toMatchObject({ status, fixtureJson: null });
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    fetchSpy.mockRestore();
  }
});
test('same source/options/seed byte-identical, reordered keys/enum choices invariant, changed seed eligible variation', () => {
  const schema = {
    type: 'object',
    required: ['a', 'b'],
    properties: {
      a: { type: 'string', minLength: 8, maxLength: 8 },
      b: { type: 'integer', enum: [30, 10, 20] },
      c: { type: 'array', items: { type: 'boolean' }, minItems: 2, maxItems: 4 },
    },
  };
  const report = run(schema);
  expect(report.status).toBe('ready');
  expect(run(schema)).toEqual(report);
  const reordered = {
    properties: {
      c: schema.properties.c,
      b: { enum: [20, 30, 10], type: 'integer' },
      a: schema.properties.a,
    },
    required: ['b', 'a'],
    type: 'object',
  };
  expect(run(reordered).fixtureJson).toBe(report.fixtureJson);
  expect(run(schema, {}, { seed: 'another-seed' }).fixtureJson).not.toBe(report.fixtureJson);
  expect(run({ type: 'string' }, { example: 'fixed' }, { seed: 10 }).fixtureJson).toBe(
    run({ type: 'string' }, { example: 'fixed' }, { seed: 99 }).fixtureJson,
  );
});
test('response readOnly required retained; writeOnly omitted even required; both flags invalid including optional hidden nodes', () => {
  const schema = {
    type: 'object',
    required: ['id', 'secret'],
    additionalProperties: false,
    properties: {
      id: { type: 'integer', readOnly: true },
      secret: { type: 'string', writeOnly: true },
    },
  };
  const report = run(schema);
  expect(report.status).toBe('ready');
  expect(JSON.parse(report.fixtureJson!)).toHaveProperty('id');
  expect(JSON.parse(report.fixtureJson!)).not.toHaveProperty('secret');
  expect(
    validateOpenApiFixture(doc(schema), options, '{"id":1,"secret":"x"}').validation.issues.map(
      (i) => i.code,
    ),
  ).toContain('writeonly-in-response');
  expect(
    run({ type: 'object', properties: { x: { type: 'string', readOnly: true, writeOnly: true } } })
      .status,
  ).toBe('invalid');
});
test.each([
  { type: 'string', format: 'uuid' },
  { type: 'string', pattern: '^x' },
  { type: 'object', additionalProperties: { type: 'string' } },
  { type: 'string', oneOf: [{ type: 'string' }] },
  { type: 'string', allOf: [] },
  { type: 'string', anyOf: [] },
  { type: 'string', not: {} },
  { type: 'object', discriminator: { propertyName: 'x' } },
  { type: 'number', multipleOf: 2 },
  { type: 'string', 'x-rule': 1 },
  { properties: { x: { type: 'string' } } },
  { type: 'object', minProperties: 1 },
])('unsupported schema refuses valid-looking example %#', (schema) => {
  const report = run(schema, { example: 'looks-valid' });
  expect(report.status).toBe('unsupported');
  expect(report.fixtureJson).toBeNull();
  expect(report.validation.status).toBe('not-run');
});
test('optional and writeOnly unreachable unsupported schemas cannot evade whole-schema preflight', () => {
  for (const property of [
    { type: 'string', format: 'email' },
    { type: 'string', writeOnly: true, pattern: 'x' },
    { $ref: 'https://never.test/schema' },
  ]) {
    expect(run({ type: 'object', properties: { hidden: property } }, { example: {} }).status).toBe(
      'unsupported',
    );
  }
});
test.each([
  { type: 'integer', minimum: 2, maximum: 1 },
  { type: 'number', minimum: 1, maximum: 1, exclusiveMinimum: true },
  { type: 'string', minLength: 2, maxLength: 1 },
  { type: 'array', items: { type: 'boolean' }, minItems: 2, maxItems: 1 },
  { type: 'object', additionalProperties: false, required: ['absent'] },
  { type: 'string', enum: [1, false] },
])('impossible supported constraints never emit valid fixture %#', (schema) => {
  expect(run(schema)).toMatchObject({ status: 'no-valid-fixture', fixtureJson: null });
});
test('bounded unique arrays, nullable enums and numeric exclusive bounds independently validate', () => {
  const cases = [
    {
      type: 'array',
      items: { type: 'integer', enum: [1, 2, 3] },
      minItems: 3,
      maxItems: 3,
      uniqueItems: true,
    },
    { type: 'number', minimum: 0.1, maximum: 0.2, exclusiveMinimum: true, exclusiveMaximum: true },
    { type: 'integer', minimum: 1, maximum: 3, exclusiveMinimum: true, exclusiveMaximum: true },
    { type: 'string', nullable: true, enum: [null] },
  ];
  for (const schema of cases) {
    const report = run(schema);
    expect(report.status).toBe('ready');
    expect(
      validateOpenApiFixture(doc(schema), options, report.fixtureJson!).validation.status,
    ).toBe('passed');
  }
  const unique = run(cases[0]);
  expect(new Set(JSON.parse(unique.fixtureJson!) as number[]).size).toBe(3);
  expect(
    run({ type: 'array', items: { type: 'boolean' }, minItems: 3, maxItems: 3, uniqueItems: true })
      .fixtureJson,
  ).toBeNull();
});
test('exact finite precision policy retains decimal and refuses unsafe source numeric literals without rounding', () => {
  const source = doc({ type: 'number', enum: [1.1] });
  expect(generateOpenApiFixture(source.replace('1.1', '1.10'), options).fixtureJson).toBe('1.1');
  for (const numeric of ['12345678901234567890', '1E400', '0.100000000000000001', '1e13', '.inf']) {
    const input = source.replace('1.1', numeric);
    expect(generateOpenApiFixture(input, options).fixtureJson).toBeNull();
  }
  expect(validateOpenApiFixture(doc({ type: 'number' }), options, '9007199254740993').status).toBe(
    'unsupported',
  );
});
test('local refs escaped percent/pointer decoding, use/definition source locations and CRLF/BOM preserved', () => {
  const source =
    '\uFEFF' +
    doc(
      { $ref: '#/components/schemas/a~1b~0%7B' },
      {},
      { schemas: { 'a/b~{': { type: 'string', enum: ['fixture'] } } },
    ).replaceAll(',', ',\r\n');
  const report = generateOpenApiFixture(source, options);
  expect(report.status).toBe('ready');
  const provenance = report.provenance.find((entry) => entry.kind === 'enum')!;
  expect(provenance).toMatchObject({
    use: { pointer: '/paths/~1items/get/responses/200/content/application~1json/schema' },
    definition: { pointer: '/components/schemas/a~1b~0{/enum' },
  });
  expect(source.slice(provenance.definition!.start, provenance.definition!.end)).toBe(
    '["fixture"]',
  );
  expect(provenance.definition!.line).toBeGreaterThan(1);
});
test.each(['https://never.test/schema', '#/missing', '#/bad~2escape', '#%FF', '#bad'])(
  'invalid/unresolved refs never fetch or emit fixture: %s',
  ($ref) => {
    const report = run({ $ref });
    expect(report.fixtureJson).toBeNull();
    expect(['unsupported', 'invalid']).toContain(report.status);
  },
);
test('recursive and ref-only cycles, hop limits, ignored siblings, response ref selections', () => {
  for (const schemas of [
    { X: { $ref: '#/components/schemas/X' } },
    { X: { type: 'object', properties: { next: { $ref: '#/components/schemas/X' } } } },
  ]) {
    expect(
      generateOpenApiFixture(doc({ $ref: '#/components/schemas/X' }, {}, { schemas }), options)
        .status,
    ).toBe('unsupported');
  }
  const schemas = Object.fromEntries(
    Array.from({ length: 18 }, (_, i) => [
      `X${i}`,
      i === 17 ? { type: 'string' } : { $ref: `#/components/schemas/X${i + 1}` },
    ]),
  );
  expect(
    generateOpenApiFixture(doc({ $ref: '#/components/schemas/X0' }, {}, { schemas }), options)
      .status,
  ).toBe('limit');
  const sibling = generateOpenApiFixture(
    doc(
      { $ref: '#/components/schemas/X', pattern: 'ignored' },
      {},
      { schemas: { X: { type: 'boolean' } } },
    ),
    options,
  );
  expect(sibling.status).toBe('ready');
  expect(sibling.issues.map((i) => i.code)).toContain('ref-siblings-ignored');
  const raw = JSON.stringify({
    ...document({ type: 'string' }),
    paths: { '/items': { get: { responses: { '200': { $ref: '#/components/responses/R' } } } } },
    components: {
      responses: { R: document({ type: 'string' }).paths['/items'].get.responses['200'] },
    },
  });
  const selection = inspectOpenApiFixtures(raw).selections[0]!;
  expect(selection.responseDefinition.pointer).toBe('/components/responses/R');
  expect(generateOpenApiFixture(raw, options).status).toBe('ready');
});
test.each([
  { ...document({ type: 'string' }), openapi: 3 },
  { ...document({ type: 'string' }), info: { title: 'Synthetic', version: 1 } },
  { ...document({ type: 'string' }), paths: [] },
])('invalid root shapes stay invalid %#', (value) => {
  expect(inspectOpenApiFixtures(JSON.stringify(value)).status).toBe('invalid');
});
test('unsupported3.1, actual-only selection, explicit media/status identity and missing schema', () => {
  expect(inspectOpenApiFixtures(JSON.stringify({ ...document({}), openapi: '3.1.0' })).status).toBe(
    'unsupported',
  );
  for (const override of [
    { path: '/missing' },
    { status: '2XX' },
    { status: 'default' },
    { mediaType: 'application/*' },
  ])
    expect(run({ type: 'string' }, {}, override).status).toBe('invalid');
  expect(run(undefined).status).toBe('unsupported');
});
test('prototype names/hostile strings are literal safe JSON; summary excludes all literal payloads and raw source', () => {
  const source =
    '{"openapi":"3.0.3","info":{"title":"SECRET_TITLE","version":"1"},"paths":{"/items":{"get":{"responses":{"200":{"description":"SECRET_DESCRIPTION","content":{"application/json":{"schema":{"type":"object","properties":{"__proto__":{"type":"string","enum":["SECRET_ENUM<script>"]},"constructor":{"type":"string"}},"default":{"token":"SECRET_DEFAULT"}},"example":{"__proto__":"SECRET_ENUM<script>","constructor":"SECRET_EXAMPLE"}}}}}}}}}';
  const report = generateOpenApiFixture(source, options);
  expect(report.status).toBe('ready');
  expect(report.fixtureJson).toBe(
    '{"__proto__":"SECRET_ENUM<script>","constructor":"SECRET_EXAMPLE"}',
  );
  expect(Object.getPrototypeOf(JSON.parse(report.fixtureJson!))).toBe(Object.prototype);
  expect(exportOpenApiFixture(report)).toBe(report.fixtureJson);
  const summary = exportOpenApiFixtureSummary(report);
  expect(summary).not.toMatch(/SECRET_|<script>|"fixtureJson"|"source"|"schema"\s*:|"map"\s*:/);
  expect(summary).toContain('/schema/default');
  expect(JSON.parse(summary).selection.id).toBe(
    JSON.stringify(['GET', '/items', '200', 'application/json']),
  );
  expect(structuredClone(report)).toEqual(report);
});
test('resource budgets: requested sizes, schema nodes/depth, options/seed/output and hostile50K nesting', () => {
  for (const schema of [
    { type: 'string', minLength: 1e6 },
    { type: 'array', minItems: 1e6, items: { type: 'boolean' } },
  ])
    expect(run(schema).status).toBe('limit');
  expect(run({ type: 'array', items: { type: 'boolean' } }, {}, { arrayLength: 1e9 }).status).toBe(
    'limit',
  );
  expect(run({ type: 'string' }, {}, { seed: 's'.repeat(129) }).status).toBe('limit');
  let deep: object = { type: 'string' };
  for (let i = 0; i < 26; i++) deep = { type: 'array', items: deep };
  expect(run(deep).status).toBe('limit');
  const many = {
    type: 'object',
    properties: Object.fromEntries(
      Array.from({ length: 2001 }, (_, i) => [`p${i}`, { type: 'boolean' }]),
    ),
  };
  expect(run(many).status).toBe('limit');
  const hugeOutput = {
    type: 'object',
    properties: Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [`p${i}`, { type: 'string', minLength: 2048 }]),
    ),
  };
  expect(run(hugeOutput)).toMatchObject({ status: 'limit', fixtureJson: null });
  const spy = vi.spyOn(Composer.prototype, 'compose');
  try {
    const start = performance.now();
    expect(inspectOpenApiFixtures('['.repeat(50_000) + '0' + ']'.repeat(50_000)).status).toBe(
      'limit',
    );
    const elapsed = performance.now() - start;
    expect(spy).not.toHaveBeenCalled();
    expect(elapsed).toBeLessThan(5000);
    console.info(`Fixture hostile 50K depth preflight: ${elapsed.toFixed(1)}ms, Composer0calls`);
  } finally {
    spy.mockRestore();
  }
  expect(OPENAPI_FIXTURE_LIMITS.schemaDepth).toBe(24);
});
test('realistic500-operation inspection/generation bounded and no Date/random generator sources', () => {
  const base = document(
    { $ref: '#/components/schemas/Item' },
    {},
    {
      schemas: {
        Item: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'integer', minimum: 1, maximum: 1000 },
            tags: {
              type: 'array',
              minItems: 2,
              maxItems: 4,
              items: { type: 'string', minLength: 3, maxLength: 8 },
            },
          },
        },
      },
    },
  );
  const source = JSON.stringify({
    ...base,
    paths: Object.fromEntries(
      Array.from({ length: 500 }, (_, i) => [`/items/${i}`, base.paths['/items']]),
    ),
  });
  const start = performance.now(),
    inspection = inspectOpenApiFixtures(source),
    report = generateOpenApiFixture(source, { ...options, path: '/items/1' }),
    elapsed = performance.now() - start;
  expect(inspection.selections).toHaveLength(500);
  expect(report.status).toBe('ready');
  expect(elapsed).toBeLessThan(10_000);
  console.info(
    `Fixture realistic ${source.length} units,500operations inspect+generate: ${elapsed.toFixed(1)}ms`,
  );
});

test('revalidates generated then edited JSON independently; strict JSON and duplicate keys cannot pass', () => {
  const schema = {
    type: 'object',
    required: ['id'],
    additionalProperties: false,
    properties: {
      id: { type: 'integer', minimum: 1, maximum: 9 },
      values: {
        type: 'array',
        minItems: 2,
        maxItems: 2,
        uniqueItems: true,
        items: { type: 'string', enum: ['A', 'B'] },
      },
    },
  };
  const report = run(schema);
  expect(report.status).toBe('ready');
  expect(validateOpenApiFixture(doc(schema), options, report.fixtureJson!).validation.status).toBe(
    'passed',
  );
  for (const value of [
    '{}',
    '{"id":0}',
    '{"id":1.5}',
    '{"id":2,"extra":true}',
    '{"id":2,"values":["A","A"]}',
    '{"id":2,"values":["A","C"]}',
  ]) {
    const mutated = validateOpenApiFixture(doc(schema), options, value);
    expect(mutated).toMatchObject({
      status: 'no-valid-fixture',
      fixtureJson: null,
      validation: { status: 'failed' },
    });
    expect(exportOpenApiFixture(mutated)).toBeNull();
  }
  for (const value of ['{id: 1}', '{"id":1,"id":2}', '{"id":1,}', 'id: 1'])
    expect(validateOpenApiFixture(doc(schema), options, value).status).toBe('invalid');
});

test('finite numeric defaults/ranges, malformed constraint types and anonymous source metadata are honest', () => {
  for (const schema of [
    { type: 'integer', maximum: -1000 },
    { type: 'integer', minimum: 1e12 },
    { type: 'integer', maximum: -1e12 },
    { type: 'number', minimum: 0.1, maximum: 0.2 },
    { type: 'string', minLength: 0, maxLength: 0 },
  ])
    expect(run(schema).status).toBe('ready');
  for (const schema of [
    { type: 'string', nullable: 'true' },
    { type: 'number', exclusiveMinimum: 1 },
    { type: 'number', exclusiveMinimum: false },
    { type: 'string', minLength: -1 },
    { type: 'object', required: [1] },
    { type: 'object', properties: [] },
    { type: 'array' },
    { type: 'boolean', readOnly: true, writeOnly: true },
  ])
    expect(run(schema).fixtureJson).toBeNull();
  expect(run({ type: 'string', enum: ['x', 'x'] }).status).toBe('invalid');
});

test('enum sizes, canonical data budget, work/attempt budget and instance limits fail closed', () => {
  expect(run({ type: 'integer', enum: Array.from({ length: 129 }, (_, i) => i) }).status).toBe(
    'limit',
  );
  expect(
    run({ type: 'string', enum: Array.from({ length: 100 }, (_, i) => `${i}-` + 'x'.repeat(500)) })
      .status,
  ).toBe('limit');
  const attempts = run({
    type: 'array',
    minItems: 4,
    maxItems: 4,
    items: { type: 'integer', enum: Array.from({ length: 100 }, (_, i) => i) },
  });
  expect(attempts).toMatchObject({ status: 'limit', fixtureJson: null });
  expect(attempts.issues.map((issue) => issue.code)).toContain('generation-attempt-budget');
  expect(
    validateOpenApiFixture(doc({ type: 'string' }), options, '"' + 'x'.repeat(100_001) + '"')
      .status,
  ).toBe('limit');
  expect(
    validateOpenApiFixture(doc({ type: 'string' }), options, '"' + 'x'.repeat(2049) + '"').status,
  ).toBe('limit');
});

test('generation does not consult wallclock/random/network; explicit numeric seed and huge request bounds', () => {
  const random = vi.spyOn(Math, 'random'),
    time = vi.spyOn(Date, 'now'),
    network = vi.spyOn(globalThis, 'fetch');
  try {
    const report = run(
      { type: 'object', properties: { number: { type: 'integer' }, value: { type: 'string' } } },
      {},
      { seed: 42 },
    );
    expect(report.status).toBe('ready');
    expect(random).not.toHaveBeenCalled();
    expect(time).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
  } finally {
    random.mockRestore();
    time.mockRestore();
    network.mockRestore();
  }
  const start = performance.now(),
    report = run({ type: 'array', minItems: 1_000_000_000, items: { type: 'string' } }),
    elapsed = performance.now() - start;
  expect(report).toMatchObject({ status: 'limit', fixtureJson: null });
  expect(elapsed).toBeLessThan(1000);
  console.info(
    `Fixture huge requested size1e9: ${elapsed.toFixed(1)}ms, no allocation of requested array`,
  );
});

test('JSON and YAML1.2 documents generate identical canonical fixtures with original YAML provenance', () => {
  const schema = {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'integer', enum: [10, 20] },
      value: { type: 'string', minLength: 3, maxLength: 3 },
    },
  };
  const yaml =
    'openapi: 3.0.3\r\ninfo: {title: Synthetic, version: "1"}\r\npaths:\r\n  /items:\r\n    get:\r\n      responses:\r\n        "200":\r\n          description: Synthetic\r\n          content:\r\n            application/json:\r\n              schema:\r\n                type: object\r\n                required: [id]\r\n                properties:\r\n                  value: {type: string, minLength: 3, maxLength: 3}\r\n                  id: {type: integer, enum: [20, 10]}\r\n';
  const report = generateOpenApiFixture(yaml, options);
  expect(report.status).toBe('ready');
  expect(report.fixtureJson).toBe(run(schema).fixtureJson);
  expect(report.provenance.find((p) => p.kind === 'enum')?.definition).toMatchObject({
    line: 16,
    pointer: '/paths/~1items/get/responses/200/content/application~1json/schema/properties/id/enum',
  });
});

test('inspection list and repeated local-reference work caps are enforced', () => {
  const base = document({ type: 'boolean' });
  const source = JSON.stringify({
    ...base,
    paths: Object.fromEntries(
      Array.from({ length: 2001 }, (_, i) => [`/items/${i}`, base.paths['/items']]),
    ),
  });
  expect(inspectOpenApiFixtures(source)).toMatchObject({ status: 'limit', selections: [] });
  const chains = Object.fromEntries(
    Array.from({ length: 16 }, (_, i) => [
      `X${i}`,
      i === 15 ? { type: 'boolean' } : { $ref: `#/components/schemas/X${i + 1}` },
    ]),
  );
  const schema = {
    type: 'object',
    properties: Object.fromEntries(
      Array.from({ length: 700 }, (_, i) => [`p${i}`, { $ref: '#/components/schemas/X0' }]),
    ),
  };
  const report = generateOpenApiFixture(doc(schema, {}, { schemas: chains }), options);
  expect(report).toMatchObject({ status: 'limit', fixtureJson: null });
  expect(report.issues.map((i) => i.code)).toContain('ref-work-budget');
});
