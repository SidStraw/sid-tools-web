import { expect, test } from 'vite-plus/test';
import { compareOpenApi, exportOpenApiSummary, type OasCategory } from './openapi.js';

const schemaDoc = (schema: object, direction: 'request' | 'response' = 'request') =>
  JSON.stringify({
    openapi: '3.0.3',
    info: { title: 'Synthetic', version: '1' },
    paths: {
      '/x': {
        post: {
          ...(direction === 'request'
            ? { requestBody: { content: { 'application/json': { schema } } } }
            : {}),
          responses: {
            '200': {
              description: 'ok',
              ...(direction === 'response' ? { content: { 'application/json': { schema } } } : {}),
            },
          },
        },
      },
    },
  });
const base = () => ({
  openapi: '3.0.3',
  info: { title: 'Synthetic', version: '1' },
  paths: { '/x': { get: { responses: { '200': { description: 'ok' } } } } },
});
const diff = (a: unknown, b: unknown) => compareOpenApi(JSON.stringify(a), JSON.stringify(b));
const has = (report: ReturnType<typeof compareOpenApi>, rule: string, category: OasCategory) =>
  expect(report.findings.map((f) => [f.rule, f.category])).toContainEqual([rule, category]);

test.each(['3.0.0', '3.0.1', '3.0.2', '3.0.3', '3.0.4'])(
  'OpenAPI %s supports identical bounded contract',
  (openapi) => {
    const doc = { ...base(), openapi };
    expect(diff(doc, doc)).toMatchObject({ status: 'complete', findings: [] });
  },
);
test.each(['3.1.0', '2.0'])(
  'unsupported version %s is distinct, never clean no changes',
  (openapi) => {
    const report = diff({ ...base(), openapi }, base());
    expect(report).toMatchObject({ status: 'unsupported', findings: [] });
  },
);
test('numeric version/required root types/Swagger2 distinguish invalid and unsupported', () => {
  expect(
    compareOpenApi('openapi: 3.0\ninfo: {title: x, version: "1"}\npaths: {}', schemaDoc({})).status,
  ).toBe('invalid');
  expect(diff({ ...base(), info: { title: 'x', version: 1 } }, base()).status).toBe('invalid');
  expect(diff({ ...base(), paths: [] }, base()).status).toBe('invalid');
  expect(diff({ swagger: '2.0' }, base()).status).toBe('unsupported');
});

