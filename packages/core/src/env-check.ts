/** A deliberately bounded dotenv subset, not a shell or a full dotenv implementation. */
export const ENV_LIMITS = {
  maxCodeUnits: 200_000,
  maxLines: 5_000,
  maxLineCodeUnits: 10_000,
} as const;

export const ENV_SUPPORT_RULES: readonly string[] = [
  'Keys use [A-Za-z_][A-Za-z0-9_]*; assignments use KEY=value with optional surrounding spaces/tabs. export is unsupported.',
  'LF and CRLF are supported; a leading BOM is ignored. Bare CR and control characters other than tab are invalid.',
  'Blank lines and # comments are ignored. In unquoted values the first # starts a comment; surrounding spaces/tabs are trimmed; additional = signs are literal.',
  'Single and double quotes must enclose the whole value, may span physical lines, and preserve whitespace, # and =. After the closing quote only spaces/tabs and a # comment are allowed.',
  'Single-quoted values have no escapes. Double-quoted values support only \\n, \\r, \\t, \\\\ and \\". Unquoted backslashes and embedded quotes are unsupported.',
  'Variable interpolation ($NAME and ${...}), command substitution ($(...)) and backticks are unsupported in all value forms, including single quotes. Nothing is expanded or executed.',
  'Empty means a valid assignment with zero value characters after unquoted trimming or quote removal; quoted whitespace is not empty. Missing means no recognized assignment for that key.',
  'Invalid value assignments still establish key presence; no first/last duplicate wins. Comparisons are provisional when syntax is invalid and omitted when an input exceeds limits.',
  'Unquoted values starting with -----BEGIN followed by a space are unsupported armor blocks (PEM/PGP/OpenSSH). Their following physical lines, including blank lines and the first trimmed line starting with -----END followed by a space, are consumed without parsing body text as keys. A missing end marker consumes through EOF and uses unterminated-quote for the unterminated block.',
  'Other unquoted multiline formats are unsupported and may be interpreted as independent assignments; this is not a generic secret detector. Enclose the entire multiline value in supported quotes rather than pasting an unquoted secret block.',
  'Duplicate diagnostics reference only the first occurrence; keys[].templateLines and keys[].candidateLines retain every recognized assignment location.',
  'Each input is limited to 200000 UTF-16 code units, 5000 physical lines and 10000 code units per line. A trailing newline creates a final empty physical line.',
];

export type EnvSource = 'template' | 'candidate';
export type EnvDiagnosticCode =
  | 'size-limit'
  | 'line-limit'
  | 'line-length-limit'
  | 'invalid-assignment'
  | 'invalid-control'
  | 'unterminated-quote'
  | 'trailing-content'
  | 'unsupported-syntax'
  | 'unsupported-interpolation'
  | 'duplicate'
  | 'empty'
  | 'missing'
  | 'extra';

export interface EnvDiagnostic {
  source: EnvSource;
  code: EnvDiagnosticCode;
  /** One-based physical location. Missing keys point into the template, not the candidate. */
  line: number;
  endLine: number;
  key?: string;
  /** For duplicates: only the first assignment start line. For missing: all template lines. */
  relatedLines: number[];
}

export interface EnvEntry {
  key: string;
  line: number;
  endLine: number;
  valid: boolean;
  /** null means invalid/unsupported, never inferred to be empty. */
  empty: boolean | null;
}

export interface EnvInputReport {
  entries: EnvEntry[];
  diagnostics: EnvDiagnostic[];
  /** false for syntax/unsupported input or resource limits; empty/duplicate are separate issues. */
  complete: boolean;
  limited: boolean;
}

export interface EnvComparison {
  template: EnvInputReport;
  candidate: EnvInputReport;
  keys: { key: string; templateLines: number[]; candidateLines: number[] }[];
  diagnostics: EnvDiagnostic[];
  summary: {
    complete: boolean;
    comparisonPerformed: boolean;
    templateKeys: number;
    candidateKeys: number;
    missing: number;
    extra: number;
    duplicate: number;
    empty: number;
    errors: number;
  };
  supportRules: string[];
  limits: typeof ENV_LIMITS;
}

