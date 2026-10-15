import { expect, test } from 'vite-plus/test';
import { parseSqlDdl, exportSqlDdlSummary, SQL_DDL_LIMITS } from './sql-ddl.js';
test('qualified tables/column and composite PK/FK retain source order/locations and PK-implied notnull', () => {
  const source = `CREATE TABLE app.parent (a int, b text, CONSTRAINT parent_pk PRIMARY KEY (b,a));
CREATE TABLE app.child (x text, y int, CONSTRAINT child_fk FOREIGN KEY (x,y) REFERENCES app.parent(b,a));`;
  const report = parseSqlDdl(source);
  expect(report.status).toBe('complete');
  expect(report.tables).toHaveLength(2);
  expect(report.edges).toHaveLength(1);
  expect(report.tables[0]!.primaryKey!.columns.map((c) => c.name)).toEqual(['b', 'a']);
  expect(report.tables[0]!.columns.every((c) => c.primaryKey && !c.nullable)).toBe(true);
  expect(report.edges[0]).toMatchObject({
    name: { name: 'child_fk' },
    binding: {
      status: 'resolved-local',
      targetTableId: report.tables[0]!.id,
      targetColumnsOrigin: 'explicit',
    },
  });
  expect(report.edges[0]!.sourceColumns.map((c) => c.name)).toEqual(['x', 'y']);
  expect(report.edges[0]!.targetColumns!.map((c) => c.name)).toEqual(['b', 'a']);
  expect(source.slice(report.edges[0]!.location.start, report.edges[0]!.location.end)).toBe(
    'CONSTRAINT child_fk FOREIGN KEY (x,y) REFERENCES app.parent(b,a)',
  );
  expect(structuredClone(report)).toEqual(report);
});
test('inline primary/reference/self reference and implicit PK source only for reliable qualified local target', () => {
  const source =
    'CREATE TABLE s.node (id int CONSTRAINT pk PRIMARY KEY, parent int CONSTRAINT fk REFERENCES s.node);';
  const report = parseSqlDdl(source);
  expect(report.status).toBe('complete');
  expect(report.edges[0]!.binding).toMatchObject({
    status: 'resolved-local',
    targetTableId: report.tables[0]!.id,
    targetColumnsOrigin: 'target-primary-key',
    targetPrimaryKeyLocation: report.tables[0]!.primaryKey!.location,
  });
  expect(report.edges[0]!.targetColumns).toBeNull();
  expect(report.edges[0]!.binding.targetColumnIds).toEqual([report.tables[0]!.columns[0]!.id]);
  const noPk = parseSqlDdl('CREATE TABLE s.node (id int, parent int REFERENCES s.node);');
  expect(noPk.status).toBe('partial');
  expect(noPk.edges[0]!.binding.status).toBe('unresolved');
  expect(noPk.edges[0]!.binding.targetColumnIds).toEqual([]);
});
test('unqualified source/target declarations remain local candidates; no invented public/search_path', () => {
  for (const source of [
    'CREATE TABLE t (id int PRIMARY KEY, p int REFERENCES t(id));',
    'CREATE TABLE s.t(id int PRIMARY KEY); CREATE TABLE child(p int REFERENCES s.t(id));',
    'CREATE TABLE s.t(id int PRIMARY KEY, p int REFERENCES t(id));',
  ]) {
    const report = parseSqlDdl(source);
    expect(report.status).toBe('partial');
    expect(report.edges[0]!.binding.status).toBe('local-candidate');
    expect(report.diagnostics.some((d) => d.code.includes('search-path'))).toBe(true);
  }
  const implicit = parseSqlDdl('CREATE TABLE t(id int PRIMARY KEY, p int REFERENCES t);');
  expect(implicit.edges[0]!.binding).toMatchObject({
    status: 'unresolved',
    targetColumnsOrigin: 'unknown',
    targetColumnIds: [],
  });
  expect(parseSqlDdl('CREATE TABLE t(id int);').status).toBe('partial');
});
test('quoted case/escaped quote/dots and prototype names use tuple identities without collisions', () => {
  const source = `CREATE TABLE "a.b".c("__proto__" int PRIMARY KEY); CREATE TABLE a."b.c"("constructor" int PRIMARY KEY); CREATE TABLE "__proto__"."constructor"(x int REFERENCES "a.b".c("__proto__"), y int REFERENCES a."b.c"("constructor")); CREATE TABLE s."Foo"("a""B" int); CREATE TABLE s.foo(id int);`;
  const report = parseSqlDdl(source);
  expect(report.status).toBe('complete');
  expect(report.tables).toHaveLength(5);
  expect(report.edges.map((e) => e.binding.targetTableId)).toEqual([
    report.tables[0]!.id,
    report.tables[1]!.id,
  ]);
  expect(report.tables[3]!.columns[0]!.name.name).toBe('a"B');
  expect(parseSqlDdl('CREATE TABLE S.FOO(id int); CREATE TABLE s."foo"(id int);').status).toBe(
    'invalid',
  );
  expect(
    parseSqlDdl('CREATE TABLE s.t(constructor constructor, __proto__ __proto__);').status,
  ).toBe('complete');
});
test('bounded lexical type descriptions, arrays/multiword/schema types and named explicit nullability retained', () => {
  const source =
    'CREATE TABLE s.t(a numeric(10,2), b double precision, c character varying(20)[], d timestamp(3) with time zone, e "Custom"."Type"[5][], f text CONSTRAINT nn NOT NULL, g int NULL);';
  const report = parseSqlDdl(source);
  expect(report.status).toBe('complete');
  expect(report.tables[0]!.columns.map((c) => c.dataType)).toEqual([
    'numeric ( 10 , 2 )',
    'double precision',
    'character varying ( 20 ) [ ]',
    'timestamp ( 3 ) with time zone',
    '"Custom" . "Type" [ 5 ] [ ]',
    'text',
    'int',
  ]);
  expect(report.tables[0]!.columns[5]!.nullable).toBe(false);
  expect(report.tables[0]!.columns[5]!.nullabilityConstraints[0]).toMatchObject({
    name: { name: 'nn' },
    nullable: false,
  });
  const type = report.tables[0]!.columns[3]!.typeLocation;
  expect(source.slice(type.start, type.end)).toBe('timestamp(3) with time zone');
});
test.each([
  'MATCH SIMPLE',
  'MATCH FULL',
  'ON DELETE NO ACTION',
  'ON UPDATE RESTRICT',
  'ON DELETE CASCADE ON UPDATE SET NULL',
  'ON DELETE SET DEFAULT',
  'DEFERRABLE INITIALLY DEFERRED',
  'NOT DEFERRABLE INITIALLY IMMEDIATE',
])('FK option retained completely: %s', (option) => {
  const report = parseSqlDdl(
    `CREATE TABLE s.p(id int PRIMARY KEY); CREATE TABLE s.c(x int REFERENCES s.p(id) ${option});`,
  );
  expect(report.status).toBe('complete');
  expect(report.edges[0]!.supported).toBe(true);
  expect(report.edges[0]!.binding.status).toBe('resolved-local');
  expect(Object.values(report.edges[0]!.options).some((v) => v !== null)).toBe(true);
});
test.each(['MATCH PARTIAL', 'ON DELETE SET NULL (x)', 'NOT VALID', 'WITH (foo)', 'ENFORCED'])(
  'unsupported FK options located and no solid binding: %s',
  (option) => {
    const source = `CREATE TABLE s.p(id int PRIMARY KEY); CREATE TABLE s.c(x int REFERENCES s.p(id) ${option});`;
    const report = parseSqlDdl(source);
    expect(report.status).not.toBe('complete');
    expect(report.edges[0]!.supported).toBe(false);
    expect(report.edges[0]!.binding.status).not.toBe('resolved-local');
    expect(report.diagnostics.some((d) => d.location.start >= source.indexOf(option))).toBe(true);
  },
);
test.each([
  ['CREATE TABLE s.t (id int DEFAULT 1);', 'unsupported-column-clause'],
  ['CREATE TABLE s.t (id int CHECK (id>0));', 'unsupported-column-clause'],
  ['CREATE TABLE s.t (id int UNIQUE);', 'unsupported-column-clause'],
  ['CREATE TABLE s.t (id int GENERATED ALWAYS AS (1) STORED);', 'unsupported-column-clause'],
  ['CREATE TABLE s.t (id int, UNIQUE(id));', 'unsupported-table-constraint'],
  ['CREATE TABLE s.t (id int, CHECK(id>0));', 'unsupported-table-constraint'],
  ['CREATE TABLE s.t (id int, CONSTRAINT u UNIQUE(id));', 'unsupported-table-constraint'],
  ['CREATE TABLE s.t (id int) INHERITS (s.parent);', 'unsupported-table-suffix'],
  ['CREATE TABLE s.t (id int) PARTITION BY RANGE(id);', 'unsupported-table-suffix'],
  ['CREATE TABLE s.t AS SELECT 1;', 'unsupported-create-body'],
  ['CREATE TABLE IF NOT EXISTS s.t (id int);', 'unsupported-create-prefix'],
  ['CREATE TEMP TABLE s.t (id int);', 'unsupported-statement'],
  ['ALTER TABLE s.t ADD COLUMN x int;', 'unsupported-statement'],
  ['DROP TABLE s.t;', 'unsupported-statement'],
  ['SET search_path = app;', 'unsupported-statement'],
] as const)('unsupported statement/clause never claims complete %#', (source, code) => {
  const report = parseSqlDdl(source);
  expect(report.status).toBe('partial');
  expect(report.diagnostics.map((d) => d.code)).toContain(code);
});
test('later unsupported migration statements never mutate snapshot, recovery after lexical boundaries only', () => {
  const source = `CREATE/*between*/TABLE s.t(id int PRIMARY KEY); ALTER TABLE s.t DROP COLUMN id; SELECT E'a\\';x', $$;$$, $q$;$q$; CREATE TABLE s.u(x int REFERENCES s.t(id)); DROP TABLE s.t;`;
  const report = parseSqlDdl(source);
  expect(report.status).toBe('partial');
  expect(report.tables).toHaveLength(2);
  expect(report.tables[0]!.columns[0]!.name.name).toBe('id');
  expect(report.statements).toHaveLength(5);
  expect(report.edges[0]!.binding.status).toBe('resolved-local');
  expect(report.diagnostics.filter((d) => d.code === 'unsupported-statement')).toHaveLength(3);
});
test.each([
  "'unclosed; CREATE TABLE s.fake(id int);",
  '"unclosed; CREATE TABLE s.fake(id int);',
  '$tag$unclosed; CREATE TABLE s.fake(id int);',
  '/* unclosed; CREATE TABLE s.fake(id int);',
  "'ambiguous\\'; CREATE TABLE s.fake(id int);",
])('unterminated/ambiguous lexical remainder never creates later guessed table %#', (tail) => {
  const report = parseSqlDdl('CREATE TABLE s.good(id int); SELECT ' + tail);
  expect(report.status).toBe('invalid');
  expect(report.tables.map((t) => t.name.name.name)).toEqual(['good']);
  expect(report.edges).toHaveLength(0);
});
test.each([
  ['CREATE TABLE s.t(id int, id text);', 'duplicate-column'],
  ['CREATE TABLE s.t(id int); CREATE TABLE s.t(x int);', 'duplicate-table'],
  ['CREATE TABLE s.t(id int PRIMARY KEY, x int PRIMARY KEY);', 'multiple-primary-keys'],
  ['CREATE TABLE s.t(id int, PRIMARY KEY(missing));', 'invalid-primary-key-column'],
  ['CREATE TABLE s.t(id int, PRIMARY KEY(id,id));', 'invalid-primary-key-column'],
  [
    'CREATE TABLE s.p(id int); CREATE TABLE s.c(x int, FOREIGN KEY(missing) REFERENCES s.p(id));',
    'invalid-fk-source-column',
  ],
  [
    'CREATE TABLE s.p(id int); CREATE TABLE s.c(x int REFERENCES s.p(missing));',
    'invalid-fk-target-column',
  ],
  [
    'CREATE TABLE s.p(id int, z int); CREATE TABLE s.c(x int REFERENCES s.p(id,z));',
    'fk-arity-mismatch',
  ],
  [
    'CREATE TABLE s.p(id int); CREATE TABLE s.c(x int REFERENCES s.p(id) ON DELETE CASCADE ON DELETE RESTRICT);',
    'duplicate-fk-option',
  ],
] as const)('invalid local model fail closed %#', (source, code) => {
  const report = parseSqlDdl(source);
  expect(report.status).toBe('invalid');
  expect(report.diagnostics.map((d) => d.code)).toContain(code);
  expect(report.edges.some((e) => e.binding.status === 'resolved-local')).toBe(false);
});
test('missing/ambiguous targets retain explicit declaration but never invent graph nodes', () => {
  const report = parseSqlDdl(
    'CREATE TABLE s.c(x int REFERENCES missing.t(id)); CREATE TABLE a.t(id int); CREATE TABLE b.t(id int); CREATE TABLE s.d(y int REFERENCES t(id));',
  );
  expect(report.status).toBe('partial');
  expect(report.tables).toHaveLength(4);
  expect(report.edges).toHaveLength(2);
  expect(report.edges.map((e) => e.binding.status)).toEqual(['unresolved', 'unresolved']);
  expect(report.edges[0]!.binding.candidateTableIds).toEqual([]);
  expect(report.edges[1]!.binding.candidateTableIds).toHaveLength(2);
  expect(
    report.edges.every(
      (e) => e.binding.targetTableId === null && e.binding.targetColumnIds.length === 0,
    ),
  ).toBe(true);
});
test('no FK means no edges and identifiers/types alone never infer relationships', () => {
  expect(
    parseSqlDdl('CREATE TABLE s.users(id int PRIMARY KEY); CREATE TABLE s.posts(user_id int);')
      .edges,
  ).toEqual([]);
});
test('source UTF16 line/column/BOM/CRLF/comment offsets are actual original ranges', () => {
  const source =
    '\uFEFFCREATE TABLE s."你好"(\r\n  "x/y" int NOT NULL,\r\n  y int REFERENCES /*注*/ s."你好"("x/y")\r\n);';
  const report = parseSqlDdl(source);
  expect(report.status).toBe('complete');
  const column = report.tables[0]!.columns[0]!;
  expect(column.name.location).toMatchObject({ line: 2, column: 3 });
  expect(source.slice(column.name.location.start, column.name.location.end)).toBe('"x/y"');
  expect(report.edges[0]!.location).toMatchObject({ line: 3, column: 9 });
  expect(source.slice(report.edges[0]!.location.start, report.edges[0]!.location.end)).toBe(
    'REFERENCES /*注*/ s."你好"("x/y")',
  );
});
test('summary explicitly projects names/types/static diagnostics; no SQL/default/literal/comment bodies or value hashes', () => {
  const source = `-- SECRET_COMMENT\nCREATE TABLE "<script>"."x&y" ("__proto__" text DEFAULT 'SECRET_DEFAULT;''SECRET_LITERAL', safe int PRIMARY KEY); SELECT $x$SECRET_DOLLAR$x$;`;
  const report = parseSqlDdl(source),
    summary = exportSqlDdlSummary(report);
  expect(report.status).toBe('partial');
  expect(summary).toContain('<script>');
  expect(summary).toContain('__proto__');
  expect(summary).not.toMatch(/SECRET_|"source"\s*:|"value"\s*:/);
  expect(report.tables[0]!.id).toBe('table:statement:0');
  expect(summary).toContain('unsupported-column-clause');
  expect(parseSqlDdl(source)).toEqual(report);
  expect(structuredClone(report)).toEqual(report);
});
test('resource caps fail without truncated model: statements/tables/per-table/global columns/constraints', () => {
  const cases = [
    'SELECT 1;'.repeat(SQL_DDL_LIMITS.statements + 1),
    Array.from(
      { length: SQL_DDL_LIMITS.tables + 1 },
      (_, i) => `CREATE TABLE s.t${i}(id int);`,
    ).join(''),
    `CREATE TABLE s.t(${Array.from({ length: SQL_DDL_LIMITS.columnsPerTable + 1 }, (_, i) => `c${i} int`).join(',')});`,
    Array.from(
      { length: 11 },
      (_, i) =>
        `CREATE TABLE s.t${i}(${Array.from({ length: 200 }, (_, j) => `c${j} int`).join(',')});`,
    ).join(''),
    `CREATE TABLE s.t(x int ${'PRIMARY KEY '.repeat(SQL_DDL_LIMITS.constraints + 1)});`,
  ];
  for (const source of cases) {
    const report = parseSqlDdl(source);
    expect(report).toMatchObject({ status: 'limit', tables: [], edges: [], statements: [] });
  }
});
test('hostile deep/long/wide and realistic80table composite model bounded measurements', () => {
  for (const [label, source] of [
    ['deep', '('.repeat(50_000) + ')'.repeat(50_000)],
    ['long', 'x'.repeat(500_001)],
    [
      'wide',
      `CREATE TABLE s.t(${Array.from({ length: 10_000 }, (_, i) => `c${i} int`).join(',')});`,
    ],
  ] as const) {
    const start = performance.now(),
      report = parseSqlDdl(source),
      elapsed = performance.now() - start;
    expect(report.status).toBe('limit');
    expect(report.tables).toEqual([]);
    expect(elapsed).toBeLessThan(5000);
    console.info(`DDL hostile ${label}: ${source.length}units ${elapsed.toFixed(1)}ms`);
  }
  const source = Array.from(
    { length: 80 },
    (_, i) =>
      `CREATE TABLE s.t${i}(a int,b text,PRIMARY KEY(a,b)${i ? `,FOREIGN KEY(a,b) REFERENCES s.t${i - 1}(a,b) MATCH FULL ON DELETE CASCADE` : ''});`,
  ).join('\n');
  const start = performance.now(),
    report = parseSqlDdl(source),
    elapsed = performance.now() - start;
  expect(report.status).toBe('complete');
  expect(report.tables).toHaveLength(80);
  expect(report.edges).toHaveLength(79);
  expect(elapsed).toBeLessThan(5000);
  console.info(
    `DDL realistic80tables/79compositeFKs ${source.length}units ${elapsed.toFixed(1)}ms`,
  );
});

