import { expect, test } from 'vite-plus/test';
import {
  BreakingChangeType,
  DangerousChangeType,
  SafeChangeType,
  buildASTSchema,
  findSchemaChanges,
  parse,
  validateSchema,
  version,
} from 'graphql';
import { compareSdl, exportSdlComparison, SDL_LIMITS, type SdlCategory } from './sdl.js';

const codes = (before: string, after: string) =>
  compareSdl(before, after).changes.map((c) => [c.code, c.category]);
const output = (type: string) => `type Query { f: ${type} }`;
const input = (type: string, value = '') => `type Query { f(x: ${type}${value}): String }`;

test('installed exact17.0.2 static APIs and known constants match verified research', () => {
  expect(version).toBe('17.0.2');
  const before = buildASTSchema(parse(output('String'))),
    after = buildASTSchema(parse(output('String!')));
  expect(validateSchema(before)).toEqual([]);
  expect(findSchemaChanges(before, after)).toEqual([
    {
      type: 'FIELD_CHANGED_KIND_SAFE',
      description: 'Field Query.f changed type from String to String!.',
    },
  ]);
  expect(Object.keys(BreakingChangeType)).toEqual([
    'TYPE_REMOVED',
    'TYPE_CHANGED_KIND',
    'TYPE_REMOVED_FROM_UNION',
    'VALUE_REMOVED_FROM_ENUM',
    'REQUIRED_INPUT_FIELD_ADDED',
    'IMPLEMENTED_INTERFACE_REMOVED',
    'FIELD_REMOVED',
    'FIELD_CHANGED_KIND',
    'REQUIRED_ARG_ADDED',
    'ARG_REMOVED',
    'ARG_CHANGED_KIND',
    'DIRECTIVE_REMOVED',
    'DIRECTIVE_ARG_REMOVED',
    'REQUIRED_DIRECTIVE_ARG_ADDED',
    'DIRECTIVE_REPEATABLE_REMOVED',
    'DIRECTIVE_LOCATION_REMOVED',
  ]);
  expect(Object.keys(DangerousChangeType)).toEqual([
    'VALUE_ADDED_TO_ENUM',
    'TYPE_ADDED_TO_UNION',
    'OPTIONAL_INPUT_FIELD_ADDED',
    'OPTIONAL_ARG_ADDED',
    'IMPLEMENTED_INTERFACE_ADDED',
    'ARG_DEFAULT_VALUE_CHANGE',
    'INPUT_FIELD_DEFAULT_VALUE_CHANGE',
  ]);
  expect(Object.keys(SafeChangeType)).toEqual([
    'DESCRIPTION_CHANGED',
    'TYPE_ADDED',
    'OPTIONAL_INPUT_FIELD_ADDED',
    'OPTIONAL_ARG_ADDED',
    'DIRECTIVE_ADDED',
    'FIELD_ADDED',
    'DIRECTIVE_REPEATABLE_ADDED',
    'DIRECTIVE_LOCATION_ADDED',
    'OPTIONAL_DIRECTIVE_ARG_ADDED',
    'FIELD_CHANGED_KIND_SAFE',
    'ARG_CHANGED_KIND_SAFE',
    'ARG_DEFAULT_VALUE_ADDED',
    'INPUT_FIELD_DEFAULT_VALUE_ADDED',
  ]);
});

test.each<[string, string, string, SdlCategory]>([
  ['String', 'String!', 'FIELD_CHANGED_KIND_SAFE', 'non-breaking'],
  ['String!', 'String', 'FIELD_CHANGED_KIND', 'breaking'],
  ['[String]', '[String!]', 'FIELD_CHANGED_KIND_SAFE', 'non-breaking'],
  ['[String!]', '[String]', 'FIELD_CHANGED_KIND', 'breaking'],
  ['[String]!', '[String]', 'FIELD_CHANGED_KIND', 'breaking'],
  ['[String]', '[String]!', 'FIELD_CHANGED_KIND_SAFE', 'non-breaking'],
  ['String', '[String]', 'FIELD_CHANGED_KIND', 'breaking'],
  ['String', 'Int', 'FIELD_CHANGED_KIND', 'breaking'],
  ['[[String]]', '[[String!]!]!', 'FIELD_CHANGED_KIND_SAFE', 'non-breaking'],
  ['[[String!]!]!', '[[String]]', 'FIELD_CHANGED_KIND', 'breaking'],
])('output variance %s → %s', (before, after, code, category) => {
  expect(codes(output(before), output(after))).toContainEqual([code, category]);
});

