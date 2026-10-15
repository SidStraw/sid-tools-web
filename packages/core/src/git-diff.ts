/** Read-only review of a strict git unified-diff subset. Never applies patches. */
export const GIT_DIFF_LIMITS = {
  maxCodeUnits: 1_000_000,
  maxLines: 20_000,
  maxLineCodeUnits: 20_000,
} as const;

export const GIT_DIFF_SUPPORT_RULES: readonly string[] = [
  'Only git diff --git with a/ and b/ paths, unified ---/+++ headers and @@ hunks is supported. Plain unified patches, combined/copy diffs and arbitrary preambles are unsupported.',
  'Unquoted diff --git paths cannot contain whitespace. Quote ambiguous paths using Git C quoting; supported escapes are a, b, t, n, v, f, r, backslash, double quote, and three-digit octal UTF-8 bytes. NUL and invalid UTF-8 are rejected.',
  'Recognized metadata: index hashes, new/deleted file mode, paired old/new mode, similarity index, rename from/to. Headers must agree on paths, appear once and precede hunks.',
  'Hunk old/new counts and ordering are validated; no-newline markers must follow the last represented line on the affected side. Raw hunk lines are untrusted text, not HTML.',
  'Binary data, unknown headers, invalid ranges, malformed paths and truncated sections mark results incomplete. Metadata-only renames and mode changes are supported; empty added/deleted files without hunks are not certified.',
  'LF and CRLF patch framing are supported and normalized to LF. No final framing newline is required. Limits: 1000000 UTF-16 code units, 20000 lines, 20000 code units per line.',
  'Selection export requires both file IDs and hunk IDs; selecting a file does not select its hunks. Export is a review extract, not a guarantee of an applicable or complete patch.',
];

export type GitDiffKind = 'added' | 'deleted' | 'modified' | 'renamed' | 'unknown';
export type GitDiffDiagnosticCode =
  | 'size-limit'
  | 'line-limit'
  | 'line-length-limit'
  | 'unsupported-format'
  | 'malformed-path'
  | 'path-mismatch'
  | 'unknown-header'
  | 'invalid-metadata'
  | 'binary-unsupported'
  | 'invalid-hunk'
  | 'hunk-count-mismatch'
  | 'invalid-no-newline'
  | 'truncated'
  | 'overlapping-hunks';

export interface GitDiffDiagnostic {
  code: GitDiffDiagnosticCode;
  sourceLine: number;
  fileId?: string;
  hunkId?: string;
}
export interface GitDiffLine {
  sourceLine: number;
  kind: 'context' | 'added' | 'deleted' | 'no-newline';
  /** Includes the original unified-diff prefix; never inject as HTML. */
  text: string;
  oldLine: number | null;
  newLine: number | null;
}
export interface GitDiffHunk {
  id: string;
  sourceLine: number;
  endLine: number;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: GitDiffLine[];
  addedLines: number;
  deletedLines: number;
  complete: boolean;
}
export interface GitDiffFile {
  id: string;
  sourceLine: number;
  endLine: number;
  oldPath: string | null;
  newPath: string | null;
  kind: GitDiffKind;
  hunks: GitDiffHunk[];
  addedLines: number;
  deletedLines: number;
  complete: boolean;
  binary: boolean;
}
export interface GitDiffSummary {
  files: number;
  hunks: number;
  addedLines: number;
  deletedLines: number;
  complete: boolean;
  text: string;
}
export interface GitDiffReport {
  files: GitDiffFile[];
  diagnostics: GitDiffDiagnostic[];
  summary: GitDiffSummary;
  supportRules: string[];
  limits: typeof GIT_DIFF_LIMITS;
}

function summarize(files: GitDiffFile[], complete: boolean): GitDiffSummary {
  const hunks = files.reduce((n, f) => n + f.hunks.length, 0);
  const addedLines = files.reduce((n, f) => n + f.addedLines, 0);
  const deletedLines = files.reduce((n, f) => n + f.deletedLines, 0);
  return {
    files: files.length,
    hunks,
    addedLines,
    deletedLines,
    complete,
    text:
      `${complete ? 'Supported selection' : 'Incomplete observed input'}: ${files.length} files, ${hunks} hunks, +${addedLines} / -${deletedLines} lines.\n` +
      files
        .map(
          (f) =>
            `${f.id} [source line ${f.sourceLine}] ${f.kind} ${JSON.stringify(f.oldPath)} -> ${JSON.stringify(f.newPath)}: ${f.hunks.length} hunks, +${f.addedLines} / -${f.deletedLines}`,
        )
        .join('\n'),
  };
}