test.each<[object, object, string, OasCategory, OasCategory]>([
  [{ type: 'number' }, { type: 'integer' }, 'schema-type-changed', 'breaking', 'non-breaking'],
  [{ type: 'integer' }, { type: 'number' }, 'schema-type-changed', 'non-breaking', 'breaking'],
  [{}, { type: 'string' }, 'schema-type-changed', 'breaking', 'non-breaking'],
  [{ type: 'string' }, {}, 'schema-type-changed', 'non-breaking', 'breaking'],
  [{ type: 'string' }, { type: 'boolean' }, 'schema-type-changed', 'breaking', 'breaking'],
  [
    { type: 'string', nullable: true },
    { type: 'string', nullable: false },
    'nullable-changed',
    'breaking',
    'non-breaking',
  ],
  [
    { type: 'string', nullable: false },
    { type: 'string', nullable: true },
    'nullable-changed',
    'non-breaking',
    'breaking',
  ],
  [
    { type: 'string', enum: ['a', 'b'] },
    { type: 'string', enum: ['a'] },
    'enum-values-removed',
    'breaking',
    'non-breaking',
  ],
  [
    { type: 'string', enum: ['a'] },
    { type: 'string', enum: ['a', 'b'] },
    'enum-values-added',
    'non-breaking',
    'review',
  ],
  [
    { type: 'string' },
    { type: 'string', enum: ['a'] },
    'enum-introduced',
    'breaking',
    'non-breaking',
  ],
  [{ type: 'string', enum: ['a'] }, { type: 'string' }, 'enum-removed', 'non-breaking', 'review'],
  [
    { type: 'object', additionalProperties: true },
    { type: 'object', additionalProperties: false },
    'additional-properties-changed',
    'breaking',
    'non-breaking',
  ],
  [
    { type: 'object', additionalProperties: false },
    { type: 'object', additionalProperties: true },
    'additional-properties-changed',
    'non-breaking',
    'review',
  ],
  [
    { type: 'object', properties: { x: { type: 'string' } } },
    { type: 'object', properties: { x: { type: 'string' } }, required: ['x'] },
    'required-property-added',
    'breaking',
    'non-breaking',
  ],
  [
    { type: 'object', properties: { x: { type: 'string' } }, required: ['x'] },
    { type: 'object', properties: { x: { type: 'string' } } },
    'required-property-removed',
    'non-breaking',
    'breaking',
  ],
  [
    { type: 'object', properties: {} },
    { type: 'object', properties: { x: { type: 'string' } } },
    'property-added',
    'non-breaking',
    'non-breaking',
  ],
  [
    { type: 'object', properties: { x: { type: 'string' } } },
    { type: 'object', properties: {} },
    'property-removed',
    'review',
    'breaking',
  ],
])('directional schema matrix %#', (left, right, rule, request, response) => {
  expect.assertions(2);
  has(compareOpenApi(schemaDoc(left), schemaDoc(right)), rule, request);
  has(compareOpenApi(schemaDoc(left, 'response'), schemaDoc(right, 'response')), rule, response);
});

test('items recurse, readOnly/writeOnly required exclusions and flag changes are explicit', () => {
  has(
    compareOpenApi(
      schemaDoc({ type: 'array', items: { type: 'number' } }),
      schemaDoc({ type: 'array', items: { type: 'integer' } }),
    ),
    'schema-type-changed',
    'breaking',
  );
  for (const [direction, flag] of [
    ['request', 'readOnly'],
    ['response', 'writeOnly'],
  ] as const) {
    const schema = { type: 'object', properties: { x: { type: 'string', [flag]: true } } };
    const result = compareOpenApi(
      schemaDoc(schema, direction),
      schemaDoc({ ...schema, required: ['x'] }, direction),
    );
    expect(result.findings.some((f) => f.rule.startsWith('required-property'))).toBe(false);
  }
  has(
    compareOpenApi(schemaDoc({ type: 'string' }), schemaDoc({ type: 'string', readOnly: true })),
    'direction-flag-changed',
    'review',
  );
  expect(
    compareOpenApi(schemaDoc({ readOnly: true, writeOnly: true }), schemaDoc({})),
  ).toMatchObject({ status: 'invalid', findings: [] });
});

test.each([
  { allOf: [{ type: 'string' }] },
  { oneOf: [{ type: 'string' }] },
  { anyOf: [{}] },
  { not: {} },
  { discriminator: { propertyName: 'x' } },
  { type: 'string', format: 'uuid' },
  { type: 'string', default: 'secret' },
  { type: 'number', minimum: 1 },
  { type: 'string', pattern: '^x' },
  { additionalProperties: { type: 'string' } },
  { type: 1 },
  { required: [1] },
  { type: 'array' },
  { properties: [] },
  { enum: [] },
  { type: 'integer', enum: [1.1] },
  { nullable: true, enum: ['x'] },
])('unsupported/malformed schema never silently complete %#', (schema) => {
  expect(compareOpenApi(schemaDoc(schema), schemaDoc(schema)).status).toBe('unknown');
});