test.each<[string, string, string, SdlCategory]>([
  ['String', 'String!', 'ARG_CHANGED_KIND', 'breaking'],
  ['String!', 'String', 'ARG_CHANGED_KIND_SAFE', 'non-breaking'],
  ['[String]', '[String!]', 'ARG_CHANGED_KIND', 'breaking'],
  ['[String!]', '[String]', 'ARG_CHANGED_KIND_SAFE', 'non-breaking'],
  ['[String]!', '[String]', 'ARG_CHANGED_KIND_SAFE', 'non-breaking'],
  ['[String]', '[String]!', 'ARG_CHANGED_KIND', 'breaking'],
  ['String', '[String]', 'ARG_CHANGED_KIND', 'breaking'],
  ['[[String]]', '[[String!]!]!', 'ARG_CHANGED_KIND', 'breaking'],
  ['[[String!]!]!', '[[String]]', 'ARG_CHANGED_KIND_SAFE', 'non-breaking'],
])('argument input variance %s → %s', (before, after, code, category) => {
  expect(codes(input(before), input(after))).toContainEqual([code, category]);
});

test.each<[string, string, string, SdlCategory]>([
  ['', ' = "a"', 'ARG_DEFAULT_VALUE_ADDED', 'non-breaking'],
  [' = "a"', '', 'ARG_DEFAULT_VALUE_CHANGE', 'dangerous'],
  [' = "a"', ' = "b"', 'ARG_DEFAULT_VALUE_CHANGE', 'dangerous'],
])('argument default %s → %s', (before, after, code, category) => {
  expect(codes(input('String', before), input('String', after))).toContainEqual([code, category]);
});

test('nullable input→NonNull with newly supplied default keeps library conservative breaking', () => {
  expect(codes(input('String'), input('String!', ' = "x"'))).toContainEqual([
    'ARG_CHANGED_KIND',
    'breaking',
  ]);
  const schema = (type: string) => `input I { x: ${type} } type Query { f(x: I): String }`;
  expect(codes(schema('String'), schema('String! = "x"'))).toContainEqual([
    'FIELD_CHANGED_KIND',
    'breaking',
  ]);
  expect(codes(schema('String!'), schema('String'))).toContainEqual([
    'FIELD_CHANGED_KIND_SAFE',
    'non-breaking',
  ]);
});

test.each<[string, string, string, SdlCategory]>([
  ['a: String', 'a: String b: String', 'OPTIONAL_INPUT_FIELD_ADDED', 'dangerous'],
  ['a: String', 'a: String b: String!', 'REQUIRED_INPUT_FIELD_ADDED', 'breaking'],
  ['a: String', 'a: String b: String! = "x"', 'OPTIONAL_INPUT_FIELD_ADDED', 'dangerous'],
  ['a: String b: Int', 'a: String', 'FIELD_REMOVED', 'breaking'],
  ['a: String', 'a: String = "x"', 'INPUT_FIELD_DEFAULT_VALUE_ADDED', 'non-breaking'],
  ['a: String = "x"', 'a: String', 'INPUT_FIELD_DEFAULT_VALUE_CHANGE', 'dangerous'],
  ['a: String = "x"', 'a: String = "y"', 'INPUT_FIELD_DEFAULT_VALUE_CHANGE', 'dangerous'],
])('input-object matrix %s → %s', (before, after, code, category) => {
  const schema = (fields: string) => `input I { ${fields} } type Query { f(x: I): String }`;
  expect(codes(schema(before), schema(after))).toContainEqual([code, category]);
});