/** Parse one Git C-quoted token (octal escapes represent UTF-8 bytes). */
function token(text: string): { path: string; rest: string } | null {
  if (!text.startsWith('"')) {
    const match = /^(\S+)(.*)$/.exec(text);
    return match &&
      !Array.from(match[1]!).some((char) => {
        const point = char.codePointAt(0)!;
        return char === '"' || point <= 31 || point === 127;
      })
      ? { path: match[1]!, rest: match[2]! }
      : null;
  }
  const bytes: number[] = [];
  const encoder = new TextEncoder();
  const escapes: Record<string, number> = {
    a: 7,
    b: 8,
    t: 9,
    n: 10,
    v: 11,
    f: 12,
    r: 13,
    '\\': 92,
    '"': 34,
  };
  for (let i = 1; i < text.length; i++) {
    const char = text[i]!;
    if (char === '"') {
      try {
        const path = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
        return path && !path.includes('\0') ? { path, rest: text.slice(i + 1) } : null;
      } catch {
        return null;
      }
    }
    if (char === '\\') {
      const next = text[++i];
      if (!next) return null;
      if (Object.hasOwn(escapes, next)) bytes.push(escapes[next]!);
      else {
        const octal = text.slice(i, i + 3);
        if (!/^[0-3][0-7]{2}$/.test(octal)) return null;
        bytes.push(Number.parseInt(octal, 8));
        i += 2;
      }
    } else {
      if (char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) return null;
      const point = text.codePointAt(i)!;
      if (point >= 0xd800 && point <= 0xdfff) return null;
      bytes.push(...encoder.encode(String.fromCodePoint(point)));
      if (point > 0xffff) i++;
    }
  }
  return null;
}

function singlePath(text: string): string | null {
  const parsed = token(text);
  return parsed && parsed.rest === '' ? parsed.path : null;
}

function prefixed(path: string | null, prefix: string): string | null {
  return path?.startsWith(prefix) && path.length > prefix.length ? path.slice(prefix.length) : null;
}

