import { describe, expect, test } from 'vite-plus/test';
import { exportGitDiffSelection, GIT_DIFF_LIMITS, parseGitDiff } from './git-diff.js';

const modified = (path = 'app.ts', before = 'old', after = 'new') =>
  [
    `diff --git a/${path} b/${path}`,
    'index aaaa..bbbb 100644',
    `--- a/${path}`,
    `+++ b/${path}`,
    '@@ -1 +1 @@ section-label',
    `-${before}`,
    `+${after}`,
  ].join('\n');
const multi =
  modified() +
  '\n@@ -10,2 +10,2 @@ private-section-label\n same\n-private-hunk-old\n+private-hunk-new';
const selected = (text: string) => {
  const report = parseGitDiff(text);
  const file = report.files[0]!;
  return exportGitDiffSelection(report, {
    fileIds: [file.id],
    hunkIds: file.hunks.map((h) => h.id),
  });
};

describe('bounded source-grounded git unified diff', () => {
  test('modified files have stable source pointers, raw hunk lines and deterministic counts', () => {
    const r = parseGitDiff(modified());
    expect(r.summary).toMatchObject({
      files: 1,
      hunks: 1,
      addedLines: 1,
      deletedLines: 1,
      complete: true,
    });
    expect(r.files[0]).toMatchObject({
      id: 'file-1',
      sourceLine: 1,
      endLine: 7,
      oldPath: 'app.ts',
      newPath: 'app.ts',
      kind: 'modified',
      complete: true,
    });
    expect(r.files[0]?.hunks[0]).toMatchObject({
      id: 'file-1-hunk-5',
      sourceLine: 5,
      endLine: 7,
      oldCount: 1,
      newCount: 1,
    });
    expect(r.files[0]?.hunks[0]?.lines).toEqual([
      { sourceLine: 6, kind: 'deleted', text: '-old', oldLine: 1, newLine: null },
      { sourceLine: 7, kind: 'added', text: '+new', oldLine: null, newLine: 1 },
    ]);
    expect(parseGitDiff(modified())).toEqual(r);
    expect(r.summary.text).toContain('[source line 1] modified "app.ts"');
    expect(r.summary.text).not.toContain('section-label');
    expect(r.summary.text).not.toContain('refactor');
  });

  test('added and deleted paths use /dev/null, modes and zero ranges', () => {
    const patch = [
      'diff --git a/new.txt b/new.txt',
      'new file mode 100644',
      'index 0000000..aaaaaaa',
      '--- /dev/null',
      '+++ b/new.txt',
      '@@ -0,0 +1,2 @@',
      '+first',
      '+second',
      'diff --git a/old.txt b/old.txt',
      'deleted file mode 100644',
      'index aaaaaaa..0000000',
      '--- a/old.txt',
      '+++ /dev/null',
      '@@ -1 +0,0 @@',
      '-gone',
    ].join('\n');
    const r = parseGitDiff(patch);
    expect(r.diagnostics).toEqual([]);
    expect(r.files.map((f) => [f.kind, f.oldPath, f.newPath])).toEqual([
      ['added', null, 'new.txt'],
      ['deleted', 'old.txt', null],
    ]);
    expect(r.summary).toMatchObject({ addedLines: 2, deletedLines: 1 });
    const out = exportGitDiffSelection(r, {
      fileIds: r.files.map((f) => f.id),
      hunkIds: r.files.flatMap((f) => f.hunks.map((h) => h.id)),
    });
    expect(out.patch).toContain('--- /dev/null');
    expect(out.patch).toContain('+++ /dev/null');
  });

  test('metadata-only rename is recognized and explicitly selectable', () => {
    const patch = 'diff --git a/old b/new\nsimilarity index 100%\nrename from old\nrename to new';
    const r = parseGitDiff(patch);
    expect(r.summary.complete).toBe(true);
    expect(r.files[0]?.kind).toBe('renamed');
    expect(selected(patch).patch).toContain('rename from "old"\nrename to "new"');
  });

  test('rename plus content change retains both paths', () => {
    const r = parseGitDiff(
      'diff --git a/old b/new\nsimilarity index 50%\nrename from old\nrename to new\n--- a/old\n+++ b/new\n@@ -1 +1 @@\n-a\n+b',
    );
    expect(r.summary.complete).toBe(true);
    expect(r.files[0]).toMatchObject({ kind: 'renamed', oldPath: 'old', newPath: 'new' });
  });

  test('paired mode changes are valid metadata-only review observations', () => {
    const r = parseGitDiff('diff --git a/run b/run\nold mode 100644\nnew mode 100755');
    expect(r.summary.complete).toBe(true);
    expect(selected('diff --git a/run b/run\nold mode 100644\nnew mode 100755').notice).toContain(
      'Modes',
    );
  });

  test('metadata that implies omitted content cannot masquerade as a complete rename/mode change', () => {
    const patches = [
      'diff --git a/old b/new\nsimilarity index 50%\nrename from old\nrename to new',
      'diff --git a/run b/run\nold mode 100644\nnew mode 100755\nindex aaaa..bbbb',
      'diff --git a/empty b/empty\nnew file mode 100644\nindex 0000000..e69de29',
    ];
    for (const patch of patches) {
      const r = parseGitDiff(patch);
      expect(r.summary.complete).toBe(false);
      expect(r.diagnostics.some((d) => d.code === 'truncated')).toBe(true);
    }
  });

  test('Git octal UTF-8 quoting decodes safely and export re-escapes newline injection', () => {
    const path = '"a/space \\346\\270\\254\\350\\251\\246\\nfile"';
    const newPath = path.replace('a/', 'b/');
    const patch = `diff --git ${path} ${newPath}\n--- ${path}\n+++ ${newPath}\n@@ -1 +1 @@\n-a\n+b`;
    const r = parseGitDiff(patch);
    expect(r.diagnostics).toEqual([]);
    expect(r.files[0]?.oldPath).toBe('space 測試\nfile');
    const out = selected(patch);
    expect(out.patch).toContain('\\012file"');
    expect(out.patch).not.toContain('測試\nfile');
    expect(out.summary.text).toContain('\\nfile');
  });

  test.each([
    'diff --git a/ambiguous path b/ambiguous path',
    'diff --git "a/bad\\q" "b/bad\\q"',
    'diff --git "a/bad\\377" "b/bad\\377"',
    'diff --git "a/bad\\000" "b/bad\\000"',
    'diff --git "a/unterminated b/unterminated',
    'diff --git a/control\u001fpath b/control\u001fpath',
    'diff --git a/control\u007fpath b/control\u007fpath',
    'diff --git a/unquoted"path b/unquoted"path',
  ])('rejects ambiguous/malformed paths: %s', (header) => {
    const r = parseGitDiff(header);
    expect(r.summary.complete).toBe(false);
    expect(r.diagnostics[0]?.code).toBe('malformed-path');
    expect(r.files[0]?.oldPath).toBeNull();
  });

  test('no-newline markers are retained and not counted as content', () => {
    const patch = modified().replace(
      '-old\n+new',
      '-old\n\\ No newline at end of file\n+new\n\\ No newline at end of file',
    );
    const r = parseGitDiff(patch);
    expect(r.summary.complete).toBe(true);
    expect(r.files[0]?.hunks[0]?.lines.map((l) => l.kind)).toEqual([
      'deleted',
      'no-newline',
      'added',
      'no-newline',
    ]);
    expect(selected(patch).patch).toContain('\\ No newline at end of file');
  });

  test('misplaced/duplicated no-newline markers are incomplete', () => {
    const r = parseGitDiff(modified().replace('-old', '\\ No newline at end of file\n-old'));
    expect(r.diagnostics.some((d) => d.code === 'invalid-no-newline')).toBe(true);
    expect(r.summary.complete).toBe(false);
  });

  test('truncated and surplus hunk bodies cannot pass declared counts', () => {
    expect(
      parseGitDiff(modified().replace('+new', '')).diagnostics.some((d) => d.code === 'truncated'),
    ).toBe(true);
    expect(
      parseGitDiff(modified() + '\n+surplus').diagnostics.some(
        (d) => d.code === 'hunk-count-mismatch',
      ),
    ).toBe(true);
    expect(parseGitDiff('diff --git a/a b/a').diagnostics.some((d) => d.code === 'truncated')).toBe(
      true,
    );
  });

  test('invalid, unsafe and overlapping ranges are incomplete', () => {
    for (const header of ['@@ nonsense @@', '@@ -0 +1 @@', '@@ -9007199254740992 +1 @@']) {
      expect(
        parseGitDiff(modified().replace('@@ -1 +1 @@ section-label', header)).diagnostics.some(
          (d) => d.code === 'invalid-hunk',
        ),
      ).toBe(true);
    }
    const r = parseGitDiff(modified() + '\n@@ -1 +1 @@\n-old\n+new');
    expect(r.diagnostics.some((d) => d.code === 'overlapping-hunks')).toBe(true);
  });

  test('unknown metadata and missing/mismatched headers are never silently supported', () => {
    const patches = [
      modified().replace('index aaaa..bbbb 100644', 'X-unknown secret-header'),
      modified().replace('+++ b/app.ts', '+++ b/different'),
      modified().replace('--- a/app.ts\n', ''),
      modified().replace('index aaaa..bbbb 100644', 'old mode 100644'),
      modified().replace('index aaaa..bbbb 100644', 'index nope'),
    ];
    for (const patch of patches) expect(parseGitDiff(patch).summary.complete).toBe(false);
  });

  test('binary markers and combined/plain unified formats are explicitly incomplete', () => {
    for (const marker of ['Binary files a/a and b/a differ', 'GIT binary patch']) {
      const r = parseGitDiff(`diff --git a/a b/a\n${marker}`);
      expect(r.files[0]?.binary).toBe(true);
      expect(r.diagnostics.some((d) => d.code === 'binary-unsupported')).toBe(true);
      expect(r.summary.complete).toBe(false);
    }
    expect(parseGitDiff('diff --cc app.ts\n@@@ -1 -1 +1 @@@').summary.complete).toBe(false);
    expect(parseGitDiff('--- old\n+++ new\n@@ -1 +1 @@\n-a\n+b').diagnostics[0]?.code).toBe(
      'unsupported-format',
    );
  });

  test('literal NUL is binary evidence, not a complete textual diff', () => {
    const r = parseGitDiff(modified('a', 'old', 'new\0binary'));
    expect(r.summary.complete).toBe(false);
    expect(r.diagnostics).toEqual([{ code: 'binary-unsupported', sourceLine: 7 }]);
    expect(r.files).toEqual([]);
  });

  test('CRLF framing and optional final newline normalize deterministically', () => {
    expect(parseGitDiff(modified().replaceAll('\n', '\r\n') + '\r\n')).toEqual(
      parseGitDiff(modified()),
    );
    expect(parseGitDiff('').summary).toMatchObject({ complete: true, files: 0, hunks: 0 });
  });

  test.each([
    ['size-limit', 'x'.repeat(GIT_DIFF_LIMITS.maxCodeUnits + 1)],
    ['line-limit', '\n'.repeat(GIT_DIFF_LIMITS.maxLines + 1)],
    ['line-length-limit', 'x'.repeat(GIT_DIFF_LIMITS.maxLineCodeUnits + 1)],
  ])('resource bound %s returns only a diagnostic, not partial files', (code, text) => {
    const r = parseGitDiff(text);
    expect(r.files).toEqual([]);
    expect(r.summary.complete).toBe(false);
    expect(r.diagnostics[0]?.code).toBe(code);
  });

  test('prototype-like paths and HTML-looking data remain plain text', () => {
    const r = parseGitDiff(modified('__proto__', '<img src=x onerror=alert(1)>', 'constructor'));
    expect(r.summary.complete).toBe(true);
    expect(r.files[0]?.oldPath).toBe('__proto__');
    expect(r.files[0]?.hunks[0]?.lines[0]?.text).toBe('-<img src=x onerror=alert(1)>');
  });

  test('selection export excludes sensitive files, hunks, section labels and original global diagnostics', () => {
    const text =
      'private-preamble\n' + multi + '\n' + modified('private.env', 'secret-old', 'secret-new');
    const report = parseGitDiff(text);
    const file = report.files[0]!;
    const out = exportGitDiffSelection(report, {
      fileIds: [file.id],
      hunkIds: [file.hunks[0]!.id],
    });
    const encoded = JSON.stringify(out);
    for (const secret of [
      'private.env',
      'secret-old',
      'secret-new',
      'private-hunk',
      'private-section-label',
      'private-preamble',
      'section-label',
    ])
      expect(encoded).not.toContain(secret);
    expect(out.summary).toMatchObject({
      files: 1,
      hunks: 1,
      addedLines: 1,
      deletedLines: 1,
      complete: true,
    });
    expect(out.patch).toContain('-old\n+new');
    expect(out.files[0]?.hunkIds).toEqual([file.hunks[0]!.id]);
    expect(encoded).not.toContain('diagnostics');
    expect(out.scope).toBe('selection-only');
  });

  test('file selection never implicitly includes hunks; empty selection never leaks input', () => {
    const r = parseGitDiff(multi);
    expect(exportGitDiffSelection(r, { fileIds: [r.files[0]!.id], hunkIds: [] }).patch).toBe('');
    expect(exportGitDiffSelection(r, { fileIds: [], hunkIds: [] }).files).toEqual([]);
  });

  test('unknown IDs, orphan hunks and incomplete selected files are rejected with static errors', () => {
    const r = parseGitDiff(modified());
    expect(() => exportGitDiffSelection(r, { fileIds: ['secret-invalid'], hunkIds: [] })).toThrow(
      'Invalid file/hunk selection.',
    );
    expect(() =>
      exportGitDiffSelection(r, { fileIds: [], hunkIds: [r.files[0]!.hunks[0]!.id] }),
    ).toThrow('Invalid file/hunk selection.');
    const bad = parseGitDiff(modified() + '\n+surplus');
    expect(() =>
      exportGitDiffSelection(bad, {
        fileIds: [bad.files[0]!.id],
        hunkIds: [bad.files[0]!.hunks[0]!.id],
      }),
    ).toThrow('Incomplete files cannot be exported.');
  });

  test('selected summary is deterministic, order follows source not selection array', () => {
    const r = parseGitDiff(modified('a') + '\n' + modified('b'));
    const files = r.files.map((f) => f.id),
      hunks = r.files.flatMap((f) => f.hunks.map((h) => h.id));
    expect(exportGitDiffSelection(r, { fileIds: files, hunkIds: hunks })).toEqual(
      exportGitDiffSelection(r, { fileIds: [...files].reverse(), hunkIds: [...hunks].reverse() }),
    );
  });
});