test.each<[string, string, string, SdlCategory]>([
  ['type Query { f: String }', 'type Query { f: String g: Int }', 'FIELD_ADDED', 'non-breaking'],
  ['type Query { f: String g: Int }', 'type Query { f: String }', 'FIELD_REMOVED', 'breaking'],
  [output('String'), input('String'), 'OPTIONAL_ARG_ADDED', 'dangerous'],
  [output('String'), input('String!'), 'REQUIRED_ARG_ADDED', 'breaking'],
  [input('String'), output('String'), 'ARG_REMOVED', 'breaking'],
  [
    'enum E { A } type Query { e: E }',
    'enum E { A B } type Query { e: E }',
    'VALUE_ADDED_TO_ENUM',
    'dangerous',
  ],
  [
    'enum E { A B } type Query { e: E }',
    'enum E { A } type Query { e: E }',
    'VALUE_REMOVED_FROM_ENUM',
    'breaking',
  ],
  [
    'type A { a: Int } type B { b: Int } union U = A type Query { u: U }',
    'type A { a: Int } type B { b: Int } union U = A | B type Query { u: U }',
    'TYPE_ADDED_TO_UNION',
    'dangerous',
  ],
  [
    'type A { a: Int } type B { b: Int } union U = A | B type Query { u: U }',
    'type A { a: Int } type B { b: Int } union U = A type Query { u: U }',
    'TYPE_REMOVED_FROM_UNION',
    'breaking',
  ],
  [
    'interface I { a: Int } type A { a: Int } type Query { a: A }',
    'interface I { a: Int } type A implements I { a: Int } type Query { a: A }',
    'IMPLEMENTED_INTERFACE_ADDED',
    'dangerous',
  ],
  [
    'interface I { a: Int } type A implements I { a: Int } type Query { a: A }',
    'interface I { a: Int } type A { a: Int } type Query { a: A }',
    'IMPLEMENTED_INTERFACE_REMOVED',
    'breaking',
  ],
  [output('String'), 'type A { a: String } type Query { f: String }', 'TYPE_ADDED', 'non-breaking'],
  ['type A { a: String } type Query { f: String }', output('String'), 'TYPE_REMOVED', 'breaking'],
  [
    'scalar X type Query { x: X }',
    'enum X { A } type Query { x: X }',
    'TYPE_CHANGED_KIND',
    'breaking',
  ],
])('type/member evolution preserves library classification %#', (before, after, code, category) => {
  expect(codes(before, after)).toContainEqual([code, category]);
});

test.each<[string, string, string, SdlCategory]>([
  ['', 'directive @d on FIELD_DEFINITION', 'DIRECTIVE_ADDED', 'non-breaking'],
  ['directive @d on FIELD_DEFINITION', '', 'DIRECTIVE_REMOVED', 'breaking'],
  [
    'directive @d on FIELD_DEFINITION',
    'directive @d repeatable on FIELD_DEFINITION',
    'DIRECTIVE_REPEATABLE_ADDED',
    'non-breaking',
  ],
  [
    'directive @d repeatable on FIELD_DEFINITION',
    'directive @d on FIELD_DEFINITION',
    'DIRECTIVE_REPEATABLE_REMOVED',
    'breaking',
  ],
  [
    'directive @d on FIELD_DEFINITION',
    'directive @d on FIELD_DEFINITION | OBJECT',
    'DIRECTIVE_LOCATION_ADDED',
    'non-breaking',
  ],
  [
    'directive @d on FIELD_DEFINITION | OBJECT',
    'directive @d on FIELD_DEFINITION',
    'DIRECTIVE_LOCATION_REMOVED',
    'breaking',
  ],
  [
    'directive @d on FIELD_DEFINITION',
    'directive @d(a: String) on FIELD_DEFINITION',
    'OPTIONAL_DIRECTIVE_ARG_ADDED',
    'non-breaking',
  ],
  [
    'directive @d on FIELD_DEFINITION',
    'directive @d(a: String!) on FIELD_DEFINITION',
    'REQUIRED_DIRECTIVE_ARG_ADDED',
    'breaking',
  ],
  [
    'directive @d(a: String) on FIELD_DEFINITION',
    'directive @d on FIELD_DEFINITION',
    'DIRECTIVE_ARG_REMOVED',
    'breaking',
  ],
])('directive definition matrix %#', (before, after, code, category) => {
  expect(codes(`${before} ${output('String')}`, `${after} ${output('String')}`)).toContainEqual([
    code,
    category,
  ]);
});

