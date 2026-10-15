/** PostgreSQL 12–18 common EXPLAIN FORMAT JSON fields; not server-version detection. */
export const EXPLAIN_LIMITS = {
  maxCodeUnits: 1_000_000,
  maxJsonDepth: 96,
  maxContainers: 10_000,
  maxNodes: 2_000,
  maxPlanDepth: 32,
} as const;
export const EXPLAIN_ESTIMATE_FACTOR = 10;
export const EXPLAIN_SUPPORT_RULES: readonly string[] = [
  'Accept exactly one statement in a PostgreSQL EXPLAIN FORMAT JSON array: [{"Plan": {...}}]. Common PostgreSQL 12–18 field subset; input does not establish the server version.',
  'Only Node Type, Relation Name, Schema, Alias, Parent Relationship, Plans, costs, rows, loops, node timing and listed buffer/I/O metrics are extracted. Other fields are counted and flagged, not copied or interpreted. Workers/JIT/triggers are not analyzed.',
  'Cost is a planner unit, never milliseconds. Actual Rows and Actual Startup/Total Time are per-loop averages; times are milliseconds. Rows × loops and time × loops are approximate derived node quantities, not wall-clock query duration.',
  'Before PostgreSQL 18, Actual Rows per-loop averages are rounded to whole numbers; PostgreSQL 18 can emit fractional rows. No server version is detected. Conditional on PostgreSQL <=17 whole-number rounding, rows × loops can differ from true rows by up to 0.5 × loops; displayed zero can hide a per-loop average below 0.5. Products are not exact true totals.',
  'Node times rounded to 3 decimal places introduce conditional time-product error up to 0.0005 × loops ms. For 100000 loops the conditional row/time rounding bounds are 50000 rows and 50 ms; neither is an execution-time or optimization guarantee.',
  'Node times and buffer counters include descendant work: never sum parent and child values or infer self time. Buffer block counters are reported counters, not per-loop averages; do not multiply them by loops. Parallel worker time may overlap.',
  'Missing metrics remain null/absent, never zero-filled. TIMING OFF can have rows/loops without node times. Actual loops = 0 means never executed; estimation comparison and multiplied actuals are unavailable.',
  'Estimate comparison uses Actual Rows per loop versus Plan Rows, not rows multiplied by loops. A factor of 10 or more is an observation warning, not proof of cause or measured optimization. Zero denominators have explicit states, never Infinity.',
  'Limits: 1000000 UTF-16 code units, 96 JSON container levels, 10000 containers, 2000 plan nodes, 32 plan levels. Structural limits are rejected before returning a partial tree.',
  'Text fields are untrusted data. No SQL execution, database connection, network, storage or optimization actions occur.',
];

export interface ExplainMetric {
  value: number;
  pointer: string;
}
export type ExplainDiagnosticCode =
  | 'input-limit'
  | 'json-depth-limit'
  | 'container-limit'
  | 'invalid-json'
  | 'invalid-shape'
  | 'node-limit'
  | 'plan-depth-limit'
  | 'invalid-field'
  | 'missing-metric'
  | 'omitted-fields'
  | 'inconsistent-metrics'
  | 'derived-overflow'
  | 'never-executed'
  | 'estimate-under'
  | 'estimate-over'
  | 'estimate-zero'
  | 'actual-zero';
export interface ExplainDiagnostic {
  code: ExplainDiagnosticCode;
  pointer: string;
  severity: 'error' | 'warning' | 'info';
}
export interface ExplainEstimate {
  state: 'unavailable' | 'never-executed' | 'comparable' | 'estimate-zero' | 'actual-zero';
  direction: 'underestimated' | 'overestimated' | 'equal' | null;
  factor: number | null;
}
export interface ExplainNode {
  id: string;
  pointer: string;
  nodeType: string;
  relation: string | null;
  schema: string | null;
  alias: string | null;
  parentRelationship: string | null;
  startupCost: ExplainMetric | null;
  totalCost: ExplainMetric | null;
  planRows: ExplainMetric | null;
  actualRows: ExplainMetric | null;
  actualLoops: ExplainMetric | null;
  actualStartupTime: ExplainMetric | null;
  actualTotalTime: ExplainMetric | null;
  buffers: Record<string, ExplainMetric>;
  execution: 'unknown' | 'never-executed' | 'executed';
  approximateRowsAcrossLoops: number | null;
  approximateInclusiveMsAcrossLoops: number | null;
  estimate: ExplainEstimate;
  omittedFieldCount: number;
  children: ExplainNode[];
}
export interface ExplainReport {
  valid: boolean;
  complete: boolean;
  mode: 'explain-only' | 'analyze' | 'partial-actuals' | 'unknown';
  root: ExplainNode | null;
  nodeCount: number;
  planningTime: ExplainMetric | null;
  executionTime: ExplainMetric | null;
  diagnostics: ExplainDiagnostic[];
  supportRules: string[];
  limits: typeof EXPLAIN_LIMITS;
}

