import { describe, expect, test } from 'vite-plus/test';
import { EXPLAIN_EXAMPLES, EXPLAIN_LIMITS, parseExplain } from './explain.js';

const plan = (overrides: Record<string, unknown> = {}) => ({
  'Node Type': 'Seq Scan',
  'Relation Name': 'items',
  'Startup Cost': 0,
  'Total Cost': 25,
  'Plan Rows': 10,
  ...overrides,
});
const analyzed = (overrides: Record<string, unknown> = {}) =>
  plan({
    'Actual Rows': 100,
    'Actual Loops': 2,
    'Actual Startup Time': 0.2,
    'Actual Total Time': 3,
    ...overrides,
  });
const encode = (node: Record<string, unknown>, statement: Record<string, unknown> = {}) =>
  JSON.stringify([{ Plan: node, ...statement }]);

describe('PostgreSQL-shaped EXPLAIN JSON subset (synthetic fixtures)', () => {
  test('EXPLAIN-only retains cost/rows/pointers without invented actual metrics', () => {
    const r = parseExplain(encode(plan()));
    expect(r).toMatchObject({
      valid: true,
      complete: true,
      mode: 'explain-only',
      nodeCount: 1,
      planningTime: null,
      executionTime: null,
    });
    expect(r.root).toMatchObject({
      id: '/0/Plan',
      pointer: '/0/Plan',
      nodeType: 'Seq Scan',
      relation: 'items',
      totalCost: { value: 25, pointer: '/0/Plan/Total Cost' },
      actualRows: null,
      actualLoops: null,
      actualTotalTime: null,
      execution: 'unknown',
      approximateRowsAcrossLoops: null,
      approximateInclusiveMsAcrossLoops: null,
      estimate: { state: 'unavailable', direction: null, factor: null },
    });
    expect(r.root?.buffers).toEqual({});
    expect(r.diagnostics).toEqual([]);
  });

  test('nested source navigation and per-loop comparison never sum inclusive times/buffers', () => {
    const r = parseExplain(EXPLAIN_EXAMPLES[1]!.text);
    expect(r).toMatchObject({
      mode: 'analyze',
      valid: true,
      complete: true,
      nodeCount: 2,
      executionTime: { value: 9, pointer: '/0/Execution Time' },
    });
    expect(r.root?.approximateInclusiveMsAcrossLoops).toBe(8);
    const child = r.root?.children[0];
    expect(child).toMatchObject({
      pointer: '/0/Plan/Plans/0',
      approximateInclusiveMsAcrossLoops: 5,
      approximateRowsAcrossLoops: 100,
      actualRows: { value: 10 },
      actualLoops: { value: 10 },
      estimate: { state: 'comparable', direction: 'underestimated', factor: 10 },
    });
    expect(child?.buffers['Shared Hit Blocks']).toEqual({
      value: 10,
      pointer: '/0/Plan/Plans/0/Shared Hit Blocks',
    });
    expect(r.root?.buffers['Shared Hit Blocks']?.value).toBe(12);
    expect(Object.keys(r)).not.toContain('summedNodeTime');
    expect(Object.keys(r.root ?? {})).not.toContain('selfTime');
    expect(r.diagnostics.filter((d) => d.code === 'estimate-under').map((d) => d.pointer)).toEqual([
      '/0/Plan',
      '/0/Plan/Plans/0',
    ]);
  });

  test('fractional Actual Rows are per-loop averages, not integer counters', () => {
    const r = parseExplain(
      encode(analyzed({ 'Plan Rows': 0.25, 'Actual Rows': 2.5, 'Actual Loops': 4 })),
    );
    expect(r.root?.approximateRowsAcrossLoops).toBe(10);
    expect(r.root?.estimate.factor).toBe(10);
    expect(r.root?.approximateInclusiveMsAcrossLoops).toBe(12);
    expect(r.valid).toBe(true);
  });

  test('TIMING OFF rows/loops retain null times without synthesizing zeros', () => {
    const r = parseExplain(encode(plan({ 'Actual Rows': 2, 'Actual Loops': 3 })));
    expect(r.mode).toBe('analyze');
    expect(r.root?.actualTotalTime).toBeNull();
    expect(r.root?.approximateInclusiveMsAcrossLoops).toBeNull();
    expect(r.root?.approximateRowsAcrossLoops).toBe(6);
    expect(r.complete).toBe(true);
  });

  test('loops zero means never executed, not a zero-rows estimation failure', () => {
    const r = parseExplain(
      encode(
        analyzed({
          'Actual Rows': 0,
          'Actual Loops': 0,
          'Actual Startup Time': 0,
          'Actual Total Time': 0,
        }),
      ),
    );
    expect(r.root).toMatchObject({
      execution: 'never-executed',
      approximateRowsAcrossLoops: null,
      approximateInclusiveMsAcrossLoops: null,
      estimate: { state: 'never-executed', direction: null, factor: null },
    });
    expect(r.diagnostics.map((d) => d.code)).toEqual(['never-executed']);
    expect(r.complete).toBe(true);
  });

  test.each([
    [0, 3, 'estimate-zero', 'underestimated', null],
    [3, 0, 'actual-zero', 'overestimated', null],
    [0, 0, 'comparable', 'equal', 1],
    [100, 1, 'comparable', 'overestimated', 100],
    [10, 11, 'comparable', 'underestimated', 1.1],
  ])(
    'estimate %s versus actual %s has safe zero/factor semantics',
    (estimated, actual, state, direction, factor) => {
      const r = parseExplain(encode(analyzed({ 'Plan Rows': estimated, 'Actual Rows': actual })));
      expect(r.root?.estimate).toEqual({ state, direction, factor });
      expect(JSON.parse(JSON.stringify(r))).toEqual(r);
    },
  );

  test('small estimate deviations do not cross the factor-10 warning threshold', () => {
    const r = parseExplain(encode(analyzed({ 'Actual Rows': 99 })));
    expect(r.root?.estimate.factor).toBe(9.9);
    expect(r.diagnostics).toEqual([]);
  });

  test('missing plan/actual fields remain null and coverage is explicit', () => {
    const r = parseExplain(encode({ 'Node Type': 'Result', 'Actual Total Time': 1 }));
    expect(r.valid).toBe(true);
    expect(r.complete).toBe(false);
    expect(r.mode).toBe('partial-actuals');
    expect(r.root).toMatchObject({
      planRows: null,
      startupCost: null,
      totalCost: null,
      actualRows: null,
      actualLoops: null,
      execution: 'unknown',
    });
    expect(r.root?.estimate.state).toBe('unavailable');
    expect(r.diagnostics.some((d) => d.code === 'missing-metric')).toBe(true);
  });

  test('mixed actual coverage and execution-time-only input do not impersonate full ANALYZE', () => {
    expect(parseExplain(encode(analyzed({ Plans: [plan()] }))).mode).toBe('partial-actuals');
    const r = parseExplain(encode(plan(), { 'Execution Time': 3 }));
    expect(r.mode).toBe('partial-actuals');
    expect(r.root?.actualTotalTime).toBeNull();
    expect(r.executionTime?.value).toBe(3);
  });

  test('unknown fields are counted, not passed through, including worker details', () => {
    const node = JSON.parse(
      '{"Node Type":"Seq Scan","Startup Cost":0,"Total Cost":1,"Plan Rows":1,"__proto__":{"secret":"private"},"Workers":[{"Actual Rows":200}],"Plan Width":8}',
    ) as Record<string, unknown>;
    const r = parseExplain(encode(node, { 'Query Text': 'secret query', Triggers: [] }));
    expect(r.valid).toBe(true);
    expect(r.complete).toBe(false);
    expect(r.root?.omittedFieldCount).toBe(3);
    expect(JSON.stringify(r)).not.toContain('private');
    expect(JSON.stringify(r)).not.toContain('secret query');
    expect(r.nodeCount).toBe(1);
    expect(r.mode).toBe('explain-only');
  });

  test.each([
    null,
    {},
    [],
    [{ Plan: [] }],
    [{ Plan: {} }],
    [{ Plan: { 'Node Type': 7 } }],
    [{ Plan: plan() }, { Plan: plan() }],
    [{ Plan: plan({ Plans: {} }) }],
    [{ Plan: plan({ Plans: [null] }) }],
  ])('rejects invalid statement/tree shapes without partial trees: %j', (value) => {
    const r = parseExplain(JSON.stringify(value));
    expect(r.valid).toBe(false);
    expect(r.root).toBeNull();
    expect(r.nodeCount).toBe(0);
    expect(r.diagnostics[0]?.code).toBe('invalid-shape');
  });

  test.each(['{bad', '[NaN]', '[Infinity]', ''])(
    'invalid JSON emits static error, not parser snippets: %s',
    (text) => {
      expect(parseExplain(text).diagnostics).toEqual([
        { code: 'invalid-json', pointer: '', severity: 'error' },
      ]);
    },
  );

  test.each([-1, '2', null, true])(
    'negative/non-numeric metric %j is invalid, not zero-filled',
    (value) => {
      const r = parseExplain(encode(analyzed({ 'Actual Rows': value })));
      expect(r.valid).toBe(false);
      expect(r.root?.actualRows).toBeNull();
      expect(r.diagnostics).toContainEqual({
        code: 'invalid-field',
        pointer: '/0/Plan/Actual Rows',
        severity: 'error',
      });
    },
  );

  test('JSON exponent overflow is rejected; derived overflow is JSON safe', () => {
    const nonfinite = encode(plan()).replace('"Plan Rows":10', '"Plan Rows":1e309');
    expect(parseExplain(nonfinite).valid).toBe(false);
    const r = parseExplain(
      encode(
        analyzed({
          'Plan Rows': 1e-300,
          'Actual Rows': 1e300,
          'Actual Loops': 1_000_000,
          'Actual Total Time': 1e308,
        }),
      ),
    );
    expect(r.valid).toBe(true);
    expect(r.complete).toBe(false);
    expect(r.root?.estimate.factor).toBeNull();
    expect(r.root?.approximateRowsAcrossLoops).toBe(1e306);
    expect(r.root?.approximateInclusiveMsAcrossLoops).toBeNull();
    expect(JSON.parse(JSON.stringify(r))).toEqual(r);
  });

  test('loops and block counters require safe integer counts, rows may be fractional', () => {
    for (const value of [0.5, Number.MAX_SAFE_INTEGER + 1]) {
      expect(parseExplain(encode(analyzed({ 'Actual Loops': value }))).valid).toBe(false);
      expect(parseExplain(encode(analyzed({ 'Shared Hit Blocks': value }))).valid).toBe(false);
    }
  });

  test('invalid text/timing and reversed startup/total metrics are explicit errors', () => {
    const r = parseExplain(
      encode(
        analyzed({
          'Relation Name': 7,
          'Startup Cost': 50,
          'Total Cost': 2,
          'Actual Startup Time': 5,
          'Actual Total Time': 1,
        }),
      ),
    );
    expect(r.valid).toBe(false);
    expect(r.root?.relation).toBeNull();
    expect(r.diagnostics.some((d) => d.code === 'inconsistent-metrics')).toBe(true);
  });

  test('available I/O times and statement timings retain source values without aggregation', () => {
    const r = parseExplain(
      encode(analyzed({ 'I/O Read Time': 2.5, 'Temp Written Blocks': 4 }), {
        'Planning Time': 0.3,
        'Execution Time': 7,
      }),
    );
    expect(r.root?.buffers['I/O Read Time']?.value).toBe(2.5);
    expect(r.root?.buffers['Temp Written Blocks']?.value).toBe(4);
    expect(r.planningTime).toEqual({ value: 0.3, pointer: '/0/Planning Time' });
    expect(r.executionTime?.value).toBe(7);
  });

  test('untrusted text stays data and JSON scanner ignores brackets/escapes within strings', () => {
    const text = '<img src=x onerror=alert(1)> " \\ ' + '['.repeat(200);
    const r = parseExplain(encode(plan({ 'Relation Name': text })));
    expect(r.valid).toBe(true);
    expect(r.root?.relation).toBe(text);
    expect(r.root?.pointer).toBe('/0/Plan');
  });

  test('size/depth/container bounds reject before returning arbitrary JSON', () => {
    expect(parseExplain(' '.repeat(EXPLAIN_LIMITS.maxCodeUnits + 1)).diagnostics[0]?.code).toBe(
      'input-limit',
    );
    expect(
      parseExplain(
        '['.repeat(EXPLAIN_LIMITS.maxJsonDepth + 1) +
          '0' +
          ']'.repeat(EXPLAIN_LIMITS.maxJsonDepth + 1),
      ).diagnostics[0]?.code,
    ).toBe('json-depth-limit');
    expect(
      parseExplain(JSON.stringify(Array.from({ length: EXPLAIN_LIMITS.maxContainers }, () => ({}))))
        .diagnostics[0]?.code,
    ).toBe('container-limit');
  });

  test('plan depth and node bounds reject entire trees and accept exact boundaries', () => {
    const chain = (levels: number) => {
      let node: Record<string, unknown> = plan();
      for (let i = 1; i < levels; i++) node = plan({ Plans: [node] });
      return node;
    };
    expect(parseExplain(encode(chain(EXPLAIN_LIMITS.maxPlanDepth))).nodeCount).toBe(
      EXPLAIN_LIMITS.maxPlanDepth,
    );
    const deep = parseExplain(encode(chain(EXPLAIN_LIMITS.maxPlanDepth + 1)));
    expect(deep.root).toBeNull();
    expect(deep.diagnostics[0]?.code).toBe('plan-depth-limit');
    expect(
      parseExplain(
        encode(plan({ Plans: Array.from({ length: EXPLAIN_LIMITS.maxNodes - 1 }, () => plan()) })),
      ).nodeCount,
    ).toBe(EXPLAIN_LIMITS.maxNodes);
    const many = parseExplain(
      encode(plan({ Plans: Array.from({ length: EXPLAIN_LIMITS.maxNodes }, () => plan()) })),
    );
    expect(many.root).toBeNull();
    expect(many.diagnostics[0]?.code).toBe('node-limit');
  });

  test('fixed example provenance is explicit and parse results deterministic', () => {
    expect(
      EXPLAIN_EXAMPLES.every((e) => e.provenance === 'synthetic' && e.label.includes('Synthetic')),
    ).toBe(true);
    for (const example of EXPLAIN_EXAMPLES)
      expect(parseExplain(example.text)).toEqual(parseExplain(example.text));
  });
});
