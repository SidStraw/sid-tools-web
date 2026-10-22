import { expect, test, vi } from 'vite-plus/test';
import {
  parseMarkdownDocument,
  resolveMarkdownDestination,
  MARKDOWN_LIMITS,
  MARKDOWN_POLICY,
  MARKDOWN_RENDERER,
} from './markdown-links.js';

const parse = (source: string) => parseMarkdownDocument('docs/source.md', source);
test('direct links/images, normalized forward references, source-first duplicate definitions and image references', () => {
  const report = parse(
    '[inline](./other.md#part "title") ![image](../asset.png)\n\n[forward][ Mixed  LABEL ] ![alt][PIC]\n\n[mixed label]: first.md\n[MIXED LABEL]: second.md\n[pic]: ../pic.svg\n',
  );
  expect(report.status).toBe('complete');
  expect(report.links.map((link) => [link.kind, link.destination])).toEqual([
    ['link', './other.md#part'],
    ['image', '../asset.png'],
    ['link', 'first.md'],
    ['image', '../pic.svg'],
  ]);
});
test('collapsed/shortcut refs, whitespace normalization and escaped/Unicode/entity destinations use AST', () => {
  const report = parse(
    '[a][] [B] [entity](a&amp;b.md) [escaped](a\\(b\\).md) [unicode](中文.md)\n\n[a]: one.md\n[b]: two.md',
  );
  expect(report.links.map((link) => link.destination)).toEqual([
    'one.md',
    'two.md',
    'a&b.md',
    'a(b).md',
    '中文.md',
  ]);
});
test('undefined references are literal Markdown text, unused definitions not links', () => {
  const report = parse('[undefined][absent]\n\n[unused]: absent.md');
  expect(report.status).toBe('complete');
  expect(report.links).toEqual([]);
});
test('code fences, indented code and inline code exclude fake headings/links/images/definitions', () => {
  const report = parse(
    '```md\n# Fake\n[bad](bad.md)\n![bad](bad.png)\n[ref]: bad.md\n```\n\n    # Indented\n    [bad](bad.md)\n\n`[inline](bad.md)`\n\n# Real\n[real](good.md)',
  );
  expect(report.anchors).toEqual(['real']);
  expect(report.links.map((link) => link.destination)).toEqual(['good.md']);
});
test('GFM tables/strikethrough/tasklists/autolinks and inline images are parsed not regex-matched', () => {
  const report = parse(
    '| A |\n| - |\n| [table](table.md) |\n\n- [x] ~~[task](task.md)~~\n\nwww.example.com <https://example.com/x> user@example.com\n\n[![nested](pic.png)](target.md)',
  );
  expect(report.links.map((link) => link.destination)).toEqual([
    'table.md',
    'task.md',
    'http://www.example.com',
    'https://example.com/x',
    'mailto:user@example.com',
    'target.md',
    'pic.png',
  ]);
  expect(
    report.links
      .slice(2, 5)
      .map((link) => resolveMarkdownDestination('a.md', link.destination).kind),
  ).toEqual(['external-skipped', 'external-skipped', 'external-skipped']);
});
test('original UTF16/BOM/CRLF positions, full reference source spans and deterministic clone-safe report', () => {
  const source =
    '\uFEFF# Heading\r\n\r\n😀 [label](target.md#head)\r\n\r\n[reference][ID]\r\n\r\n[id]: file.md\r\n';
  const report = parse(source),
    direct = report.links[0]!,
    reference = report.links[1]!;
  expect(direct.location).toMatchObject({ line: 3, column: 4 });
  expect(source.slice(direct.location.start, direct.location.end)).toBe('[label](target.md#head)');
  expect(source.slice(reference.location.start, reference.location.end)).toBe('[reference][ID]');
  expect(reference.location).toMatchObject({ line: 5, column: 1 });
  expect(structuredClone(report)).toEqual(report);
  expect(parse(source)).toEqual(report);
});
test('heading text is parsed, entities/emphasis/code/image-alt/link text and duplicates use per-doc slugger', () => {
  const source =
    '# Hello *World* `Code` &amp; ![Alt](image.png) [Link](file.md)\n\n## 中文 Café!\n\nHello\n=====\n\n# Hello\n# Hello-1\n# Hello\n';
  const report = parse(source);
  expect(report.status).toBe('complete');
  expect(report.anchorCoverage).toBe('complete');
  expect(report.anchors).toEqual([
    'hello-world-code--alt-link',
    '中文-café',
    'hello',
    'hello-1',
    'hello-1-1',
    'hello-2',
  ]);
  expect(parse('# Hello').anchors).toEqual(['hello']);
  expect(MARKDOWN_RENDERER).toBe('gfm-heading-subset/v1');
  expect(MARKDOWN_POLICY.headings).toContain('not full GitHub renderer parity');
});
test.each([
  '# <i>Same</i>\n# Same',
  '<a id="custom"></a>\n\n# Known',
  '# Same\n# <span>Same</span>\n# Same',
  '# title[^note]\n\n[^note]: text',
  '# Known\n\ntext[^n]\n\n[^n]: note',
])('unsupported HTML/generated anchors clear all potentially colliding anchors %#', (source) => {
  const report = parse(source + '\n\n[retained](file.md)');
  expect(report.status).toBe('partial');
  expect(report.anchorCoverage).toBe('unknown');
  expect(report.anchors).toEqual([]);
  expect(report.links.at(-1)!.destination).toBe('file.md');
});
test('HTML is not parsed for URLs/IDs, scripts never executed and raw exception/source data never echoed', () => {
  const report = parse(
    '<script>SECRET_SOURCE</script>\n\n<a href="SECRET_URL" id="SECRET_ID">link</a>',
  );
  expect(report.status).toBe('partial');
  expect(report.links).toEqual([]);
  expect(JSON.stringify(report)).not.toMatch(/SECRET_|script>/);
  const spy = vi.spyOn(String.prototype, 'toUpperCase').mockImplementation(() => {
    throw new Error('SECRET_EXCEPTION');
  });
  try {
    const failed = parse('[link][ref]\n\n[ref]: file.md');
    expect(failed.status).toBe('partial');
    expect(failed.links).toEqual([]);
    expect(JSON.stringify(failed)).not.toContain('SECRET_EXCEPTION');
  } finally {
    spy.mockRestore();
  }
});
test('prototype-like reference identifiers are data, never object property lookups', () => {
  expect(
    parse('[a][__proto__] [b][constructor]\n\n[__proto__]: a.md\n[constructor]: b.md').links.map(
      (link) => link.destination,
    ),
  ).toEqual(['a.md', 'b.md']);
});

