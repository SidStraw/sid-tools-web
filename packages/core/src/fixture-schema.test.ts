import { expect, test } from 'vite-plus/test';
import { parseOpenApiSource } from './openapi-parser.js';
import {
  normalizeFixtureSchema,
  validateFixtureInstance,
  sourceValue,
  fixtureJson,
  type FixtureValue,
} from './fixture-schema.js';
const normalize = (schema: object) => {
  const root = parseOpenApiSource(JSON.stringify(schema)).root!;
  return normalizeFixtureSchema(root, root, []);
};
test.each<[object, FixtureValue, string]>([
  [
    { type: 'object', required: ['x'], properties: { x: { type: 'string' } } },
    {},
    'required-missing',
  ],
  [{ type: 'object', additionalProperties: false }, { x: 1 }, 'additional-property'],
  [{ type: 'integer' }, 1.1, 'number-type'],
  [{ type: 'string' }, 1, 'string-required'],
  [{ type: 'boolean' }, 'true', 'boolean-required'],
  [{ type: 'array', items: { type: 'string' } }, {}, 'array-required'],
  [{ type: 'object' }, [], 'object-required'],
  [{ type: 'string' }, null, 'null-not-allowed'],
  [{ type: 'string', nullable: true, enum: ['x'] }, null, 'enum-mismatch'],
  [{ type: 'number', minimum: 1, exclusiveMinimum: true }, 1, 'minimum'],
  [{ type: 'number', maximum: 1, exclusiveMaximum: true }, 1, 'maximum'],
  [{ type: 'string', minLength: 2 }, 'x', 'string-length'],
  [{ type: 'string', maxLength: 1 }, 'xx', 'string-length'],
  [{ type: 'array', items: { type: 'boolean' }, minItems: 2 }, [true], 'array-length'],
  [{ type: 'array', items: { type: 'boolean' }, maxItems: 1 }, [true, false], 'array-length'],
  [
    { type: 'array', items: { type: 'boolean' }, uniqueItems: true },
    [true, true],
    'array-not-unique',
  ],
  [
    { type: 'object', properties: { x: { type: 'string', writeOnly: true } } },
    { x: 's' },
    'writeonly-in-response',
  ],
])('independent validator rejects mutated instance %#', (schema, value, code) => {
  const issues = validateFixtureInstance(normalize(schema), value);
  expect(issues.map((i) => i.code)).toContain(code);
  expect(issues.every((i) => i.location !== null)).toBe(true);
});
test('Unicode length counts code points not UTF16/graphemes; boolean AP defaulttrue; nullable enum applies', () => {
  expect(
    validateFixtureInstance(normalize({ type: 'string', minLength: 1, maxLength: 1 }), '😀'),
  ).toEqual([]);
  expect(validateFixtureInstance(normalize({ type: 'object' }), { any: 'allowed' })).toEqual([]);
  expect(
    validateFixtureInstance(normalize({ type: 'string', nullable: true, enum: [null] }), null),
  ).toEqual([]);
  expect(
    validateFixtureInstance(
      normalize({
        type: 'object',
        required: ['x'],
        properties: { x: { type: 'string', writeOnly: true } },
      }),
      {},
    ),
  ).toEqual([]);
});
test('canonical JSON is prototype-safe and order-independent for nested object enum/unique comparison', () => {
  const value = sourceValue(
    parseOpenApiSource('{"__proto__":{"z":1,"a":2},"constructor":"literal"}').root!,
  );
  expect(fixtureJson(value)).toBe('{"__proto__":{"a":2,"z":1},"constructor":"literal"}');
  const schema = normalize({ type: 'array', items: { type: 'object' }, uniqueItems: true });
  expect(
    validateFixtureInstance(schema, [
      { a: 1, b: 2 },
      { b: 2, a: 1 },
    ]).map((i) => i.code),
  ).toContain('array-not-unique');
});
test('bounded serializer rejects cycles/nonfinite/oversized values without trusting instance producer', () => {
  const cycle: FixtureValue[] = [];
  cycle.push(cycle);
  for (const value of [cycle, Infinity, 'x'.repeat(3000), Array.from({ length: 101 }, () => null)])
    expect(() => fixtureJson(value)).toThrow(
      /instance-not-json|numeric-precision-unsupported|string-budget|array-budget/,
    );
});
