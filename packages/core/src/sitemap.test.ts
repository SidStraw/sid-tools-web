import { describe, expect, test } from 'vite-plus/test';
import {
  SITEMAP_LIMITS,
  SITEMAP_NAMESPACE,
  sitemapEntryPointer,
  validateSitemap,
  type SitemapDocument,
  type SitemapEntry,
  type SitemapKind,
} from './sitemap.js';

// Synthetic normalized XML-adapter fixtures, not fetched sitemap or indexing evidence.
const entry = (
  ordinal: number,
  loc?: string,
  overrides: Partial<SitemapEntry> = {},
  kind: SitemapKind = 'urlset',
): SitemapEntry => ({
  ordinal,
  pointer: sitemapEntryPointer(kind, ordinal),
  ...(loc === undefined ? {} : { loc }),
  unknownTagCount: 0,
  duplicateFieldCount: 0,
  nestedMarkup: false,
  ...overrides,
});
const document = (
  entries: readonly SitemapEntry[],
  overrides: Partial<SitemapDocument> = {},
): SitemapDocument => ({
  kind: 'urlset',
  namespace: SITEMAP_NAMESPACE,
  entries,
  unknownTagCount: 0,
  structureIssueCount: 0,
  rawUtf8Bytes: 100,
  xmlPolicy: {
    wellFormed: true,
    doctypeDetected: false,
    entityDeclarationDetected: false,
    structureChecked: true,
  },
  ...overrides,
});

