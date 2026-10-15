import { expect, test } from 'vite-plus/test';
import { locateExplainSources } from '../apps/web/src/pages/explain-source.js';

test('escaped duplicate keys keep the exact final value and escaped JSON Pointer', () => {
  const text = String.raw`[{"Plan":{"Plan Rows":1,"Plan\u0020Rows":27,"I/O~":{"value":2},"I\u002fO~":{"value":8}}}]`;
  const rows = '/0/Plan/Plan Rows',
    io = '/0/Plan/I~1O~0/value';
  const ranges = locateExplainSources(text, new Set([rows, io]));
  for (const [pointer, value] of [
    [rows, '27'],
    [io, '8'],
  ]) {
    const range = ranges.get(pointer!);
    expect(range).toBeDefined();
    expect(text.slice(range!.start, range!.end)).toBe(value);
  }
});

test('duplicate ancestors prune absent fields and retain nearest-parent fallback ranges', () => {
  const text = String.raw`[{"Plan":{"Plan Rows":1,"Plans":[{"Actual Rows":2,"Plan Rows":3}]},"Pl\u0061n":{"Plans":[{"Plan Rows":4}],"Plans":[{"Actual Rows":5}]}}]`;
  const wanted = new Set([
    '',
    '/0',
    '/0/Plan',
    '/0/Plan/Plan Rows',
    '/0/Plan/Plans',
    '/0/Plan/Plans/0',
    '/0/Plan/Plans/0/Actual Rows',
    '/0/Plan/Plans/0/Plan Rows',
  ]);
  const ranges = locateExplainSources(text, wanted);
  expect(ranges.has('/0/Plan/Plan Rows')).toBe(false);
  expect(ranges.has('/0/Plan/Plans/0/Plan Rows')).toBe(false);
  expect(ranges.size).toBe(6);
  const child = ranges.get('/0/Plan/Plans/0')!;
  expect(text.slice(child.start, child.end)).toBe('{"Actual Rows":5}');
  const metric = ranges.get('/0/Plan/Plans/0/Actual Rows')!;
  expect(text.slice(metric.start, metric.end)).toBe('5');
  const plan = ranges.get('/0/Plan')!;
  expect(JSON.parse(text.slice(plan.start, plan.end))).toEqual(JSON.parse(text)[0].Plan);
});

test.each(['null', '[]', '{}', '"replaced"', '7'])(
  'parent replaced by %s invalidates earlier descendants even if parent is not wanted',
  (replacement) => {
    const text = `{"Plan":{"Plans":[{"Plan Rows":1}]},"Plan":${replacement}}`;
    const ranges = locateExplainSources(text, new Set(['/Plan/Plans/0/Plan Rows', '']));
    expect([...ranges.keys()]).toEqual(['']);
    expect(ranges.get('')).toEqual({ start: 0, end: text.length });
  },
);

test('near-million-character duplicate workload is bounded independently of all accumulated ranges', () => {
  const metrics = [
    'Startup Cost',
    'Total Cost',
    'Plan Rows',
    'Actual Rows',
    'Actual Loops',
    'Actual Startup Time',
    'Actual Total Time',
    'Shared Hit Blocks',
    'Shared Read Blocks',
    'Shared Dirtied Blocks',
    'Shared Written Blocks',
    'Local Hit Blocks',
    'Local Read Blocks',
    'Temp Read Blocks',
    'Temp Written Blocks',
  ];
  const fields = metrics.map((name) => `${JSON.stringify(name)}:1`).join(',');
  const node = `{"Node Type":"Seq Scan",${fields}}`;
  const prefix = `[{"Plan":{"Node Type":"Append",${fields},"Plans":[${Array.from({ length: 1000 }, () => node).join(',')},{"Node Type":"Seq Scan",${fields},`;
  const suffix = '"Plan Rows":73}]}}]';
  const duplicate = '"Plan Rows":1,';
  const repeats = Math.floor((999_000 - prefix.length - suffix.length) / duplicate.length);
  const text = prefix + duplicate.repeat(repeats) + suffix;
  expect(text.length).toBeLessThanOrEqual(1_000_000);
  expect(text.length).toBeGreaterThan(998_000);
  expect(repeats).toBeGreaterThan(40_000);
  expect(JSON.parse(text)[0].Plan.Plans[1000]['Plan Rows']).toBe(73);
  const wanted = new Set(['', '/0', '/0/Plan', '/0/Plan/Plans']);
  for (const base of ['/0/Plan', ...Array.from({ length: 1001 }, (_, i) => `/0/Plan/Plans/${i}`)]) {
    wanted.add(base);
    for (const metric of metrics) wanted.add(`${base}/${metric}`);
  }
  const start = performance.now();
  const ranges = locateExplainSources(text, wanted);
  const elapsed = performance.now() - start;
  expect(ranges.size).toBe(wanted.size);
  const range = ranges.get('/0/Plan/Plans/1000/Plan Rows')!;
  expect(text.slice(range.start, range.end)).toBe('73');
  expect(range.start).toBe(text.lastIndexOf('73'));
  // Generous main-thread budget: catches the reviewed ~34s regression, not tiny timing variation.
  expect(elapsed).toBeLessThan(5_000);
  console.info(
    `EXPLAIN locator regression: ${text.length} chars, ${repeats} duplicates, ${ranges.size} ranges, ${elapsed.toFixed(1)}ms`,
  );
}, 60_000);
