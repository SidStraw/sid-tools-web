import {
  lexSqlDdl,
  SQL_DDL_LIMITS,
  type SqlToken,
  type SqlLocation,
  type SqlDiagnostic,
} from './sql-ddl-lexer.js';
export { SQL_DDL_LIMITS } from './sql-ddl-lexer.js';
export type { SqlLocation, SqlDiagnostic } from './sql-ddl-lexer.js';
export const SQL_DDL_SCOPE = [
  'Bounded PostgreSQL18 CREATE TABLE declaration subset, not database validation or migration final state. No execution, catalog, network or name-based inferred relationships. Unsupported ALTER/DROP/SET and later statements never mutate earlier CREATE snapshots.',
  'ASCII unquoted identifiers lowercase; quoted identifiers preserve case and doubled quotes. Exact schema/name tuple identity, no implicit public/search_path. Non-ASCII unquoted and U&/bare-backslash string modes refuse remainder rather than guess lexical recovery.',
  'Column types are bounded lexical descriptions, not catalog-validated types: simple/schema-qualified names, selected builtin multiword types, numeric modifiers and arrays. Explicit NULL/NOT NULL, column/table named PRIMARY KEY and REFERENCES/FOREIGN KEY supported. PK implies not-null display.',
  'FK MATCH SIMPLE/FULL, ON DELETE/UPDATE NO ACTION/RESTRICT/CASCADE/SET NULL/SET DEFAULT and DEFERRABLE/NOT DEFERRABLE/INITIALLY DEFERRED/IMMEDIATE retained. Other options/clauses unsupported and partial. Defaults/checks/unique/generated/inherits/partition/temp/IF NOT EXISTS/CREATE AS not interpreted.',
  'Resolved-local means unique explicitly qualified input target and existing ordered source/target columns only, never proven target uniqueness/type compatibility/DB acceptance. Unqualified declarations/references remain local candidates without search_path. Implicit referenced columns derived only from known explicit PK of a structurally complete qualified local target before relationship resolution; provenance retained.',
  'Only declared FKs become edges; unresolved edges retain target identity without invented nodes or columns. Names/type descriptions may be sensitive and contain markup-looking text; render/export plaintext with consent. Summary excludes raw SQL, literals, defaults and comment bodies. Dedicated terminable app worker required for UI.',
] as const;
export interface SqlIdentifier {
  name: string;
  quoted: boolean;
  location: SqlLocation;
}
export interface SqlTableName {
  schema: SqlIdentifier | null;
  name: SqlIdentifier;
  location: SqlLocation;
}
export interface SqlColumn {
  id: string;
  name: SqlIdentifier;
  dataType: string;
  typeLocation: SqlLocation;
  location: SqlLocation;
  nullable: boolean;
  primaryKey: boolean;
  nullabilityConstraints: {
    name: SqlIdentifier | null;
    nullable: boolean;
    location: SqlLocation;
  }[];
}
export interface SqlPrimaryKey {
  id: string;
  name: SqlIdentifier | null;
  columns: SqlIdentifier[];
  location: SqlLocation;
}
export interface SqlForeignKey {
  id: string;
  sourceTableId: string;
  name: SqlIdentifier | null;
  sourceColumns: SqlIdentifier[];
  target: SqlTableName;
  targetColumns: SqlIdentifier[] | null;
  location: SqlLocation;
  supported: boolean;
  options: {
    match: 'simple' | 'full' | null;
    onDelete: string | null;
    onUpdate: string | null;
    deferrable: boolean | null;
    initially: 'deferred' | 'immediate' | null;
  };
  binding: {
    status: 'resolved-local' | 'local-candidate' | 'unresolved' | 'invalid';
    targetTableId: string | null;
    candidateTableIds: string[];
    sourceColumnIds: string[];
    targetColumnIds: string[];
    targetColumnsOrigin: 'explicit' | 'target-primary-key' | 'unknown';
    targetPrimaryKeyLocation: SqlLocation | null;
  };
}
export interface SqlTable {
  id: string;
  statementId: string;
  name: SqlTableName;
  location: SqlLocation;
  status: 'complete' | 'partial' | 'invalid';
  columns: SqlColumn[];
  primaryKey: SqlPrimaryKey | null;
  foreignKeys: SqlForeignKey[];
}
export interface SqlStatement {
  id: string;
  kind: 'create-table' | 'unsupported' | 'invalid';
  status: 'complete' | 'partial' | 'invalid';
  location: SqlLocation;
  tableId: string | null;
}
export interface SqlDdlReport {
  status: 'complete' | 'partial' | 'invalid' | 'limit';
  tables: SqlTable[];
  edges: SqlForeignKey[];
  statements: SqlStatement[];
  diagnostics: SqlDiagnostic[];
  scope: string[];
  limits: typeof SQL_DDL_LIMITS;
}
class Limit extends Error {
  constructor(
    readonly code: string,
    readonly location: SqlLocation,
  ) {
    super(code);
  }
}
class Syntax extends Error {
  constructor(
    readonly code: string,
    readonly token: SqlToken | undefined,
  ) {
    super(code);
  }
}
const word = (token: SqlToken | undefined, value: string) =>
  token?.kind === 'word' && token.value === value;