const BUFFER_FIELDS = [
  'Shared Hit Blocks',
  'Shared Read Blocks',
  'Shared Dirtied Blocks',
  'Shared Written Blocks',
  'Local Hit Blocks',
  'Local Read Blocks',
  'Local Dirtied Blocks',
  'Local Written Blocks',
  'Temp Read Blocks',
  'Temp Written Blocks',
  'I/O Read Time',
  'I/O Write Time',
  'Shared I/O Read Time',
  'Shared I/O Write Time',
  'Local I/O Read Time',
  'Local I/O Write Time',
  'Temp I/O Read Time',
  'Temp I/O Write Time',
] as const;
const NODE_FIELDS = new Set<string>([
  'Node Type',
  'Relation Name',
  'Schema',
  'Alias',
  'Parent Relationship',
  'Plans',
  'Startup Cost',
  'Total Cost',
  'Plan Rows',
  'Actual Rows',
  'Actual Loops',
  'Actual Startup Time',
  'Actual Total Time',
  ...BUFFER_FIELDS,
]);
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value: Record<string, unknown>, key: string) => Object.hasOwn(value, key);
const pointerKey = (key: string) => key.replaceAll('~', '~0').replaceAll('/', '~1');

/** Returns sanitized supported fields, never the original arbitrary JSON object. */
export function parseExplain(text: string): ExplainReport {
  const report: ExplainReport = {
    valid: false,
    complete: false,
    mode: 'unknown',
    root: null,
    nodeCount: 0,
    planningTime: null,
    executionTime: null,
    diagnostics: [],
    supportRules: [...EXPLAIN_SUPPORT_RULES],
    limits: { ...EXPLAIN_LIMITS },
  };
  let partial = false;
  const diagnostic = (
    code: ExplainDiagnosticCode,
    pointer: string,
    severity: ExplainDiagnostic['severity'] = 'error',
  ) => {
    report.diagnostics.push({ code, pointer, severity });
  };
  if (text.length > EXPLAIN_LIMITS.maxCodeUnits) {
    diagnostic('input-limit', '');
    return report;
  }
  // Bound even omitted JSON before JSON.parse; braces inside strings are not containers.
  let depth = 0,
    containers = 0,
    inString = false,
    escaped = false;
  for (const char of text) {
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === '{' || char === '[') {
      depth++;
      containers++;
      if (depth > EXPLAIN_LIMITS.maxJsonDepth) {
        diagnostic('json-depth-limit', '');
        return report;
      }
      if (containers > EXPLAIN_LIMITS.maxContainers) {
        diagnostic('container-limit', '');
        return report;
      }
    } else if (char === '}' || char === ']') depth--;
  }
  let input: unknown;
  try {
    input = JSON.parse(text) as unknown;
  } catch {
    diagnostic('invalid-json', '');
    return report;
  }
  if (!Array.isArray(input) || input.length !== 1 || !object(input[0]) || !object(input[0].Plan)) {
    diagnostic('invalid-shape', '');
    return report;
  }
  const statement = input[0];
  // Iterative structural validation prevents a truncated tree masquerading as a complete plan.
  const queue: { value: Record<string, unknown>; pointer: string; depth: number }[] = [
    { value: statement.Plan as Record<string, unknown>, pointer: '/0/Plan', depth: 1 },
  ];
  let count = 0;
  while (queue.length) {
    const current = queue.pop()!;
    if (++count > EXPLAIN_LIMITS.maxNodes) {
      diagnostic('node-limit', current.pointer);
      return report;
    }
    if (current.depth > EXPLAIN_LIMITS.maxPlanDepth) {
      diagnostic('plan-depth-limit', current.pointer);
      return report;
    }
    if (
      typeof current.value['Node Type'] !== 'string' ||
      current.value['Node Type'].trim() === ''
    ) {
      diagnostic('invalid-shape', `${current.pointer}/Node Type`);
      return report;
    }
    if (own(current.value, 'Plans')) {
      const plans: unknown = current.value.Plans;
      if (!Array.isArray(plans)) {
        diagnostic('invalid-shape', `${current.pointer}/Plans`);
        return report;
      }
      for (let i = 0; i < plans.length; i++) {
        const child: unknown = plans[i];
        const pointer = `${current.pointer}/Plans/${i}`;
        if (!object(child)) {
          diagnostic('invalid-shape', pointer);
          return report;
        }
        queue.push({ value: child, pointer, depth: current.depth + 1 });
      }
    }
  }
  const metric = (
    source: Record<string, unknown>,
    key: string,
    base: string,
    integer = false,
  ): ExplainMetric | null => {
    if (!own(source, key)) return null;
    const value = source[key];
    const pointer = `${base}/${pointerKey(key)}`;
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < 0 ||
      (integer && !Number.isSafeInteger(value))
    ) {
      diagnostic('invalid-field', pointer);
      partial = true;
      return null;
    }
    return { value, pointer };
  };
  const string = (source: Record<string, unknown>, key: string, base: string): string | null => {
    if (!own(source, key)) return null;
    if (typeof source[key] !== 'string') {
      diagnostic('invalid-field', `${base}/${pointerKey(key)}`);
      return null;
    }
    return source[key];
  };
  const omitted = (source: Record<string, unknown>, supported: Set<string>, pointer: string) => {
    const omittedCount = Object.keys(source).filter((key) => !supported.has(key)).length;
    if (omittedCount) {
      diagnostic('omitted-fields', pointer, 'info');
      partial = true;
    }
    return omittedCount;
  };
  const multiply = (
    value: number | undefined,
    loops: number | undefined,
    pointer: string,
  ): number | null => {
    if (value === undefined || loops === undefined || loops === 0) return null;
    const product = value * loops;
    if (!Number.isFinite(product)) {
      diagnostic('derived-overflow', pointer, 'warning');
      partial = true;
      return null;
    }
    return product;
  };
  let actualEvidence = own(statement, 'Execution Time');
  let nodesWithActualPair = 0;
  const build = (source: Record<string, unknown>, pointer: string): ExplainNode => {
    const startupCost = metric(source, 'Startup Cost', pointer);
    const totalCost = metric(source, 'Total Cost', pointer);
    const planRows = metric(source, 'Plan Rows', pointer);
    const actualRows = metric(source, 'Actual Rows', pointer);
    const actualLoops = metric(source, 'Actual Loops', pointer, true);
    const actualStartupTime = metric(source, 'Actual Startup Time', pointer);
    const actualTotalTime = metric(source, 'Actual Total Time', pointer);
    if (
      ['Actual Rows', 'Actual Loops', 'Actual Startup Time', 'Actual Total Time'].some((key) =>
        own(source, key),
      )
    )
      actualEvidence = true;
    if (actualRows && actualLoops) nodesWithActualPair++;
    for (const [key, value] of [
      ['Startup Cost', startupCost],
      ['Total Cost', totalCost],
      ['Plan Rows', planRows],
    ] as const) {
      if (value === null && !own(source, key)) {
        diagnostic('missing-metric', `${pointer}/${key}`, 'warning');
        partial = true;
      }
    }
    if (
      (startupCost && totalCost && startupCost.value > totalCost.value) ||
      (actualStartupTime && actualTotalTime && actualStartupTime.value > actualTotalTime.value)
    ) {
      diagnostic('inconsistent-metrics', pointer);
      partial = true;
    }
    const execution =
      actualLoops === null ? 'unknown' : actualLoops.value === 0 ? 'never-executed' : 'executed';
    const estimate: ExplainEstimate = {
      state: execution === 'never-executed' ? 'never-executed' : 'unavailable',
      direction: null,
      factor: null,
    };
    if (execution === 'never-executed') diagnostic('never-executed', pointer, 'info');
    else if (execution === 'executed' && actualRows && planRows) {
      const a = actualRows.value,
        p = planRows.value;
      if (p === 0 && a > 0) {
        Object.assign(estimate, { state: 'estimate-zero', direction: 'underestimated' });
        diagnostic('estimate-zero', pointer, 'warning');
      } else if (a === 0 && p > 0) {
        Object.assign(estimate, { state: 'actual-zero', direction: 'overestimated' });
        diagnostic('actual-zero', pointer, 'warning');
      } else {
        const factor = a === p ? 1 : Math.max(a, p) / Math.min(a, p);
        estimate.state = 'comparable';
        estimate.direction = a === p ? 'equal' : a > p ? 'underestimated' : 'overestimated';
        if (Number.isFinite(factor)) estimate.factor = factor;
        else {
          diagnostic('derived-overflow', pointer, 'warning');
          partial = true;
        }
        if (factor >= EXPLAIN_ESTIMATE_FACTOR)
          diagnostic(a > p ? 'estimate-under' : 'estimate-over', pointer, 'warning');
      }
    }
    const buffers: Record<string, ExplainMetric> = {};
    for (const key of BUFFER_FIELDS) {
      const value = metric(source, key, pointer, key.endsWith('Blocks'));
      if (value) buffers[key] = value;
    }
    const plans = source.Plans as Record<string, unknown>[] | undefined;
    return {
      id: pointer,
      pointer,
      nodeType: source['Node Type'] as string,
      relation: string(source, 'Relation Name', pointer),
      schema: string(source, 'Schema', pointer),
      alias: string(source, 'Alias', pointer),
      parentRelationship: string(source, 'Parent Relationship', pointer),
      startupCost,
      totalCost,
      planRows,
      actualRows,
      actualLoops,
      actualStartupTime,
      actualTotalTime,
      buffers,
      execution,
      approximateRowsAcrossLoops: multiply(actualRows?.value, actualLoops?.value, pointer),
      approximateInclusiveMsAcrossLoops: multiply(
        actualTotalTime?.value,
        actualLoops?.value,
        pointer,
      ),
      estimate,
      omittedFieldCount: omitted(source, NODE_FIELDS, pointer),
      children: plans?.map((child, i) => build(child, `${pointer}/Plans/${i}`)) ?? [],
    };
  };
  report.root = build(statement.Plan as Record<string, unknown>, '/0/Plan');
  report.nodeCount = count;
  report.planningTime = metric(statement, 'Planning Time', '/0');
  report.executionTime = metric(statement, 'Execution Time', '/0');
  omitted(statement, new Set(['Plan', 'Planning Time', 'Execution Time']), '/0');
  report.mode = actualEvidence
    ? nodesWithActualPair === count
      ? 'analyze'
      : 'partial-actuals'
    : 'explain-only';
  if (report.mode === 'partial-actuals') {
    diagnostic('missing-metric', '/0/Plan', 'warning');
    partial = true;
  }
  report.valid = !report.diagnostics.some((d) => d.severity === 'error');
  report.complete = report.valid && !partial;
  return report;
}

