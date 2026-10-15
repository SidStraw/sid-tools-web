import { type OasNode, type OasLocation } from './openapi-parser.js';

export const FIXTURE_LIMITS = {
  schemaDepth: 24,
  schemaNodes: 2000,
  refHops: 16,
  resolutions: 10_000,
  outputUnits: 100_000,
  instanceNodes: 10_000,
  arrayItems: 100,
  stringLength: 2048,
  enumValues: 128,
  enumUnits: 32_768,
  attempts: 256,
  selections: 2000,
  seedUnits: 128,
  validationWork: 50_000,
} as const;
export type FixtureStatus =
  | 'ready'
  | 'confirmation-required'
  | 'invalid'
  | 'unsupported'
  | 'limit'
  | 'no-valid-fixture';
export interface FixtureIssue {
  code: string;
  severity: 'error' | 'warning';
  location: OasLocation | null;
  instancePointer: string | null;
}
export type FixtureValue =
  | null
  | boolean
  | number
  | string
  | FixtureValue[]
  | { [key: string]: FixtureValue };
export interface FixtureSchema {
  type: 'object' | 'array' | 'string' | 'integer' | 'number' | 'boolean';
  nullable: boolean;
  readOnly: boolean;
  writeOnly: boolean;
  required: Set<string>;
  properties: Map<string, FixtureSchema>;
  items: FixtureSchema | null;
  additional: boolean;
  enumeration: FixtureValue[] | null;
  enumLocation: OasLocation | null;
  minimum: number | null;
  maximum: number | null;
  exclusiveMinimum: boolean;
  exclusiveMaximum: boolean;
  minLength: number;
  maxLength: number;
  minItems: number;
  maxItems: number;
  unique: boolean;
  use: OasLocation;
  definition: OasLocation;
  example: OasNode | null;
}
export const member = (node: OasNode | null | undefined, key: string) =>
  node?.kind === 'map' ? node.map.get(key) : undefined;
export const text = (node: OasNode | null | undefined) =>
  node?.kind === 'string' ? node.text : undefined;
export const pointerToken = (key: string) => key.replaceAll('~', '~0').replaceAll('/', '~1');
export const order = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const codepoints = (value: string) => {
  let length = 0;
  for (const _char of value) length++;
  return length;
};
export class FixtureFailure extends Error {
  constructor(
    readonly status: FixtureStatus,
    readonly code: string,
    readonly location: OasLocation | null = null,
  ) {
    super(code);
  }
}
export function fail(status: FixtureStatus, code: string, node?: OasNode): never {
  throw new FixtureFailure(status, code, node?.location ?? null);
}
export function issueFrom(error: unknown): FixtureIssue {
  return {
    code: error instanceof FixtureFailure ? error.code : 'fixture-unsupported',
    severity: 'error',
    location: error instanceof FixtureFailure ? error.location : null,
    instancePointer: null,
  };
}

function decimal(value: string): string {
  const parts = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(value)!;
  let digits = (parts[2]! + (parts[3] ?? '')).replace(/^0+/, '');
  if (!digits) return '0e0';
  let exponent = Number(parts[4] ?? 0) - (parts[3]?.length ?? 0);
  const trimmed = digits.replace(/0+$/, '');
  exponent += digits.length - trimmed.length;
  digits = trimmed;
  return `${parts[1]}${digits}e${exponent}`;
}
/** Limited finite numeric subset: decimal round-trip identity, safe integers, magnitude <=1e12. */
export function exactNumber(node: OasNode): number {
  if (node.kind !== 'number') fail('unsupported', 'finite-number-required', node);
  const value = Number(node.text);
  if (
    !Number.isFinite(value) ||
    Math.abs(value) > 1e12 ||
    (Number.isInteger(value) && !Number.isSafeInteger(value)) ||
    decimal(String(value)) !== node.text
  )
    fail('unsupported', 'numeric-precision-unsupported', node);
  return value;
}