test('edge/type/nullability/global-work guards refuse without exposing a partial graph', () => {
  const edgeLimit = 'CREATE TABLE s.t(id int ' + 'REFERENCES s.t(id) '.repeat(1001) + ');';
  expect(parseSqlDdl(edgeLimit)).toMatchObject({
    status: 'limit',
    tables: [],
    edges: [],
    diagnostics: [{ code: 'edge-limit' }],
  });
  const nullLimit = 'CREATE TABLE s.t(id int ' + 'NOT NULL '.repeat(1001) + ');';
  expect(parseSqlDdl(nullLimit)).toMatchObject({
    status: 'limit',
    tables: [],
    diagnostics: [{ code: 'constraint-limit' }],
  });
  const longType = 'CREATE TABLE s.t(x int' + '[]'.repeat(65) + ');';
  expect(parseSqlDdl(longType)).toMatchObject({
    status: 'limit',
    tables: [],
    diagnostics: [{ code: 'datatype-token-limit' }],
  });
  const typeSize = 'CREATE TABLE s.t(x "' + 'x'.repeat(2050) + '"."' + 'y'.repeat(2050) + '");';
  expect(parseSqlDdl(typeSize)).toMatchObject({
    status: 'limit',
    tables: [],
    diagnostics: [{ code: 'datatype-size-limit' }],
  });
  const work = Array.from(
    { length: 100 },
    (_, i) =>
      `CREATE TABLE s.t${i}(id int,${Array.from({ length: 9 }, (_, j) => `c${j} int${'[]'.repeat(20)} REFERENCES t0(id)`).join(',')});`,
  ).join('');
  const start = performance.now(),
    report = parseSqlDdl(work),
    elapsed = performance.now() - start;
  expect(report).toMatchObject({
    status: 'limit',
    tables: [],
    edges: [],
    diagnostics: [{ code: 'work-limit' }],
  });
  expect(elapsed).toBeLessThan(5000);
  console.info(
    `DDL global-work fanout ${work.length}units: ${elapsed.toFixed(1)}ms, fail-closed limit`,
  );
});