/** Authored examples, not database measurements or real benchmark evidence. */
export const EXPLAIN_EXAMPLES: readonly {
  id: string;
  label: string;
  provenance: 'synthetic';
  text: string;
}[] = [
  {
    id: 'estimate-only',
    label: 'Synthetic EXPLAIN-only scan',
    provenance: 'synthetic',
    text: JSON.stringify(
      [
        {
          Plan: {
            'Node Type': 'Seq Scan',
            'Relation Name': 'example_items',
            'Startup Cost': 0,
            'Total Cost': 25,
            'Plan Rows': 10,
          },
        },
      ],
      null,
      2,
    ),
  },
  {
    id: 'analyze-loops',
    label: 'Synthetic ANALYZE per-loop estimate gap',
    provenance: 'synthetic',
    text: JSON.stringify(
      [
        {
          Plan: {
            'Node Type': 'Nested Loop',
            'Startup Cost': 0,
            'Total Cost': 100,
            'Plan Rows': 10,
            'Actual Rows': 100,
            'Actual Loops': 1,
            'Actual Startup Time': 1,
            'Actual Total Time': 8,
            'Shared Hit Blocks': 12,
            Plans: [
              {
                'Node Type': 'Index Scan',
                'Relation Name': 'example_items',
                'Startup Cost': 0,
                'Total Cost': 2,
                'Plan Rows': 1,
                'Actual Rows': 10,
                'Actual Loops': 10,
                'Actual Startup Time': 0.1,
                'Actual Total Time': 0.5,
                'Shared Hit Blocks': 10,
              },
            ],
          },
          'Execution Time': 9,
        },
      ],
      null,
      2,
    ),
  },
];