/** Bounded source-value projection; no YAML toJS, raw JSON serialization, or prototype assignment. */
export function sourceValue(root: OasNode): FixtureValue {
  let nodes = 0,
    units = 0;
  function convert(node: OasNode, depth: number): FixtureValue {
    if (++nodes > FIXTURE_LIMITS.instanceNodes || depth > FIXTURE_LIMITS.schemaDepth)
      fail('limit', 'instance-budget', node);
    units += node.text.length + 8;
    if (units > FIXTURE_LIMITS.outputUnits) fail('limit', 'output-budget', node);
    if (node.kind === 'null') return null;
    if (node.kind === 'boolean') return node.text === 'true';
    if (node.kind === 'number') return exactNumber(node);
    if (node.kind === 'string') {
      if (codepoints(node.text) > FIXTURE_LIMITS.stringLength) fail('limit', 'string-budget', node);
      return node.text;
    }
    if (node.kind === 'seq') {
      if (node.items.length > FIXTURE_LIMITS.arrayItems) fail('limit', 'array-budget', node);
      return node.items.map((child) => convert(child, depth + 1));
    }
    if (node.kind === 'map') {
      const value: Record<string, FixtureValue> = Object.create(null) as Record<
        string,
        FixtureValue
      >;
      for (const key of [...node.map.keys()].sort(order)) {
        units += key.length * 6 + 4;
        if (units > FIXTURE_LIMITS.outputUnits) fail('limit', 'output-budget', node);
        value[key] = convert(node.map.get(key)!, depth + 1);
      }
      return value;
    }
    return fail('unsupported', 'nonfinite-value', node);
  }
  return convert(root, 0);
}

/** Checks depth/size/types before serialization, canonicalizes maps without __proto__ setters. */
export function fixtureJson(value: FixtureValue): string {
  let nodes = 0,
    units = 0;
  const active = new Set<object>();
  function encode(input: FixtureValue, depth: number): string {
    if (++nodes > FIXTURE_LIMITS.instanceNodes || depth > FIXTURE_LIMITS.schemaDepth)
      throw new FixtureFailure('limit', 'instance-budget');
    if (input === null || typeof input === 'boolean') {
      units += 5;
      return String(input);
    }
    if (typeof input === 'number') {
      if (
        !Number.isFinite(input) ||
        Math.abs(input) > 1e12 ||
        (Number.isInteger(input) && !Number.isSafeInteger(input))
      )
        throw new FixtureFailure('unsupported', 'numeric-precision-unsupported');
      const number = String(input);
      units += number.length;
      return number;
    }
    if (typeof input === 'string') {
      if (input.length > FIXTURE_LIMITS.stringLength * 2)
        throw new FixtureFailure('limit', 'string-budget');
      if (codepoints(input) > FIXTURE_LIMITS.stringLength)
        throw new FixtureFailure('limit', 'string-budget');
      units += input.length * 6 + 2;
      if (units > FIXTURE_LIMITS.outputUnits) throw new FixtureFailure('limit', 'output-budget');
      return JSON.stringify(input);
    }
    if (!input || typeof input !== 'object' || active.has(input))
      throw new FixtureFailure('invalid', 'instance-not-json');
    active.add(input);
    let result: string;
    if (Array.isArray(input)) {
      if (input.length > FIXTURE_LIMITS.arrayItems)
        throw new FixtureFailure('limit', 'array-budget');
      result = '[' + input.map((child) => encode(child, depth + 1)).join(',') + ']';
    } else {
      const keys = Object.keys(input).sort(order);
      if (keys.length > FIXTURE_LIMITS.instanceNodes)
        throw new FixtureFailure('limit', 'instance-budget');
      result =
        '{' +
        keys
          .map((key) => {
            units += key.length * 6 + 4;
            if (units > FIXTURE_LIMITS.outputUnits)
              throw new FixtureFailure('limit', 'output-budget');
            return JSON.stringify(key) + ':' + encode(input[key]!, depth + 1);
          })
          .join(',') +
        '}';
    }
    active.delete(input);
    units += 2;
    if (units > FIXTURE_LIMITS.outputUnits || result.length > FIXTURE_LIMITS.outputUnits)
      throw new FixtureFailure('limit', 'output-budget');
    return result;
  }
  return encode(value, 0);
}