test('explicit PK derivation is stable before later FK-resolution diagnostics; late invalid tables clear all bindings', () => {
  const source =
    'CREATE TABLE s.p(id int PRIMARY KEY, x int REFERENCES absent.t(id)); CREATE TABLE s.c(x int REFERENCES s.p);';
  const report = parseSqlDdl(source);
  expect(report.status).toBe('partial');
  expect(report.edges[1]!.binding).toMatchObject({
    status: 'resolved-local',
    targetColumnsOrigin: 'target-primary-key',
  });
  const reordered = parseSqlDdl(
    'CREATE TABLE s.c(x int REFERENCES s.p); CREATE TABLE s.p(id int PRIMARY KEY, x int REFERENCES absent.t(id));',
  );
  expect(reordered.edges[0]!.binding).toMatchObject({
    status: 'resolved-local',
    targetColumnsOrigin: 'target-primary-key',
  });
  const late = parseSqlDdl(
    'CREATE TABLE s.t(id int PRIMARY KEY, good int REFERENCES s.t(id), bad int REFERENCES s.t(missing));',
  );
  expect(late.status).toBe('invalid');
  expect(
    late.edges.every(
      (edge) => edge.binding.status === 'invalid' && edge.binding.targetTableId === null,
    ),
  ).toBe(true);
});

