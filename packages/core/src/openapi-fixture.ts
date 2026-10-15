import {
  parseOpenApiSource,
  OAS_PARSE_LIMITS,
  type OasNode,
  type OasLocation,
} from './openapi-parser.js';
import {
  FIXTURE_LIMITS,
  FixtureFailure,
  fail,
  issueFrom,
  member,
  text,
  order,
  pointerToken,
  resolver,
  sourceValue,
  fixtureJson,
  normalizeFixtureSchema,
  validateFixtureInstance,
  type FixtureValue,
  type FixtureSchema,
  type FixtureIssue,
  type FixtureStatus,
} from './fixture-schema.js';
export type { FixtureIssue, FixtureStatus } from './fixture-schema.js';
export type { OasLocation as FixtureLocation } from './openapi-parser.js';
export const OPENAPI_FIXTURE_LIMITS = { ...OAS_PARSE_LIMITS, ...FIXTURE_LIMITS } as const;
export const OPENAPI_FIXTURE_SCOPE = [
  'Local static OpenAPI3.0.x response JSON fixture subset, not full OAS validation, a mock server, anonymization or proof of real API behavior. Source confirmation is a user assertion of test data, never automatic synthetic-data verification.',
  'Explicit operation/path/status/media selection; no wildcard/status/default inference. JSON media: application/json or a non-wildcard subtype ending +json, type/subtype case-insensitive; parameters retained, selection identity exact.',
  'Policy, not OAS normative priority: media.example or selected named examples.value (default name sorted first), then root resolved schema.example, then seeded generation. Invalid candidate diagnostics retained before fallback. externalValue is unsupported, never fetched. Media example/examples are mutually exclusive. default is ignored with notice, not an observed response.',
  'Explicit type required. Object/array/string/integer/number/boolean, nullable, enum, required, response readOnly included/writeOnly omitted, boolean additionalProperties defaulttrue; basic numeric exclusive bounds, Unicode codepoint string lengths, array lengths and uniqueItems. Every optional/writeOnly schema preflighted; unsupported semantics never bypassed with examples.',
  'Unsupported format/pattern/composition/schema-valued additionalProperties/unknown keywords/extensions/recursive or missing/external refs refuse fixture. Local refs strict percent/JSONPointer decode, bounded depth/hops/work. Ref siblings ignored per OAS3.0 with notice.',
  'Finite numeric source roundtrip identity, safe integers and magnitude <=1e12 only; conservative unsupported for unsafe precision. Resource/attempt exhaustion is not proof no schema instance exists. Requested size above hard limits refuses, never allocates unbounded output.',
  'Sorted map keys/enum choices, explicit seed only. No time/random/network/storage/execution. Source examples/enums are copied, potentially sensitive and identified in provenance. Seed/names/pointers may be sensitive. Summary excludes literals; fixture download is deliberate and only after independent validator passes. Use a dedicated terminable app worker.',
] as const;
export interface OpenApiFixtureOptions {
  method: string;
  path: string;
  status: string;
  mediaType: string;
  exampleName?: string;
  seed: string | number;
  sourceConfirmedSynthetic: boolean;
  arrayLength?: number;
}
export interface FixtureSelection {
  id: string;
  method: string;
  path: string;
  status: string;
  mediaType: string;
  location: OasLocation;
  responseUse: OasLocation;
  responseDefinition: OasLocation;
  examples: { name: string; location: OasLocation }[];
}
export interface FixtureInspection {
  status: 'ready' | 'invalid' | 'unsupported' | 'limit';
  selections: FixtureSelection[];
  issues: FixtureIssue[];
  supportedScope: string[];
  limits: typeof OPENAPI_FIXTURE_LIMITS;
}
export interface FixtureProvenance {
  kind: 'media-example' | 'named-example' | 'schema-example' | 'generated' | 'enum';
  outcome: 'used' | 'rejected' | 'attempted';
  instancePointer: string;
  use: OasLocation | null;
  definition: OasLocation | null;
}
export interface OpenApiFixtureReport {
  status: FixtureStatus;
  fixtureJson: string | null;
  validation: { status: 'passed' | 'failed' | 'not-run'; issues: FixtureIssue[] };
  selection: FixtureSelection | null;
  options: OpenApiFixtureOptions | null;
  issues: FixtureIssue[];
  provenance: FixtureProvenance[];
  supportedScope: string[];
  limits: typeof OPENAPI_FIXTURE_LIMITS;
}
const methods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
interface Context {
  inspection: FixtureInspection;
  root: OasNode | null;
  media: Map<string, OasNode>;
}
function context(source: string): Context {
  const inspection: FixtureInspection = {
    status: 'ready',
    selections: [],
    issues: [],
    supportedScope: [...OPENAPI_FIXTURE_SCOPE],
    limits: { ...OPENAPI_FIXTURE_LIMITS },
  };
  const parsed = parseOpenApiSource(source),
    media = new Map<string, OasNode>();
  if (parsed.status !== 'valid') {
    inspection.status = parsed.status;
    inspection.issues = parsed.issues.map((issue) => ({
      code: issue.code,
      severity: 'error',
      location: issue.location,
      instancePointer: null,
    }));
    return { inspection, root: null, media };
  }
  const root = parsed.root!;
  try {
    if (root.kind !== 'map') fail('invalid', 'root-map-required', root);
    const version = member(root, 'openapi');
    if (!version && member(root, 'swagger'))
      fail('unsupported', 'openapi-version-unsupported', member(root, 'swagger'));
    if (text(version) === undefined)
      fail('invalid', 'openapi-version-string-required', version ?? root);
    if (!/^3\.0\.\d+$/.test(version!.text))
      fail('unsupported', 'openapi-version-unsupported', version);
    const info = member(root, 'info');
    if (
      info?.kind !== 'map' ||
      text(member(info, 'title')) === undefined ||
      text(member(info, 'version')) === undefined
    )
      fail('invalid', 'info-title-version-strings-required', info ?? root);
    const paths = member(root, 'paths');
    const components = member(root, 'components');
    if (components && components.kind !== 'map')
      fail('invalid', 'components-map-required', components);
    if (paths?.kind !== 'map') fail('invalid', 'paths-map-required', paths ?? root);
    const resolve = resolver(root, inspection.issues);
    for (const path of [...paths.map.keys()].sort(order)) {
      const item = paths.map.get(path)!;
      if (path.startsWith('x-')) continue; // Non-selection metadata, never asserted schema semantics.
      if (!path.startsWith('/') || item.kind !== 'map') fail('invalid', 'path-item-invalid', item);
      if (member(item, '$ref')) fail('unsupported', 'path-item-ref-unsupported', item);
      for (const method of [...item.map.keys()].sort(order)) {
        if (!methods.has(method)) continue;
        const operation = item.map.get(method)!;
        if (operation.kind !== 'map') fail('invalid', 'operation-map-required', operation);
        const responses = member(operation, 'responses');
        if (responses?.kind !== 'map' || !responses.map.size)
          fail('invalid', 'responses-map-required', responses ?? operation);
        for (const status of [...responses.map.keys()].sort(order)) {
          const use = responses.map.get(status)!;
          if (status.startsWith('x-')) continue;
          if (!/^(?:[1-5](?:\d\d|XX)|default)$/.test(status))
            fail('invalid', 'response-status-invalid', use);
          const response = resolve(use);
          if (response.kind !== 'map' || text(member(response, 'description')) === undefined)
            fail('invalid', 'response-description-required', response);
          const content = member(response, 'content');
          if (!content) continue;
          if (content.kind !== 'map') fail('invalid', 'content-map-required', content);
          for (const name of [...content.map.keys()].sort(order)) {
            const type = name.split(';')[0]!.trim().toLowerCase();
            if (type !== 'application/json' && !/^[^\s/*]+\/[^\s/*]+\+json$/.test(type)) continue;
            const value = content.map.get(name)!;
            if (value.kind !== 'map') fail('invalid', 'media-map-required', value);
            if (member(value, 'example') && member(value, 'examples'))
              fail('invalid', 'media-example-mutual-exclusion', value);
            const examples = member(value, 'examples');
            if (examples && examples.kind !== 'map')
              fail('invalid', 'examples-map-required', examples);
            const selection: FixtureSelection = {
              id: JSON.stringify([method.toUpperCase(), path, status, name]),
              method: method.toUpperCase(),
              path,
              status,
              mediaType: name,
              location: value.location,
              responseUse: use.location,
              responseDefinition: response.location,
              examples: examples
                ? [...examples.map.keys()]
                    .sort(order)
                    .map((key) => ({ name: key, location: examples.map.get(key)!.location }))
                : [],
            };
            if (inspection.selections.length >= FIXTURE_LIMITS.selections)
              fail('limit', 'selection-budget', value);
            inspection.selections.push(selection);
            media.set(selection.id, value);
          }
        }
      }
    }
  } catch (error) {
    inspection.status =
      error instanceof FixtureFailure && error.status === 'limit'
        ? 'limit'
        : error instanceof FixtureFailure && error.status === 'invalid'
          ? 'invalid'
          : 'unsupported';
    inspection.selections = [];
    inspection.issues.push(issueFrom(error));
    media.clear();
  }
  return { inspection, root, media };
}
export function inspectOpenApiFixtures(source: string): FixtureInspection {
  return context(source).inspection;
}

function optionsCopy(options: OpenApiFixtureOptions): OpenApiFixtureOptions {
  if (
    !options ||
    typeof options.method !== 'string' ||
    typeof options.path !== 'string' ||
    typeof options.status !== 'string' ||
    typeof options.mediaType !== 'string' ||
    (options.exampleName !== undefined && typeof options.exampleName !== 'string')
  )
    throw new FixtureFailure('invalid', 'selection-options-required');
  if (
    typeof options.seed !== 'string' &&
    (typeof options.seed !== 'number' || !Number.isSafeInteger(options.seed))
  )
    throw new FixtureFailure('invalid', 'seed-string-or-safe-integer');
  if (
    String(options.seed).length > FIXTURE_LIMITS.seedUnits ||
    [
      options.method,
      options.path,
      options.status,
      options.mediaType,
      options.exampleName ?? '',
    ].some((value) => value.length > 2048)
  )
    throw new FixtureFailure('limit', 'option-size-budget');
  if (
    options.arrayLength !== undefined &&
    (!Number.isInteger(options.arrayLength) || options.arrayLength < 0)
  )
    throw new FixtureFailure('invalid', 'array-length-invalid');
  if (options.arrayLength !== undefined && options.arrayLength > FIXTURE_LIMITS.arrayItems)
    throw new FixtureFailure('limit', 'array-budget');
  return {
    method: options.method.toUpperCase(),
    path: options.path,
    status: options.status,
    mediaType: options.mediaType,
    ...(options.exampleName !== undefined ? { exampleName: options.exampleName } : {}),
    seed: options.seed,
    sourceConfirmedSynthetic: options.sourceConfirmedSynthetic === true,
    ...(options.arrayLength !== undefined ? { arrayLength: options.arrayLength } : {}),
  };
}
function prepare(source: string, options: OpenApiFixtureOptions) {
  const report: OpenApiFixtureReport = {
    status: 'invalid',
    fixtureJson: null,
    validation: { status: 'not-run', issues: [] },
    selection: null,
    options: null,
    issues: [],
    provenance: [],
    supportedScope: [...OPENAPI_FIXTURE_SCOPE],
    limits: { ...OPENAPI_FIXTURE_LIMITS },
  };
  let root: OasNode | null = null,
    media: OasNode | null = null,
    schema: FixtureSchema | null = null;
  try {
    report.options = optionsCopy(options);
    const ctx = context(source);
    root = ctx.root;
    report.issues.push(...ctx.inspection.issues);
    if (ctx.inspection.status !== 'ready') {
      report.status = ctx.inspection.status;
      report.issues = ctx.inspection.issues;
      return { report, root, media, schema };
    }
    const id = JSON.stringify([
      report.options.method,
      report.options.path,
      report.options.status,
      report.options.mediaType,
    ]);
    report.selection = ctx.inspection.selections.find((selection) => selection.id === id) ?? null;
    if (!report.selection) throw new FixtureFailure('invalid', 'selection-not-found');
    media = ctx.media.get(id)!;
    if (!report.options.sourceConfirmedSynthetic) {
      report.status = 'confirmation-required';
      return { report, root, media, schema };
    }
    const use = member(media, 'schema');
    if (!use) fail('unsupported', 'response-schema-required', media);
    schema = normalizeFixtureSchema(root!, use, report.issues);
    report.status = 'ready';
  } catch (error) {
    report.status = error instanceof FixtureFailure ? error.status : 'unsupported';
    report.issues.push(issueFrom(error));
  }
  return { report, root, media, schema };
}

function randomFor(seed: string | number) {
  let state = 2166136261;
  for (const char of `${typeof seed}:${seed}`)
    state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  if (!state) state = 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
}
function generate(
  schema: FixtureSchema,
  options: OpenApiFixtureOptions,
  provenance: FixtureProvenance[],
): FixtureValue {
  const random = randomFor(options.seed);
  let nodes = 0,
    attempts = 0,
    units = 0;
  function make(s: FixtureSchema, pointer: string, depth: number): FixtureValue {
    if (++nodes > FIXTURE_LIMITS.instanceNodes || depth > FIXTURE_LIMITS.schemaDepth)
      throw new FixtureFailure('limit', 'generation-budget', s.use);
    const choice = random();
    if (s.enumeration) {
      const eligible = s.enumeration.filter((value) => {
        if (++attempts > FIXTURE_LIMITS.attempts)
          throw new FixtureFailure('limit', 'generation-attempt-budget', s.definition);
        return validateFixtureInstance(s, value).length === 0;
      });
      if (!eligible.length)
        throw new FixtureFailure('no-valid-fixture', 'enum-no-valid-candidate', s.enumLocation);
      const selected = eligible[choice % eligible.length]!;
      units += fixtureJson(selected).length;
      if (units > FIXTURE_LIMITS.outputUnits)
        throw new FixtureFailure('limit', 'output-budget', s.use);
      provenance.push({
        kind: 'enum',
        outcome: 'used',
        instancePointer: pointer,
        use: s.use,
        definition: s.enumLocation,
      });
      return selected;
    }
    if (s.nullable && choice % 5 === 0) return null;
    if (s.type === 'boolean') return choice % 2 === 0;
    if (s.type === 'string') {
      const length =
        s.minLength +
        (choice % (Math.min(s.maxLength, Math.max(s.minLength, 16)) - s.minLength + 1));
      units += length * 6 + 2;
      if (units > FIXTURE_LIMITS.outputUnits)
        throw new FixtureFailure('limit', 'output-budget', s.use);
      let result = '';
      const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
      for (let i = 0; i < length; i++) result += alphabet[random() % alphabet.length];
      return result;
    }
    if (s.type === 'number' || s.type === 'integer') {
      const min = s.minimum ?? Math.max(-1e12, Math.min(-100, (s.maximum ?? 100) - 100)),
        max = s.maximum ?? Math.min(1e12, Math.max(100, min + 100));
      const low = Math.ceil(min) + (s.exclusiveMinimum && min === Math.ceil(min) ? 1 : 0);
      const high = Math.floor(max) - (s.exclusiveMaximum && max === Math.floor(max) ? 1 : 0);
      const candidates = low <= high ? [low + (choice % Math.min(high - low + 1, 1000))] : [];
      if (s.type === 'number') candidates.push((min + max) / 2, min, max);
      for (const value of candidates)
        if (Math.abs(value) <= 1e12 && validateFixtureInstance(s, value).length === 0) return value;
      throw new FixtureFailure('no-valid-fixture', 'numeric-no-valid-candidate', s.definition);
    }
    if (s.type === 'object') {
      const result: Record<string, FixtureValue> = Object.create(null) as Record<
        string,
        FixtureValue
      >;
      for (const [key, property] of s.properties)
        if (!property.writeOnly) {
          units += key.length * 6 + 4;
          if (units > FIXTURE_LIMITS.outputUnits)
            throw new FixtureFailure('limit', 'output-budget', s.use);
          result[key] = make(property, `${pointer}/${pointerToken(key)}`, depth + 1);
        }
      for (const key of s.required)
        if (!s.properties.has(key)) {
          if (!s.additional)
            throw new FixtureFailure(
              'no-valid-fixture',
              'required-property-disallowed',
              s.definition,
            );
          units += key.length * 6 + 8;
          if (units > FIXTURE_LIMITS.outputUnits)
            throw new FixtureFailure('limit', 'output-budget', s.use);
          result[key] = null;
        }
      return result;
    }
    const length =
      options.arrayLength ??
      s.minItems + (choice % (Math.min(s.maxItems, Math.max(4, s.minItems)) - s.minItems + 1));
    if (length < s.minItems || length > s.maxItems)
      throw new FixtureFailure('no-valid-fixture', 'requested-array-length-conflict', s.definition);
    const result: FixtureValue[] = [],
      identities = new Set<string>();
    for (let i = 0; i < length; i++) {
      let found = false;
      for (let attempt = 0; attempt < (s.unique ? FIXTURE_LIMITS.attempts : 1); attempt++) {
        if (++attempts > FIXTURE_LIMITS.attempts)
          throw new FixtureFailure('limit', 'generation-attempt-budget', s.definition);
        const value = make(s.items!, `${pointer}/${i}`, depth + 1),
          identity = fixtureJson(value);
        if (!s.unique || !identities.has(identity)) {
          result.push(value);
          identities.add(identity);
          found = true;
          break;
        }
      }
      if (!found)
        throw new FixtureFailure('no-valid-fixture', 'unique-no-valid-candidate', s.definition);
    }
    return result;
  }
  return make(schema, '', 0);
}

export function generateOpenApiFixture(
  source: string,
  options: OpenApiFixtureOptions,
): OpenApiFixtureReport {
  const { report, root, media, schema } = prepare(source, options);
  if (report.status !== 'ready' || !schema || !media || !root) return report;
  try {
    const candidates: { kind: FixtureProvenance['kind']; value: OasNode; use: OasNode }[] = [];
    if (member(media, 'example')) {
      if (report.options!.exampleName !== undefined)
        fail('invalid', 'named-example-not-found', media);
      candidates.push({
        kind: 'media-example',
        value: member(media, 'example')!,
        use: member(media, 'example')!,
      });
    } else if (member(media, 'examples')) {
      const examples = member(media, 'examples')!;
      const name = report.options!.exampleName ?? [...examples.map.keys()].sort(order)[0];
      const use = name !== undefined ? examples.map.get(name) : undefined;
      if (!use && report.options!.exampleName !== undefined)
        fail('invalid', 'named-example-not-found', examples);
      if (use) {
        const attempted: FixtureProvenance = {
          kind: 'named-example',
          outcome: 'attempted',
          instancePointer: '',
          use: use.location,
          definition: null,
        };
        report.provenance.push(attempted);
        const example = resolver(root, report.issues)(use);
        attempted.definition = example.location;
        if (example.kind !== 'map') fail('invalid', 'example-object-required', example);
        if (member(example, 'value') && member(example, 'externalValue'))
          fail('invalid', 'example-value-mutual-exclusion', example);
        if (member(example, 'externalValue'))
          fail('unsupported', 'external-example-unsupported', example);
        if (!member(example, 'value')) fail('invalid', 'inline-example-value-required', example);
        candidates.push({ kind: 'named-example', value: member(example, 'value')!, use });
      }
    } else if (report.options!.exampleName !== undefined)
      fail('invalid', 'named-example-not-found', media);
    if (schema.example)
      candidates.push({
        kind: 'schema-example',
        value: schema.example,
        use: member(media, 'schema')!,
      });
    let selected: FixtureValue | undefined;
    for (const candidate of candidates) {
      const provenance: FixtureProvenance = {
        kind: candidate.kind,
        outcome: 'attempted',
        instancePointer: '',
        use: candidate.use.location,
        definition: candidate.value.location,
      };
      if (candidate.kind === 'named-example') report.provenance.pop();
      report.provenance.push(provenance);
      try {
        const value = sourceValue(candidate.value),
          issues = validateFixtureInstance(schema, value);
        if (!issues.length) {
          selected = value;
          provenance.outcome = 'used';
          break;
        }
        provenance.outcome = 'rejected';
        report.issues.push({
          code: 'example-invalid-fallback',
          severity: 'warning',
          location: candidate.value.location,
          instancePointer: null,
        });
        for (const issue of issues) report.issues.push({ ...issue, severity: 'warning' });
      } catch (error) {
        if (error instanceof FixtureFailure && error.status === 'limit') throw error;
        provenance.outcome = 'rejected';
        report.issues.push({ ...issueFrom(error), severity: 'warning' });
      }
    }
    if (selected === undefined) {
      report.provenance.push({
        kind: 'generated',
        outcome: 'attempted',
        instancePointer: '',
        use: schema.use,
        definition: schema.definition,
      });
      selected = generate(schema, report.options!, report.provenance);
      report.provenance.find((entry) => entry.kind === 'generated')!.outcome = 'used';
    }
    const issues = validateFixtureInstance(schema, selected);
    report.validation = { status: issues.length ? 'failed' : 'passed', issues };
    if (issues.length) report.status = 'no-valid-fixture';
    else report.fixtureJson = fixtureJson(selected);
  } catch (error) {
    report.status = error instanceof FixtureFailure ? error.status : 'unsupported';
    report.fixtureJson = null;
    report.issues.push(issueFrom(error));
  }
  return report;
}

/** Re-parse and independently validate caller-edited JSON; no generator result or flags trusted. */
export function validateOpenApiFixture(
  source: string,
  options: OpenApiFixtureOptions,
  instanceJson: string,
): OpenApiFixtureReport {
  const { report, schema } = prepare(source, options);
  if (report.status !== 'ready' || !schema) return report;
  try {
    if (instanceJson.length > FIXTURE_LIMITS.outputUnits)
      throw new FixtureFailure('limit', 'output-budget');
    // JSON.parse only after iterative YAML token preflight bounds nesting/size. Projection is used
    // for precision/type safety; JSON.parse enforces strict JSON grammar, never serializes raw AST.
    const parsed = parseOpenApiSource(instanceJson);
    if (parsed.status !== 'valid')
      throw new FixtureFailure(
        parsed.status === 'limit' ? 'limit' : 'invalid',
        'instance-json-invalid',
      );
    const value = sourceValue(parsed.root!);
    try {
      JSON.parse(instanceJson);
    } catch {
      throw new FixtureFailure('invalid', 'instance-json-invalid');
    }
    const issues = validateFixtureInstance(schema, value);
    report.validation = { status: issues.length ? 'failed' : 'passed', issues };
    if (issues.length) report.status = 'no-valid-fixture';
    else report.fixtureJson = fixtureJson(value);
  } catch (error) {
    report.status = error instanceof FixtureFailure ? error.status : 'unsupported';
    report.issues.push(issueFrom(error));
  }
  return report;
}

export function exportOpenApiFixture(report: OpenApiFixtureReport): string | null {
  return report.status === 'ready' &&
    report.options?.sourceConfirmedSynthetic === true &&
    report.validation.status === 'passed'
    ? report.fixtureJson
    : null;
}
export function exportOpenApiFixtureSummary(report: OpenApiFixtureReport): string {
  const loc = (value: OasLocation | null) =>
    value
      ? {
          pointer: value.pointer,
          start: value.start,
          end: value.end,
          line: value.line,
          column: value.column,
        }
      : null;
  const issue = (value: FixtureIssue) => ({
    code: value.code,
    severity: value.severity,
    location: loc(value.location),
    instancePointer: value.instancePointer,
  });
  const selection = report.selection;
  return JSON.stringify(
    {
      format: 'sid-tools/openapi-fixture/v1',
      status: report.status,
      validation: { status: report.validation.status, issues: report.validation.issues.map(issue) },
      options: report.options
        ? {
            method: report.options.method,
            path: report.options.path,
            status: report.options.status,
            mediaType: report.options.mediaType,
            seed: report.options.seed,
            sourceConfirmedSynthetic: report.options.sourceConfirmedSynthetic,
            ...(report.options.exampleName !== undefined
              ? { exampleName: report.options.exampleName }
              : {}),
            ...(report.options.arrayLength !== undefined
              ? { arrayLength: report.options.arrayLength }
              : {}),
          }
        : null,
      selection: selection
        ? {
            id: selection.id,
            method: selection.method,
            path: selection.path,
            status: selection.status,
            mediaType: selection.mediaType,
            location: loc(selection.location),
            responseUse: loc(selection.responseUse),
            responseDefinition: loc(selection.responseDefinition),
            examples: selection.examples.map((entry) => ({
              name: entry.name,
              location: loc(entry.location),
            })),
          }
        : null,
      issues: report.issues.map(issue),
      provenance: report.provenance.map((entry) => ({
        kind: entry.kind,
        outcome: entry.outcome,
        instancePointer: entry.instancePointer,
        use: loc(entry.use),
        definition: loc(entry.definition),
      })),
      limits: { ...OPENAPI_FIXTURE_LIMITS },
      supportedScope: [...OPENAPI_FIXTURE_SCOPE],
    },
    null,
    2,
  );
}