test('default/format/extension changes unknown, deprecation informational, enum+nullable interaction unknown', () => {
  expect.assertions(4);
  has(
    compareOpenApi(schemaDoc({ default: 'a' }), schemaDoc({ default: 'b' })),
    'schema-constraint-unsupported',
    'unknown',
  );
  has(
    compareOpenApi(schemaDoc({ 'x-policy': 'a' }), schemaDoc({ 'x-policy': 'b' })),
    'extension-changed',
    'unknown',
  );
  has(
    compareOpenApi(schemaDoc({}), schemaDoc({ deprecated: true })),
    'deprecated-added',
    'non-breaking',
  );
  has(
    compareOpenApi(
      schemaDoc({ enum: ['x'], nullable: false }),
      schemaDoc({ enum: ['x', null], nullable: true }),
    ),
    'nullable-enum-interaction',
    'unknown',
  );
});

test('JSON/YAML, annotation/map/required/enum/security order are equivalent and values are precision-aware', () => {
  const json = {
    openapi: '3.0.3',
    info: { title: 'x', version: '1' },
    security: [{ a: ['b', 'c'] }, { z: [] }],
    paths: {},
    components: {
      schemas: {
        X: {
          type: 'object',
          required: ['a', 'b'],
          properties: { a: { type: 'string', enum: ['y', 'x'] }, b: { type: 'number' } },
        },
      },
    },
  };
  const yaml =
    'openapi: 3.0.3\ninfo: {version: "1", title: another}\nsecurity: [{z: []}, {a: [c, b]}]\npaths: {}\ncomponents:\n  schemas:\n    X:\n      properties:\n        b: {type: number}\n        a: {enum: [x, y], type: string}\n      required: [b, a]\n      type: object';
  const result = compareOpenApi(JSON.stringify(json), yaml);
  expect(result.status).toBe('complete');
  expect(result.findings).toEqual([]);
  const raw = schemaDoc({ type: 'number', enum: [1.1] });
  expect(compareOpenApi(raw.replace('1.1', '1.10'), raw).findings).toEqual([]);
  const huge = schemaDoc({ type: 'number', enum: [1] }).replace('"enum":[1]', '"enum":[1E400]');
  expect(compareOpenApi(huge, huge.replace('1E400', '10e399')).status).toBe('complete');
  const integer = huge.replace('1E400', '12345678901234567890');
  has(
    compareOpenApi(integer, integer.replace('12345678901234567890', '12345678901234567891')),
    'enum-values-added',
    'non-breaking',
  );
});

test('operation removals/additions, normalized path rename and case-insensitive parameter override/ignored headers', () => {
  has(diff(base(), { ...base(), paths: {} }), 'operation-removed', 'breaking');
  has(diff({ ...base(), paths: {} }, base()), 'operation-added', 'non-breaking');
  const doc = (name: string, order = false) => ({
    ...base(),
    paths: {
      [`/x/{${name}}`]: {
        parameters: [
          { name: 'x-token', in: 'header', required: true, schema: { type: 'integer' } },
        ],
        get: {
          parameters: [
            ...(order
              ? [{ name: 'Accept', in: 'header', required: true, schema: { type: 'string' } }]
              : []),
            { name: 'X-TOKEN', in: 'header', required: false, schema: { type: 'string' } },
            { name, in: 'path', required: true, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'ok' } },
        },
      },
    },
  });
  const result = diff(doc('id'), doc('renamed', true));
  expect(result.status).toBe('complete');
  expect(result.findings.map((f) => f.rule)).toEqual(['path-variable-renamed']);
  const ambiguous = {
    ...base(),
    paths: Object.fromEntries(
      ['a', 'b'].map((name) => [
        `/{${name}}`,
        {
          ...base().paths['/x'],
          parameters: [{ name, in: 'path', required: true, schema: { type: 'string' } }],
        },
      ]),
    ),
  };
  expect(diff(ambiguous, ambiguous).status).toBe('unknown');
});