test.each([
  ['target.md', 'docs/target.md', null],
  ['../readme.md#Intro', 'readme.md', 'Intro'],
  ['#heading', 'docs/source.md', 'heading'],
  ['', 'docs/source.md', null],
  ['#', 'docs/source.md', null],
  ['?view=1#part', 'docs/source.md', 'part'],
  ['./other.md?view=1#part', 'docs/other.md', 'part'],
  ['%E4%B8%AD%E6%96%87.md#caf%C3%A9', 'docs/中文.md', 'café'],
  ['file+name.md#plus+sign', 'docs/file+name.md', 'plus+sign'],
  ['a%20b.md', 'docs/a b.md', null],
  ['a%23b.md#a%3Fb', 'docs/a#b.md', 'a?b'],
  ['%252e%252e/file.md#%252f', 'docs/%2e%2e/file.md', '%2f'],
  ['a/../../file.md', 'file.md', null],
  ['../中文.md?token=discarded', '中文.md', null],
])('destination %s resolves once under root', (destination, path, fragment) => {
  expect(resolveMarkdownDestination('docs/source.md', destination)).toEqual({
    kind: 'local',
    path,
    fragment,
  });
});
test.each(['source.md', 'docs/sub/source.md'])(
  'terminal directory syntax is retained before normalization from %s',
  (fromPath) => {
    const prefix = fromPath.slice(0, fromPath.lastIndexOf('/') + 1);
    for (const destination of [
      'target.md/',
      'target.md/.',
      'target.md/sub/..',
      'target.md/%2e',
      'target.md/sub/%2E%2e',
      'target.md/sub/.%2e',
      'target.md/%2e/',
      'target.md/sub/%2e%2e?view=1#part',
    ]) {
      expect(resolveMarkdownDestination(fromPath, destination)).toEqual({
        kind: 'local',
        path: prefix + 'target.md',
        fragment: destination.includes('#') ? 'part' : null,
        directoryRequired: true,
      });
    }
    for (const destination of ['hidden/', '.', '%2e', '..', '%2e%2e']) {
      if (fromPath === 'source.md' && destination !== 'hidden/') continue;
      expect(resolveMarkdownDestination(fromPath, destination)).toMatchObject({
        kind: 'local',
        directoryRequired: true,
      });
    }
    for (const destination of ['target.md', './target.md', 'sub/../target.md', '%74arget.md']) {
      expect(resolveMarkdownDestination(fromPath, destination)).toEqual({
        kind: 'local',
        path: prefix + 'target.md',
        fragment: null,
      });
    }
    for (const destination of ['', '#part', '?view=1#part']) {
      expect(resolveMarkdownDestination(fromPath, destination)).toEqual({
        kind: 'local',
        path: fromPath,
        fragment: destination.includes('#') ? 'part' : null,
      });
    }
  },
);
test.each([
  ['source.md', '../target.md/'],
  ['source.md', 'target.md/../..'],
  ['source.md', 'target.md/%2e%2e/%2e%2e'],
  ['docs/source.md', '../../target.md/.'],
  ['docs/sub/source.md', '../../../target.md/sub/..'],
])('directory syntax cannot bypass root escape from %s: %s', (fromPath, destination) => {
  expect(resolveMarkdownDestination(fromPath, destination)).toEqual({
    kind: 'unknown',
    reason: 'root-escape',
  });
});
test.each([
  '../../secret.md',
  '../..',
  '/absolute.md',
  'C:\\file.md',
  'C:relative.md',
  '\\\\server\\file.md',
  'a\\b.md',
  'a%2fb.md',
  'a%2Fb.md',
  'a%5cb.md',
  '%00',
  'file.md#%2f',
  'file.md#%5C',
  'bad%',
  'bad%ZZ',
  '%C0%AF',
  'file.md#%E0%A4',
  'file.md?bad=%',
  '\u0000',
  'file.md#%01',
  ' a.md',
  'a.md ',
  'a/b%3Ac.md',
])('ambiguous/malformed/escaping destination remains unknown %#', (destination) => {
  expect(resolveMarkdownDestination('docs/source.md', destination).kind).toBe('unknown');
});
test.each([
  ['https://example.com/x', 'https'],
  ['HTTP://example.com', 'http'],
  ['//example.com/x', 'protocol-relative'],
  ['mailto:a@example.com', 'mailto'],
  ['ftp://example.com', 'ftp'],
  ['javascript:alert(1)', 'javascript'],
  ['data:text/plain,hello', 'data'],
  ['custom+v1:value', 'custom+v1'],
  ['file:///etc/passwd', 'file'],
])('external scheme %s is skipped, never requested/executed', (destination, scheme) => {
  expect(resolveMarkdownDestination('docs/source.md', destination)).toEqual({
    kind: 'external-skipped',
    scheme,
  });
});
test.each([
  '',
  '/a.md',
  '../a.md',
  'a/../b.md',
  './a.md',
  'a//b.md',
  'a\\b.md',
  'C:foo.md',
  'a\u0000.md',
])('invalid source path %s never produces a lookup target', (path) => {
  expect(resolveMarkdownDestination(path, 'target.md')).toEqual({
    kind: 'unknown',
    reason: 'invalid-source-path',
  });
  expect(parseMarkdownDocument(path, '# Heading')).toMatchObject({
    status: 'partial',
    anchors: [],
    links: [],
    anchorCoverage: 'unknown',
  });
});
test('root directory and resolved path/URL/input limits remain bounded', () => {
  expect(resolveMarkdownDestination('source.md', '.')).toEqual({
    kind: 'unknown',
    reason: 'root-directory-target',
  });
  expect(resolveMarkdownDestination('x'.repeat(4000) + '/a.md', 'y'.repeat(200))).toEqual({
    kind: 'unknown',
    reason: 'resolved-path-limit',
  });
  expect(
    resolveMarkdownDestination('a.md', 'x'.repeat(MARKDOWN_LIMITS.destinationCodeUnits + 1)),
  ).toEqual({ kind: 'unknown', reason: 'destination-limit' });
  expect(parse('x'.repeat(MARKDOWN_LIMITS.sourceCodeUnits + 1))).toMatchObject({
    status: 'limit',
    anchors: [],
    links: [],
    anchorCoverage: 'unknown',
  });
});