export function resolver(root: OasNode, issues?: FixtureIssue[]) {
  let resolutions = 0;
  return (use: OasNode): OasNode => {
    let node = use;
    const seen = new Set<OasNode>();
    for (let hop = 0; member(node, '$ref'); hop++) {
      if (
        node.map.size > 1 &&
        issues &&
        !issues.some(
          (issue) =>
            issue.code === 'ref-siblings-ignored' &&
            issue.location?.pointer === node.location.pointer,
        )
      )
        issues.push({
          code: 'ref-siblings-ignored',
          severity: 'warning',
          location: node.location,
          instancePointer: null,
        });
      if (++resolutions > FIXTURE_LIMITS.resolutions) fail('limit', 'ref-work-budget', use);
      if (hop >= FIXTURE_LIMITS.refHops) fail('limit', 'ref-hop-budget', use);
      if (seen.has(node)) fail('unsupported', 'ref-cycle', use);
      seen.add(node);
      const ref = member(node, '$ref')!;
      if (ref.kind !== 'string') fail('invalid', 'ref-string-required', ref);
      if (!ref.text.startsWith('#')) fail('unsupported', 'external-ref', ref);
      let fragment: string;
      try {
        fragment = decodeURIComponent(ref.text.slice(1));
      } catch {
        return fail('invalid', 'ref-fragment-invalid', ref);
      }
      if (fragment && !fragment.startsWith('/')) fail('invalid', 'ref-pointer-invalid', ref);
      let target: OasNode | undefined = root;
      for (const part of fragment ? fragment.slice(1).split('/') : []) {
        if (/~(?![01])/.test(part)) fail('invalid', 'ref-pointer-invalid', ref);
        const key = part.replaceAll('~1', '/').replaceAll('~0', '~');
        target =
          target?.kind === 'map'
            ? target.map.get(key)
            : target?.kind === 'seq' && /^(0|[1-9]\d*)$/.test(key)
              ? target.items[Number(key)]
              : undefined;
      }
      if (!target) fail('unsupported', 'missing-ref', ref);
      node = target;
    }
    return node;
  };
}