test('only known type tokens enter export; malformed clauses and trailing tokens cannot be complete', () => {
  for (const source of [
    'CREATE TABLE s.t(x int mystery clause);',
    'CREATE TABLE s.t(x int) nonsense;',
    'CREATE TABLE s.t(x int,,y text);',
    'CREATE TABLE s.t(x);',
    'CREATE TABLE s.t(x int, FOREIGN KEY(x) REFERENCES);',
    'CREATE TABLE s.t(x int; y text);',
  ])
    expect(parseSqlDdl(source).status).not.toBe('complete');
  expect(parseSqlDdl(' -- only comments\n/* nested /*x*/ */')).toMatchObject({
    status: 'complete',
    tables: [],
    statements: [],
  });
  const report = parseSqlDdl(
    'CREATE TABLE s.t(id int PRIMARY KEY, p int REFERENCES s.t(id) ON DELETE CASCADE);',
  );
  expect(JSON.parse(exportSqlDdlSummary(report)).tables[0].foreignKeys[0]).toMatchObject({
    options: { onDelete: 'cascade' },
    binding: { status: 'resolved-local' },
  });
});

test('FK options retain exact enumerated metadata and source spans; named NULL metadata exported', () => {
  const source =
    'CREATE TABLE s.t(id int PRIMARY KEY, x int CONSTRAINT fk REFERENCES s.t(id) MATCH FULL ON DELETE SET DEFAULT ON UPDATE NO ACTION DEFERRABLE INITIALLY DEFERRED, y text CONSTRAINT nn NOT NULL);';
  const report = parseSqlDdl(source);
  expect(report.status).toBe('complete');
  expect(report.edges[0]!.options).toEqual({
    match: 'full',
    onDelete: 'set default',
    onUpdate: 'no action',
    deferrable: true,
    initially: 'deferred',
  });
  expect(source.slice(report.edges[0]!.location.start, report.edges[0]!.location.end)).toBe(
    'CONSTRAINT fk REFERENCES s.t(id) MATCH FULL ON DELETE SET DEFAULT ON UPDATE NO ACTION DEFERRABLE INITIALLY DEFERRED',
  );
  expect(
    JSON.parse(exportSqlDdlSummary(report)).tables[0].columns[2].nullabilityConstraints[0],
  ).toMatchObject({ name: { name: 'nn' }, nullable: false });
});

test('time type suffixes consumed once only and key-list resource cap bounded', () => {
  expect(
    parseSqlDdl('CREATE TABLE s.t(a timestamp with time zone, b time(2) without time zone);')
      .status,
  ).toBe('complete');
  for (const type of [
    'timestamp with time zone with time zone',
    'time.foo with time zone',
    'timestamp with time zone(2)',
  ])
    expect(parseSqlDdl(`CREATE TABLE s.t(x ${type});`).status).not.toBe('complete');
  const list = Array.from({ length: 201 }, (_, i) => `c${i}`).join(',');
  expect(parseSqlDdl(`CREATE TABLE s.t(x int, PRIMARY KEY(${list}));`)).toMatchObject({
    status: 'limit',
    tables: [],
    diagnostics: [{ code: 'key-column-limit' }],
  });
});