test('encoded traversal containment, original first-line BOM and lone surrogate strings do not get guessed', () => {
  expect(resolveMarkdownDestination('docs/source.md', '%2e%2e/ok.md')).toEqual({
    kind: 'local',
    path: 'ok.md',
    fragment: null,
  });
  expect(resolveMarkdownDestination('source.md', '%2e%2e/no.md')).toEqual({
    kind: 'unknown',
    reason: 'root-escape',
  });
  expect(resolveMarkdownDestination('source.md', '\ud800.md')).toEqual({
    kind: 'unknown',
    reason: 'ill-formed-unicode',
  });
  expect(parse('\udc00')).toMatchObject({
    status: 'partial',
    anchorCoverage: 'unknown',
    anchors: [],
    links: [],
  });
  const source = '\uFEFF[x](a.md)',
    link = parse(source).links[0]!;
  expect(link.location).toEqual({ start: 1, end: source.length, line: 1, column: 2 });
  expect(source.slice(link.location.start, link.location.end)).toBe('[x](a.md)');
});
test.each([
  ['heading-limit', '# H\n'.repeat(MARKDOWN_LIMITS.headings + 1)],
  ['link-limit', '[x](a) '.repeat(MARKDOWN_LIMITS.links + 1)],
  [
    'definition-limit',
    Array.from({ length: MARKDOWN_LIMITS.definitions + 1 }, (_, i) => `[r${i}]: a`).join('\n'),
  ],
  ['diagnostic-limit', '<a id="x"></a>\n\n'.repeat(MARKDOWN_LIMITS.diagnostics + 1)],
  ['destination-limit', '[x](' + 'a'.repeat(MARKDOWN_LIMITS.destinationCodeUnits + 1) + ')'],
  ['node-limit', Array.from({ length: 11000 }, () => '*x* ').join('')],
])('%s clears all report arrays instead of fabricating coverage', (code, source) => {
  expect(parse(source)).toMatchObject({
    status: 'limit',
    anchors: [],
    links: [],
    anchorCoverage: 'unknown',
    diagnostics: [{ code, location: null }],
  });
});
test('hostile parser depth is measured separately from postparse AST bounds; no hard synchronous parse deadline claim', () => {
  const source = '> '.repeat(256) + '[x](a.md)\n',
    start = performance.now(),
    report = parse(source),
    elapsed = performance.now() - start;
  expect(report).toMatchObject({
    status: 'limit',
    anchors: [],
    links: [],
    diagnostics: [{ code: 'depth-limit', location: null }],
  });
  expect(MARKDOWN_POLICY.bounds).toContain('after parsing');
  console.info(
    `Markdown hostile256 blockquote depth: ${elapsed.toFixed(1)}ms (AST limit after parse)`,
  );
});
test(
  'hostile bracket/emphasis/fanout fixtures measured within source ceiling; callers still require parser isolation',
  { timeout: 60_000 },
  () => {
    for (const [name, source] of [
      ['brackets', '['.repeat(12_000) + ']'.repeat(12_000)],
      ['emphasis', '*_'.repeat(6000) + 'x' + '_*'.repeat(6000)],
      ['plain200K', 'x'.repeat(200_000)],
      ['fanout', '- [x](a.md)\n'.repeat(4000)],
    ] as const) {
      const start = performance.now(),
        report = parse(source),
        elapsed = performance.now() - start;
      expect(['complete', 'partial', 'limit']).toContain(report.status);
      // Wall time is observational; the CLI child deadline has its own integration test.
      expect(report.links).toHaveLength(report.status === 'limit' || name !== 'fanout' ? 0 : 4000);
      expect(report.anchorCoverage).toBe(report.status === 'limit' ? 'unknown' : 'complete');
      console.info(
        `Markdown ${name} ${source.length}UTF16: ${elapsed.toFixed(1)}ms, ${report.status}`,
      );
    }
  },
);
