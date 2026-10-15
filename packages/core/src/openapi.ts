import {
  parseOpenApiSource,
  OAS_PARSE_LIMITS,
  type OasNode,
  type OasLocation,
  type OasIssue,
} from './openapi-parser.js';
export type { OasLocation, OasIssue } from './openapi-parser.js';
export const OPENAPI_LIMITS = {
  ...OAS_PARSE_LIMITS,
  refHops: 16,
  resolutions: 50_000,
  pairs: 50_000,
  comparisonDepth: 64,
  findings: 5_000,
  affectedOperations: 20,
} as const;
export type OasCategory = 'breaking' | 'non-breaking' | 'review' | 'unknown';
export type OasDirection = 'request' | 'response' | 'contract';
export interface OasSide {
  status: 'valid' | 'invalid' | 'unsupported-version' | 'limit';
  version: string | null;
  issues: OasIssue[];
  refs: number;
}
export interface OasFinding {
  id: string;
  category: OasCategory;
  rule: string;
  direction: OasDirection;
  operation: string | null;
  before: OasLocation | null;
  after: OasLocation | null;
  definitionBefore: OasLocation | null;
  definitionAfter: OasLocation | null;
  affectedOperations: string[];
  affectedCount: number;
  uses: { operation: string; before: OasLocation | null; after: OasLocation | null }[];
  detail: { beforeCount: number; afterCount: number } | null;
}
export interface OpenApiComparison {
  status: 'complete' | 'unknown' | 'invalid' | 'unsupported' | 'limit';
  before: OasSide;
  after: OasSide;
  findings: OasFinding[];
  counts: Record<OasCategory, number>;
  rules: string[];
  limits: typeof OPENAPI_LIMITS;
}
export const OPENAPI_RULES: readonly string[] = [
  'Bounded static OpenAPI3.0.x subset, YAML1.2 core JSON-compatible input (not strict JSON). No client/server/traffic proof, execution or network. Complete means covered rules, not compatible: breaking/review findings may exist.',
  'Request acceptance narrowing is breaking, widening non-breaking; response guarantees use inverse type/nullability/required rules. Response enum/status additions are review, not guaranteed breaking. Required excludes request readOnly and response writeOnly.',
  'Only local references, strict fragment/JSONPointer decoding; missing/external/ref-only and recursive schema cycles are unknown even unchanged. Unsupported schema semantics are conservative unknown. Reference scan also covers ignored subtrees.',
  'Maps and required/enum/parameter/security sets are order-independent. Description/summary/title/example(s)/externalDocs/xml and info annotations do not determine compatibility. Changed x-* constraints/format/default/compositions are unknown. Headers unsupported; security/servers require review.',
  'Locations preserve original UTF16 offsets including BOM/CRLF; end-exclusive, one-based line/column. Shared definition findings retain first use plus bounded affected-operation use locations. Names/pointers may be sensitive.',
  'Export is explicit metadata projection only: no raw source/nodes/descriptions/defaults/examples/enum literals/server/security values. Structural IDs never hash user values. Use a terminable dedicated app worker; synchronous core cannot interrupt its caller.',
];
const get = (n: OasNode | undefined | null, key: string) =>
  n?.kind === 'map' ? n.map.get(key) : undefined;
const str = (n: OasNode | undefined) => (n?.kind === 'string' ? n.text : undefined);
const flag = (n: OasNode | undefined) => n?.kind === 'boolean' && n.text === 'true';
const keys = (n: OasNode | undefined) => (n?.kind === 'map' ? [...n.map.keys()] : []);
const union = (a: Iterable<string>, b: Iterable<string>) =>
  [...new Set([...a, ...b])].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
const annotations = new Set([
  'description',
  'summary',
  'title',
  'example',
  'examples',
  'externalDocs',
  'xml',
]);
const methods = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);
class Budget extends Error {}
class FindingLimit extends Error {}
interface SideContext {
  report: OasSide;
  root: OasNode | null;
  index: Map<string, OasNode>;
  issueKeys: Set<string>;
}
interface Operation {
  key: string;
  path: string;
  names: string[];
  node: OasNode;
  item: OasNode;
}

