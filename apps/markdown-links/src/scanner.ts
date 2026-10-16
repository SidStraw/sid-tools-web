import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, opendir, realpath } from 'node:fs/promises';
import path from 'node:path';
import ignore from 'ignore';
import {
  parseMarkdownDocument,
  resolveMarkdownDestination,
  type MarkdownDocumentReport,
} from '@sid-tools/core/markdown-links';
import { FORMAT, LIMITS, failed, type Finding, type Options, type Report } from './model';

const FIXED = new Set(['.git', 'node_modules', 'dist', '.slim']);
const MARKDOWN = /\.(md|markdown)$/i;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const findingId = (finding: Omit<Finding, 'id'>) => digest(JSON.stringify(finding));

class CoverageError extends Error {}

function requireCoverage(condition: boolean, code: string): asserts condition {
  if (!condition) throw new CoverageError(code);
}

function localName(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= LIMITS.pathUnits &&
    !value.includes('\\') &&
    !value.includes('\0') &&
    !value.includes('\ufffd') &&
    !path.posix.isAbsolute(value) &&
    !/^[a-z]:/i.test(value) &&
    value.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
  );
}

interface Context {
  root: string;
  rootDev: number;
  rootIno: number;
}

// Node has no portable openat(dirfd) chain. Recheck each ancestor and final inode,
// and O_NOFOLLOW the file; do not promise isolation from hostile concurrent renames.
async function contained(context: Context, relative: string, finalMayBeFile = true): Promise<void> {
  requireCoverage(localName(relative), 'unsafe-path');
  const rootStat = await lstat(context.root);
  requireCoverage(
    rootStat.isDirectory() && rootStat.dev === context.rootDev && rootStat.ino === context.rootIno,
    'root-changed',
  );
  const parts = relative.split('/');
  let current = context.root;
  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index]!);
    const stat = await lstat(current);
    requireCoverage(!stat.isSymbolicLink(), 'symlink-path');
    if (index < parts.length - 1 || !finalMayBeFile)
      requireCoverage(stat.isDirectory(), 'non-directory-ancestor');
    const resolved = await realpath(current);
    requireCoverage(resolved === current, 'path-changed');
  }
}