test('custom applications on both identical and changed schemas stay located unknown; builtins distinguished', () => {
  const sdl =
    'directive @auth(role: String) on FIELD_DEFINITION\ntype Query { f: String @auth(role: "secret") }';
  const report = compareSdl(sdl, sdl);
  expect(report.status).toBe('unknown');
  expect(report.before.warnings[0]).toMatchObject({
    code: 'custom-directive-application',
    path: 'Query.f',
    location: { line: 2 },
  });
  expect(report.changes.some((c) => c.category === 'unknown')).toBe(true);
  const deprecated = 'type Query { f: String @deprecated(reason: "old") }';
  expect(compareSdl(deprecated, deprecated).before.warnings).toEqual([]);
  expect(compareSdl(deprecated, deprecated).status).toBe('complete');
  expect(
    compareSdl(deprecated, deprecated.replace('old', 'new')).changes.some(
      (c) => c.code === 'directive-application-change',
    ),
  ).toBe(true);
  expect(compareSdl(sdl, sdl.replace('secret', 'different')).status).toBe('unknown');
});

test('schema root role changes are unknown even when library type maps have no change', () => {
  const types = 'type A { a: Int } type B { b: Int }';
  const report = compareSdl(`schema { query: A } ${types}`, `schema { query: B } ${types}`);
  expect(report.status).toBe('unknown');
  expect(report.changes.some((c) => c.code === 'schema-roots-changed')).toBe(true);
});

test('explicit built-in redefinitions do not masquerade as specified directive semantics', () => {
  const source =
    'directive @deprecated(foo: String) on FIELD_DEFINITION type Query { f: String @deprecated(foo: "secret") }';
  const report = compareSdl(source, source);
  expect(report.status).toBe('unknown');
  expect(report.before.warnings[0]?.code).toBe('builtin-directive-redefinition');
  expect(exportSdlComparison(report)).not.toContain('secret');
});

test('custom directive application on directive definition is also unknown', () => {
  const source =
    'directive @meta on DIRECTIVE_DEFINITION directive @d @meta on FIELD_DEFINITION type Query { f: String }';
  const report = compareSdl(source, source);
  expect(report.status).toBe('unknown');
  expect(report.before.warnings[0]).toMatchObject({
    path: '@d',
    code: 'custom-directive-application',
  });
});

test('directive extensions retain application locations and unresolved ones reject', () => {
  const source =
    'directive @meta on DIRECTIVE_DEFINITION directive @d on FIELD_DEFINITION extend directive @d @meta type Query { f: String }';
  const report = compareSdl(source, source);
  expect(report.status).toBe('unknown');
  expect(report.before.warnings[0]).toMatchObject({ path: '@d', location: { line: 1 } });
  expect(
    compareSdl(
      'directive @meta on DIRECTIVE_DEFINITION extend directive @missing @meta type Query { f: String }',
      output('String'),
    ).status,
  ).toBe('invalid');
});

test('description-only changes are retained as library classification, formatting/comments alone are not changes', () => {
  expect(codes('"old" type Query { f: String }', '"new" type Query { f: String }')).toContainEqual([
    'DESCRIPTION_CHANGED',
    'non-breaking',
  ]);
  expect(compareSdl(output('String'), '# comment\ntype Query{ f:String }')).toMatchObject({
    status: 'complete',
    changes: [],
  });
});