const accepted = new Set([
  'type',
  'nullable',
  'enum',
  'required',
  'properties',
  'items',
  'additionalProperties',
  'readOnly',
  'writeOnly',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
  'uniqueItems',
  'example',
  'default',
  'title',
  'description',
  'deprecated',
  'externalDocs',
  'xml',
]);
export function normalizeFixtureSchema(
  root: OasNode,
  use: OasNode,
  issues: FixtureIssue[],
): FixtureSchema {
  const resolve = resolver(root, issues),
    active = new Set<OasNode>();
  let count = 0,
    enumUnits = 0;
  function compile(source: OasNode, depth: number): FixtureSchema {
    if (++count > FIXTURE_LIMITS.schemaNodes || depth > FIXTURE_LIMITS.schemaDepth)
      fail('limit', 'schema-budget', source);
    const node = resolve(source);
    if (active.has(node)) fail('unsupported', 'recursive-schema', source);
    if (node.kind !== 'map') fail('invalid', 'schema-map-required', node);
    active.add(node);
    for (const [key, child] of node.map)
      if (!accepted.has(key)) fail('unsupported', 'schema-keyword-unsupported', child);
    const additional = member(node, 'additionalProperties');
    if (additional && additional.kind !== 'boolean')
      fail('unsupported', 'schema-additional-properties-unsupported', additional);
    const type = text(member(node, 'type'));
    if (!['object', 'array', 'string', 'integer', 'number', 'boolean'].includes(type ?? ''))
      fail('unsupported', 'explicit-supported-type-required', member(node, 'type') ?? node);
    const bool = (name: string, fallback = false) => {
      const value = member(node, name);
      if (!value) return fallback;
      if (value.kind !== 'boolean') fail('invalid', 'schema-boolean-required', value);
      return value.text === 'true';
    };
    const bound = (name: string): number | null => {
      const value = member(node, name);
      return value ? exactNumber(value) : null;
    };
    const size = (name: string, fallback: number, max: number) => {
      const value = bound(name);
      if (value === null) return fallback;
      if (!Number.isInteger(value) || value < 0)
        fail('invalid', 'nonnegative-integer-required', member(node, name));
      if (value > max) fail('limit', 'requested-size-budget', member(node, name));
      return value;
    };
    const schema: FixtureSchema = {
      type: type as FixtureSchema['type'],
      nullable: bool('nullable'),
      readOnly: bool('readOnly'),
      writeOnly: bool('writeOnly'),
      required: new Set(),
      properties: new Map(),
      items: null,
      additional: bool('additionalProperties', true),
      enumeration: null,
      enumLocation: member(node, 'enum')?.location ?? null,
      minimum: bound('minimum'),
      maximum: bound('maximum'),
      exclusiveMinimum: bool('exclusiveMinimum'),
      exclusiveMaximum: bool('exclusiveMaximum'),
      minLength: size('minLength', 0, FIXTURE_LIMITS.stringLength),
      maxLength: size('maxLength', FIXTURE_LIMITS.stringLength, FIXTURE_LIMITS.stringLength),
      minItems: size('minItems', 0, FIXTURE_LIMITS.arrayItems),
      maxItems: size('maxItems', FIXTURE_LIMITS.arrayItems, FIXTURE_LIMITS.arrayItems),
      unique: bool('uniqueItems'),
      use: source.location,
      definition: node.location,
      example: member(node, 'example') ?? null,
    };
    if (schema.readOnly && schema.writeOnly) fail('invalid', 'read-write-both-true', node);
    if (
      (member(node, 'exclusiveMinimum') && schema.minimum === null) ||
      (member(node, 'exclusiveMaximum') && schema.maximum === null)
    )
      fail('invalid', 'exclusive-bound-required', node);
    if (
      schema.minLength > schema.maxLength ||
      schema.minItems > schema.maxItems ||
      (schema.minimum !== null &&
        schema.maximum !== null &&
        (schema.minimum > schema.maximum ||
          (schema.minimum === schema.maximum &&
            (schema.exclusiveMinimum || schema.exclusiveMaximum))))
    )
      fail('no-valid-fixture', 'inconsistent-bounds', node);
    const required = member(node, 'required');
    if (required) {
      if (required.kind !== 'seq' || required.items.some((n) => n.kind !== 'string'))
        fail('invalid', 'required-string-array', required);
      for (const name of required.items) {
        if (schema.required.has(name.text)) fail('invalid', 'duplicate-required', required);
        schema.required.add(name.text);
      }
    }
    const props = member(node, 'properties');
    if (props) {
      if (props.kind !== 'map') fail('invalid', 'properties-map-required', props);
      for (const key of [...props.map.keys()].sort(order))
        schema.properties.set(key, compile(props.map.get(key)!, depth + 1));
    }
    const items = member(node, 'items');
    if (items) schema.items = compile(items, depth + 1);
    if (type === 'array' && !items) fail('invalid', 'array-items-required', node);
    if (
      (type !== 'object' && (props || required || member(node, 'additionalProperties'))) ||
      (type !== 'array' &&
        ['minItems', 'maxItems', 'uniqueItems'].some((key) => member(node, key))) ||
      (type !== 'string' && ['minLength', 'maxLength'].some((key) => member(node, key))) ||
      (!['integer', 'number'].includes(type!) &&
        ['minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum'].some((key) =>
          member(node, key),
        ))
    )
      fail('unsupported', 'ambiguous-keyword-type', node);
    if (type !== 'array' && items) fail('unsupported', 'ambiguous-items', node);
    if (member(node, 'default'))
      issues.push({
        code: 'default-not-an-example',
        severity: 'warning',
        location: member(node, 'default')!.location,
        instancePointer: null,
      });
    const values = member(node, 'enum');
    if (values) {
      if (values.kind !== 'seq' || values.items.length === 0)
        fail('invalid', 'nonempty-enum-required', values);
      if (values.items.length > FIXTURE_LIMITS.enumValues) fail('limit', 'enum-budget', values);
      schema.enumeration = values.items
        .map(sourceValue)
        .sort((a, b) => order(fixtureJson(a), fixtureJson(b)));
      const identities = new Set<string>();
      for (const value of schema.enumeration) {
        const json = fixtureJson(value);
        enumUnits += json.length;
        if (enumUnits > FIXTURE_LIMITS.enumUnits) fail('limit', 'enum-budget', values);
        if (identities.has(json)) fail('invalid', 'duplicate-enum', values);
        identities.add(json);
      }
    }
    active.delete(node);
    return schema;
  }
  return compile(use, 0);
}