async function readContained(
  context: Context,
  relative: string,
  maxBytes: number,
): Promise<string> {
  await contained(context, relative);
  const filename = path.join(context.root, relative);
  const before = await lstat(filename);
  requireCoverage(before.isFile() && before.size <= maxBytes, 'file-type-or-size-limit');
  const handle = await open(
    filename,
    constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  );
  try {
    const opened = await handle.stat();
    requireCoverage(
      opened.isFile() &&
        opened.dev === before.dev &&
        opened.ino === before.ino &&
        opened.size <= maxBytes,
      'file-changed',
    );
    const bytes = Buffer.alloc(Math.min(maxBytes + 1, opened.size + 1));
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    const after = await handle.stat();
    requireCoverage(
      offset === opened.size && after.size === opened.size && after.mtimeMs === opened.mtimeMs,
      'file-changed-or-oversize',
    );
    await contained(context, relative);
    const final = await lstat(filename);
    requireCoverage(final.dev === opened.dev && final.ino === opened.ino, 'file-replaced');
    try {
      return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
        bytes.subarray(0, offset),
      );
    } catch {
      throw new CoverageError('invalid-utf8');
    }
  } finally {
    await handle.close();
  }
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function baselineIds(text: string, current: Report): Set<string> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new CoverageError('invalid-baseline');
  }
  requireCoverage(object(value), 'invalid-baseline');
  requireCoverage(
    Object.keys(value).sort().join(',') ===
      'counts,delta,failure,findings,format,offline,policy,renderer,rootIdentity,status',
    'invalid-baseline-schema',
  );
  requireCoverage(
    value.format === FORMAT &&
      value.status === 'complete' &&
      value.failure === null &&
      value.offline === true,
    'invalid-baseline-schema',
  );
  requireCoverage(
    value.rootIdentity === current.rootIdentity &&
      value.policy === current.policy &&
      value.renderer === current.renderer,
    'baseline-scope-mismatch',
  );
  requireCoverage(
    Array.isArray(value.findings) && value.findings.length <= LIMITS.findings,
    'invalid-baseline-findings',
  );
  requireCoverage(object(value.counts), 'invalid-baseline-counts');
  requireCoverage(
    Object.keys(value.counts).sort().join(',') === 'broken,documents,links,skipped,unknown',
    'invalid-baseline-counts',
  );
  for (const [key, count] of Object.entries(value.counts)) {
    const maximum = key === 'documents' ? LIMITS.documents : LIMITS.work;
    requireCoverage(
      Number.isSafeInteger(count) && Number(count) >= 0 && Number(count) <= maximum,
      'invalid-baseline-counts',
    );
  }
  const ids = new Set<string>();
  let broken = 0;
  let unknown = 0;
  let skipped = 0;
  for (const entry of value.findings) {
    requireCoverage(object(entry), 'invalid-baseline-finding');
    requireCoverage(
      Object.keys(entry).sort().join(',') ===
        'column,destination,id,line,reason,source,status,target',
      'invalid-baseline-finding',
    );
    for (const key of ['id', 'source', 'reason', 'status'])
      requireCoverage(
        typeof entry[key] === 'string' && entry[key].length <= 4096,
        'invalid-baseline-finding',
      );
    for (const key of ['target', 'destination'])
      requireCoverage(
        entry[key] === null || (typeof entry[key] === 'string' && entry[key].length <= 8192),
        'invalid-baseline-finding',
      );
    for (const key of ['line', 'column'])
      requireCoverage(
        entry[key] === null ||
          (Number.isSafeInteger(entry[key]) &&
            Number(entry[key]) > 0 &&
            Number(entry[key]) < 1_000_000),
        'invalid-baseline-finding',
      );
    requireCoverage(
      ['missing-file', 'missing-anchor', 'unknown', 'external-skipped', 'ignored-skipped'].includes(
        String(entry.status),
      ),
      'invalid-baseline-finding',
    );
    const finding = entry as unknown as Finding;
    const { id, ...identity } = finding;
    requireCoverage(id === findingId(identity) && !ids.has(id), 'invalid-baseline-identity');
    ids.add(id);
    if (finding.status === 'unknown') unknown++;
    else if (finding.status === 'missing-file' || finding.status === 'missing-anchor') broken++;
    else skipped++;
  }
  requireCoverage(
    value.counts.broken === broken &&
      value.counts.unknown === unknown &&
      value.counts.skipped === skipped,
    'invalid-baseline-counts',
  );
  if (value.delta !== null) {
    requireCoverage(
      object(value.delta) &&
        Object.keys(value.delta).sort().join(',') === 'added,resolved,unchanged',
      'invalid-baseline-delta',
    );
    for (const key of ['added', 'resolved', 'unchanged']) {
      const entries = value.delta[key];
      requireCoverage(
        Array.isArray(entries) &&
          entries.length <= LIMITS.findings &&
          entries.every((id) => typeof id === 'string' && /^[a-f0-9]{64}$/.test(id)),
        'invalid-baseline-delta',
      );
    }
  }
  return ids;
}

