import { describe, expect, test } from 'vite-plus/test';
import { readFileSync } from 'node:fs';
import { compareLighthouse } from './lighthouse.js';
import { compareJson, serializeJson } from './json-diff.js';
import { previewCron } from './cron.js';
const report = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    lighthouseVersion: '12.6.1',
    finalUrl: 'https://example.com/',
    configSettings: {
      formFactor: 'mobile',
      throttlingMethod: 'simulate',
      throttling: { cpuSlowdownMultiplier: 4 },
      screenEmulation: { mobile: true },
    },
    categories: { performance: { score: 0.5 } },
    audits: {
      lcp: {
        numericValue: 100,
        numericUnit: 'millisecond',
        score: null,
        scoreDisplayMode: 'numeric',
      },
    },
    ...overrides,
  });
describe('Lighthouse evidence', () => {
  test('real consecutive runs retain source values and configuration mismatches are warned', () => {
    const load = (file: string) =>
      readFileSync(
        new URL(
          `../../../research/competitor-validation-2026-10-14/samples/lighthouse/${file}`,
          import.meta.url,
        ),
        'utf8',
      );
    const a = load('live-chrome-docs-mobile-a.json'),
      b = load('live-chrome-docs-mobile-b.json');
    const result = compareLighthouse(a, b);
    expect(result.categories.find((r) => r.id === 'performance')).toMatchObject({
      before: 69,
      after: 67,
      delta: -2,
    });
    expect(result.warnings).toHaveLength(1);
    const desktop = compareLighthouse(a, load('live-chrome-docs-desktop.json'));
    expect(desktop.warnings.join(' ')).toContain('formFactor 不同');
    expect(desktop.warnings.join(' ')).toContain('throttling 不同');
    expect(
      result.metrics.find((r) => r.id === 'largest-contentful-paint')?.before.numericValue,
    ).toBeGreaterThan(0);
  });
  test('null and missing scores stay unavailable; units cannot be silently mixed', () => {
    const result = compareLighthouse(
      report(),
      report({
        categories: { performance: { score: null } },
        audits: {
          lcp: { numericValue: 2, numericUnit: 'second', score: null, scoreDisplayMode: 'error' },
        },
      }),
    );
    expect(result.categories[0]).toMatchObject({ before: 50, after: null, delta: null });
    expect(result.audits[0]?.delta).toBeNull();
    expect(compareLighthouse(report(), report({ audits: {} })).audits[0]?.after.mode).toBe(
      'unavailable',
    );
  });
  test('version and URL changes warn; unsupported and failed reports reject', () => {
    expect(
      compareLighthouse(
        report(),
        report({ lighthouseVersion: '13.0.0', finalUrl: 'https://other.example/' }),
      ).warnings.join(' '),
    ).toMatch(/主版本不同/);
    expect(() => compareLighthouse(report(), report({ lighthouseVersion: '10.0.0' }))).toThrow(
      '11–13',
    );
    expect(() =>
      compareLighthouse(report(), report({ runtimeError: { message: 'navigation failed' } })),
    ).toThrow('navigation failed');
  });
});
describe('lossless JSON diff', () => {
  test('prototype-like and escaped property names are real JSON data', () => {
    const result = compareJson(
      '{"__proto__":{"n":9007199254740993},"$x":1}',
      '{"__proto__":{"n":9007199254740994},"$x":1}',
    );
    expect(result.changes[0]?.path).toBe('/__proto__/n');
    expect(serializeJson(result)).toContain('9007199254740994');
    expect(compareJson('{"\\u005f_proto__":1}', '{}').changes).toHaveLength(1);
  });

  test('all change classes and object order', () => {
    expect(compareJson('{"a":1,"b":2}', '{"b":2,"a":1}').changes).toEqual([]);
    const result = compareJson('{"a":1,"b":true,"c":0}', '{"a":2,"b":"true","d":null}');
    expect(result.changes.map((c) => c.type)).toEqual(['value', 'type', 'removed', 'added']);
  });
  test('adjacent unsafe integers stay distinct and raw exports retain exact numbers', () => {
    const result = compareJson('{"id":9007199254740992}', '{"id":9007199254740993}');
    expect(result.changes).toHaveLength(1);
    expect(serializeJson(result)).toContain('"after": 9007199254740993');
    expect(compareJson('1.0', '1e0').changes).toEqual([]);
    expect(compareJson('1e999', '2e999').changes).toHaveLength(1);
  });
  test('ignores enumerate matches, escaped paths and wildcard array IDs work', () => {
    const result = compareJson(
      '{"items":[{"id":1,"t":1}]}',
      '{"items":[{"id":1,"t":2}]}',
      '/items/*/t',
      'id',
    );
    expect(result.changes).toEqual([]);
    expect(result.ignoredPaths).toHaveLength(1);
    expect(result.summary).toContain('不代表完整');
    expect(compareJson('{"a/b":1}', '{"a/b":2}', '/a~1b').ignoredPaths).toEqual(['/a~1b']);
  });
  test('reordered IDs pair without noise; missing or duplicate IDs remain explicit conflicts', () => {
    expect(compareJson('[{"id":1},{"id":2}]', '[{"id":2},{"id":1}]', '', 'id').changes).toEqual([]);
    expect(compareJson('[{"id":1},{"id":1}]', '[{"id":1}]', '', 'id').conflicts[0]).toContain(
      '重複',
    );
    expect(compareJson('[{"id":1},{}]', '[{"id":1}]', '', 'id').summary).toContain('不完整');
    expect(
      compareJson(
        '[{"id":9007199254740992},{"id":9007199254740993}]',
        '[{"id":9007199254740993},{"id":9007199254740992}]',
        '',
        'id',
      ).changes,
    ).toEqual([]);
  });
  test('invalid input, duplicate object keys, invalid paths and deep inputs fail with useful errors', () => {
    expect(() => compareJson('{\n "a": }', '{}')).toThrow(/第 2 行/);
    expect(() => compareJson('{"a":1,"a":2}', '{}')).toThrow('Duplicate key');
    expect(() => compareJson('{}', '{}', 'bad')).toThrow('每行以 /');
    expect(() => compareJson('['.repeat(101) + ']'.repeat(101), '{}')).toThrow('100 層');
  });
});
describe('Unix cron and timezones', () => {
  test('next ten instants map correctly into two timezones', () => {
    const result = previewCron(
      '0 9 * * 1-5',
      'Asia/Taipei',
      'America/New_York',
      '2026-01-02T01:00:00Z',
    );
    expect(result.times).toHaveLength(10);
    expect(result.times[0]?.utc).toBe('2026-01-05T01:00:00.000Z');
    expect(result.times[0]?.schedule).toContain('09:00:00');
    expect(result.times[0]?.local).toContain('2026-01-04 20:00:00');
  });
  test('DST gap delays a fixed 02:30 clock to 03:30 and returns to 02:30 next day', () => {
    const result = previewCron('30 2 * * *', 'America/New_York', 'UTC', '2026-03-08T00:00:00Z');
    expect(result.times.slice(0, 2).map((t) => t.utc)).toEqual([
      '2026-03-08T07:30:00.000Z',
      '2026-03-09T06:30:00.000Z',
    ]);
    expect(result.times[0]?.schedule).toContain('03:30:00');
  });
  test('DST fold fixed 01:30 executes once, with the next occurrence on the next date', () => {
    const result = previewCron('30 1 * * *', 'America/New_York', 'UTC', '2026-11-01T00:00:00Z');
    expect(result.times.slice(0, 2).map((t) => t.utc)).toEqual([
      '2026-11-01T05:30:00.000Z',
      '2026-11-02T06:30:00.000Z',
    ]);
  });
  test('month-end skips missing dates, leap years remain real, DOM/DOW uses OR', () => {
    expect(previewCron('0 0 31 * *', 'UTC', 'UTC', '2026-04-01T00:00:00Z').times[0]?.utc).toBe(
      '2026-05-31T00:00:00.000Z',
    );
    expect(previewCron('0 0 29 2 *', 'UTC', 'UTC', '2026-01-01T00:00:00Z').times[0]?.utc).toBe(
      '2028-02-29T00:00:00.000Z',
    );
    expect(
      previewCron('0 0 13 * 1', 'UTC', 'UTC', '2026-01-01T00:00:00Z')
        .times.slice(0, 3)
        .map((t) => t.utc),
    ).toEqual(['2026-01-05T00:00:00.000Z', '2026-01-12T00:00:00.000Z', '2026-01-13T00:00:00.000Z']);
  });
  test('invalid fields, dialects, zones and impossible dates reject', () => {
    for (const exp of [
      '0 0 0 * * *',
      'cron(0 9 * * ? *)',
      '0 9 ? * 1',
      '0 9 * * MON',
      '60 * * * *',
      '*/0 * * * *',
    ])
      expect(() => previewCron(exp, 'UTC', 'UTC', '2026-01-01T00:00:00Z')).toThrow(/.+/);
    expect(() => previewCron('* * * * *', 'Mars/Olympus', 'UTC', '2026-01-01T00:00:00Z')).toThrow(
      'IANA',
    );
    expect(() => previewCron('* * * * *', 'UTC', 'UTC', '2026-02-30T00:00:00Z')).toThrow('不存在');
  });
});