/** IDs are source-position based, deterministic for identical input, not cross-revision identities. */
export function parseGitDiff(text: string): GitDiffReport {
  const files: GitDiffFile[] = [];
  const diagnostics: GitDiffDiagnostic[] = [];
  const result = (): GitDiffReport => ({
    files,
    diagnostics,
    summary: summarize(files, diagnostics.length === 0),
    supportRules: [...GIT_DIFF_SUPPORT_RULES],
    limits: { ...GIT_DIFF_LIMITS },
  });
  if (text.length > GIT_DIFF_LIMITS.maxCodeUnits) {
    diagnostics.push({ code: 'size-limit', sourceLine: 1 });
    return result();
  }
  const lines = text.replaceAll('\r\n', '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  if (lines.length > GIT_DIFF_LIMITS.maxLines) {
    diagnostics.push({ code: 'line-limit', sourceLine: GIT_DIFF_LIMITS.maxLines + 1 });
    return result();
  }
  const long = lines.findIndex((line) => line.length > GIT_DIFF_LIMITS.maxLineCodeUnits);
  if (long !== -1) {
    diagnostics.push({ code: 'line-length-limit', sourceLine: long + 1 });
    return result();
  }
  const nulLine = lines.findIndex((line) => line.includes('\0'));
  if (nulLine !== -1) {
    diagnostics.push({ code: 'binary-unsupported', sourceLine: nulLine + 1 });
    return result();
  }
  let i = 0;
  while (i < lines.length) {
    const start = i;
    if (!lines[i]!.startsWith('diff --git ')) {
      diagnostics.push({ code: 'unsupported-format', sourceLine: ++i });
      continue;
    }
    i++;
    while (i < lines.length && !lines[i]!.startsWith('diff --git ')) i++;
    const end = i;
    const file: GitDiffFile = {
      id: `file-${start + 1}`,
      sourceLine: start + 1,
      endLine: end,
      oldPath: null,
      newPath: null,
      kind: 'unknown',
      hunks: [],
      addedLines: 0,
      deletedLines: 0,
      complete: true,
      binary: false,
    };
    files.push(file);
    const issue = (code: GitDiffDiagnosticCode, at: number, hunk?: GitDiffHunk) => {
      diagnostics.push({
        code,
        sourceLine: at,
        fileId: file.id,
        ...(hunk ? { hunkId: hunk.id } : {}),
      });
      file.complete = false;
      if (hunk) hunk.complete = false;
    };
    const first = token(lines[start]!.slice(11));
    const second = first?.rest.startsWith(' ') ? token(first.rest.slice(1)) : null;
    const oldPath = prefixed(first?.path ?? null, 'a/');
    const newPath = prefixed(second?.path ?? null, 'b/');
    if (!oldPath || !newPath || second?.rest !== '') {
      issue('malformed-path', start + 1);
      continue;
    }
    file.oldPath = oldPath;
    file.newPath = newPath;
    file.kind = 'modified';
    const meta = new Map<string, string>();
    let oldHeader: string | null | undefined;
    let newHeader: string | null | undefined;
    let sawHunk = false;
    for (let j = start + 1; j < end; j++) {
      const raw = lines[j]!;
      if (raw.startsWith('@@')) {
        sawHunk = true;
        const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?: .*)?$/.exec(raw);
        if (!match) {
          issue('invalid-hunk', j + 1);
          continue;
        }
        const numbers = [
          Number(match[1]),
          Number(match[2] ?? 1),
          Number(match[3]),
          Number(match[4] ?? 1),
        ];
        const [oldStart, oldCount, newStart, newCount] = numbers as [
          number,
          number,
          number,
          number,
        ];
        if (
          numbers.some((n) => !Number.isSafeInteger(n) || n < 0 || n > 1_000_000_000) ||
          (oldStart === 0 && oldCount !== 0) ||
          (newStart === 0 && newCount !== 0)
        ) {
          issue('invalid-hunk', j + 1);
          continue;
        }
        const hunk: GitDiffHunk = {
          id: `${file.id}-hunk-${j + 1}`,
          sourceLine: j + 1,
          endLine: j + 1,
          oldStart,
          oldCount,
          newStart,
          newCount,
          lines: [],
          addedLines: 0,
          deletedLines: 0,
          complete: true,
        };
        const previous = file.hunks.at(-1);
        if (
          previous &&
          (oldStart < previous.oldStart + previous.oldCount ||
            newStart < previous.newStart + previous.newCount)
        ) {
          issue('overlapping-hunks', j + 1, hunk);
        }
        file.hunks.push(hunk);
        let oldSeen = 0,
          newSeen = 0;
        while (j + 1 < end && !lines[j + 1]!.startsWith('@@')) {
          const body = lines[++j]!;
          const prefix = body[0];
          hunk.endLine = j + 1;
          if (body === '\\ No newline at end of file') {
            const preceding = hunk.lines.at(-1);
            if (
              !preceding ||
              preceding.kind === 'no-newline' ||
              (preceding.kind !== 'added' && oldSeen !== oldCount) ||
              (preceding.kind !== 'deleted' && newSeen !== newCount)
            )
              issue('invalid-no-newline', j + 1, hunk);
            hunk.lines.push({
              sourceLine: j + 1,
              kind: 'no-newline',
              text: body,
              oldLine: null,
              newLine: null,
            });
          } else if (prefix === ' ' || prefix === '+' || prefix === '-') {
            const kind = prefix === ' ' ? 'context' : prefix === '+' ? 'added' : 'deleted';
            hunk.lines.push({
              sourceLine: j + 1,
              kind,
              text: body,
              oldLine: prefix === '+' ? null : oldStart + oldSeen,
              newLine: prefix === '-' ? null : newStart + newSeen,
            });
            if (prefix !== '+') oldSeen++;
            if (prefix !== '-') newSeen++;
            if (prefix === '+') hunk.addedLines++;
            if (prefix === '-') hunk.deletedLines++;
          } else issue('unknown-header', j + 1, hunk);
        }
        if (oldSeen !== oldCount || newSeen !== newCount) {
          issue(
            oldSeen < oldCount || newSeen < newCount ? 'truncated' : 'hunk-count-mismatch',
            hunk.sourceLine,
            hunk,
          );
        }
        if (hunk.addedLines + hunk.deletedLines === 0) issue('invalid-hunk', hunk.sourceLine, hunk);
        file.addedLines += hunk.addedLines;
        file.deletedLines += hunk.deletedLines;
        continue;
      }
      if (raw.startsWith('Binary files ') || raw === 'GIT binary patch') {
        file.binary = true;
        issue('binary-unsupported', j + 1);
        continue;
      }
      if (sawHunk) {
        issue('unknown-header', j + 1);
        continue;
      }
      if (raw.startsWith('--- ') || raw.startsWith('+++ ')) {
        const path = singlePath(raw.slice(4));
        const isOld = raw.startsWith('--- ');
        const decoded = path === '/dev/null' ? null : prefixed(path, isOld ? 'a/' : 'b/');
        if (decoded === null && path !== '/dev/null') issue('malformed-path', j + 1);
        if (
          isOld
            ? oldHeader !== undefined || newHeader !== undefined
            : oldHeader === undefined || newHeader !== undefined
        )
          issue('invalid-metadata', j + 1);
        if (isOld) oldHeader = decoded;
        else newHeader = decoded;
        continue;
      }
      const metadata =
        /^(index|new file mode|deleted file mode|old mode|new mode|similarity index|rename from|rename to) (.+)$/.exec(
          raw,
        );
      if (!metadata) {
        issue('unknown-header', j + 1);
        continue;
      }
      const name = metadata[1]!,
        value = metadata[2]!;
      if (meta.has(name) || oldHeader !== undefined) issue('invalid-metadata', j + 1);
      meta.set(name, value);
      if (name === 'index' && !/^[0-9a-f]{4,64}\.\.[0-9a-f]{4,64}(?: [0-7]{6})?$/.test(value))
        issue('invalid-metadata', j + 1);
      if (name.endsWith('mode') && !/^[0-7]{6}$/.test(value)) issue('invalid-metadata', j + 1);
      if (name === 'similarity index' && !/^(?:100|[0-9]{1,2})%$/.test(value))
        issue('invalid-metadata', j + 1);
    }
    const renameFrom = meta.has('rename from') ? singlePath(meta.get('rename from')!) : undefined;
    const renameTo = meta.has('rename to') ? singlePath(meta.get('rename to')!) : undefined;
    if (renameFrom !== undefined || renameTo !== undefined) {
      file.kind = 'renamed';
      if (!renameFrom || !renameTo || renameFrom !== oldPath || renameTo !== newPath)
        issue('path-mismatch', file.sourceLine);
    } else if (oldPath !== newPath) issue('path-mismatch', file.sourceLine);
    if (meta.has('new file mode') || oldHeader === null) {
      file.kind = 'added';
      file.oldPath = null;
      if (!meta.has('new file mode') || oldHeader !== null || newHeader !== newPath)
        issue('invalid-metadata', file.sourceLine);
    }
    const wasAdded = file.kind === 'added';
    if (meta.has('deleted file mode') || newHeader === null) {
      file.kind = 'deleted';
      file.newPath = null;
      if (!meta.has('deleted file mode') || newHeader !== null || oldHeader !== oldPath || wasAdded)
        issue('invalid-metadata', file.sourceLine);
    }
    if (
      (renameFrom !== undefined || renameTo !== undefined) &&
      (meta.has('new file mode') || meta.has('deleted file mode'))
    )
      issue('invalid-metadata', file.sourceLine);
    if (meta.has('old mode') !== meta.has('new mode')) issue('invalid-metadata', file.sourceLine);
    if (meta.has('similarity index') && file.kind !== 'renamed')
      issue('invalid-metadata', file.sourceLine);
    if (oldHeader !== undefined && oldHeader !== null && oldHeader !== oldPath)
      issue('path-mismatch', file.sourceLine);
    if (newHeader !== undefined && newHeader !== null && newHeader !== newPath)
      issue('path-mismatch', file.sourceLine);
    if (file.hunks.length && (oldHeader === undefined || newHeader === undefined))
      issue('truncated', file.sourceLine);
    const metadataOnly =
      (file.kind === 'renamed' && meta.get('similarity index') === '100%' && !meta.has('index')) ||
      (file.kind === 'modified' &&
        meta.has('old mode') &&
        meta.has('new mode') &&
        !meta.has('index'));
    if (!file.hunks.length && !metadataOnly && !file.binary) issue('truncated', file.sourceLine);
    if (!file.hunks.length && (oldHeader !== undefined || newHeader !== undefined))
      issue('truncated', file.sourceLine);
    if (file.kind === 'added' && file.hunks.some((h) => h.oldCount !== 0 || h.oldStart !== 0))
      issue('invalid-hunk', file.sourceLine);
    if (file.kind === 'deleted' && file.hunks.some((h) => h.newCount !== 0 || h.newStart !== 0))
      issue('invalid-hunk', file.sourceLine);
  }
  return result();
}