export async function scan(options: Options): Promise<Report> {
  const report = failed('scan-failed');
  try {
    const root = await realpath(options.root);
    const rootStat = await lstat(root);
    requireCoverage(rootStat.isDirectory(), 'invalid-root');
    const context: Context = { root, rootDev: rootStat.dev, rootIno: rootStat.ino };
    report.rootIdentity = digest(JSON.stringify([root, rootStat.dev, rootStat.ino]));
    const ignoreText = options.ignoreFile
      ? await readContained(context, options.ignoreFile, LIMITS.policyBytes)
      : '';
    requireCoverage(ignoreText.split('\n').length <= 256, 'ignore-rule-limit');
    const matcher = ignore().add(ignoreText).add(options.ignores);
    const excluded = (name: string, directory = false) =>
      name.split('/').some((part) => FIXED.has(part)) ||
      matcher.ignores(name + (directory ? '/' : ''));
    report.policy = digest(
      JSON.stringify({
        format: FORMAT,
        renderer: report.renderer,
        ignores: options.ignores,
        ignoreText,
        fixed: [...FIXED],
        limits: LIMITS,
      }),
    );
    const baseline = options.baseline
      ? baselineIds(await readContained(context, options.baseline, LIMITS.reportBytes), report)
      : null;
    const inventory = new Map<string, 'file' | 'directory' | 'symlink' | 'special'>();
    const prunedDirectories = new Set<string>();
    let work = 0;
    const tick = () => requireCoverage(++work <= LIMITS.work, 'scan-work-limit');
    const pending = [''];
    while (pending.length) {
      const directory = pending.pop()!;
      if (directory) await contained(context, directory, false);
      const absolute = directory ? path.join(root, directory) : root;
      const before = await lstat(absolute);
      requireCoverage(before.isDirectory() && !before.isSymbolicLink(), 'directory-changed');
      const stream = await opendir(absolute);
      for await (const entry of stream) {
        tick();
        const relative = directory ? `${directory}/${entry.name}` : entry.name;
        requireCoverage(localName(relative), 'path-encoding-or-length');
        requireCoverage(relative.split('/').length <= LIMITS.depth, 'directory-depth-limit');
        if (excluded(relative, entry.isDirectory())) {
          if (entry.isDirectory()) {
            requireCoverage(prunedDirectories.size < LIMITS.entries, 'pruned-directory-limit');
            prunedDirectories.add(relative);
          }
          continue;
        }
        requireCoverage(inventory.size < LIMITS.entries, 'inventory-limit');
        const info = await lstat(path.join(root, relative));
        if (info.isSymbolicLink()) inventory.set(relative, 'symlink');
        else if (info.isDirectory()) {
          inventory.set(relative, 'directory');
          pending.push(relative);
        } else inventory.set(relative, info.isFile() ? 'file' : 'special');
      }
      const after = await lstat(absolute);
      requireCoverage(
        after.dev === before.dev && after.ino === before.ino && !after.isSymbolicLink(),
        'directory-changed',
      );
      if (directory) await contained(context, directory, false);
    }
    const documents = new Map<string, MarkdownDocumentReport>();
    let bytes = 0;
    const add = (finding: Omit<Finding, 'id'>) => {
      requireCoverage(report.findings.length < LIMITS.findings, 'finding-limit');
      requireCoverage((finding.destination?.length ?? 0) <= 8192, 'destination-limit');
      report.findings.push({ id: findingId(finding), ...finding });
    };
    for (const [name, kind] of [...inventory].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
      tick();
      if (!MARKDOWN.test(name)) continue;
      if (kind !== 'file') {
        if (kind !== 'directory')
          add({
            source: name,
            target: name,
            destination: null,
            line: null,
            column: null,
            status: 'unknown',
            reason: 'source-not-regular-file',
          });
        continue;
      }
      requireCoverage(documents.size < LIMITS.documents, 'document-limit');
      const source = await readContained(context, name, LIMITS.fileBytes);
      bytes += Buffer.byteLength(source);
      requireCoverage(bytes <= LIMITS.totalBytes, 'total-source-byte-limit');
      const document = parseMarkdownDocument(name, source);
      requireCoverage(document.status !== 'limit', 'parser-limit');
      requireCoverage(
        !document.diagnostics.some((diagnostic) =>
          ['markdown-parser-failed', 'invalid-source-path', 'ill-formed-unicode'].includes(
            diagnostic.code,
          ),
        ),
        'markdown-parser-failed',
      );
      documents.set(name, document);
      for (const diagnostic of document.diagnostics) {
        tick();
        add({
          source: name,
          target: null,
          destination: null,
          line: diagnostic.location?.line ?? null,
          column: diagnostic.location?.column ?? null,
          status: 'unknown',
          reason: diagnostic.code,
        });
      }
      if (document.status !== 'complete' && document.diagnostics.length === 0)
        add({
          source: name,
          target: null,
          destination: null,
          line: null,
          column: null,
          status: 'unknown',
          reason: 'partial-document',
        });
    }
    report.counts.documents = documents.size;
    for (const [name, document] of documents) {
      for (const link of document.links) {
        tick();
        report.counts.links++;
        const base = {
          source: name,
          target: null,
          destination: link.destination,
          line: link.location.line,
          column: link.location.column,
        };
        const destination = resolveMarkdownDestination(name, link.destination);
        if (destination.kind === 'external-skipped') {
          // Do not emit obvious URL userinfo credentials. Arbitrary names/query
          // strings can still be sensitive: this is not a general secret detector.
          const redacted = link.destination.replace(
            /^([a-z][a-z0-9+.-]*:)?\/\/[^/?#]*@/i,
            '$1//[redacted]@',
          );
          add({
            ...base,
            destination: redacted,
            status: 'external-skipped',
            reason: 'offline-no-request',
          });
          continue;
        }
        if (destination.kind === 'unknown') {
          add({ ...base, status: 'unknown', reason: destination.reason });
          continue;
        }
        const target = destination.path;
        const local = { ...base, target };
        if (!localName(target)) {
          add({ ...local, status: 'unknown', reason: 'unsafe-target-path' });
          continue;
        }
        const parts = target.split('/');
        if (
          excluded(target) ||
          parts.some((_, index) => prunedDirectories.has(parts.slice(0, index + 1).join('/')))
        ) {
          add({ ...local, status: 'ignored-skipped', reason: 'ignored-target-not-checked' });
          continue;
        }
        let blocked = false;
        for (let index = 1; index <= parts.length; index++) {
          tick();
          const ancestor = parts.slice(0, index).join('/');
          if (inventory.get(ancestor) === 'symlink' || inventory.get(ancestor) === 'special')
            blocked = true;
        }
        if (blocked) {
          add({ ...local, status: 'unknown', reason: 'symlink-or-special-target' });
          continue;
        }
        const kind = inventory.get(target);
        if (!kind) {
          // Check all ancestors before a missing classification, including case
          // aliases on case-insensitive filesystems and newly introduced symlinks.
          try {
            await contained(context, target);
            throw new CoverageError('inventory-changed');
          } catch (error) {
            if (
              error instanceof CoverageError &&
              ['root-changed', 'inventory-changed'].includes(error.message)
            )
              throw error;
            const missing = error instanceof Error && 'code' in error && error.code === 'ENOENT';
            add({
              ...local,
              status: missing ? 'missing-file' : 'unknown',
              reason: missing ? 'target-not-in-inventory' : 'target-path-not-checkable',
            });
          }
          continue;
        }
        await contained(context, target);
        const currentTarget = await lstat(path.join(root, target));
        requireCoverage(
          (kind === 'directory' && currentTarget.isDirectory()) ||
            (kind === 'file' && currentTarget.isFile()),
          'target-type-changed',
        );
        if (kind === 'directory') {
          add({ ...local, status: 'unknown', reason: 'directory-no-readme-inference' });
          continue;
        }
        if (destination.directoryRequired) {
          add({ ...local, status: 'unknown', reason: 'directory-syntax-for-regular-file' });
          continue;
        }
        if (destination.fragment !== null && destination.fragment !== '') {
          const targetDocument = documents.get(target);
          if (!targetDocument)
            add({ ...local, status: 'unknown', reason: 'non-markdown-fragment' });
          else if (!targetDocument.anchors.includes(destination.fragment))
            add({
              ...local,
              status: targetDocument.anchorCoverage === 'complete' ? 'missing-anchor' : 'unknown',
              reason:
                targetDocument.anchorCoverage === 'complete'
                  ? 'heading-anchor-not-found'
                  : 'anchor-coverage-unknown',
            });
        }
      }
    }
    // Remove identical diagnostics without losing distinct source locations.
    report.findings = [
      ...new Map(report.findings.map((finding) => [finding.id, finding])).values(),
    ];
    for (const finding of report.findings) {
      if (finding.status === 'unknown') report.counts.unknown++;
      else if (finding.status === 'missing-file' || finding.status === 'missing-anchor')
        report.counts.broken++;
      else report.counts.skipped++;
    }
    if (baseline) {
      const current = new Set(report.findings.map((finding) => finding.id));
      report.delta = {
        added: [...current].filter((id) => !baseline.has(id)),
        resolved: [...baseline].filter((id) => !current.has(id)),
        unchanged: [...current].filter((id) => baseline.has(id)),
      };
    }
    report.status = 'complete';
    report.failure = null;
    requireCoverage(
      Buffer.byteLength(JSON.stringify(report)) <= LIMITS.reportBytes,
      'report-byte-limit',
    );
    return report;
  } catch (error) {
    return {
      ...failed(error instanceof CoverageError ? error.message : 'filesystem-or-scan-failed'),
      rootIdentity: report.rootIdentity,
      policy: report.policy,
    };
  }
}