test.each<[object[], object[], string, OasCategory]>([
  [
    [],
    [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
    'parameter-added',
    'breaking',
  ],
  [[], [{ name: 'q', in: 'query', schema: { type: 'string' } }], 'parameter-added', 'non-breaking'],
  [[{ name: 'q', in: 'query', schema: { type: 'string' } }], [], 'parameter-removed', 'review'],
  [
    [{ name: 'q', in: 'query', schema: { type: 'string' } }],
    [{ name: 'q', in: 'query', required: true, schema: { type: 'string' } }],
    'parameter-required-changed',
    'breaking',
  ],
])('parameter matrix %#', (left, right, rule, category) => {
  expect.assertions(1);
  const doc = (parameters: object[]) => ({
    ...base(),
    paths: { '/x': { get: { ...base().paths['/x'].get, parameters } } },
  });
  has(diff(doc(left), doc(right)), rule, category);
});

test('body required/add/remove/media rules and response status/media/headers review', () => {
  const body = (required: boolean) => ({
    content: { 'application/json': { schema: { type: 'string' } } },
    required,
  });
  const doc = (requestBody?: object) => ({
    ...base(),
    paths: {
      '/x': { get: { ...base().paths['/x'].get, ...(requestBody ? { requestBody } : {}) } },
    },
  });
  has(diff(doc(), doc(body(true))), 'request-body-added', 'breaking');
  has(diff(doc(), doc(body(false))), 'request-body-added', 'non-breaking');
  const removed = diff(doc(body(true)), doc());
  has(removed, 'request-body-removed', 'review');
  expect(removed.counts.breaking).toBe(0);
  has(diff(doc(body(false)), doc(body(true))), 'request-body-required-changed', 'breaking');
  has(diff(doc(body(true)), doc(body(false))), 'request-body-required-changed', 'non-breaking');
  has(diff(doc(body(true)), doc({ content: { 'text/plain': {} } })), 'media-removed', 'breaking');
  const responses = (value: object) => ({
    ...base(),
    paths: { '/x': { get: { responses: value } } },
  });
  has(
    diff(responses({ '200': { description: 'ok' } }), responses({ '400': { description: 'bad' } })),
    'response-status-removed',
    'breaking',
  );
  has(
    diff(
      responses({ '400': { description: 'bad' }, default: { description: 'fallback' } }),
      responses({ default: { description: 'fallback' } }),
    ),
    'response-status-removed',
    'review',
  );
  has(
    diff(
      responses({ default: { description: 'fallback' } }),
      responses({ '400': { description: 'bad' } }),
    ),
    'response-status-removed',
    'breaking',
  );
  has(
    diff(
      responses({ '200': { description: 'ok' } }),
      responses({ '200': { description: 'ok' }, '201': { description: 'new' } }),
    ),
    'response-status-added',
    'review',
  );
  const mediaOld = {
    '200': { description: 'ok', content: { 'APPLICATION/JSON; profile=AbC': {} } },
  };
  const mediaNew = {
    '200': { description: 'ok', content: { 'application/json; profile=AbC': {} } },
  };
  expect(diff(responses(mediaOld), responses(mediaNew)).findings).toEqual([]);
  has(
    diff(
      responses(mediaOld),
      responses({ '200': { description: 'ok', content: { 'application/json; profile=abc': {} } } }),
    ),
    'media-added',
    'review',
  );
  expect(
    diff(
      responses({ '200': { description: 'ok', headers: { x: { schema: { type: 'string' } } } } }),
      responses({ '200': { description: 'ok' } }),
    ).status,
  ).toBe('unknown');
});

test('security/servers changes review, serialization/content params unknown and malformed shapes fail closed', () => {
  has(
    diff({ ...base(), security: [] }, { ...base(), security: [{ token: [] }] }),
    'security-changed',
    'review',
  );
  has(
    diff(
      { ...base(), servers: [{ url: 'https://a.test' }] },
      { ...base(), servers: [{ url: 'https://b.test' }] },
    ),
    'servers-changed',
    'review',
  );
  const parameter = (style: string) => ({
    ...base(),
    paths: {
      '/x': {
        get: {
          ...base().paths['/x'].get,
          parameters: [{ name: 'q', in: 'query', style, schema: { type: 'string' } }],
        },
      },
    },
  });
  has(
    diff(parameter('form'), parameter('spaceDelimited')),
    'parameter-serialization-unsupported',
    'unknown',
  );
  expect(
    diff({ ...base(), security: { foo: 1 } }, { ...base(), security: { foo: 1 } }).status,
  ).toBe('unknown');
});

test('local refs escaped/~/% decoding keep use+definition sources, shared findings deduplicate with affected operation cap', () => {
  const doc = (type: string) => ({
    ...base(),
    paths: Object.fromEntries(
      Array.from({ length: 25 }, (_, i) => [
        `/x${i}`,
        {
          post: {
            requestBody: {
              content: {
                'application/json': { schema: { $ref: '#/components/schemas/a~1b~0%7B' } },
              },
            },
            responses: { '200': { description: 'ok' } },
          },
        },
      ]),
    ),
    components: { schemas: { 'a/b~{': { type } } },
  });
  const result = diff(doc('number'), doc('integer'));
  const findings = result.findings.filter((f) => f.rule === 'schema-type-changed');
  expect(findings).toHaveLength(1);
  expect(findings[0]).toMatchObject({
    category: 'breaking',
    affectedCount: 25,
    definitionBefore: { pointer: '/components/schemas/a~1b~0{/type' },
  });
  expect(findings[0]!.before!.pointer).toContain('/requestBody/content/');
  expect(findings[0]!.affectedOperations).toHaveLength(20);
  expect(findings[0]!.uses).toHaveLength(20);
});

test.each(['https://never.test/schema', '#/missing', '#/bad~2escape', '#%FF', '#bad'])(
  'unresolved/invalid refs unknown even unchanged: %s',
  ($ref) => {
    const doc = schemaDoc({ allOf: [{ $ref }] });
    expect(compareOpenApi(doc, doc).status).toBe('unknown');
  },
);

test('ref-only cycles, recursive schemas, ref hop bound and ignored siblings cannot produce clean complete', () => {
  const doc = (schemas: object) => ({
    ...base(),
    paths: {
      '/x': {
        post: {
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/X' } } },
          },
          responses: { '200': { description: 'ok' } },
        },
      },
    },
    components: { schemas },
  });
  for (const schemas of [
    { X: { $ref: '#/components/schemas/Y' }, Y: { $ref: '#/components/schemas/X' } },
    { X: { type: 'object', properties: { next: { $ref: '#/components/schemas/X' } } } },
  ])
    expect(diff(doc(schemas), doc(schemas)).status).toBe('unknown');
  const chain = Object.fromEntries(
    Array.from({ length: 18 }, (_, i) => [
      i ? `X${i}` : 'X',
      i < 17 ? { $ref: `#/components/schemas/X${i + 1}` } : { type: 'string' },
    ]),
  );
  expect(diff(doc(chain), doc(chain)).status).toBe('unknown');
  const siblings = schemaDoc({ $ref: '#/components/schemas/X', type: 'integer' });
  const withComponent = JSON.parse(siblings) as ReturnType<typeof base> & { components: object };
  withComponent.components = { schemas: { X: { type: 'string' } } };
  const report = diff(withComponent, withComponent);
  expect(
    report.before.issues.some((i) => i.code === 'ref-siblings-ignored' && i.severity === 'info'),
  ).toBe(true);
});