const symbol = (token: SqlToken | undefined, value: string) =>
  token?.kind === 'symbol' && token.value === value;
const identifier = (token: SqlToken | undefined): SqlIdentifier | null =>
  token && (token.kind === 'word' || token.kind === 'identifier')
    ? { name: token.value, quoted: token.kind === 'identifier', location: token.location }
    : null;
const canonical = (name: SqlTableName) =>
  JSON.stringify([name.schema?.name ?? null, name.name.name]);
const reserved = new Set([
  'constraint',
  'primary',
  'foreign',
  'unique',
  'check',
  'exclude',
  'like',
  'period',
]);
const startsConstraint = new Set([
  'constraint',
  'primary',
  'references',
  'not',
  'null',
  'default',
  'check',
  'unique',
  'generated',
  'collate',
  'identity',
  'compression',
  'storage',
]);

export function parseSqlDdl(source: string): SqlDdlReport {
  const lexed = lexSqlDdl(source);
  const report: SqlDdlReport = {
    status: lexed.status === 'complete' ? 'complete' : lexed.status,
    tables: [],
    edges: [],
    statements: [],
    diagnostics: [...lexed.diagnostics],
    scope: [...SQL_DDL_SCOPE],
    limits: { ...SQL_DDL_LIMITS },
  };
  if (lexed.status === 'limit') return report;
  let work = 0,
    columnCount = 0,
    constraintCount = 0;
  const spend = (location: SqlLocation, amount = 1) => {
    work += amount;
    if (work > SQL_DDL_LIMITS.work) throw new Limit('work-limit', location);
  };
  function diagnostic(
    code: string,
    severity: SqlDiagnostic['severity'],
    location: SqlLocation,
    statement?: SqlStatement,
    table?: SqlTable,
  ) {
    report.diagnostics.push({
      code,
      severity,
      location,
      statementId: statement?.id ?? table?.statementId ?? null,
      tableId: table?.id ?? null,
    });
    if (table)
      table.status =
        severity === 'invalid' ? 'invalid' : table.status === 'invalid' ? 'invalid' : 'partial';
    if (statement)
      statement.status =
        severity === 'invalid' ? 'invalid' : statement.status === 'invalid' ? 'invalid' : 'partial';
  }
  const span = (tokens: SqlToken[], fallback: SqlLocation) =>
    tokens.length ? lexed.locate(tokens[0]!.location.start, tokens.at(-1)!.location.end) : fallback;
  function parseStatement(tokens: SqlToken[], end: number) {
    if (!tokens.length) return;
    if (report.statements.length >= SQL_DDL_LIMITS.statements)
      throw new Limit('statement-limit', tokens[0]!.location);
    const statement: SqlStatement = {
      id: `statement:${report.statements.length}`,
      kind: 'unsupported',
      status: 'partial',
      location: lexed.locate(tokens[0]!.location.start, end),
      tableId: null,
    };
    report.statements.push(statement);
    spend(statement.location, tokens.length);
    if (!word(tokens[0], 'create') || !word(tokens[1], 'table')) {
      diagnostic('unsupported-statement', 'unsupported', statement.location, statement);
      return;
    }
    if (word(tokens[2], 'if') || word(tokens[2], 'only')) {
      diagnostic(
        'unsupported-create-prefix',
        'unsupported',
        span(tokens.slice(2), statement.location),
        statement,
      );
      return;
    }
    let position = 2;
    const nameAt = (): SqlIdentifier => {
      const name = identifier(tokens[position]);
      if (!name) throw new Syntax('identifier-required', tokens[position]);
      position++;
      return name;
    };
    const tableName = (): SqlTableName => {
      const first = nameAt();
      let schema: SqlIdentifier | null = null,
        name = first;
      if (symbol(tokens[position], '.')) {
        position++;
        schema = first;
        name = nameAt();
      }
      return { schema, name, location: lexed.locate(first.location.start, name.location.end) };
    };
    let table: SqlTable | undefined;
    try {
      const name = tableName();
      if (!symbol(tokens[position], '(')) {
        diagnostic(
          'unsupported-create-body',
          'unsupported',
          span(tokens.slice(position), statement.location),
          statement,
        );
        return;
      }
      if (report.tables.length >= SQL_DDL_LIMITS.tables)
        throw new Limit('table-limit', name.location);
      statement.kind = 'create-table';
      statement.status = 'complete';
      table = {
        id: `table:${statement.id}`,
        statementId: statement.id,
        name,
        location: statement.location,
        status: 'complete',
        columns: [],
        primaryKey: null,
        foreignKeys: [],
      };
      statement.tableId = table.id;
      report.tables.push(table);
      position++;
      const clauses: SqlToken[][] = [];
      let start = position,
        depth = 0,
        closed = false;
      const appendClause = () => {
        if (clauses.length >= SQL_DDL_LIMITS.columnsPerTable + SQL_DDL_LIMITS.constraints)
          throw new Limit('clause-limit', tokens[start]?.location ?? statement.location);
        clauses.push(tokens.slice(start, position));
      };
      for (; position < tokens.length; position++) {
        const token = tokens[position]!;
        spend(token.location);
        if (symbol(token, '(')) depth++;
        else if (symbol(token, ')')) {
          if (!depth) {
            if (position > start) appendClause();
            else if (clauses.length)
              diagnostic('empty-clause', 'invalid', token.location, statement, table);
            closed = true;
            position++;
            break;
          }
          depth--;
        } else if (symbol(token, ',') && !depth) {
          appendClause();
          start = position + 1;
        } else if (symbol(token, ';'))
          diagnostic('semicolon-in-definition', 'invalid', token.location, statement, table);
      }
      if (!closed) throw new Syntax('table-body-unclosed', tokens.at(-1));
      if (!clauses.length)
        diagnostic(
          'empty-table-subset-unsupported',
          'unsupported',
          table.location,
          statement,
          table,
        );
      for (const clause of clauses) parseClause(clause, table, statement);
      if (position < tokens.length)
        diagnostic(
          'unsupported-table-suffix',
          'unsupported',
          span(tokens.slice(position), statement.location),
          statement,
          table,
        );
    } catch (error) {
      if (error instanceof Limit) throw error;
      diagnostic(
        error instanceof Syntax ? error.code : 'invalid-create-table',
        'invalid',
        error instanceof Syntax
          ? (error.token?.location ?? statement.location)
          : statement.location,
        statement,
        table,
      );
      statement.kind = table ? 'create-table' : 'invalid';
    }
  }
  function parseClause(tokens: SqlToken[], table: SqlTable, statement: SqlStatement) {
    if (!tokens.length) {
      diagnostic('empty-clause', 'invalid', table.location, statement, table);
      return;
    }
    let p = 0,
      constraintName: SqlIdentifier | null = null,
      constraintStart = 0;
    const loc = () => tokens[p]?.location ?? tokens.at(-1)!.location;
    const take = (value: string) => {
      if (word(tokens[p], value)) {
        p++;
        return true;
      }
      return false;
    };
    const need = (value: string) => {
      if (!take(value)) throw new Syntax('expected-keyword', tokens[p]);
    };
    const ident = () => {
      const result = identifier(tokens[p]);
      if (!result) throw new Syntax('identifier-required', tokens[p]);
      p++;
      return result;
    };
    const list = (): SqlIdentifier[] => {
      if (!symbol(tokens[p], '(')) throw new Syntax('column-list-required', tokens[p]);
      p++;
      const result: SqlIdentifier[] = [ident()];
      while (symbol(tokens[p], ',')) {
        p++;
        if (result.length >= SQL_DDL_LIMITS.columnsPerTable)
          throw new Limit('key-column-limit', loc());
        result.push(ident());
      }
      if (!symbol(tokens[p], ')')) throw new Syntax('column-list-unclosed', tokens[p]);
      p++;
      return result;
    };
    const constraintId = () => {
      if (++constraintCount > SQL_DDL_LIMITS.constraints)
        throw new Limit('constraint-limit', loc());
      return `${table.id}:constraint:${constraintCount}`;
    };
    const constraintLocation = () =>
      lexed.locate(
        tokens[constraintStart]!.location.start,
        tokens[Math.max(constraintStart, p - 1)]!.location.end,
      );
    const primary = (columns: SqlIdentifier[]) => {
      const pk: SqlPrimaryKey = {
        id: constraintId(),
        name: constraintName,
        columns,
        location: constraintLocation(),
      };
      if (table.primaryKey)
        diagnostic('multiple-primary-keys', 'invalid', pk.location, statement, table);
      else table.primaryKey = pk;
    };
    const foreign = (columns: SqlIdentifier[]) => {
      const first = ident();
      let schema: SqlIdentifier | null = null,
        name = first;
      if (symbol(tokens[p], '.')) {
        p++;
        schema = first;
        name = ident();
      }
      const target: SqlTableName = {
        schema,
        name,
        location: lexed.locate(first.location.start, name.location.end),
      };
      const targetColumns = symbol(tokens[p], '(') ? list() : null;
      if (report.edges.length >= SQL_DDL_LIMITS.edges) throw new Limit('edge-limit', loc());
      const edge: SqlForeignKey = {
        id: constraintId(),
        sourceTableId: table.id,
        name: constraintName,
        sourceColumns: columns,
        target,
        targetColumns,
        location: constraintLocation(),
        supported: true,
        options: { match: null, onDelete: null, onUpdate: null, deferrable: null, initially: null },
        binding: {
          status: 'unresolved',
          targetTableId: null,
          candidateTableIds: [],
          sourceColumnIds: [],
          targetColumnIds: [],
          targetColumnsOrigin: targetColumns ? 'explicit' : 'unknown',
          targetPrimaryKeyLocation: null,
        },
      };
      const seen = new Set<string>();
      while (p < tokens.length) {
        const optionStart = p;
        let key: string | null = null;
        if (take('match')) {
          key = 'match';
          if (take('simple')) edge.options.match = 'simple';
          else if (take('full')) edge.options.match = 'full';
          else {
            p = optionStart;
            break;
          }
        } else if (take('on')) {
          const which = take('delete') ? 'onDelete' : take('update') ? 'onUpdate' : null;
          if (!which) {
            p = optionStart;
            break;
          }
          key = which;
          if (take('no')) {
            need('action');
            edge.options[which] = 'no action';
          } else if (take('restrict')) edge.options[which] = 'restrict';
          else if (take('cascade')) edge.options[which] = 'cascade';
          else if (take('set')) {
            if (take('null')) edge.options[which] = 'set null';
            else if (take('default')) edge.options[which] = 'set default';
            else {
              p = optionStart;
              break;
            }
          } else {
            p = optionStart;
            break;
          }
        } else if (take('deferrable')) {
          key = 'deferrable';
          edge.options.deferrable = true;
        } else if (word(tokens[p], 'not') && word(tokens[p + 1], 'deferrable')) {
          p += 2;
          key = 'deferrable';
          edge.options.deferrable = false;
        } else if (take('initially')) {
          key = 'initially';
          if (take('deferred')) edge.options.initially = 'deferred';
          else if (take('immediate')) edge.options.initially = 'immediate';
          else {
            p = optionStart;
            break;
          }
        } else break;
        if (seen.has(key!))
          diagnostic(
            'duplicate-fk-option',
            'invalid',
            tokens[optionStart]!.location,
            statement,
            table,
          );
        seen.add(key!);
      }
      edge.location = constraintLocation();
      table.foreignKeys.push(edge);
      report.edges.push(edge);
      return edge;
    };
    let lastFk: SqlForeignKey | null = null;
    try {
      if (take('constraint')) {
        constraintName = ident();
        constraintStart = 0;
      }
      if (take('primary')) {
        need('key');
        const columns = list();
        primary(columns);
      } else if (take('foreign')) {
        need('key');
        const columns = list();
        need('references');
        lastFk = foreign(columns);
      } else if (constraintName || (tokens[p]?.kind === 'word' && reserved.has(tokens[p]!.value))) {
        diagnostic(
          'unsupported-table-constraint',
          'unsupported',
          span(tokens, table.location),
          statement,
          table,
        );
        return;
      } else {
        const name = ident(),
          typeStart = p;
        if (!tokens[p] || (tokens[p]?.kind === 'word' && startsConstraint.has(tokens[p]!.value)))
          throw new Syntax('datatype-required', tokens[p]);
        // Datatypes contain identifiers, bounded numeric modifiers and array brackets only.
        const firstType = ident();
        const qualifiedType = symbol(tokens[p], '.');
        if (qualifiedType) {
          p++;
          ident();
        } else if (!firstType.quoted) {
          const multi: Record<string, string[][]> = {
            double: [['precision']],
            character: [['varying']],
            char: [['varying']],
            bit: [['varying']],
          };
          for (const suffix of Object.hasOwn(multi, firstType.name) ? multi[firstType.name]! : [])
            if (suffix.every((value, i) => word(tokens[p + i], value))) {
              p += suffix.length;
              break;
            }
        }
        if (symbol(tokens[p], '(')) {
          p++;
          if (tokens[p]?.kind !== 'number')
            throw new Syntax('datatype-modifier-unsupported', tokens[p]);
          p++;
          while (symbol(tokens[p], ',')) {
            p++;
            if (tokens[p]?.kind !== 'number')
              throw new Syntax('datatype-modifier-unsupported', tokens[p]);
            p++;
          }
          if (!symbol(tokens[p], ')')) throw new Syntax('datatype-modifier-unsupported', tokens[p]);
          p++;
        }
        // timestamp(precision) WITH/WITHOUT TIME ZONE is also a supported lexical spelling.
        if (
          !qualifiedType &&
          !firstType.quoted &&
          ['timestamp', 'time'].includes(firstType.name) &&
          (word(tokens[p], 'with') || word(tokens[p], 'without')) &&
          word(tokens[p + 1], 'time') &&
          word(tokens[p + 2], 'zone')
        )
          p += 3;
        while (symbol(tokens[p], '[')) {
          p++;
          if (tokens[p]?.kind === 'number') p++;
          if (!symbol(tokens[p], ']')) throw new Syntax('datatype-array-unsupported', tokens[p]);
          p++;
        }
        if (p - typeStart > SQL_DDL_LIMITS.typeTokens)
          throw new Limit('datatype-token-limit', tokens[typeStart]!.location);
        const typeTokens = tokens.slice(typeStart, p);
        if (
          typeTokens.reduce((units, token) => units + token.value.length + 3, 0) >
          SQL_DDL_LIMITS.typeUnits
        )
          throw new Limit('datatype-size-limit', tokens[typeStart]!.location);
        const dataType = typeTokens
          .map((token) =>
            token.kind === 'identifier' ? `"${token.value.replaceAll('"', '""')}"` : token.value,
          )
          .join(' ');
        if (
          ++columnCount > SQL_DDL_LIMITS.columns ||
          table.columns.length >= SQL_DDL_LIMITS.columnsPerTable
        )
          throw new Limit('column-limit', name.location);
        const column: SqlColumn = {
          id: `${table.id}:column:${table.columns.length}`,
          name,
          dataType,
          typeLocation: span(typeTokens, name.location),
          location: span(tokens, name.location),
          nullable: true,
          primaryKey: false,
          nullabilityConstraints: [],
        };
        table.columns.push(column);
        let seenNull = false;
        while (p < tokens.length) {
          constraintStart = p;
          constraintName = null;
          if (take('constraint')) constraintName = ident();
          if (take('not')) {
            need('null');
            if (seenNull) diagnostic('duplicate-nullability', 'invalid', loc(), statement, table);
            seenNull = true;
            column.nullable = false;
            constraintId();
            column.nullabilityConstraints.push({
              name: constraintName,
              nullable: false,
              location: constraintLocation(),
            });
          } else if (take('null')) {
            if (seenNull) diagnostic('duplicate-nullability', 'invalid', loc(), statement, table);
            seenNull = true;
            column.nullable = true;
            constraintId();
            column.nullabilityConstraints.push({
              name: constraintName,
              nullable: true,
              location: constraintLocation(),
            });
          } else if (take('primary')) {
            need('key');
            primary([name]);
          } else if (take('references')) lastFk = foreign([name]);
          else {
            diagnostic(
              'unsupported-column-clause',
              'unsupported',
              span(tokens.slice(constraintStart), column.location),
              statement,
              table,
            );
            if (lastFk) lastFk.supported = false;
            return;
          }
        }
      }
      if (p < tokens.length) {
        diagnostic(
          'unsupported-constraint-suffix',
          'unsupported',
          span(tokens.slice(p), table.location),
          statement,
          table,
        );
        if (lastFk) lastFk.supported = false;
      }
    } catch (error) {
      if (error instanceof Limit) throw error;
      diagnostic(
        error instanceof Syntax ? error.code : 'invalid-clause',
        'invalid',
        error instanceof Syntax
          ? (error.token?.location ?? span(tokens, table.location))
          : span(tokens, table.location),
        statement,
        table,
      );
      if (lastFk) lastFk.supported = false;
    }
  }
  try {
    let start = 0,
      depth = 0;
    for (let i = 0; i < lexed.tokens.length; i++) {
      const token = lexed.tokens[i]!;
      spend(token.location);
      if (symbol(token, '(')) depth++;
      else if (symbol(token, ')')) depth--;
      if (symbol(token, ';') && !depth) {
        parseStatement(lexed.tokens.slice(start, i), token.location.end);
        start = i + 1;
      }
    }
    if (start < lexed.tokens.length && lexed.status === 'complete')
      parseStatement(lexed.tokens.slice(start), source.length);
    else if (start < lexed.tokens.length) {
      if (report.statements.length >= SQL_DDL_LIMITS.statements)
        throw new Limit('statement-limit', lexed.tokens[start]!.location);
      report.statements.push({
        id: `statement:${report.statements.length}`,
        kind: 'invalid',
        status: 'invalid',
        location: lexed.locate(lexed.tokens[start]!.location.start, source.length),
        tableId: null,
      });
    }
    resolve();
  } catch (error) {
    if (error instanceof Limit) {
      report.status = 'limit';
      report.tables = [];
      report.edges = [];
      report.statements = [];
      report.diagnostics = [
        {
          code: error.code,
          severity: 'limit',
          location: error.location,
          statementId: null,
          tableId: null,
        },
      ];
      return report;
    }
    throw error;
  }
  function resolve() {
    const tables = new Map<string, SqlTable[]>(),
      columns = new Map<string, Map<string, SqlColumn[]>>();
    for (const table of report.tables) {
      const key = canonical(table.name);
      const matches = tables.get(key) ?? [];
      matches.push(table);
      tables.set(key, matches);
      const names = new Map<string, SqlColumn[]>();
      columns.set(table.id, names);
      for (const column of table.columns) {
        spend(column.location);
        const matches = names.get(column.name.name) ?? [];
        matches.push(column);
        names.set(column.name.name, matches);
      }
      for (const matches of names.values())
        if (matches.length > 1)
          for (const column of matches)
            diagnostic('duplicate-column', 'invalid', column.name.location, undefined, table);
      if (!table.name.schema)
        diagnostic(
          'unqualified-declaration-search-path-unknown',
          'unsupported',
          table.name.location,
          undefined,
          table,
        );
      if (table.primaryKey) {
        const seen = new Set<string>();
        for (const name of table.primaryKey.columns) {
          const matches = names.get(name.name) ?? [];
          if (matches.length !== 1 || seen.has(name.name))
            diagnostic('invalid-primary-key-column', 'invalid', name.location, undefined, table);
          else {
            matches[0]!.primaryKey = true;
            matches[0]!.nullable = false;
          }
          seen.add(name.name);
        }
      }
    }
    for (const matches of tables.values())
      if (matches.length > 1)
        for (const table of matches)
          diagnostic('duplicate-table', 'invalid', table.name.location, undefined, table);
    const explicitPkTargets = new Set(
      report.tables
        .filter((table) => table.name.schema && table.status === 'complete' && table.primaryKey)
        .map((table) => table.id),
    );
    for (const table of report.tables)
      for (const edge of table.foreignKeys) {
        spend(edge.location);
        const candidates = edge.target.schema
          ? (tables.get(canonical(edge.target)) ?? [])
          : report.tables.filter((target) => {
              spend(edge.location);
              return target.name.name.name === edge.target.name.name;
            });
        edge.binding.candidateTableIds = candidates.map((target) => target.id);
        const sourceColumns = columns.get(table.id)!;
        let bad = false;
        const seenSource = new Set<string>();
        for (const name of edge.sourceColumns) {
          const matches = sourceColumns.get(name.name) ?? [];
          if (matches.length !== 1 || seenSource.has(name.name)) {
            bad = true;
            diagnostic('invalid-fk-source-column', 'invalid', name.location, undefined, table);
          } else edge.binding.sourceColumnIds.push(matches[0]!.id);
          seenSource.add(name.name);
        }
        if (candidates.length !== 1) {
          diagnostic(
            candidates.length ? 'ambiguous-fk-target' : 'missing-fk-target',
            'unsupported',
            edge.target.location,
            undefined,
            table,
          );
          edge.binding.status = bad ? 'invalid' : 'unresolved';
          continue;
        }
        const target = candidates[0]!;
        const reliablyQualified = !!edge.target.schema && !!target.name.schema;
        let targetNames = edge.targetColumns;
        if (
          !targetNames &&
          reliablyQualified &&
          explicitPkTargets.has(target.id) &&
          target.primaryKey
        ) {
          targetNames = target.primaryKey.columns;
          edge.binding.targetColumnsOrigin = 'target-primary-key';
          edge.binding.targetPrimaryKeyLocation = target.primaryKey.location;
        }
        if (!targetNames) {
          diagnostic(
            'implicit-target-primary-key-unresolved',
            'unsupported',
            edge.target.location,
            undefined,
            table,
          );
          continue;
        }
        if (targetNames.length !== edge.sourceColumns.length) {
          bad = true;
          diagnostic('fk-arity-mismatch', 'invalid', edge.location, undefined, table);
        }
        const seenTarget = new Set<string>();
        for (const name of targetNames) {
          const matches = columns.get(target.id)!.get(name.name) ?? [];
          if (matches.length !== 1 || seenTarget.has(name.name)) {
            bad = true;
            diagnostic('invalid-fk-target-column', 'invalid', name.location, undefined, table);
          } else edge.binding.targetColumnIds.push(matches[0]!.id);
          seenTarget.add(name.name);
        }
        if (bad || table.status === 'invalid' || target.status === 'invalid') {
          edge.binding.status = 'invalid';
          edge.binding.targetColumnIds = [];
          continue;
        }
        if (!edge.supported) {
          diagnostic('fk-options-incomplete', 'unsupported', edge.location, undefined, table);
          edge.binding.targetColumnIds = [];
          continue;
        }
        if (!reliablyQualified || !table.name.schema) {
          edge.binding.status = 'local-candidate';
          diagnostic(
            'unqualified-reference-search-path-unknown',
            'unsupported',
            edge.target.location,
            undefined,
            table,
          );
        } else edge.binding.status = 'resolved-local';
        edge.binding.targetTableId = target.id;
      }
    for (const table of report.tables)
      for (const edge of table.foreignKeys) {
        const target = report.tables.find(
          (candidate) => candidate.id === edge.binding.targetTableId,
        );
        if (table.status === 'invalid' || target?.status === 'invalid') {
          edge.binding.status = 'invalid';
          edge.binding.targetTableId = null;
          edge.binding.targetColumnIds = [];
        }
      }
    for (const statement of report.statements)
      if (statement.tableId)
        statement.status = report.tables.find((table) => table.id === statement.tableId)!.status;
  }
  report.status = report.diagnostics.some((d) => d.severity === 'invalid')
    ? 'invalid'
    : report.diagnostics.length
      ? 'partial'
      : 'complete';
  return report;
}