/** Independent instance traversal: no generation flags, defaults, or example validity shortcuts. */
export function validateFixtureInstance(
  schema: FixtureSchema,
  value: FixtureValue,
): FixtureIssue[] {
  fixtureJson(value); // instance depth/size/type guard before recursive validation
  const issues: FixtureIssue[] = [];
  let nodes = 0;
  let work = 0;
  const enums = new WeakMap<FixtureSchema, Set<string>>();
  function validate(s: FixtureSchema, input: FixtureValue, pointer: string) {
    if (++nodes > FIXTURE_LIMITS.instanceNodes)
      throw new FixtureFailure('limit', 'validation-budget');
    const bad = (code: string) => {
      if (issues.length < 100)
        issues.push({ code, severity: 'error', location: s.definition, instancePointer: pointer });
    };
    if (s.enumeration) {
      let identities = enums.get(s);
      if (!identities) {
        identities = new Set();
        for (const member of s.enumeration) {
          if (++work > FIXTURE_LIMITS.validationWork)
            throw new FixtureFailure('limit', 'validation-work-budget');
          identities.add(fixtureJson(member));
        }
        enums.set(s, identities);
      }
      if (!identities.has(fixtureJson(input))) bad('enum-mismatch');
    }
    if (input === null) {
      if (!s.nullable) bad('null-not-allowed');
      return;
    }
    if (s.type === 'object') {
      if (typeof input !== 'object' || Array.isArray(input)) {
        bad('object-required');
        return;
      }
      for (const key of s.required)
        if (!s.properties.get(key)?.writeOnly && !Object.hasOwn(input, key))
          bad('required-missing');
      for (const key of Object.keys(input).sort(order)) {
        const property = s.properties.get(key);
        if (!property) {
          if (!s.additional) bad('additional-property');
        } else if (property.writeOnly) bad('writeonly-in-response');
        else validate(property, input[key]!, `${pointer}/${pointerToken(key)}`);
      }
    } else if (s.type === 'array') {
      if (!Array.isArray(input)) {
        bad('array-required');
        return;
      }
      if (input.length < s.minItems || input.length > s.maxItems) bad('array-length');
      const identities = new Set<string>();
      for (let i = 0; i < input.length; i++) {
        if (s.unique) {
          const identity = fixtureJson(input[i]!);
          if (identities.has(identity)) bad('array-not-unique');
          identities.add(identity);
        }
        validate(s.items!, input[i]!, `${pointer}/${i}`);
      }
    } else if (s.type === 'string') {
      if (typeof input !== 'string') {
        bad('string-required');
        return;
      }
      if (codepoints(input) < s.minLength || codepoints(input) > s.maxLength) bad('string-length');
    } else if (s.type === 'boolean') {
      if (typeof input !== 'boolean') bad('boolean-required');
    } else {
      if (typeof input !== 'number' || (s.type === 'integer' && !Number.isInteger(input))) {
        bad('number-type');
        return;
      }
      if (s.minimum !== null && (input < s.minimum || (s.exclusiveMinimum && input === s.minimum)))
        bad('minimum');
      if (s.maximum !== null && (input > s.maximum || (s.exclusiveMaximum && input === s.maximum)))
        bad('maximum');
    }
  }
  validate(schema, value, '');
  return issues;
}