export function compareOpenApi(beforeText: string, afterText: string): OpenApiComparison {
  const contexts: SideContext[] = [beforeText, afterText].map((text) => {
    const parsed = parseOpenApiSource(text);
    const report: OasSide = {
      status: parsed.status,
      version: null,
      issues: [...parsed.issues],
      refs: 0,
    };
    const index = new Map<string, OasNode>();
    const stack = parsed.root ? [parsed.root] : [];
    while (stack.length) {
      const node = stack.pop()!;
      index.set(node.location.pointer, node);
      for (const child of node.map.values()) stack.push(child);
      for (const child of node.items) stack.push(child);
    }
    return { report, root: parsed.root, index, issueKeys: new Set<string>() };
  });
  const [b, a] = contexts as [SideContext, SideContext];
  const report: OpenApiComparison = {
    status: 'complete',
    before: b.report,
    after: a.report,
    findings: [],
    counts: { breaking: 0, 'non-breaking': 0, review: 0, unknown: 0 },
    rules: [...OPENAPI_RULES],
    limits: { ...OPENAPI_LIMITS },
  };
  const issue = (
    side: SideContext,
    code: string,
    node?: OasNode,
    severity: OasIssue['severity'] = 'unknown',
  ) => {
    const key = `${code}:${node?.location.pointer ?? ''}`;
    if (!side.issueKeys.has(key))
      side.report.issues.push({ code, severity, location: node?.location ?? null });
    side.issueKeys.add(key);
    if (severity === 'error') side.report.status = 'invalid';
  };
  const shape = (side: SideContext, node: OasNode | undefined, allowed: string[]) => {
    if (!node) return;
    if (node.kind !== 'map') {
      issue(side, 'object-map-required', node);
      return;
    }
    for (const [name, value] of node.map)
      if (name.startsWith('x-')) issue(side, 'extension-semantics-unknown', value);
    for (const [name, value] of node.map)
      if (!allowed.includes(name) && !annotations.has(name) && !name.startsWith('x-'))
        issue(side, 'object-keyword-unsupported', value);
  };
  for (const side of contexts) {
    if (side.report.status !== 'valid') continue;
    const root = side.root!;
    const version = get(root, 'openapi');
    if (root.kind !== 'map') issue(side, 'root-map-required', root, 'error');
    else if (!version && get(root, 'swagger')) {
      side.report.status = 'unsupported-version';
      issue(side, 'unsupported-version', get(root, 'swagger'));
    } else if (version?.kind !== 'string')
      issue(side, 'version-string-required', version ?? root, 'error');
    else {
      shape(side, root, ['openapi', 'info', 'paths', 'components', 'servers', 'security', 'tags']);
      side.report.version = /^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(version.text) ? version.text : null;
      if (!/^3\.0\.\d+$/.test(version.text)) {
        side.report.status = 'unsupported-version';
        issue(side, 'unsupported-version', version);
      }
      const info = get(root, 'info'),
        paths = get(root, 'paths');
      shape(side, info, ['title', 'version', 'termsOfService', 'contact', 'license']);
      if (
        info?.kind !== 'map' ||
        str(get(info, 'title')) === undefined ||
        str(get(info, 'version')) === undefined
      )
        issue(side, 'info-title-version-strings-required', info ?? root, 'error');
      if (paths?.kind !== 'map') issue(side, 'paths-map-required', paths ?? root, 'error');
      if (get(root, 'components') && get(root, 'components')?.kind !== 'map')
        issue(side, 'components-map-required', get(root, 'components'), 'error');
    }
  }
  const rejected = () => {
    if (contexts.some((s) => s.report.status === 'limit')) report.status = 'limit';
    else if (contexts.some((s) => s.report.status === 'invalid')) report.status = 'invalid';
    else if (contexts.some((s) => s.report.status === 'unsupported-version'))
      report.status = 'unsupported';
    else return false;
    report.findings = [];
    report.counts = { breaking: 0, 'non-breaking': 0, review: 0, unknown: 0 };
    return true;
  };
  if (rejected()) return report;
  let resolutions = 0,
    pairs = 0;
  const usedDefinitions = new Set<string>();
  function resolve(side: SideContext, use: OasNode | undefined, mark = false): OasNode | undefined {
    let current = use;
    const visited = new Set<string>();
    for (let hop = 0; current && get(current, '$ref'); hop++) {
      if (++resolutions > OPENAPI_LIMITS.resolutions) throw new Budget();
      const ref = get(current, '$ref')!;
      if (ref.kind !== 'string') {
        issue(side, 'ref-string-required', ref);
        return undefined;
      }
      if (hop >= OPENAPI_LIMITS.refHops) {
        issue(side, 'ref-hop-limit', use);
        return undefined;
      }
      if (visited.has(current.location.pointer)) {
        issue(side, 'ref-only-cycle', use);
        return undefined;
      }
      visited.add(current.location.pointer);
      if (current.map.size > 1) issue(side, 'ref-siblings-ignored', current, 'info');
      if (!ref.text.startsWith('#')) {
        issue(side, 'unresolved-external-ref', ref);
        return undefined;
      }
      let fragment: string;
      try {
        fragment = decodeURIComponent(ref.text.slice(1));
      } catch {
        issue(side, 'invalid-ref-fragment', ref);
        return undefined;
      }
      if (fragment !== '' && !fragment.startsWith('/')) {
        issue(side, 'invalid-ref-pointer', ref);
        return undefined;
      }
      let target = side.root ?? undefined;
      for (const part of fragment === '' ? [] : fragment.slice(1).split('/')) {
        if (/~(?![01])/.test(part)) {
          target = undefined;
          break;
        }
        const name = part.replaceAll('~1', '/').replaceAll('~0', '~');
        if (target?.kind === 'map') target = target.map.get(name);
        else if (target?.kind === 'seq' && /^(0|[1-9]\d*)$/.test(name))
          target = target.items[Number(name)];
        else {
          target = undefined;
          break;
        }
      }
      if (!target) {
        issue(side, 'unresolved-local-ref', ref);
        return undefined;
      }
      current = target;
      if (mark) usedDefinitions.add(`${side === b ? 'b' : 'a'}:${current.location.pointer}`);
    }
    return current;
  }
  // Bounded flat canonical strings, never recursive engine serialization or value hashes.
  const annotationContainers = new WeakSet<OasNode>(),
    schemaSets = new WeakSet<OasNode>();
  const serialCache = new WeakMap<OasNode, string>(),
    annotatedCache = new WeakMap<OasNode, string>();
  function serial(node: OasNode | undefined, sets = false, ignoreAnnotations = false): string {
    if (!node) return 'absent';
    const cache = ignoreAnnotations ? annotatedCache : serialCache;
    if (!sets && cache.has(node)) return cache.get(node)!;
    const values = new Map<OasNode, string>();
    const stack = [{ node, exit: false }];
    while (stack.length) {
      const frame = stack.pop()!;
      if (++pairs > OPENAPI_LIMITS.pairs) throw new Budget();
      if (!frame.exit) {
        stack.push({ ...frame, exit: true });
        for (const child of frame.node.map.values()) stack.push({ node: child, exit: false });
        for (const child of frame.node.items) stack.push({ node: child, exit: false });
      } else {
        const n = frame.node;
        const value =
          n.kind === 'map'
            ? `{${[...n.map.keys()]
                .filter(
                  (key) =>
                    !ignoreAnnotations || !annotationContainers.has(n) || !annotations.has(key),
                )
                .sort()
                .map((key) => `${JSON.stringify(key)}:${values.get(n.map.get(key)!)}`)
                .join(',')}}`
            : n.kind === 'seq'
              ? `[${(sets || schemaSets.has(n) ? n.items.map((c) => values.get(c)!).sort() : n.items.map((c) => values.get(c)!)).join(',')}]`
              : `${n.kind}:${JSON.stringify(n.text)}`;
        values.set(n, value);
      }
    }
    const result = values.get(node)!;
    if (!sets) cache.set(node, result);
    return result;
  }
  const equal = (
    left: OasNode | undefined,
    right: OasNode | undefined,
    sets = false,
    ignoreAnnotations = false,
  ) => serial(left, sets, ignoreAnnotations) === serial(right, sets, ignoreAnnotations);
  const findingIndex = new Map<string, { finding: OasFinding; operations: Set<string> }>();
  function emit(
    rule: string,
    category: OasCategory,
    direction: OasDirection,
    operation: string | null,
    before?: OasNode,
    after?: OasNode,
    definitionBefore = before,
    definitionAfter = after,
    detail: OasFinding['detail'] = null,
  ) {
    const shared = [definitionBefore, definitionAfter].some((n) =>
      n?.location.pointer.startsWith('/components/'),
    );
    const key = JSON.stringify([
      rule,
      direction,
      shared ? null : operation,
      definitionBefore?.location.pointer ?? null,
      definitionAfter?.location.pointer ?? null,
    ]);
    let entry = findingIndex.get(key);
    if (!entry) {
      if (report.findings.length >= OPENAPI_LIMITS.findings) throw new FindingLimit();
      const finding: OasFinding = {
        id: key,
        category,
        rule,
        direction,
        operation,
        before: before?.location ?? null,
        after: after?.location ?? null,
        definitionBefore: definitionBefore?.location ?? null,
        definitionAfter: definitionAfter?.location ?? null,
        affectedOperations: [],
        affectedCount: 0,
        uses: [],
        detail,
      };
      entry = { finding, operations: new Set() };
      findingIndex.set(key, entry);
      report.findings.push(finding);
    }
    if (operation && !entry.operations.has(operation)) {
      entry.operations.add(operation);
      entry.finding.affectedCount++;
      if (entry.finding.affectedOperations.length < OPENAPI_LIMITS.affectedOperations) {
        entry.finding.affectedOperations.push(operation);
        entry.finding.uses.push({
          operation,
          before: before?.location ?? null,
          after: after?.location ?? null,
        });
      }
    }
  }
  const unknown = (
    rule: string,
    dir: OasDirection,
    op: string | null,
    left?: OasNode,
    right?: OasNode,
  ) => emit(rule, 'unknown', dir, op, left, right);
  function stringSet(side: SideContext, node: OasNode | undefined): Set<string> {
    if (!node) return new Set();
    if (node.kind !== 'seq' || node.items.some((n) => n.kind !== 'string')) {
      issue(side, 'string-set-required', node);
      return new Set();
    }
    const set = new Set(node.items.map((n) => n.text));
    if (set.size !== node.items.length) issue(side, 'duplicate-set-member', node);
    return set;
  }
  const schemaKeys = new Set([
    'type',
    'nullable',
    'enum',
    'properties',
    'required',
    'readOnly',
    'writeOnly',
    'additionalProperties',
    'items',
    '$ref',
    'deprecated',
    ...annotations,
  ]);
  const schemaSeen = new Set<string>();
  function inspectSchema(side: SideContext, initial: OasNode | undefined) {
    const stack = initial ? [initial] : [];
    while (stack.length) {
      const use = stack.pop()!,
        key = `${side === b ? 'b' : 'a'}:${use.location.pointer}`;
      if (schemaSeen.has(key)) continue;
      schemaSeen.add(key);
      const node = resolve(side, use);
      if (!node) continue;
      if (node.kind !== 'map') {
        issue(side, 'schema-map-required', node);
        continue;
      }
      for (const [name, child] of node.map)
        if (!schemaKeys.has(name))
          issue(
            side,
            name.startsWith('x-') ? 'extension-semantics-unknown' : 'schema-facet-unsupported',
            child,
          );
      const type = get(node, 'type');
      annotationContainers.add(node);
      if (get(node, 'required')?.kind === 'seq') schemaSets.add(get(node, 'required')!);
      if (get(node, 'enum')?.kind === 'seq') schemaSets.add(get(node, 'enum')!);
      if (
        type &&
        (type.kind !== 'string' ||
          !['object', 'array', 'string', 'integer', 'number', 'boolean'].includes(type.text))
      )
        issue(side, 'unsupported-schema-type', type);
      for (const name of ['nullable', 'readOnly', 'writeOnly', 'deprecated'])
        if (get(node, name) && get(node, name)?.kind !== 'boolean')
          issue(side, 'schema-boolean-required', get(node, name));
      if (flag(get(node, 'readOnly')) && flag(get(node, 'writeOnly')))
        issue(side, 'read-write-both-true', node, 'error');
      stringSet(side, get(node, 'required'));
      const properties = get(node, 'properties');
      if (properties && properties.kind !== 'map')
        issue(side, 'properties-map-required', properties);
      else for (const child of properties?.map.values() ?? []) stack.push(child);
      if (get(node, 'items')) stack.push(get(node, 'items')!);
      else if (str(type) === 'array') issue(side, 'array-items-required', node);
      const ap = get(node, 'additionalProperties');
      if (ap && ap.kind !== 'boolean') {
        issue(side, 'schema-additional-properties-unsupported', ap);
        if (ap.kind === 'map') stack.push(ap);
      }
      const enumeration = get(node, 'enum');
      if (enumeration) {
        if (enumeration.kind !== 'seq' || !enumeration.items.length)
          issue(side, 'enum-array-required', enumeration);
        else {
          const members = new Set<string>();
          for (const value of enumeration.items) {
            let valid = value.kind !== 'nonfinite';
            if (value.kind === 'null') valid = flag(get(node, 'nullable'));
            else if (type)
              valid =
                valid &&
                (str(type) === 'integer'
                  ? value.kind === 'number' &&
                    Number(value.text.slice(value.text.lastIndexOf('e') + 1)) >= 0
                  : str(type) === 'number'
                    ? value.kind === 'number'
                    : value.kind === str(type) ||
                      (str(type) === 'object' && value.kind === 'map') ||
                      (str(type) === 'array' && value.kind === 'seq'));
            if (!valid) issue(side, 'enum-type-or-null-unsupported', value);
            const identity = serial(value);
            if (members.has(identity)) issue(side, 'duplicate-enum-member', value);
            members.add(identity);
          }
          if (flag(get(node, 'nullable')) && !enumeration.items.some((v) => v.kind === 'null'))
            issue(side, 'nullable-enum-excludes-null', enumeration);
        }
      }
    }
  }
  function schema(
    left: OasNode | undefined,
    right: OasNode | undefined,
    dir: 'request' | 'response',
    op: string,
    depth = 0,
    active = new Set<string>(),
    useLeft?: OasNode,
    useRight?: OasNode,
  ) {
    if (++pairs > OPENAPI_LIMITS.pairs || depth > OPENAPI_LIMITS.comparisonDepth)
      throw new Budget();
    inspectSchema(b, left);
    inspectSchema(a, right);
    const l = resolve(b, left, true),
      r = resolve(a, right, true);
    const ul = useLeft ?? (get(left, '$ref') ? left : undefined),
      ur = useRight ?? (get(right, '$ref') ? right : undefined);
    if ((left && !l) || (right && !r)) {
      unknown('schema-ref-unresolved', dir, op, left, right);
      return;
    }
    if ((l && l.kind !== 'map') || (r && r.kind !== 'map')) {
      unknown('schema-shape-unsupported', dir, op, left, right);
      return;
    }
    const key = `${dir}:${l?.location.pointer}|${r?.location.pointer}`;
    if (active.has(key)) {
      emit('recursive-schema-unknown', 'unknown', dir, op, ul ?? left, ur ?? right, l, r);
      return;
    }
    active.add(key);
    const change = (
      rule: string,
      cat: OasCategory,
      lb = l,
      rb = r,
      detail: OasFinding['detail'] = null,
    ) => emit(rule, cat, dir, op, ul ?? lb, ur ?? rb, lb, rb, detail);
    const request = dir === 'request';
    const lt = str(get(l, 'type')),
      rt = str(get(r, 'type'));
    if (lt !== rt) {
      const narrowing = (!lt && !!rt) || (lt === 'number' && rt === 'integer');
      const widening = (!!lt && !rt) || (lt === 'integer' && rt === 'number');
      change(
        'schema-type-changed',
        narrowing || widening
          ? (request ? narrowing : widening)
            ? 'breaking'
            : 'non-breaking'
          : 'breaking',
        get(l, 'type') ?? l,
        get(r, 'type') ?? r,
      );
    }
    const ln = flag(get(l, 'nullable')),
      rn = flag(get(r, 'nullable'));
    const le = get(l, 'enum'),
      re = get(r, 'enum');
    if (ln !== rn)
      change(
        le || re ? 'nullable-enum-interaction' : 'nullable-changed',
        le || re ? 'unknown' : (request ? ln : rn) ? 'breaking' : 'non-breaking',
        get(l, 'nullable') ?? l,
        get(r, 'nullable') ?? r,
      );
    if (le?.kind === 'seq' || re?.kind === 'seq') {
      const ls = new Set(le?.items.map((n) => serial(n)) ?? []),
        rs = new Set(re?.items.map((n) => serial(n)) ?? []);
      const removed = [...ls].some((v) => !rs.has(v)),
        added = [...rs].some((v) => !ls.has(v));
      if (!le && re) change('enum-introduced', request ? 'breaking' : 'non-breaking', le ?? l, re);
      else if (le && !re) change('enum-removed', request ? 'non-breaking' : 'review', le, re ?? r);
      else {
        if (removed)
          change('enum-values-removed', request ? 'breaking' : 'non-breaking', le, re, {
            beforeCount: ls.size,
            afterCount: rs.size,
          });
        if (added)
          change('enum-values-added', request ? 'non-breaking' : 'review', le, re, {
            beforeCount: ls.size,
            afterCount: rs.size,
          });
      }
    }
    for (const name of ['readOnly', 'writeOnly'])
      if (flag(get(l, name)) !== flag(get(r, name)))
        change('direction-flag-changed', 'review', get(l, name) ?? l, get(r, name) ?? r);
    const lp = get(l, 'properties'),
      rp = get(r, 'properties');
    const lr = stringSet(b, get(l, 'required')),
      rr = stringSet(a, get(r, 'required'));
    for (const name of union(keys(lp), keys(rp))) {
      const oldProp = get(lp, name),
        newProp = get(rp, name);
      const oldDef = resolve(b, oldProp),
        newDef = resolve(a, newProp);
      if (flag(get(oldDef, request ? 'readOnly' : 'writeOnly'))) lr.delete(name);
      if (flag(get(newDef, request ? 'readOnly' : 'writeOnly'))) rr.delete(name);
      if (!oldProp) {
        change(
          'property-added',
          request && rr.has(name) ? 'breaking' : 'non-breaking',
          oldProp,
          newProp,
        );
        inspectSchema(a, newProp);
      } else if (!newProp)
        change('property-removed', request ? 'review' : 'breaking', oldProp, newProp);
      else schema(oldProp, newProp, dir, op, depth + 1, active, ul, ur);
    }
    for (const name of union(lr, rr))
      if (lr.has(name) !== rr.has(name))
        change(
          rr.has(name) ? 'required-property-added' : 'required-property-removed',
          (request ? rr.has(name) : lr.has(name)) ? 'breaking' : 'non-breaking',
          get(l, 'required') ?? l,
          get(r, 'required') ?? r,
        );
    const lap = get(l, 'additionalProperties'),
      rap = get(r, 'additionalProperties');
    if ((lap && lap.kind !== 'boolean') || (rap && rap.kind !== 'boolean'))
      change('schema-additional-properties-unsupported', 'unknown', lap ?? l, rap ?? r);
    else if ((lap ? flag(lap) : true) !== (rap ? flag(rap) : true))
      change(
        'additional-properties-changed',
        request
          ? (rap ? flag(rap) : true)
            ? 'non-breaking'
            : 'breaking'
          : (rap ? flag(rap) : true)
            ? 'review'
            : 'non-breaking',
        lap ?? l,
        rap ?? r,
      );
    if (get(l, 'items') || get(r, 'items'))
      schema(get(l, 'items'), get(r, 'items'), dir, op, depth + 1, active, ul, ur);
    if (!flag(get(l, 'deprecated')) && flag(get(r, 'deprecated')))
      change('deprecated-added', 'non-breaking', l, r);
    for (const name of union(keys(l), keys(r)))
      if (!schemaKeys.has(name) && !equal(get(l, name), get(r, name)))
        change(
          name.startsWith('x-') ? 'extension-changed' : 'schema-constraint-unsupported',
          'unknown',
          get(l, name) ?? l,
          get(r, name) ?? r,
        );
    active.delete(key);
  }
  function operations(side: SideContext): Map<string, Operation> {
    const result = new Map<string, Operation>(),
      identities = new Set<string>();
    for (const [path, item] of get(side.root, 'paths')!.map) {
      if (path.startsWith('x-')) {
        issue(side, 'extension-semantics-unknown', item);
        continue;
      }
      if (!path.startsWith('/') || item.kind !== 'map') {
        issue(side, 'invalid-path-item', item);
        continue;
      }
      if (get(item, '$ref')) {
        issue(side, 'path-item-ref-unsupported', item);
        continue;
      }
      const names = [...path.matchAll(/\{([^{}]+)\}/g)].map((m) => m[1]!);
      const normalized = path.replace(/\{[^{}]+\}/g, '{}');
      if (/[{}]/.test(normalized.replaceAll('{}', '')) || new Set(names).size !== names.length)
        issue(side, 'ambiguous-path-template', item);
      shape(side, item, [...methods, 'servers', 'parameters', '$ref']);
      if (identities.has(normalized)) {
        issue(side, 'ambiguous-normalized-path', item);
        continue;
      }
      identities.add(normalized);
      for (const [method, node] of item.map) {
        if (!methods.has(method)) continue;
        if (node.kind !== 'map') {
          issue(side, 'operation-map-required', node);
          continue;
        }
        shape(side, node, [
          'tags',
          'operationId',
          'parameters',
          'requestBody',
          'responses',
          'deprecated',
          'security',
          'servers',
        ]);
        if (get(node, 'deprecated') && get(node, 'deprecated')?.kind !== 'boolean')
          issue(side, 'deprecated-boolean-required', get(node, 'deprecated'));
        const key = `${method.toUpperCase()} ${normalized}`;
        const operation = { key, path, names, node, item };
        result.set(key, operation);
        for (const use of parameters(side, operation).values()) {
          const parameter = resolve(side, use);
          inspectSchema(side, get(parameter, 'schema'));
        }
        const body = resolve(side, get(node, 'requestBody'));
        if (body) {
          shape(side, body, ['required', 'content']);
          if (get(body, 'required') && get(body, 'required')?.kind !== 'boolean')
            issue(side, 'required-boolean-required', get(body, 'required'));
          if (get(body, 'content')?.kind !== 'map' || !get(body, 'content')?.map.size)
            issue(side, 'request-body-content-required', body, 'error');
          content(side, body);
        }
        for (const use of responses(side, operation).values()) {
          const response = resolve(side, use);
          shape(side, response, ['content', 'headers']);
          if (get(response, 'headers'))
            issue(side, 'response-headers-unsupported', get(response, 'headers'));
          content(side, response);
        }
      }
    }
    return result;
  }
  function parameters(side: SideContext, op: Operation): Map<string, OasNode> {
    const result = new Map<string, OasNode>();
    for (const owner of [op.item, op.node]) {
      const list = get(owner, 'parameters');
      if (!list) continue;
      if (list.kind !== 'seq') {
        issue(side, 'parameters-array-required', list);
        continue;
      }
      const level = new Set<string>();
      for (const use of list.items) {
        const node = resolve(side, use, true);
        if (!node) continue;
        const name = str(get(node, 'name')),
          place = str(get(node, 'in'));
        if (
          node.kind !== 'map' ||
          name === undefined ||
          !['path', 'query', 'header', 'cookie'].includes(place ?? '')
        ) {
          issue(side, 'invalid-parameter-identity', node);
          continue;
        }
        if (
          place === 'header' &&
          ['accept', 'content-type', 'authorization'].includes(name.toLowerCase())
        )
          continue;
        shape(side, node, [
          'name',
          'in',
          'required',
          'deprecated',
          'allowEmptyValue',
          'style',
          'explode',
          'allowReserved',
          'schema',
          'content',
        ]);
        if (!get(node, 'schema') && !get(node, 'content'))
          issue(side, 'parameter-schema-required', node);
        if (get(node, 'content')) issue(side, 'parameter-content-unsupported', node);
        if (get(node, 'schema') && get(node, 'content'))
          issue(side, 'parameter-schema-content-conflict', node);
        for (const name of ['style', 'explode', 'allowEmptyValue', 'allowReserved'])
          if (get(node, name)) issue(side, 'parameter-serialization-unsupported', get(node, name));
        if (get(node, 'deprecated') && get(node, 'deprecated')?.kind !== 'boolean')
          issue(side, 'deprecated-boolean-required', get(node, 'deprecated'));
        const identity = `${place}:${place === 'header' ? name.toLowerCase() : place === 'path' && op.names.includes(name) ? `@${op.names.indexOf(name)}` : name}`;
        if (place === 'path' && (!flag(get(node, 'required')) || !op.names.includes(name)))
          issue(side, 'invalid-path-parameter', node, 'error');
        if (get(node, 'required') && get(node, 'required')?.kind !== 'boolean')
          issue(side, 'required-boolean-required', get(node, 'required'));
        if (level.has(identity)) issue(side, 'duplicate-parameter-identity', node);
        level.add(identity);
        result.set(identity, use);
      }
    }
    for (let i = 0; i < op.names.length; i++)
      if (!result.has(`path:@${i}`)) issue(side, 'missing-path-parameter', op.node, 'error');
    return result;
  }
  const normalizeMedia = (name: string) => {
    const semicolon = name.indexOf(';');
    return semicolon < 0
      ? name.trim().toLowerCase()
      : name.slice(0, semicolon).trim().toLowerCase() + name.slice(semicolon);
  };
  function content(side: SideContext, owner: OasNode | undefined): Map<string, OasNode> {
    const node = get(owner, 'content'),
      result = new Map<string, OasNode>();
    if (!node) return result;
    if (node.kind !== 'map') {
      issue(side, 'content-map-required', node);
      return result;
    }
    for (const [name, media] of node.map) {
      const key = normalizeMedia(name);
      if (!/^[^\s/;]+\/[^\s/;]+/.test(key) || media.kind !== 'map')
        issue(side, 'invalid-media-type', media);
      shape(side, media, ['schema', 'encoding']);
      if (get(media, 'encoding')) issue(side, 'media-encoding-unsupported', get(media, 'encoding'));
      if (result.has(key)) issue(side, 'ambiguous-media-type', media);
      result.set(key, media);
      inspectSchema(side, get(media, 'schema'));
    }
    return result;
  }
  function media(
    left: OasNode | undefined,
    right: OasNode | undefined,
    dir: 'request' | 'response',
    op: string,
    useLeft?: OasNode,
    useRight?: OasNode,
  ) {
    const old = content(b, left),
      next = content(a, right);
    for (const name of union(old.keys(), next.keys())) {
      const l = old.get(name),
        r = next.get(name);
      reviewMetadata(l, r, op);
      if (!l) emit('media-added', dir === 'request' ? 'non-breaking' : 'review', dir, op, l, r);
      else if (!r) emit('media-removed', 'breaking', dir, op, l, r);
      else schema(get(l, 'schema'), get(r, 'schema'), dir, op, 0, new Set(), useLeft, useRight);
      if (!equal(get(l, 'encoding'), get(r, 'encoding')))
        unknown('media-encoding-unsupported', dir, op, l, r);
    }
  }
  function responses(side: SideContext, op: Operation): Map<string, OasNode> {
    const map = get(op.node, 'responses'),
      result = new Map<string, OasNode>();
    if (map?.kind !== 'map' || !map.map.size) {
      issue(side, 'responses-map-required', map ?? op.node, 'error');
      return result;
    }
    for (const [name, use] of map.map) {
      if (name.startsWith('x-')) {
        issue(side, 'extension-semantics-unknown', use);
        continue;
      }
      const key = name.toUpperCase();
      if (!/^(?:[1-5](?:\d\d|XX)|DEFAULT)$/.test(key)) {
        issue(side, 'unsupported-response-status', use);
        continue;
      }
      if (result.has(key)) issue(side, 'duplicate-response-status', use);
      result.set(key, use);
      const resolved = resolve(side, use, true);
      if (resolved && (resolved.kind !== 'map' || str(get(resolved, 'description')) === undefined))
        issue(side, 'response-description-string-required', resolved, 'error');
    }
    return result;
  }
  function reviewMetadata(
    left: OasNode | undefined,
    right: OasNode | undefined,
    op: string | null,
  ) {
    for (const name of ['security', 'servers']) {
      for (const [side, owner] of [
        [b, left],
        [a, right],
      ] as const) {
        const value = get(owner, name);
        if (name === 'servers')
          for (const entry of value?.items ?? []) annotationContainers.add(entry);
        if (
          value &&
          (value.kind !== 'seq' ||
            value.items.some(
              (entry) =>
                entry.kind !== 'map' ||
                (name === 'servers'
                  ? str(get(entry, 'url')) === undefined
                  : [...entry.map.values()].some(
                      (scopes) =>
                        scopes.kind !== 'seq' ||
                        scopes.items.some((scope) => scope.kind !== 'string'),
                    )),
            ))
        )
          issue(side, 'metadata-shape-unsupported', value);
      }
      if (!equal(get(left, name), get(right, name), name === 'security', name === 'servers'))
        emit(`${name}-changed`, 'review', 'contract', op, get(left, name), get(right, name));
    }
    for (const name of union(keys(left), keys(right)))
      if (name.startsWith('x-') && !equal(get(left, name), get(right, name)))
        unknown('extension-changed', 'contract', op, get(left, name), get(right, name));
  }
  try {
    // Independent coverage, including unsupported/unchanged subtrees, never relies on equality shortcuts.
    for (const side of contexts)
      for (const node of side.index.values()) {
        if (get(node, '$ref')) {
          side.report.refs++;
          if (
            !/\/(?:components\/(?:schemas|parameters|requestBodies|responses|headers)\/[^/]+|schema|items|properties\/[^/]+|parameters\/\d+|requestBody|responses\/[^/]+|headers\/[^/]+)$/.test(
              node.location.pointer,
            )
          )
            issue(side, 'ref-position-unsupported', node);
          resolve(side, node);
        }
        if (node.kind === 'nonfinite') issue(side, 'nonfinite-unsupported', node);
      }
    for (const side of contexts) {
      const components = get(side.root, 'components');
      shape(side, components, [
        'schemas',
        'parameters',
        'requestBodies',
        'responses',
        'headers',
        'securitySchemes',
        'examples',
        'links',
        'callbacks',
      ]);
      for (const [groupName, group] of components?.map ?? []) {
        if (groupName.startsWith('x-')) continue;
        if (group.kind !== 'map') {
          issue(side, 'component-group-map-required', group);
          continue;
        }
        for (const use of group.map.values()) {
          if (groupName === 'schemas') {
            inspectSchema(side, use);
            continue;
          }
          if (groupName === 'examples') continue;
          const node = resolve(side, use);
          if (!node) continue;
          if (node.kind !== 'map') {
            issue(side, 'component-object-required', node);
            continue;
          }
          if (groupName === 'parameters') {
            shape(side, node, [
              'name',
              'in',
              'required',
              'deprecated',
              'allowEmptyValue',
              'style',
              'explode',
              'allowReserved',
              'schema',
              'content',
            ]);
            if (
              str(get(node, 'name')) === undefined ||
              !['path', 'query', 'header', 'cookie'].includes(str(get(node, 'in')) ?? '') ||
              (!get(node, 'schema') && !get(node, 'content'))
            )
              issue(side, 'invalid-component-parameter', node);
            if (get(node, 'content')) issue(side, 'parameter-content-unsupported', node);
            inspectSchema(side, get(node, 'schema'));
          } else if (groupName === 'requestBodies' || groupName === 'responses') {
            shape(
              side,
              node,
              groupName === 'requestBodies' ? ['content', 'required'] : ['content', 'headers'],
            );
            if (groupName === 'responses' && str(get(node, 'description')) === undefined)
              issue(side, 'response-description-string-required', node, 'error');
            if (
              groupName === 'requestBodies' &&
              (get(node, 'content')?.kind !== 'map' || !get(node, 'content')?.map.size)
            )
              issue(side, 'request-body-content-required', node, 'error');
            if (get(node, 'headers'))
              issue(side, 'response-headers-unsupported', get(node, 'headers'));
            content(side, node);
          } else if (groupName === 'securitySchemes') {
            const type = str(get(node, 'type'));
            shape(side, node, [
              'type',
              'name',
              'in',
              'scheme',
              'bearerFormat',
              'flows',
              'openIdConnectUrl',
            ]);
            if (type === 'apiKey') {
              if (
                str(get(node, 'name')) === undefined ||
                !['query', 'header', 'cookie'].includes(str(get(node, 'in')) ?? '')
              )
                issue(side, 'security-scheme-shape-unsupported', node);
            } else if (type === 'http') {
              if (str(get(node, 'scheme')) === undefined)
                issue(side, 'security-scheme-shape-unsupported', node);
            } else issue(side, 'security-scheme-semantics-unsupported', node);
          } else issue(side, 'component-kind-unsupported', node);
        }
      }
    }
    for (const side of contexts)
      for (const group of get(side.root, 'components')?.map.values() ?? [])
        for (const node of group.map.values()) annotationContainers.add(node);
    reviewMetadata(b.root ?? undefined, a.root ?? undefined, null);
    if (
      !equal(
        get(get(b.root, 'components'), 'securitySchemes'),
        get(get(a.root, 'components'), 'securitySchemes'),
        true,
      )
    )
      emit(
        'security-schemes-changed',
        'review',
        'contract',
        null,
        get(b.root, 'components'),
        get(a.root, 'components'),
      );
    const old = operations(b),
      next = operations(a);
    for (const key of union(old.keys(), next.keys())) {
      const left = old.get(key),
        right = next.get(key);
      if (!left || !right) {
        emit(
          left ? 'operation-removed' : 'operation-added',
          left ? 'breaking' : 'non-breaking',
          'contract',
          key,
          left?.node,
          right?.node,
        );
        if (left) {
          parameters(b, left);
          responses(b, left);
        }
        if (right) {
          parameters(a, right);
          responses(a, right);
        }
        continue;
      }
      if (left.path !== right.path)
        emit('path-variable-renamed', 'non-breaking', 'contract', key, left.item, right.item);
      reviewMetadata(left.item, right.item, key);
      reviewMetadata(left.node, right.node, key);
      if (!flag(get(left.node, 'deprecated')) && flag(get(right.node, 'deprecated')))
        emit('deprecated-added', 'non-breaking', 'contract', key, left.node, right.node);
      const lp = parameters(b, left),
        rp = parameters(a, right);
      for (const identity of union(lp.keys(), rp.keys())) {
        const lu = lp.get(identity),
          ru = rp.get(identity),
          l = resolve(b, lu, true),
          r = resolve(a, ru, true);
        reviewMetadata(l, r, key);
        if (!lu)
          emit(
            'parameter-added',
            flag(get(r, 'required')) ? 'breaking' : 'non-breaking',
            'request',
            key,
            lu,
            ru,
            l,
            r,
          );
        else if (!ru) emit('parameter-removed', 'review', 'request', key, lu, ru, l, r);
        else {
          if (flag(get(l, 'required')) !== flag(get(r, 'required')))
            emit(
              'parameter-required-changed',
              flag(get(r, 'required')) ? 'breaking' : 'non-breaking',
              'request',
              key,
              lu,
              ru,
              l,
              r,
            );
          for (const name of ['style', 'explode', 'allowEmptyValue', 'allowReserved'])
            if (!equal(get(l, name), get(r, name)))
              unknown('parameter-serialization-unsupported', 'request', key, l, r);
          if (get(l, 'content') || get(r, 'content'))
            unknown('parameter-content-unsupported', 'request', key, l, r);
          schema(
            get(l, 'schema'),
            get(r, 'schema'),
            'request',
            key,
            0,
            new Set(),
            get(lu, '$ref') ? lu : undefined,
            get(ru, '$ref') ? ru : undefined,
          );
        }
      }
      const lbu = get(left.node, 'requestBody'),
        rbu = get(right.node, 'requestBody'),
        lb = resolve(b, lbu, true),
        rb = resolve(a, rbu, true);
      reviewMetadata(lb, rb, key);
      if (!lbu && rbu)
        emit(
          'request-body-added',
          flag(get(rb, 'required')) ? 'breaking' : 'non-breaking',
          'request',
          key,
          lbu,
          rbu,
          lb,
          rb,
        );
      else if (lbu && !rbu)
        emit('request-body-removed', 'review', 'request', key, lbu, rbu, lb, rb);
      else if (lbu && rbu && flag(get(lb, 'required')) !== flag(get(rb, 'required')))
        emit(
          'request-body-required-changed',
          flag(get(rb, 'required')) ? 'breaking' : 'non-breaking',
          'request',
          key,
          lbu,
          rbu,
          lb,
          rb,
        );
      for (const [side, body] of [
        [b, lb],
        [a, rb],
      ] as const)
        if (
          body &&
          (body.kind !== 'map' ||
            get(body, 'content')?.kind !== 'map' ||
            !get(body, 'content')?.map.size)
        )
          issue(side, 'request-body-content-required', body, 'error');
      if (lbu && rbu)
        media(
          lb,
          rb,
          'request',
          key,
          get(lbu, '$ref') ? lbu : undefined,
          get(rbu, '$ref') ? rbu : undefined,
        );
      const lr = responses(b, left),
        rr = responses(a, right);
      const hasSuccess = [...lr.keys()].some((status) => status.startsWith('2'));
      for (const status of union(lr.keys(), rr.keys())) {
        const lu = lr.get(status),
          ru = rr.get(status),
          l = resolve(b, lu, true),
          r = resolve(a, ru, true);
        reviewMetadata(l, r, key);
        if (!lu) emit('response-status-added', 'review', 'response', key, lu, ru, l, r);
        else if (!ru)
          emit(
            'response-status-removed',
            status.startsWith('2') || (status === 'DEFAULT' && !hasSuccess) ? 'breaking' : 'review',
            'response',
            key,
            lu,
            ru,
            l,
            r,
          );
        else
          media(
            l,
            r,
            'response',
            key,
            get(lu, '$ref') ? lu : undefined,
            get(ru, '$ref') ? ru : undefined,
          );
        if (!equal(get(l, 'headers'), get(r, 'headers')))
          unknown('response-headers-unsupported', 'response', key, lu, ru);
      }
    }
    // Changed unused components cannot disappear behind an unvisited-reference shortcut.
    const bc = get(b.root, 'components'),
      ac = get(a.root, 'components');
    reviewMetadata(bc, ac, null);
    for (const group of union(keys(bc), keys(ac)))
      if (group !== 'securitySchemes') {
        for (const name of union(keys(get(bc, group)), keys(get(ac, group)))) {
          const l = get(get(bc, group), name),
            r = get(get(ac, group), name);
          const covered =
            (l && usedDefinitions.has(`b:${l.location.pointer}`)) ||
            (r && usedDefinitions.has(`a:${r.location.pointer}`));
          if (!covered && !equal(l, r, false, true))
            unknown('unassessed-component-change', 'contract', null, l, r);
        }
      }
  } catch (error) {
    if (error instanceof FindingLimit) {
      report.status = 'limit';
      report.findings = [];
      report.after.issues.push({ code: 'finding-limit', severity: 'error', location: null });
      return report;
    }
    if (error instanceof Budget) {
      report.status = 'unknown';
      report.after.issues.push({ code: 'comparison-limit', severity: 'unknown', location: null });
    } else {
      report.status = 'unknown';
      report.after.issues.push({
        code: 'comparison-unsupported',
        severity: 'unknown',
        location: null,
      });
    }
  }
  if (rejected()) return report;
  for (const finding of report.findings) report.counts[finding.category]++;
  if (
    report.findings.some((f) => f.category === 'unknown') ||
    contexts.some((s) => s.report.issues.some((i) => i.severity === 'unknown'))
  )
    report.status = 'unknown';
  return report;
}