export function exportSqlDdlSummary(report: SqlDdlReport): string {
  const location = (value: SqlLocation) => ({
    start: value.start,
    end: value.end,
    line: value.line,
    column: value.column,
  });
  const ident = (value: SqlIdentifier) => ({
    name: value.name,
    quoted: value.quoted,
    location: location(value.location),
  });
  const name = (value: SqlTableName) => ({
    schema: value.schema ? ident(value.schema) : null,
    name: ident(value.name),
    location: location(value.location),
  });
  const fk = (value: SqlForeignKey) => ({
    id: value.id,
    sourceTableId: value.sourceTableId,
    name: value.name ? ident(value.name) : null,
    sourceColumns: value.sourceColumns.map(ident),
    target: name(value.target),
    targetColumns: value.targetColumns?.map(ident) ?? null,
    location: location(value.location),
    supported: value.supported,
    options: {
      match: value.options.match,
      onDelete: value.options.onDelete,
      onUpdate: value.options.onUpdate,
      deferrable: value.options.deferrable,
      initially: value.options.initially,
    },
    binding: {
      status: value.binding.status,
      targetTableId: value.binding.targetTableId,
      candidateTableIds: [...value.binding.candidateTableIds],
      sourceColumnIds: [...value.binding.sourceColumnIds],
      targetColumnIds: [...value.binding.targetColumnIds],
      targetColumnsOrigin: value.binding.targetColumnsOrigin,
      targetPrimaryKeyLocation: value.binding.targetPrimaryKeyLocation
        ? location(value.binding.targetPrimaryKeyLocation)
        : null,
    },
  });
  return JSON.stringify(
    {
      format: 'sid-tools/sql-ddl/v1',
      status: report.status,
      tables: report.tables.map((table) => ({
        id: table.id,
        statementId: table.statementId,
        name: name(table.name),
        location: location(table.location),
        status: table.status,
        columns: table.columns.map((column) => ({
          id: column.id,
          name: ident(column.name),
          dataType: column.dataType,
          typeLocation: location(column.typeLocation),
          location: location(column.location),
          nullable: column.nullable,
          primaryKey: column.primaryKey,
          nullabilityConstraints: column.nullabilityConstraints.map((constraint) => ({
            name: constraint.name ? ident(constraint.name) : null,
            nullable: constraint.nullable,
            location: location(constraint.location),
          })),
        })),
        primaryKey: table.primaryKey
          ? {
              id: table.primaryKey.id,
              name: table.primaryKey.name ? ident(table.primaryKey.name) : null,
              columns: table.primaryKey.columns.map(ident),
              location: location(table.primaryKey.location),
            }
          : null,
        foreignKeys: table.foreignKeys.map(fk),
      })),
      statements: report.statements.map((s) => ({
        id: s.id,
        kind: s.kind,
        status: s.status,
        location: location(s.location),
        tableId: s.tableId,
      })),
      diagnostics: report.diagnostics.map((d) => ({
        code: d.code,
        severity: d.severity,
        location: location(d.location),
        statementId: d.statementId,
        tableId: d.tableId,
      })),
      limits: { ...SQL_DDL_LIMITS },
      scope: [...SQL_DDL_SCOPE],
    },
    null,
    2,
  );
}