describe('pure normalized sitemap 0.9 subset (synthetic adapter fixtures)', () => {
  test('urlset validates known fields and preserves original ordinals/pointers', () => {
    const r = validateSitemap(
      document([
        entry(1, ' https://example.com/a?x=1 ', {
          lastmod: '2024-02-29',
          changefreq: 'daily',
          priority: '0.8',
        }),
      ]),
    );
    expect(r).toMatchObject({
      kind: 'urlset',
      valid: true,
      complete: true,
      sourceEntryCount: 1,
      checkedEntryCount: 1,
      rawUtf8Bytes: 100,
      uncheckedChildCount: 0,
      indexingStatus: 'not-checked',
    });
    expect(r.entries[0]).toMatchObject({
      ordinal: 1,
      pointer: '/urlset/url[1]',
      loc: 'https://example.com/a?x=1',
      url: { origin: 'https://example.com', host: 'example.com', pathname: '/a', search: '?x=1' },
      childStatus: null,
    });
    expect(r.pathGroups).toEqual([
      { origin: 'https://example.com', pathname: '/a', entryOrdinals: [1] },
    ]);
    expect(r.diagnostics).toEqual([]);
  });

  test('index children always remain unchecked, never inferred from URL extension', () => {
    const r = validateSitemap(
      document(
        [
          entry(
            1,
            'https://example.com/child.xml',
            { lastmod: '2026-10-15T12:00:00+08:00' },
            'sitemapindex',
          ),
        ],
        { kind: 'sitemapindex' },
      ),
    );
    expect(r.valid).toBe(true);
    expect(r.complete).toBe(false);
    expect(r.entries[0]?.childStatus).toBe('unchecked');
    expect(r.uncheckedChildCount).toBe(1);
    expect(r.diagnostics.map((d) => d.code)).toEqual(['unchecked-children']);
    expect(r.indexingStatus).toBe('not-checked');
  });

  test('duplicate comparison is exact decoded/trimmed text, not URL canonicalization', () => {
    const locations = [
      'https://EXAMPLE.com/a?x=1&y=2',
      'https://example.com/a?x=1&y=2',
      'https://example.com/a?y=2&x=1',
      'https://example.com/A?x=1&y=2',
      'https://example.com/%7e',
      'https://example.com/%7E',
      'https://example.com/a?x=1&y=2 ',
    ];
    const r = validateSitemap(document(locations.map((loc, i) => entry(i + 1, loc))));
    expect(r.diagnostics.filter((d) => d.code === 'duplicate-loc')).toEqual([
      {
        code: 'duplicate-loc',
        severity: 'warning',
        pointer: '/urlset/url[7]/loc',
        ordinal: 7,
        relatedOrdinal: 2,
      },
    ]);
    expect(r.entries[6]?.duplicateOf).toBe(2);
    expect(r.diagnostics.some((d) => d.code === 'mixed-host')).toBe(false);
    expect(r.pathGroups.find((g) => g.pathname === '/a')?.entryOrdinals).toEqual([1, 2, 3, 7]);
  });

  test('duplicates always reference first ordinal with linear group membership', () => {
    const count = SITEMAP_LIMITS.localEntries;
    const r = validateSitemap(
      document(Array.from({ length: count }, (_, i) => entry(i + 1, 'https://example.com/'))),
    );
    expect(r.checkedEntryCount).toBe(count);
    expect(r.diagnostics).toHaveLength(count - 1);
    expect(r.diagnostics.every((d) => d.relatedOrdinal === 1)).toBe(true);
    expect(r.pathGroups[0]?.entryOrdinals).toHaveLength(count);
  });

  test('mixed hosts use parsed host with default-port/case normalization, not path changes', () => {
    const r = validateSitemap(
      document(
        [
          'https://EXAMPLE.com:443/a',
          'https://example.com/b',
          'https://other.example/c',
          'https://example.com:8443/d',
        ].map((loc, i) => entry(i + 1, loc)),
      ),
    );
    expect(
      r.diagnostics
        .filter((d) => d.code === 'mixed-host')
        .map((d) => [d.ordinal, d.relatedOrdinal]),
    ).toEqual([
      [3, 1],
      [4, 1],
    ]);
  });

  test.each([
    '2004',
    '2004-12',
    '2024-01',
    '2004-12-23T18:00+00:00',
    '2004-12-23T18:00Z',
    '2004-12-23T18:00:01.123456789012Z',
    '2024-02-29',
    '2000-02-29',
    '0001-01-01',
    '9999-12-31',
    '2026-10-15T23:59:59Z',
    '2026-10-15T12:01:02.123456789-05:30',
  ])('accepts strict Gregorian W3C Datetime forms %s', (lastmod) => {
    expect(validateSitemap(document([entry(1, 'https://example.com/', { lastmod })])).valid).toBe(
      true,
    );
  });

  test.each([
    '2023-02-29',
    '1900-02-29',
    '2024-04-31',
    '0000-01-01',
    '2024-13-01',
    '2024-01-00',
    '2024-1-01',
    '2004-13',
    '2004-02-30T18:00Z',
    '2004-12-23T18:00',
    '0000',
    '0000-12',
    '2004-12-23T18:60Z',
    '2004-12-23T18:00.1Z',
    '2004-12-23T18:00:00.Z',
    '2024-01-01T24:00:00Z',
    '2024-01-01T00:00:60Z',
    '2024-01-01T00:00:00',
    '2024-01-01T00:00:00+24:00',
    '2024-01-01T00:00:00+01:60',
    '2024-01-01t00:00:00z',
    '',
  ])('rejects invalid/unsupported lastmod %s without Date normalization', (lastmod) => {
    const r = validateSitemap(document([entry(1, 'https://example.com/', { lastmod })]));
    expect(r.valid).toBe(false);
    expect(r.diagnostics[0]).toMatchObject({
      code: 'invalid-lastmod',
      pointer: '/urlset/url[1]/lastmod',
      ordinal: 1,
    });
  });

  test.each([
    '/relative',
    'ftp://example.com/a',
    'https://u:p@example.com/a',
    'https://example.com/a#fragment',
    'https://example.com/#',
    'https:///example.com/a',
    'https://@example.com/a',
    'https:\\example.com',
    'https://example.com/a b',
    'https://example.com/%oops',
    'https://example.com/a\u001f',
    'https://example.com/' + 'a'.repeat(SITEMAP_LIMITS.locCodeUnits),
  ])('rejects unsupported/unsafe loc %s', (loc) => {
    const r = validateSitemap(document([entry(1, loc)]));
    expect(r.entries[0]?.url).toBeNull();
    expect(r.valid).toBe(false);
    expect(r.diagnostics.some((d) => d.code === 'invalid-loc')).toBe(true);
  });

  test('required loc, optional keywords and priorities are explicit', () => {
    const missing = validateSitemap(document([entry(1)]));
    expect(missing.diagnostics[0]?.code).toBe('missing-loc');
    for (const priority of ['0', '0.0', '0.123', '1', '1.000'])
      expect(
        validateSitemap(document([entry(1, 'https://example.com/', { priority })])).valid,
      ).toBe(true);
    for (const priority of ['.5', '-1', '1.1', '1e-1', 'NaN', ''])
      expect(
        validateSitemap(document([entry(1, 'https://example.com/', { priority })])).diagnostics[0]
          ?.code,
      ).toBe('invalid-priority');
    expect(
      validateSitemap(document([entry(1, 'https://example.com/', { changefreq: 'DAILY' })]))
        .diagnostics[0]?.code,
    ).toBe('invalid-changefreq');
    const index = validateSitemap(
      document([entry(1, 'https://example.com/a.xml', { priority: '0.5' }, 'sitemapindex')], {
        kind: 'sitemapindex',
      }),
    );
    expect(index.valid).toBe(false);
    expect(index.diagnostics[0]?.code).toBe('unsupported-index-field');
  });

  test('unsupported namespace/root and unaudited/unsafe XML policy cannot be complete', () => {
    const base = document([entry(1, 'https://example.com/')]);
    const cases = [
      { ...base, namespace: SITEMAP_NAMESPACE.replace('http:', 'https:') },
      { ...base, kind: 'html' } as unknown as SitemapDocument,
      { ...base, xmlPolicy: { ...base.xmlPolicy, wellFormed: false } },
      { ...base, xmlPolicy: { ...base.xmlPolicy, doctypeDetected: true } },
      { ...base, xmlPolicy: { ...base.xmlPolicy, entityDeclarationDetected: true } },
      { ...base, xmlPolicy: { ...base.xmlPolicy, structureChecked: false } },
    ];
    for (const value of cases) {
      const r = validateSitemap(value);
      expect(r.valid).toBe(false);
      expect(r.complete).toBe(false);
      expect(r.entries).toEqual([]);
    }
  });

  test('unknown tags, repeated fields and nested markup prevent full coverage', () => {
    const r = validateSitemap(
      document(
        [
          entry(1, 'https://example.com/', {
            unknownTagCount: 1,
            duplicateFieldCount: 1,
            nestedMarkup: true,
          }),
        ],
        { unknownTagCount: 2, structureIssueCount: 1 },
      ),
    );
    expect(r.valid).toBe(true);
    expect(r.complete).toBe(false);
    expect(r.diagnostics.map((d) => d.code)).toEqual(['unknown-structure', 'unknown-structure']);
  });

  test('original ordinal/pointer metadata must agree with untruncated source order', () => {
    const r = validateSitemap(document([entry(5, 'https://example.com/')]));
    expect(r.valid).toBe(false);
    expect(r.diagnostics[0]).toMatchObject({
      code: 'source-mismatch',
      ordinal: 1,
      pointer: '/urlset/url[1]',
    });
    expect(validateSitemap(document([])).diagnostics[0]?.code).toBe('empty-document');
  });

  test('protocol and local count/byte limits are distinct, no partial entries returned', () => {
    for (const count of [SITEMAP_LIMITS.localEntries + 1, SITEMAP_LIMITS.protocolEntries + 1]) {
      const r = validateSitemap(document(new Array<SitemapEntry>(count)));
      expect(r.entries).toEqual([]);
      expect(r.sourceEntryCount).toBe(count);
      expect(r.diagnostics.some((d) => d.code === 'local-count-limit')).toBe(true);
    }
    const big = validateSitemap(document([], { rawUtf8Bytes: SITEMAP_LIMITS.protocolBytes + 1 }));
    expect(big.diagnostics.map((d) => d.code)).toEqual(['protocol-size-limit', 'local-size-limit']);
    expect(
      validateSitemap(
        document([entry(1, 'https://example.com/')], { rawUtf8Bytes: SITEMAP_LIMITS.localBytes }),
      ).complete,
    ).toBe(true);
  });

  test('byte size is never invented from normalized text; malformed counters reject', () => {
    const input = document([entry(1, 'https://example.com/')]);
    delete input.rawUtf8Bytes;
    const r = validateSitemap(input);
    expect(r.rawUtf8Bytes).toBeNull();
    expect(r.valid).toBe(true);
    expect(r.complete).toBe(false);
    expect(r.diagnostics[0]?.code).toBe('size-unmeasured');
    expect(validateSitemap(document([], { rawUtf8Bytes: -1 })).valid).toBe(false);
    expect(
      validateSitemap(document([entry(1, 'https://example.com/', { unknownTagCount: -1 })])).valid,
    ).toBe(false);
  });

  test('normalized text bound is independent from declared raw byte count', () => {
    const loc = 'https://example.com/' + 'a'.repeat(2000);
    const r = validateSitemap(document(Array.from({ length: 1000 }, (_, i) => entry(i + 1, loc))));
    expect(r.entries).toEqual([]);
    expect(r.diagnostics[0]?.code).toBe('normalized-size-limit');
    expect(
      validateSitemap(
        document([
          entry(1, 'https://example.com/', {
            lastmod: 'x'.repeat(SITEMAP_LIMITS.fieldCodeUnits + 1),
          }),
        ]),
      ).valid,
    ).toBe(false);
  });

  test('long path segmentation never causes recursive tree growth and prototype-like text stays data', () => {
    const loc = 'https://example.com/' + 'x/'.repeat(900) + '__proto__?q=%3Cimg%3E';
    const input = document([entry(1, loc), entry(2, 'https://example.com/constructor')]);
    const r = validateSitemap(input);
    expect(r.valid).toBe(true);
    expect(r.pathGroups).toHaveLength(2);
    expect(r.entries[0]?.url?.pathname).toContain('__proto__');
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
    expect(validateSitemap(input)).toEqual(r);
  });
});