export function exportOpenApiSummary(report: OpenApiComparison): string {
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
  const side = (value: OasSide) => ({
    status: value.status,
    version: value.version,
    refs: value.refs,
    issues: value.issues.map((i) => ({
      code: i.code,
      severity: i.severity,
      location: loc(i.location),
    })),
  });
  return JSON.stringify(
    {
      format: 'sid-tools/openapi-static/v1',
      status: report.status,
      before: side(report.before),
      after: side(report.after),
      findings: report.findings.map((f) => ({
        id: f.id,
        category: f.category,
        rule: f.rule,
        direction: f.direction,
        operation: f.operation,
        before: loc(f.before),
        after: loc(f.after),
        definitionBefore: loc(f.definitionBefore),
        definitionAfter: loc(f.definitionAfter),
        affectedOperations: [...f.affectedOperations],
        affectedCount: f.affectedCount,
        uses: f.uses.map((u) => ({
          operation: u.operation,
          before: loc(u.before),
          after: loc(u.after),
        })),
        detail: f.detail
          ? { beforeCount: f.detail.beforeCount, afterCount: f.detail.afterCount }
          : null,
      })),
      counts: { ...report.counts },
      limits: { ...OPENAPI_LIMITS },
      rules: [...OPENAPI_RULES],
    },
    null,
    2,
  );
}