const trimSpace = (text: string) => text.replace(/^[\t ]+|[\t ]+$/g, '');
const interpolation = /\$(?:[A-Za-z_{(])|`/;
const invalidControl = {
  test: (text: string) =>
    Array.from(text).some((character) => {
      const code = character.charCodeAt(0);
      return code <= 8 || (code >= 11 && code <= 31) || code === 127;
    }),
};

function parseEnv(text: string, source: EnvSource): EnvInputReport {
  const report: EnvInputReport = { entries: [], diagnostics: [], complete: true, limited: false };
  const issue = (
    code: EnvDiagnosticCode,
    line: number,
    endLine = line,
    key?: string,
    relatedLines: number[] = [],
  ) => {
    report.diagnostics.push({ source, code, line, endLine, ...(key ? { key } : {}), relatedLines });
    if (code !== 'empty' && code !== 'duplicate') report.complete = false;
  };
  if (text.length > ENV_LIMITS.maxCodeUnits) {
    issue('size-limit', 1);
    report.limited = true;
    return report;
  }
  const lines = text
    .replace(/^\uFEFF/, '')
    .replaceAll('\r\n', '\n')
    .split('\n');
  if (lines.length > ENV_LIMITS.maxLines) {
    issue('line-limit', ENV_LIMITS.maxLines + 1);
    report.limited = true;
    return report;
  }
  const longLine = lines.findIndex((line) => line.length > ENV_LIMITS.maxLineCodeUnits);
  if (longLine !== -1) {
    issue('line-length-limit', longLine + 1);
    report.limited = true;
    return report;
  }
  const seen = new Map<string, number[]>();
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const line = i + 1;
    const hasControl = invalidControl.test(raw);
    const content = trimSpace(raw);
    if (!content || content.startsWith('#')) {
      if (hasControl) issue('invalid-control', line);
      continue;
    }
    const assignment = /^([A-Za-z_][A-Za-z0-9_]*)[\t ]*=[\t ]*(.*)$/.exec(content);
    if (!assignment) {
      issue(
        hasControl
          ? 'invalid-control'
          : content.startsWith('export ')
            ? 'unsupported-syntax'
            : 'invalid-assignment',
        line,
      );
      continue;
    }
    const key = assignment[1]!;
    const previous = seen.get(key) ?? [];
    if (previous.length) issue('duplicate', line, line, key, [previous[0]!]);
    previous.push(line);
    seen.set(key, previous);
    let segment = assignment[2] ?? '';
    const quote = segment[0];
    let empty = true;
    let valid = true;
    const emitted = new Set<string>();
    const fail = (code: EnvDiagnosticCode, at = i + 1) => {
      const identity = `${code}:${at}`;
      if (!emitted.has(identity)) issue(code, at, at, key);
      emitted.add(identity);
      valid = false;
    };
    if (hasControl) fail('invalid-control', line);
    if (quote === '"' || quote === "'") {
      let closed = false;
      let position = 1;
      while (!closed) {
        let valuePart = '';
        for (; position < segment.length; position++) {
          const char = segment[position];
          if (char === quote) {
            closed = true;
            const tail = trimSpace(segment.slice(position + 1));
            if (tail && !tail.startsWith('#')) fail('trailing-content');
            break;
          }
          valuePart += char;
          empty = false;
          if (char === '\\' && quote === '"') {
            const next = segment[position + 1];
            if (next && 'nrt\\"'.includes(next)) {
              valuePart += next;
              position++;
            } else fail('unsupported-syntax');
          }
        }
        if (invalidControl.test(valuePart)) fail('invalid-control');
        if (interpolation.test(valuePart)) fail('unsupported-interpolation');
        if (closed) break;
        if (i + 1 >= lines.length) {
          issue('unterminated-quote', line, i + 1, key);
          valid = false;
          break;
        }
        empty = false; // A physical newline is a value character, even between empty lines.
        segment = lines[++i] ?? '';
        position = 0;
      }
    } else {
      const value = trimSpace(segment.split('#', 1)[0] ?? '');
      empty = value.length === 0;
      if (value.startsWith('-----BEGIN ') && !value.includes('-----END ')) {
        fail('unsupported-syntax', line);
        let closed = false;
        while (i + 1 < lines.length) {
          if (trimSpace(lines[++i] ?? '').startsWith('-----END ')) {
            closed = true;
            break;
          }
        }
        if (!closed) issue('unterminated-quote', line, i + 1, key);
      } else {
        if (/[\\'"]/.test(value)) fail('unsupported-syntax');
        if (interpolation.test(value)) fail('unsupported-interpolation');
      }
    }
    report.entries.push({ key, line, endLine: i + 1, valid, empty: valid ? empty : null });
    if (valid && empty) issue('empty', line, i + 1, key);
  }
  return report;
}

/** Never returns input values, snippets, invalid key tokens, or value lengths. */
export function compareEnv(template: string, candidate: string): EnvComparison {
  const a = parseEnv(template, 'template');
  const b = parseEnv(candidate, 'candidate');
  const index = (entries: EnvEntry[]) => {
    const result = new Map<string, number[]>();
    for (const entry of entries) {
      const lines = result.get(entry.key) ?? [];
      lines.push(entry.line);
      result.set(entry.key, lines);
    }
    return result;
  };
  const templateKeys = index(a.entries);
  const candidateKeys = index(b.entries);
  const diagnostics = [...a.diagnostics, ...b.diagnostics];
  const comparisonPerformed = !a.limited && !b.limited;
  const keys = [...new Set([...templateKeys.keys(), ...candidateKeys.keys()])].map((key) => ({
    key,
    templateLines: templateKeys.get(key) ?? [],
    candidateLines: candidateKeys.get(key) ?? [],
  }));
  if (comparisonPerformed) {
    for (const row of keys) {
      if (!row.candidateLines.length) {
        diagnostics.push({
          source: 'candidate',
          code: 'missing',
          key: row.key,
          line: row.templateLines[0]!,
          endLine: row.templateLines[0]!,
          relatedLines: [...row.templateLines],
        });
      } else if (!row.templateLines.length) {
        diagnostics.push({
          source: 'candidate',
          code: 'extra',
          key: row.key,
          line: row.candidateLines[0]!,
          endLine: row.candidateLines[0]!,
          relatedLines: [],
        });
      }
    }
  }
  const count = (code: EnvDiagnosticCode) => diagnostics.filter((d) => d.code === code).length;
  const findings = new Set<EnvDiagnosticCode>(['missing', 'extra', 'duplicate', 'empty']);
  return {
    template: a,
    candidate: b,
    keys,
    diagnostics,
    summary: {
      complete: a.complete && b.complete,
      comparisonPerformed,
      templateKeys: templateKeys.size,
      candidateKeys: candidateKeys.size,
      missing: count('missing'),
      extra: count('extra'),
      duplicate: count('duplicate'),
      empty: count('empty'),
      errors: diagnostics.filter((d) => !findings.has(d.code)).length,
    },
    supportRules: [...ENV_SUPPORT_RULES],
    limits: { ...ENV_LIMITS },
  };
}