test('reference changes through Response definitions preserve original use sites; non-string required fields not coerced', () => {
  const doc = (type: string) => ({
    ...base(),
    paths: { '/x': { get: { responses: { '200': { $ref: '#/components/responses/R' } } } } },
    components: {
      responses: {
        R: { description: 'ok', content: { 'application/json': { schema: { type } } } },
      },
    },
  });
  const finding = diff(doc('integer'), doc('number')).findings.find(
    (f) => f.rule === 'schema-type-changed',
  )!;
  expect(finding).toMatchObject({
    category: 'breaking',
    before: { pointer: '/paths/~1x/get/responses/200' },
    definitionBefore: { pointer: '/components/responses/R/content/application~1json/schema/type' },
  });
  const invalid = {
    ...base(),
    paths: { '/x': { get: { responses: { '200': { description: 123 } } } } },
  };
  expect(diff(invalid, base())).toMatchObject({ status: 'invalid', findings: [] });
});

test('exports contain only structural metadata, never values/hashes of defaults/enums/descriptions/credentials', () => {
  const left = schemaDoc({
    type: 'string',
    default: 'SECRET_DEFAULT',
    enum: ['SECRET_ENUM'],
    description: '<script>SECRET_DESCRIPTION</script>',
  });
  const right = left
    .replace('SECRET_DEFAULT', 'SECRET_NEW')
    .replace('SECRET_ENUM', 'SECRET_NEW_ENUM');
  const report = compareOpenApi(left, right),
    summary = exportOpenApiSummary(report);
  expect(summary).not.toMatch(/SECRET_|<script>|https:\/\/|"source":|"text":|"enum":|"default":/);
  expect(
    report.findings.every(
      (f) =>
        f.id ===
        JSON.stringify([
          f.rule,
          f.direction,
          f.definitionBefore?.pointer.startsWith('/components/') ||
          f.definitionAfter?.pointer.startsWith('/components/')
            ? null
            : f.operation,
          f.definitionBefore?.pointer ?? null,
          f.definitionAfter?.pointer ?? null,
        ]),
    ),
  ).toBe(true);
  expect(exportOpenApiSummary(compareOpenApi(left, right))).toBe(summary);
  expect(structuredClone(report)).toEqual(report);
});

