import { readFile } from 'node:fs/promises';
import { expect, expectTypeOf, test } from 'vite-plus/test';
import { inspectImage, type ImageInfo } from '@sid-tools/core';
import { compareSemver, type SemverComparison } from '@sid-tools/core/semver';
import { compareEnv, type EnvComparison } from '@sid-tools/core/env-check';
import { parseExplain, EXPLAIN_EXAMPLES, type ExplainReport } from '@sid-tools/core/explain';
import { analyzeSelectors, type SelectorListAnalysis } from '@sid-tools/core/selectors';
import { compareSdl, exportSdlComparison, type SdlComparison } from '@sid-tools/core/sdl';
import {
  compareOpenApi,
  exportOpenApiSummary,
  type OpenApiComparison,
} from '@sid-tools/core/openapi';

test('public OpenAPI subpath exposes clone-safe typed directional report and value-free projection', () => {
  expectTypeOf(compareOpenApi).returns.toEqualTypeOf<OpenApiComparison>();
  const before = JSON.stringify({
    openapi: '3.0.3',
    info: { title: 'synthetic-private-title', version: '1' },
    paths: {
      '/sample': {
        get: { responses: { '200': { description: 'synthetic-private-description' } } },
      },
    },
  });
  const after = JSON.stringify({
    openapi: '3.0.3',
    info: { title: 'synthetic-private-title', version: '1' },
    paths: {},
  });
  const report = compareOpenApi(before, after);
  expect(report.counts.breaking).toBe(1);
  expect(structuredClone(report)).toEqual(report);
  const exported = exportOpenApiSummary(report);
  expect(exported).not.toContain('synthetic-private');
  expect(exported).not.toContain('"source"');
  expect(JSON.parse(exported)).toHaveProperty('status', 'complete');
});

test('public SDL subpath exposes typed static variance and projected export without source strings', () => {
  expectTypeOf(compareSdl).returns.toEqualTypeOf<SdlComparison>();
  const report = compareSdl(
    'type Query { f(arg: String = "synthetic-private"): String }',
    'type Query { f(arg: String = "synthetic-private"): String! }',
  );
  expect(report.status).toBe('complete');
  expect(report.counts['non-breaking']).toBe(1);
  const text = exportSdlComparison(report);
  expect(text).not.toContain('synthetic-private');
  expect(text).not.toContain('"signature"');
  expect(text).not.toContain('"reason"');
  expect(JSON.parse(text)).toHaveProperty('status', 'complete');
});

test('public selectors subpath exposes typed per-complex tuples, source spans and honest unknowns', () => {
  expectTypeOf(analyzeSelectors).returns.toEqualTypeOf<SelectorListAnalysis>();
  const text = ':where(#root) .card, .card:has(> p), :unknown-state';
  const report = analyzeSelectors(text);
  expect(report.selectors.map((branch) => branch.specificity)).toEqual([
    [0, 1, 0],
    [0, 1, 1],
    null,
  ]);
  expect(report.selectors[2]?.matching).toBe('unsupported');
  for (const branch of report.selectors)
    expect(text.slice(branch.span.start, branch.span.end)).toBe(branch.text);
});
import {
  extractPalette,
  evaluateContrast,
  exportCssTokens,
  type PaletteReport,
  type ContrastEvaluation,
} from '@sid-tools/core/palette';

test('public palette subpath exposes typed explicit alpha/contrast and selected preview-consistent CSS', () => {
  expectTypeOf(extractPalette).returns.toEqualTypeOf<PaletteReport>();
  expectTypeOf(evaluateContrast).returns.toEqualTypeOf<ContrastEvaluation>();
  const backing = { r: 255, g: 255, b: 255 };
  const palette = extractPalette(new Uint8ClampedArray([255, 0, 0, 0, 0, 0, 0, 255]), { backing });
  expect(palette.colors.map((color) => color.hex)).toEqual(['#000000', '#ffffff']);
  const contrast = evaluateContrast(
    { r: 0, g: 0, b: 0, a: 0.5 },
    { r: 255, g: 255, b: 255, a: 1 },
    backing,
  );
  expect(contrast.foreground).toEqual({ r: 127.5, g: 127.5, b: 127.5 });
  expect(contrast.passes.aaNormal).toBe(false);
  expect(exportCssTokens([{ name: 'text', color: contrast.foreground }])).toBe(
    ':root {\n  --text: rgb(127.5 127.5 127.5);\n}\n',
  );
});

