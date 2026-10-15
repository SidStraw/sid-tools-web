export const SQL_DDL_LIMITS = {
  codeUnits: 500_000,
  tokens: 50_000,
  tokenUnits: 4096,
  typeTokens: 128,
  typeUnits: 4096,
  commentUnits: 100_000,
  commentDepth: 32,
  parentheses: 32,
  statements: 500,
  tables: 100,
  columnsPerTable: 200,
  columns: 2000,
  constraints: 1000,
  edges: 1000,
  work: 200_000,
} as const;
export interface SqlLocation {
  start: number;
  end: number;
  line: number;
  column: number;
}
export interface SqlDiagnostic {
  code: string;
  severity: 'unsupported' | 'invalid' | 'limit';
  location: SqlLocation;
  statementId: string | null;
  tableId: string | null;
}
export interface SqlToken {
  kind: 'word' | 'identifier' | 'number' | 'literal' | 'symbol';
  value: string;
  location: SqlLocation;
}
export interface SqlLexed {
  tokens: SqlToken[];
  diagnostics: SqlDiagnostic[];
  status: 'complete' | 'invalid' | 'limit';
  locate: (start: number, end: number) => SqlLocation;
}
/** Iterative PG18 lexical boundary subset. Literal/comment bodies are never retained. */
export function lexSqlDdl(source: string): SqlLexed {
  const tokens: SqlToken[] = [],
    diagnostics: SqlDiagnostic[] = [],
    lines = [0];
  const locate = (start: number, end: number): SqlLocation => {
    let lo = 0,
      hi = lines.length;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >>> 1;
      if (lines[mid]! <= start) lo = mid;
      else hi = mid;
    }
    return { start, end, line: lo + 1, column: start - lines[lo]! + 1 };
  };
  const result: SqlLexed = { tokens, diagnostics, status: 'complete', locate };
  const error = (code: string, start: number, end: number, limit = false) => {
    result.status = limit ? 'limit' : 'invalid';
    diagnostics.push({
      code,
      severity: limit ? 'limit' : 'invalid',
      location: locate(start, end),
      statementId: null,
      tableId: null,
    });
  };
  if (source.length > SQL_DDL_LIMITS.codeUnits) {
    error('input-limit', 0, 0, true);
    return result;
  }
  for (let i = 0; i < source.length; i++)
    if (source[i] === '\n' || (source[i] === '\r' && source[i + 1] !== '\n')) lines.push(i + 1);
  let i = 0,
    depth = 0;
  while (i < source.length && result.status === 'complete') {
    const start = i,
      char = source[i]!;
    if (/[\t\n\r\f\v ]/.test(char) || (i === 0 && char === '\uFEFF')) {
      i++;
      continue;
    }
    if (source.startsWith('--', i)) {
      i += 2;
      while (i < source.length && source[i] !== '\n' && source[i] !== '\r') {
        i++;
        if (i - start > SQL_DDL_LIMITS.commentUnits) break;
      }
      if (i - start > SQL_DDL_LIMITS.commentUnits) error('comment-size-limit', start, i, true);
      continue;
    }
    if (source.startsWith('/*', i)) {
      i += 2;
      let nested = 1;
      while (i < source.length && nested) {
        if (source.startsWith('/*', i)) {
          nested++;
          i += 2;
        } else if (source.startsWith('*/', i)) {
          nested--;
          i += 2;
        } else i++;
        if (nested > SQL_DDL_LIMITS.commentDepth) {
          error('comment-depth-limit', start, i, true);
          break;
        }
        if (i - start > SQL_DDL_LIMITS.commentUnits) {
          error('comment-size-limit', start, i, true);
          break;
        }
      }
      if (result.status === 'complete' && nested) error('unterminated-comment', start, i);
      continue;
    }
    if (/^[uU]&["']/.test(source.slice(i, i + 3))) {
      error('unicode-escape-mode-unsupported', start, source.length);
      break;
    }
    let kind: SqlToken['kind'] = 'symbol',
      value = char;
    const escaped = (char === 'e' || char === 'E') && source[i + 1] === "'";
    if (char === '"' || char === "'" || escaped) {
      const quote = escaped ? "'" : char;
      kind = quote === '"' ? 'identifier' : 'literal';
      value = '';
      i += escaped ? 2 : 1;
      let closed = false;
      while (i < source.length) {
        if (i - start > SQL_DDL_LIMITS.tokenUnits) {
          error('token-size-limit', start, i, true);
          break;
        }
        if (source[i] === quote) {
          if (source[i + 1] === quote) {
            if (kind === 'identifier') value += quote;
            i += 2;
            continue;
          }
          i++;
          closed = true;
          break;
        }
        if (source[i] === '\\' && quote === "'") {
          if (!escaped) {
            error('standard-string-backslash-mode-unsupported', start, source.length);
            break;
          }
          i += 2;
          continue;
        }
        if (source[i] === '\0') {
          error('nul-unsupported', start, i + 1);
          break;
        }
        if (kind === 'identifier') value += source[i];
        i++;
      }
      if (result.status !== 'complete') break;
      if (!closed) {
        error('unterminated-quoted-token', start, source.length);
        break;
      }
      if (kind === 'identifier' && !value.length) {
        error('empty-identifier', start, i);
        break;
      }
    } else if (char === '$') {
      const delimiter = /^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/.exec(
        source.slice(i, i + SQL_DDL_LIMITS.tokenUnits + 1),
      )?.[0];
      if (!delimiter) {
        error('dollar-token-unsupported', start, source.length);
        break;
      }
      if (delimiter.length > SQL_DDL_LIMITS.tokenUnits) {
        error('token-size-limit', start, i, true);
        break;
      }
      i += delimiter.length;
      let closed = false;
      while (i < source.length) {
        if (i - start > SQL_DDL_LIMITS.tokenUnits) {
          error('token-size-limit', start, i, true);
          break;
        }
        if (source.startsWith(delimiter, i)) {
          i += delimiter.length;
          closed = true;
          break;
        }
        i++;
      }
      if (result.status !== 'complete') break;
      if (!closed) {
        error('unterminated-dollar-string', start, source.length);
        break;
      }
      kind = 'literal';
      value = '';
    } else if (/[A-Za-z_]/.test(char)) {
      kind = 'word';
      i++;
      while (i < source.length && /[A-Za-z0-9_$]/.test(source[i]!)) {
        i++;
        if (i - start > SQL_DDL_LIMITS.tokenUnits) break;
      }
      value = source.slice(start, i).toLowerCase();
    } else if (/[0-9]/.test(char)) {
      kind = 'number';
      i++;
      while (i < source.length && /[0-9]/.test(source[i]!)) {
        i++;
        if (i - start > SQL_DDL_LIMITS.tokenUnits) break;
      }
      value = source.slice(start, i);
    } else {
      if (char.charCodeAt(0) > 127 || char === '\0' || char === '\\') {
        error('lexical-mode-unsupported', start, source.length);
        break;
      }
      if (char === '(' && ++depth > SQL_DDL_LIMITS.parentheses) {
        error('parenthesis-depth-limit', start, i + 1, true);
        break;
      }
      if (char === ')' && --depth < 0) {
        error('unmatched-parenthesis', start, i + 1);
        break;
      }
      i++;
    }
    if (i - start > SQL_DDL_LIMITS.tokenUnits) {
      error('token-size-limit', start, i, true);
      break;
    }
    if (tokens.length >= SQL_DDL_LIMITS.tokens) {
      error('token-count-limit', start, i, true);
      break;
    }
    tokens.push({ kind, value, location: locate(start, i) });
  }
  if (result.status === 'complete' && depth)
    error('unclosed-parenthesis', source.length, source.length);
  return result;
}