test('enum JSON data does not inherit annotation filtering or array-set normalization', () => {
  const left = schemaDoc({ type: 'object', enum: [{ description: 'a', required: [1, 2] }] });
  const right = schemaDoc({ type: 'object', enum: [{ description: 'b', required: [2, 1] }] });
  has(compareOpenApi(left, right), 'enum-values-removed', 'breaking');
  has(compareOpenApi(left, right), 'enum-values-added', 'non-breaking');
  expect(
    compareOpenApi(
      schemaDoc({ type: 'string', enum: ['1'] }),
      schemaDoc({ type: 'string', enum: [1] }),
    ).status,
  ).toBe('unknown');
});

test('budget exhaustion and finding overflow cannot return clean partial success', () => {
  let nested: object = { type: 'string' };
  for (let i = 0; i < 70; i++) nested = { type: 'array', items: nested };
  const depth = compareOpenApi(schemaDoc(nested), schemaDoc(nested));
  expect(depth.status).toBe('unknown');
  expect(depth.after.issues.some((i) => i.code === 'comparison-limit')).toBe(true);
  const document = (after: boolean) =>
    schemaDoc({
      type: 'object',
      properties: Object.fromEntries(
        Array.from({ length: 2490 }, (_, i) => [
          `p${i}`,
          { type: after ? 'integer' : 'string', nullable: !after, default: after ? 1 : 'x' },
        ]),
      ),
    });
  const findings = compareOpenApi(document(false), document(true));
  expect(findings).toMatchObject({
    status: 'limit',
    findings: [],
    counts: { breaking: 0, 'non-breaking': 0, review: 0, unknown: 0 },
  });
  expect(findings.after.issues.some((i) => i.code === 'finding-limit')).toBe(true);
});