test('public explain subpath exposes typed synthetic per-loop, inclusive and independent statement metrics', () => {
  expectTypeOf(parseExplain).returns.toEqualTypeOf<ExplainReport>();
  const example = EXPLAIN_EXAMPLES.find((example) => example.id === 'analyze-loops');
  expect(example?.provenance).toBe('synthetic');
  const report = parseExplain(example?.text ?? '');
  expect(report.root?.children[0]?.estimate.factor).toBe(10);
  expect(report.root?.children[0]?.approximateRowsAcrossLoops).toBe(100);
  expect(report.root?.children[0]?.approximateInclusiveMsAcrossLoops).toBe(5);
  expect(report.executionTime).toEqual({ value: 9, pointer: '/0/Execution Time' });
  expect(report.root?.children[0]?.actualTotalTime?.pointer).toBe(
    '/0/Plan/Plans/0/Actual Total Time',
  );
});
import {
  validateSitemap,
  sitemapEntryPointer,
  SITEMAP_NAMESPACE,
  type SitemapReport,
} from '@sid-tools/core/sitemap';

test('public sitemap subpath exposes typed static validation with explicitly unchecked index children', () => {
  expectTypeOf(validateSitemap).returns.toEqualTypeOf<SitemapReport>();
  const report = validateSitemap({
    kind: 'sitemapindex',
    namespace: SITEMAP_NAMESPACE,
    entries: [
      {
        ordinal: 1,
        pointer: sitemapEntryPointer('sitemapindex', 1),
        loc: 'https://example.test/child.xml',
        unknownTagCount: 0,
        duplicateFieldCount: 0,
        nestedMarkup: false,
      },
    ],
    unknownTagCount: 0,
    structureIssueCount: 0,
    rawUtf8Bytes: 200,
    xmlPolicy: {
      wellFormed: true,
      doctypeDetected: false,
      entityDeclarationDetected: false,
      structureChecked: true,
    },
  });
  expect(report).toMatchObject({
    valid: true,
    complete: false,
    indexingStatus: 'not-checked',
    uncheckedChildCount: 1,
  });
  expect(report.entries[0]).toMatchObject({
    pointer: '/sitemapindex/sitemap[1]',
    childStatus: 'unchecked',
  });
});
import {
  parseGitDiff,
  exportGitDiffSelection,
  type GitDiffReport,
  type GitDiffExport,
} from '@sid-tools/core/git-diff';

test('public git-diff subpath exposes typed source-grounded parsing and explicit selection export', () => {
  expectTypeOf(parseGitDiff).returns.toEqualTypeOf<GitDiffReport>();
  expectTypeOf(exportGitDiffSelection).returns.toEqualTypeOf<GitDiffExport>();
  const report = parseGitDiff(
    'diff --git a/ok.txt b/ok.txt\n--- a/ok.txt\n+++ b/ok.txt\n@@ -1 +1 @@\n-before\n+after',
  );
  expect(report.files[0]?.hunks[0]?.sourceLine).toBe(4);
  expect(exportGitDiffSelection(report, { fileIds: ['file-1'], hunkIds: [] }).files).toEqual([]);
  expect(
    exportGitDiffSelection(report, { fileIds: ['file-1'], hunkIds: ['file-1-hunk-4'] }).summary,
  ).toMatchObject({ files: 1, addedLines: 1, deletedLines: 1 });
});

test('public env-check subpath exposes a typed key-only comparison with template locations for missing keys', () => {
  expectTypeOf(compareEnv).returns.toEqualTypeOf<EnvComparison>();
  const result = compareEnv('# template\nAPI_TOKEN=demo-secret', 'OTHER_KEY=other-secret');
  expect(result.diagnostics).toContainEqual({
    source: 'candidate',
    code: 'missing',
    key: 'API_TOKEN',
    line: 2,
    endLine: 2,
    relatedLines: [2],
  });
  expect(JSON.stringify(result)).not.toContain('demo-secret');
  expect(JSON.stringify(result)).not.toContain('other-secret');
});

test('public SemVer subpath exposes browser-reproducible typed comparisons', () => {
  expectTypeOf(compareSemver).returns.toEqualTypeOf<SemverComparison>();
  expect(compareSemver('1.2.3 1.3.0', '~1.2.3', '^1.2.3').added).toEqual(['1.3.0']);
});

test('public exports inspect real JPEG and PNG inputs', async () => {
  expect(inspectImage(await readFile('tests/fixtures/photo.jpg'))).toEqual({
    format: 'image/jpeg',
    width: 3872,
    height: 2592,
  });
  expect(inspectImage(await readFile('tests/fixtures/transparent.png'))).toEqual({
    format: 'image/png',
    width: 706,
    height: 1442,
  });
  expectTypeOf(inspectImage).returns.toEqualTypeOf<ImageInfo>();
});