test('structured coordinates and reference navigation map single field change without reading library prose', () => {
  const before = 'type Query { f(a: Int): String }';
  const after = 'type Query { f(a: Int): String! }';
  const report = compareSdl(before, after);
  expect(report.changes.find((c) => c.code === 'FIELD_CHANGED_KIND_SAFE')).toMatchObject({
    path: 'Query.f',
    type: 'Query',
    field: 'f',
    mapping: 'exact',
  });
  const arg = report.after.coordinates.find((c) => c.path === 'Query.f(a:)')!;
  expect(after.slice(arg.location!.start, arg.location!.end)).toBe('a: Int');
  expect(report.after.references.some((r) => r.from === 'Query.f(a:)' && r.to === 'Int')).toBe(
    true,
  );
  const enumSdl = 'enum E { A B } type Query { e: E }';
  const value = compareSdl(enumSdl, enumSdl).before.coordinates.find((c) => c.path === 'E.B')!;
  expect(enumSdl.slice(value.location!.start, value.location!.end)).toBe('B');
});

test('ambiguous targets stay candidate-only; library removal of unreferenced builtin is not falsely attributed to Query', () => {
  const report = compareSdl(
    'type Query { a: String b: String }',
    'type Query { a: String! b: String! }',
  );
  expect(report.status).toBe('unknown');
  expect(report.changes.every((c) => c.path === null && c.mapping === 'candidates')).toBe(true);
  const removed = compareSdl('type Query { a: Int }', 'type Query { a: String }').changes.find(
    (c) => c.code === 'TYPE_REMOVED',
  );
  expect(removed).toMatchObject({ path: null, mapping: 'unmapped' });
  const multipleRemovals = compareSdl(
    'type A { a: Int } type Query { a: Int }',
    'type Query { a: String }',
  );
  expect(
    multipleRemovals.changes
      .filter((c) => c.code === 'TYPE_REMOVED')
      .every((c) => c.mapping !== 'exact'),
  ).toBe(true);
});

test('schema description changes remain unknown alongside a classified field change and IDs survive unrelated additions', () => {
  const before = '"old schema" schema { query: Query } type Query { f: String }';
  const after = '"new schema" schema { query: Query } type Query { f: String! }';
  expect(compareSdl(before, after).changes.some((c) => c.code === 'unclassified-ast-change')).toBe(
    true,
  );
  const first = compareSdl(output('String'), output('String!')).changes.find(
    (c) => c.code === 'FIELD_CHANGED_KIND_SAFE',
  )!;
  const second = compareSdl(
    output('String'),
    'type New { a: String } type Query { f: String! }',
  ).changes.find((c) => c.code === 'FIELD_CHANGED_KIND_SAFE')!;
  expect(first.id).toBe(second.id);
});

test.each([
  'type Query {',
  'extend type Missing { a: Int } type Query { f: String }',
  'type Query { f: Missing }',
  'type Query { f: String f: Int }',
  'type Query { f: String } type Query { g: Int }',
  'enum E { A A } type Query { f: E }',
  'type Query { f(a: Int, a: Int): String }',
  'input I { i: I! } type Query { f(i: I): Int }',
  'interface I { a: Int } type Query implements I { x: Int }',
  'query Q { x }',
  'type Query { f(a: Int = "wrong-type"): String }',
])('invalid SDL rejects comparison: %s', (sdl) => {
  const report = compareSdl(sdl, output('String'));
  expect(report.status).toBe('invalid');
  expect(report.before.errors.length).toBeGreaterThan(0);
  expect(report.changes).toEqual([]);
});