test('realistic near-1M bounded sources complete within dedicated-worker budget, no unsafe raw Composer probe', () => {
  const document = {
    ...base(),
    paths: Object.fromEntries(
      Array.from({ length: 100 }, (_, i) => [
        `/api/${i}`,
        { get: { responses: { '200': { description: 'Synthetic annotation '.repeat(400) } } } },
      ]),
    ),
  };
  const json = JSON.stringify(document);
  const source = json + '\n#' + 'padding'.repeat(Math.floor((999_999 - json.length - 2) / 7));
  expect(source.length).toBeLessThanOrEqual(1_000_000);
  expect(source.length).toBeGreaterThan(990_000);
  const start = performance.now(),
    report = compareOpenApi(source, source),
    elapsed = performance.now() - start;
  expect(report).toMatchObject({ status: 'complete', findings: [] });
  expect(elapsed).toBeLessThan(15_000);
  console.info(
    `OpenAPI realistic ${source.length} code units/side, 100 operations, two parses+comparison: ${elapsed.toFixed(1)}ms`,
  );
}, 20_000);

test('malformed missing template parameters and unsupported-version payloads cannot look safe or leak into summary', () => {
  const doc = { ...base(), paths: { '/x/{id}': base().paths['/x'] } };
  expect(diff(doc, doc)).toMatchObject({ status: 'invalid', findings: [] });
  const invalidVersion = { ...base(), openapi: 'SECRET_VERSION_PAYLOAD' };
  const report = diff(invalidVersion, base());
  expect(report.status).toBe('unsupported');
  expect(exportOpenApiSummary(report)).not.toContain('SECRET_VERSION_PAYLOAD');
});

test.each(['paths', 'responses'] as const)(
  'changed and unchanged %s extensions remain unknown with zero unknown findings',
  (position) => {
    const doc = (value: number) => ({
      ...base(),
      paths:
        position === 'paths'
          ? { ...base().paths, 'x-policy': value }
          : { '/x': { get: { responses: { '200': { description: 'ok' }, 'x-policy': value } } } },
    });
    const pointer = position === 'paths' ? '/paths/x-policy' : '/paths/~1x/get/responses/x-policy';
    for (const value of [1, 2]) {
      const report = diff(doc(1), doc(value));
      expect(report).toMatchObject({ status: 'unknown', findings: [], counts: { unknown: 0 } });
      for (const side of [report.before, report.after])
        expect(side.issues).toContainEqual(
          expect.objectContaining({
            code: 'extension-semantics-unknown',
            severity: 'unknown',
            location: expect.objectContaining({ pointer }),
          }),
        );
      expect(JSON.parse(exportOpenApiSummary(report))).toMatchObject({
        status: 'unknown',
        counts: { unknown: 0 },
      });
    }
  },
);

test('500 operations with two parameters/two responses/shared schema fit per-collection and global budgets', () => {
  const ref = { $ref: '#/components/schemas/Item' };
  const source = JSON.stringify({
    ...base(),
    paths: Object.fromEntries(
      Array.from({ length: 500 }, (_, i) => [
        `/items/${i}`,
        {
          get: {
            description: 'Synthetic operation sharing a bounded schema.',
            parameters: [
              { name: 'q', in: 'query', schema: { type: 'string' } },
              { name: 'page', in: 'query', schema: { type: 'integer' } },
            ],
            responses: {
              '200': { description: 'ok', content: { 'application/json': { schema: ref } } },
              '404': { description: 'missing', content: { 'application/json': { schema: ref } } },
            },
          },
        },
      ]),
    ),
    components: { schemas: { Item: { type: 'object', properties: { id: { type: 'integer' } } } } },
  });
  const start = performance.now(),
    report = compareOpenApi(source, source),
    elapsed = performance.now() - start;
  expect(source.length).toBeGreaterThan(200_000);
  expect(source.length).toBeLessThan(250_000);
  expect(report).toMatchObject({
    status: 'complete',
    findings: [],
    before: { refs: 1000, issues: [] },
    after: { refs: 1000, issues: [] },
  });
  expect(elapsed).toBeLessThan(15_000);
  console.info(
    `OpenAPI 500 operations/2 parameters/2 responses/shared schema: ${source.length} code units per side; ${elapsed.toFixed(1)}ms two parses+comparison`,
  );
}, 20_000);