/** Always C-quote paths so decoded newline/tab/quote bytes cannot inject patch headers. */
function quotePath(path: string): string {
  let encoded = '"';
  for (const byte of new TextEncoder().encode(path)) {
    if (byte === 34 || byte === 92) encoded += `\\${String.fromCharCode(byte)}`;
    else if (byte < 32 || byte >= 127) encoded += `\\${byte.toString(8).padStart(3, '0')}`;
    else encoded += String.fromCharCode(byte);
  }
  return encoded + '"';
}

export interface GitDiffSelection {
  fileIds: readonly string[];
  hunkIds: readonly string[];
}
export interface GitDiffExport {
  scope: 'selection-only';
  notice: string;
  summary: GitDiffSummary;
  files: {
    id: string;
    oldPath: string | null;
    newPath: string | null;
    kind: GitDiffKind;
    sourceLine: number;
    hunkIds: string[];
    addedLines: number;
    deletedLines: number;
  }[];
  patch: string;
}

/** Only accept reports produced by parseGitDiff; this is not a sanitizer for forged reports. */
export function exportGitDiffSelection(
  report: GitDiffReport,
  selection: GitDiffSelection,
): GitDiffExport {
  const fileIds = new Set(selection.fileIds),
    hunkIds = new Set(selection.hunkIds);
  const knownFiles = new Set(report.files.map((f) => f.id));
  const knownHunks = new Map(
    report.files.flatMap((f) => f.hunks.map((h) => [h.id, f.id] as const)),
  );
  if (
    [...fileIds].some((id) => !knownFiles.has(id)) ||
    [...hunkIds].some((id) => !knownHunks.has(id) || !fileIds.has(knownHunks.get(id)!))
  ) {
    throw new Error('Invalid file/hunk selection.');
  }
  const selected: GitDiffFile[] = [];
  for (const file of report.files) {
    if (!fileIds.has(file.id)) continue;
    const hunks = file.hunks.filter((h) => hunkIds.has(h.id));
    if (file.hunks.length && !hunks.length) continue;
    if (!file.complete || hunks.some((h) => !h.complete))
      throw new Error('Incomplete files cannot be exported.');
    selected.push({
      ...file,
      hunks,
      addedLines: hunks.reduce((n, h) => n + h.addedLines, 0),
      deletedLines: hunks.reduce((n, h) => n + h.deletedLines, 0),
    });
  }
  const chunks: string[] = [];
  for (const file of selected) {
    const oldPath = file.oldPath ?? file.newPath!;
    const newPath = file.newPath ?? file.oldPath!;
    const block = [`diff --git ${quotePath(`a/${oldPath}`)} ${quotePath(`b/${newPath}`)}`];
    if (file.kind === 'renamed')
      block.push(`rename from ${quotePath(oldPath)}`, `rename to ${quotePath(newPath)}`);
    // Original mode/index/function-context metadata is intentionally not copied.
    if (file.hunks.length) {
      block.push(
        `--- ${file.oldPath === null ? '/dev/null' : quotePath(`a/${oldPath}`)}`,
        `+++ ${file.newPath === null ? '/dev/null' : quotePath(`b/${newPath}`)}`,
      );
      for (const h of file.hunks)
        block.push(
          `@@ -${h.oldStart},${h.oldCount} +${h.newStart},${h.newCount} @@`,
          ...h.lines.map((line) => line.text),
        );
    }
    chunks.push(block.join('\n'));
  }
  return {
    scope: 'selection-only',
    notice:
      'Explicit selections only. Review extract; not a complete or application-ready patch. Modes, hashes and hunk section labels are omitted.',
    summary: summarize(selected, true),
    files: selected.map((f) => ({
      id: f.id,
      oldPath: f.oldPath,
      newPath: f.newPath,
      kind: f.kind,
      sourceLine: f.sourceLine,
      hunkIds: f.hunks.map((h) => h.id),
      addedLines: f.addedLines,
      deletedLines: f.deletedLines,
    })),
    patch: chunks.length ? chunks.join('\n') + '\n' : '',
  };
}