test('syntax/unresolved-extension errors have source positions, valid extensions keep field navigation', () => {
  expect(compareSdl('type Query {\n f:', output('String')).before.errors[0]?.location?.line).toBe(
    2,
  );
  expect(
    compareSdl('extend type Missing { a: Int }', output('String')).before.errors[0]?.location,
  ).not.toBeNull();
  const sdl = 'type Query { a: String } extend type Query { b: Int }';
  expect(compareSdl(sdl, sdl).status).toBe('complete');
  const changed = compareSdl(sdl, sdl.replace('a: String', 'a: String!'));
  expect(changed.changes.some((c) => c.code === 'FIELD_CHANGED_KIND_SAFE')).toBe(true);
});

test('pre-build input/token/nesting/member/type bounds reject entire side', () => {
  const cases = [
    ' '.repeat(SDL_LIMITS.codeUnits + 1),
    'type Query { f: ' + '['.repeat(25) + 'String' + ']'.repeat(25) + ' }',
    'type Query { ' + Array.from({ length: 501 }, (_, i) => `f${i}: Int`).join(' ') + ' }',
    output('String') + Array.from({ length: 64 }, (_, i) => `type T${i} { a: Int }`).join(' '),
    'type Query { f(a: [Int] = [' + '1 '.repeat(10_001) + ']): Int }',
  ];
  for (const sdl of cases) {
    const result = compareSdl(sdl, output('String'));
    expect(result.status).toBe('limit');
    expect(result.changes).toEqual([]);
    expect(result.before.coordinates).toEqual([]);
  }
});

test('shallow SDL cannot bypass interface graph depth/cycle safeguards', () => {
  const chain = Array.from(
    { length: 18 },
    (_, i) => `interface I${i}${i ? ` implements I${i - 1}` : ''} { f: Int }`,
  ).join(' ');
  expect(compareSdl(`${chain} ${output('String')}`, output('String')).status).toBe('limit');
  expect(
    compareSdl(
      `interface I implements J { f: Int } interface J implements I { f: Int } ${output('String')}`,
      output('String'),
    ).status,
  ).toBe('invalid');
});

test('AST-node and reference budgets are independent of shallow lexical depth and type count', () => {
  const ast = compareSdl(
    'type Query { f(x: [Int] = [' + '1 '.repeat(6000) + ']): Int }',
    output('String'),
  );
  expect(ast).toMatchObject({ status: 'limit', changes: [] });
  expect(ast.before.errors[0]?.code).toBe('ast-limit');
  const interfaces = Array.from({ length: 31 }, (_, i) => `interface I${i} { f: Int }`).join(' ');
  const implementsAll = Array.from({ length: 31 }, (_, i) => `I${i}`).join(' & ');
  const objects = Array.from(
    { length: 32 },
    (_, i) => `type T${i} implements ${implementsAll} { f: Int }`,
  ).join(' ');
  const references = compareSdl(`${interfaces} ${objects} type Query { t: T0 }`, output('String'));
  expect(references).toMatchObject({ status: 'limit', changes: [] });
  expect(references.before.errors[0]?.code).toBe('reference-limit');
});

test('safe export excludes raw SDL, descriptions, defaults, custom directive arguments and engine error excerpts', () => {
  const before =
    '"<script>SECRET_DESCRIPTION</script>" type Query { constructor(x: String = "SECRET_DEFAULT"): String }';
  const after = before
    .replace('SECRET_DESCRIPTION', 'SECRET_CHANGED')
    .replace('SECRET_DEFAULT', 'SECRET_NEW_DEFAULT');
  const report = compareSdl(before, after);
  const serialized = exportSdlComparison(report);
  expect(report.status).not.toBe('invalid');
  expect(serialized).not.toMatch(/SECRET_|<script>|"signature":|"reason":|source\.body/);
  expect(JSON.parse(serialized)).toMatchObject({
    format: 'sid-tools/sdl-static/v1',
    status: report.status,
  });
  expect(exportSdlComparison(compareSdl(before, after))).toBe(serialized);
  expect(JSON.parse(JSON.stringify(report))).toEqual(report);
  expect(
    exportSdlComparison(compareSdl('type Query { f: "SECRET_UNKNOWN" }', output('String'))),
  ).not.toContain('SECRET_UNKNOWN');
});
