import { expect, test } from 'vite-plus/test';
import { lexSqlDdl, SQL_DDL_LIMITS } from './sql-ddl-lexer.js';
test('quoted/E/dollar strings and nested comments never expose inner semicolons as statement tokens', () => {
  const source = `SELECT 'a;''b', E'a\\';b', $$x;/*not comment*/$$, $tag$z;--not comment$tag$, "a;""B"; /* outer; /* nested; */ done */ -- tail;\r\nSELECT 2;`;
  const report = lexSqlDdl(source);
  expect(report.status).toBe('complete');
  expect(report.tokens.filter((t) => t.value === ';')).toHaveLength(2);
  expect(report.tokens.filter((t) => t.kind === 'literal').map((t) => t.value)).toEqual([
    '',
    '',
    '',
    '',
  ]);
  expect(report.tokens.find((t) => t.kind === 'identifier')?.value).toBe('a;"B');
  expect(JSON.stringify(report.tokens)).not.toContain('not comment');
});
test('ASCII fold, dollar inside bare identifier, doubled quotes, BOM/CRLF UTF16 locations', () => {
  const source = '\uFEFFCREATE\r\n/*x*/ TABLE "你好" (a$b INT);';
  const report = lexSqlDdl(source);
  expect(report.status).toBe('complete');
  expect(report.tokens.find((t) => t.value === 'a$b')?.kind).toBe('word');
  const token = report.tokens.find((t) => t.kind === 'identifier')!;
  expect(token.location).toMatchObject({ line: 2, column: 13 });
  expect(source.slice(token.location.start, token.location.end)).toBe('"你好"');
});
test.each([
  "SELECT 'unterminated; CREATE TABLE s.fake(id int);",
  "SELECT E'escape\\",
  'SELECT $tag$unterminated;',
  'SELECT $$unterminated;',
  'SELECT "unterminated;',
  '/* outer /* inner */',
])('unterminated constructs stop with invalid remainder %#', (source) => {
  const report = lexSqlDdl(source);
  expect(report.status).toBe('invalid');
  expect(report.diagnostics).toHaveLength(1);
  expect(report.diagnostics[0]!.code).toMatch(/unterminated/);
});
test.each([
  "SELECT 'ambiguous\\'; CREATE TABLE s.fake(id int);",
  'SELECT U&"escaped";',
  "SELECT U&'escaped';",
  'CREATE TABLE 中文 (id int);',
  'SELECT $标签$x;$标签$;',
])('unsupported lexical modes refuse rather than recover incorrectly %#', (source) => {
  expect(lexSqlDdl(source).status).toBe('invalid');
});
test.each([
  ['input-limit', () => ' '.repeat(SQL_DDL_LIMITS.codeUnits + 1)],
  ['token-size-limit', () => 'a'.repeat(SQL_DDL_LIMITS.tokenUnits + 1)],
  ['token-size-limit', () => '"' + 'a'.repeat(SQL_DDL_LIMITS.tokenUnits) + '"'],
  ['token-count-limit', () => ';'.repeat(SQL_DDL_LIMITS.tokens + 1)],
  ['comment-size-limit', () => '--' + 'x'.repeat(SQL_DDL_LIMITS.commentUnits)],
  ['comment-depth-limit', () => '/*'.repeat(SQL_DDL_LIMITS.commentDepth + 1)],
  ['parenthesis-depth-limit', () => '('.repeat(SQL_DDL_LIMITS.parentheses + 1)],
] as const)('lexer resource %s refuses at boundary', (code, make) => {
  expect(lexSqlDdl(make())).toMatchObject({ status: 'limit', diagnostics: [{ code }] });
});
test('unmatched parentheses and NUL fail closed', () => {
  expect(lexSqlDdl(')')).toMatchObject({
    status: 'invalid',
    diagnostics: [{ code: 'unmatched-parenthesis' }],
  });
  expect(lexSqlDdl('(').status).toBe('invalid');
  expect(lexSqlDdl('"a\0b"').status).toBe('invalid');
});
