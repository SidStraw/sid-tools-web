import {
  parseComposeSource,
  COMPOSE_LIMITS,
  type ComposeNode,
  type ComposeLocation,
} from './compose-parser.js';
export { COMPOSE_LIMITS } from './compose-parser.js';
export type { ComposeLocation } from './compose-parser.js';
export const COMPOSE_SPEC_SNAPSHOT = '914ec15d1fa498969c0df5c1d672306db3256089';
export const COMPOSE_SPEC_URL = `https://github.com/compose-spec/compose-spec/blob/${COMPOSE_SPEC_SNAPSHOT}/schema/compose-spec.json`;
export const COMPOSE_SCOPE = [
  'Pinned Compose Specification reference snapshot, not full schema validation or resolved runtime application. One bounded YAML document, no environment/files/multifile merge/Docker daemon/image pull/execution/network. Spec reference is not a runtime dependency.',
  'Coverage: services with nonempty image strings, short/long depends_on, profile conditions, default/explicit networks, named volumes/anonymous volumes/unambiguous POSIX binds and selected long mounts. Other nonextension clauses conservatively partial. x-* ignored explicitly. YAML anchors/aliases/tags/merge/directives/multidoc unsupported before composition.',
  'No interpolation, even expressions with defaults/required alternatives. $$ escapes one literal dollar; unresolved values never become empty strings. Dynamic graph names unknown, not literal missing references. Names/profiles may be sensitive; scalar bodies/environment/commands/paths are not retained in report or summary.',
  'Dependency conditions/restart/required retained. Concrete undeclared dependencies are reference errors even required:false, matching observed Compose v5.5.0 primary config. Existing profiled targets are declared, not undeclared: no chosen profile activation or dependency auto-activation. SCC cycles are declared cycles; conditional cycles warn rather than claim an active cycle for every profile set. External resource existence, images, health/exit conditions and bind paths remain unverified.',
  'An existing inactive profiled optional dependency succeeds in observed Compose v5.5.0 primary config; this static graph retains its conditional edge without selecting profiles. CLI --no-interpolate skips observed consistency checks and is not the reference for missing targets or cycles.',
  'Absent or empty collection service networks attaches default unless network_mode is present; null service networks is invalid and produces no default edge, matching observed Compose v5.5.0 primary config. Unsupported network_mode suppresses guessed network edges. Attachments arise only from explicit mounts/networks or documented default. No guessed binds for ambiguous Windows/colon syntax. Complete only means covered static graph checks, never full Compose conformance or successful deployment.',
] as const;
export interface ComposeDiagnostic {
  code: string;
  severity: 'info' | 'warning' | 'error';
  category: 'structure' | 'reference' | 'cycle' | 'unresolved' | 'coverage' | 'limit';
  location: ComposeLocation;
}
export interface ComposeService {
  id: string;
  name: string;
  location: ComposeLocation;
  profiles: string[];
  conditional: boolean;
  image: 'declared' | 'unresolved' | 'absent';
  networkModeUnsupported: boolean;
}
export interface ComposeResource {
  id: string;
  name: string;
  kind: 'network' | 'volume';
  location: ComposeLocation | null;
  implicit: boolean;
  external: boolean | null;
  existence: 'not-checked';
  identity: 'declared' | 'unresolved';
}
export interface ComposeDependency {
  id: string;
  sourceId: string;
  targetName: string | null;
  targetId: string | null;
  condition: 'service_started' | 'service_healthy' | 'service_completed_successfully' | null;
  required: boolean | null;
  restart: boolean | null;
  conditional: boolean;
  supported: boolean;
  status: 'declared' | 'missing' | 'unresolved';
  location: ComposeLocation;
}
export interface ComposeAttachment {
  id: string;
  sourceId: string;
  kind: 'network' | 'volume' | 'bind' | 'anonymous';
  targetName: string | null;
  targetId: string | null;
  implicit: boolean;
  status: 'declared' | 'missing' | 'unresolved';
  location: ComposeLocation;
}
export interface ComposeCycle {
  id: string;
  serviceIds: string[];
  dependencyIds: string[];
  conditional: boolean;
  containsUnconditionalCycle: boolean;
}
export interface ComposeReport {
  status: 'complete' | 'partial' | 'invalid' | 'limit';
  spec: { snapshot: string; url: string };
  coverage: string[];
  services: ComposeService[];
  networks: ComposeResource[];
  volumes: ComposeResource[];
  dependencies: ComposeDependency[];
  attachments: ComposeAttachment[];
  cycles: ComposeCycle[];
  diagnostics: ComposeDiagnostic[];
  limits: typeof COMPOSE_LIMITS;
}
const get = (node: ComposeNode | null | undefined, key: string) =>
  node?.kind === 'map' ? node.map.get(key) : undefined;
const sorted = (node: ComposeNode | undefined) =>
  node?.kind === 'map' ? [...node.map.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)) : [];
/** Scanner only; never evaluates an interpolation operator or consults an environment. */
function interpolation(value: string): { unresolved: boolean; literal: string } {
  let literal = '',
    unresolved = false;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '$') {
      if (value[i + 1] === '$') {
        literal += '$';
        i++;
        continue;
      }
      if (value[i + 1] === '{' || /[A-Za-z_]/.test(value[i + 1] ?? '')) unresolved = true;
    }
    literal += value[i];
  }
  return { unresolved, literal };
}
class ResourceLimit extends Error {
  constructor(
    readonly code: string,
    readonly location: ComposeLocation,
  ) {
    super(code);
  }
}
export function analyzeCompose(source: string): ComposeReport {
  const parsed = parseComposeSource(source);
  const emptyLocation: ComposeLocation = { path: '', start: 0, end: 0, line: 1, column: 1 };
  const report: ComposeReport = {
    status: 'complete',
    spec: { snapshot: COMPOSE_SPEC_SNAPSHOT, url: COMPOSE_SPEC_URL },
    coverage: [...COMPOSE_SCOPE],
    services: [],
    networks: [],
    volumes: [],
    dependencies: [],
    attachments: [],
    cycles: [],
    diagnostics: [],
    limits: { ...COMPOSE_LIMITS },
  };
  if (parsed.status !== 'parsed') {
    report.status = parsed.status === 'unsupported' ? 'partial' : parsed.status;
    report.diagnostics.push({
      code: parsed.code!,
      severity: parsed.status === 'unsupported' ? 'warning' : 'error',
      category: parsed.status === 'limit' ? 'limit' : 'structure',
      location: parsed.location ?? emptyLocation,
    });
    return report;
  }
  const root = parsed.root!;
  let references = 0,
    work = 0,
    incompleteModel = false;
  const serviceNodes = new Map<string, ComposeNode>(),
    serviceByName = new Map<string, ComposeService>();
  const networkByName = new Map<string, ComposeResource>(),
    volumeByName = new Map<string, ComposeResource>();
  function issue(
    code: string,
    severity: ComposeDiagnostic['severity'],
    category: ComposeDiagnostic['category'],
    node: ComposeNode | ComposeLocation,
  ) {
    const location = 'location' in node ? node.location : node;
    if (report.diagnostics.length >= COMPOSE_LIMITS.diagnostics)
      throw new ResourceLimit('diagnostic-limit', location);
    report.diagnostics.push({ code, severity, category, location });
  }
  function spend(node: ComposeNode | ComposeLocation) {
    const loc = 'location' in node ? node.location : node;
    if (++work > COMPOSE_LIMITS.graphWork) throw new ResourceLimit('graph-work-limit', loc);
  }
  const ref = (node: ComposeNode) => {
    if (++references > COMPOSE_LIMITS.references)
      throw new ResourceLimit('reference-limit', node.location);
  };
  function checkKeys(node: ComposeNode, supported: string[], special: string[] = []) {
    if (node.kind !== 'map') return;
    for (const key of sorted(node)) {
      const value = node.map.get(key)!;
      if (key.startsWith('x-')) issue('extension-ignored', 'info', 'coverage', value);
      else if (!supported.includes(key))
        issue(
          special.includes(key) ? 'multifile-feature-unresolved' : 'unsupported-or-unknown-key',
          'warning',
          special.includes(key) ? 'unresolved' : 'coverage',
          value,
        );
    }
  }
  function staticName(value: string, node: ComposeNode, keyBased = false): string | null {
    const location = keyBased ? (node.keyLocation ?? node.location) : node.location;
    if (value.length > COMPOSE_LIMITS.nameUnits)
      throw new ResourceLimit('name-size-limit', node.location);
    if (value.includes('$')) {
      issue('dynamic-graph-identity', 'warning', 'unresolved', location);
      return null;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(value) || !value.length) {
      issue('invalid-graph-name', 'error', 'structure', location);
      return null;
    }
    return value;
  }
  const boolean = (node: ComposeNode | undefined, fallback: boolean): boolean | null => {
    if (!node) return fallback;
    if (node.kind !== 'boolean') {
      if (node.kind === 'string' && interpolation(node.value).unresolved) {
        issue('boolean-interpolation-unresolved', 'warning', 'unresolved', node);
        return null;
      }
      issue('boolean-required', 'error', 'structure', node);
      return null;
    }
    return node.value === 'true';
  };
  function resourceDefinitions(kind: 'network' | 'volume') {
    const node = get(root, kind === 'network' ? 'networks' : 'volumes');
    if (!node) return;
    if (node.kind === 'null') {
      issue('null-resource-map-unverified', 'warning', 'coverage', node);
      return;
    }
    if (node.kind !== 'map') {
      issue('resource-map-required', 'error', 'structure', node);
      return;
    }
    const output = kind === 'network' ? report.networks : report.volumes,
      byName = kind === 'network' ? networkByName : volumeByName;
    for (const key of sorted(node)) {
      const value = node.map.get(key)!;
      if (key.startsWith('x-')) {
        issue('extension-ignored', 'info', 'coverage', value);
        continue;
      }
      const name = staticName(key, value, true);
      if (!name) {
        incompleteModel = true;
        continue;
      }
      if (output.length >= COMPOSE_LIMITS[kind === 'network' ? 'networks' : 'volumes'])
        throw new ResourceLimit('resource-limit', value.location);
      if (value.kind !== 'map' && value.kind !== 'null') {
        issue('resource-definition-required', 'error', 'structure', value);
        continue;
      }
      checkKeys(value, ['external', 'name']);
      const external = boolean(get(value, 'external'), false),
        configuredName = get(value, 'name');
      let identity: ComposeResource['identity'] = 'declared';
      if (configuredName) {
        if (configuredName.kind !== 'string' || !configuredName.value)
          issue('resource-name-string-required', 'error', 'structure', configuredName);
        else if (interpolation(configuredName.value).unresolved) identity = 'unresolved';
      }
      if (external) {
        issue('external-existence-unverified', 'warning', 'unresolved', value);
        for (const field of value.map.keys())
          if (!['external', 'name'].includes(field) && !field.startsWith('x-'))
            issue('external-resource-extra-field', 'error', 'structure', value.map.get(field)!);
      }
      const resource: ComposeResource = {
        id: `${kind}:${output.length}`,
        name,
        kind,
        location: value.location,
        implicit: false,
        external,
        existence: 'not-checked',
        identity,
      };
      output.push(resource);
      byName.set(name, resource);
    }
  }
  function attach(
    service: ComposeService,
    node: ComposeNode,
    kind: ComposeAttachment['kind'],
    name: string | null,
    implicit = false,
  ) {
    ref(node);
    const target =
      name === null ? undefined : (kind === 'network' ? networkByName : volumeByName).get(name);
    const resourceKind = kind === 'network' || kind === 'volume';
    const unresolved =
      (name === null && resourceKind) || (incompleteModel && !target && resourceKind);
    const status: ComposeAttachment['status'] = unresolved
      ? 'unresolved'
      : resourceKind && !target
        ? 'missing'
        : 'declared';
    if (status !== 'declared')
      issue(
        status === 'unresolved' ? 'attachment-target-unresolved' : 'missing-attachment-target',
        status === 'missing' ? 'error' : 'warning',
        status === 'missing' ? 'reference' : 'unresolved',
        node,
      );
    report.attachments.push({
      id: `attachment:${report.attachments.length}`,
      sourceId: service.id,
      kind,
      targetName: name,
      targetId: target?.id ?? null,
      implicit,
      status,
      location: node.location,
    });
  }
  function serviceNetworks(service: ComposeService, node: ComposeNode) {
    const networks = get(node, 'networks');
    if (get(node, 'network_mode')) {
      service.networkModeUnsupported = true;
      issue(
        'network-mode-unsupported-no-default',
        'warning',
        'coverage',
        get(node, 'network_mode')!,
      );
      if (networks) issue('networks-and-network-mode-conflict', 'error', 'structure', networks);
      return;
    }
    if (get(node, 'extends') && !networks) {
      issue(
        'inherited-network-unresolved-no-default',
        'warning',
        'unresolved',
        get(node, 'extends')!,
      );
      return;
    }
    if (
      !networks ||
      (networks.kind === 'seq' && !networks.items.length) ||
      (networks.kind === 'map' && !networks.map.size)
    ) {
      let target = networkByName.get('default');
      if (!target) {
        if (report.networks.length >= COMPOSE_LIMITS.networks)
          throw new ResourceLimit('resource-limit', node.location);
        target = {
          id: 'network:implicit-default',
          name: 'default',
          kind: 'network',
          location: null,
          implicit: true,
          external: false,
          existence: 'not-checked',
          identity: 'declared',
        };
        report.networks.push(target);
        networkByName.set('default', target);
      }
      attach(service, networks ?? node, 'network', 'default', true);
      return;
    }
    if (networks.kind !== 'seq' && networks.kind !== 'map') {
      issue('service-networks-shape', 'error', 'structure', networks);
      return;
    }
    const seen = new Set<string>();
    const entries =
      networks.kind === 'seq'
        ? networks.items.map((value) => ({
            key: value.kind === 'string' ? interpolation(value.value).literal : null,
            value,
          }))
        : sorted(networks).map((key) => ({ key, value: networks.map.get(key)! }));
    for (const { key, value } of entries) {
      if (key === null) {
        issue('network-name-string-required', 'error', 'structure', value);
        continue;
      }
      if (networks.kind === 'map' && key.startsWith('x-')) {
        issue('extension-ignored', 'info', 'coverage', value);
        continue;
      }
      const name = staticName(key, value, networks.kind === 'map');
      if (name && seen.has(name))
        issue('duplicate-network-attachment', 'error', 'structure', value);
      if (name) seen.add(name);
      if (networks.kind === 'map') {
        if (value.kind !== 'null' && value.kind !== 'map')
          issue('network-attachment-shape', 'error', 'structure', value);
        else checkKeys(value, []);
      }
      attach(service, value, 'network', name);
    }
  }
  function volumes(service: ComposeService, node: ComposeNode) {
    const list = get(node, 'volumes');
    if (!list) return;
    if (list.kind !== 'seq') {
      issue('mount-list-required', 'error', 'structure', list);
      return;
    }
    const targets = new Set<string>();
    const targetOnce = (target: string, mount: ComposeNode) => {
      if (targets.has(target)) issue('duplicate-mount-target', 'error', 'structure', mount);
      targets.add(target);
    };
    for (const mount of list.items) {
      if (mount.kind === 'string') {
        if (interpolation(mount.value).unresolved) {
          issue('mount-interpolation-unresolved', 'warning', 'unresolved', mount);
          attach(service, mount, 'volume', null);
          continue;
        }
        const value = interpolation(mount.value).literal;
        if (value.includes('\\') || /^[A-Za-z]:/.test(value)) {
          issue('platform-mount-unsupported', 'warning', 'coverage', mount);
          attach(service, mount, 'volume', null);
          continue;
        }
        const parts = value.split(':');
        if (parts.length === 1 && parts[0]!.startsWith('/')) {
          targetOnce(parts[0]!, mount);
          attach(service, mount, 'anonymous', null);
          continue;
        }
        if (
          parts.length < 2 ||
          parts.length > 3 ||
          !parts[0] ||
          !parts[1]?.startsWith('/') ||
          (parts.length === 3 && !['ro', 'rw'].includes(parts[2]!))
        ) {
          issue('short-mount-unsupported', 'warning', 'coverage', mount);
          attach(service, mount, 'volume', null);
          continue;
        }
        const source = parts[0]!;
        targetOnce(parts[1]!, mount);
        if (
          source.startsWith('/') ||
          source.startsWith('./') ||
          source.startsWith('../') ||
          source.startsWith('~/')
        )
          attach(service, mount, 'bind', null);
        else attach(service, mount, 'volume', staticName(source, mount));
      } else if (mount.kind === 'map') {
        checkKeys(mount, ['type', 'source', 'target', 'read_only']);
        const type = get(mount, 'type'),
          source = get(mount, 'source'),
          target = get(mount, 'target');
        if (
          [type, source, target].some(
            (value) => value?.kind === 'string' && interpolation(value.value).unresolved,
          )
        ) {
          issue('mount-interpolation-unresolved', 'warning', 'unresolved', mount);
          attach(service, mount, 'volume', null);
          continue;
        }
        boolean(get(mount, 'read_only'), false);
        if (type?.kind !== 'string' || !['bind', 'volume'].includes(type.value)) {
          issue('mount-type-unsupported', 'warning', 'coverage', type ?? mount);
          attach(service, mount, 'volume', null);
          continue;
        }
        if (target?.kind !== 'string' || !target.value.startsWith('/'))
          issue('mount-target-required', 'error', 'structure', target ?? mount);
        else targetOnce(target.value, mount);
        if (type.value === 'bind') {
          if (source?.kind !== 'string' || !source.value)
            issue('bind-source-required', 'error', 'structure', source ?? mount);
          attach(service, mount, 'bind', null);
        } else if (!source) attach(service, mount, 'anonymous', null);
        else if (source.kind !== 'string')
          issue('volume-source-string-required', 'error', 'structure', source);
        else
          attach(service, mount, 'volume', staticName(interpolation(source.value).literal, source));
      } else issue('mount-shape-invalid', 'error', 'structure', mount);
    }
  }
  function dependencies(service: ComposeService, node: ComposeNode) {
    const depends = get(node, 'depends_on');
    if (!depends) return;
    if (depends.kind !== 'seq' && depends.kind !== 'map') {
      issue('depends-on-shape', 'error', 'structure', depends);
      return;
    }
    const entries =
      depends.kind === 'seq'
        ? depends.items.map((value) => ({
            key: value.kind === 'string' ? interpolation(value.value).literal : null,
            value,
          }))
        : sorted(depends).map((key) => ({ key, value: depends.map.get(key)! }));
    const seen = new Set<string>();
    for (const { key, value } of entries) {
      ref(value);
      if (key === null) {
        issue('dependency-name-string-required', 'error', 'structure', value);
        continue;
      }
      if (depends.kind === 'map' && key.startsWith('x-')) {
        issue('extension-ignored', 'info', 'coverage', value);
        continue;
      }
      const name = staticName(key, value, depends.kind === 'map');
      let condition: ComposeDependency['condition'] = 'service_started',
        supported = true;
      let required: boolean | null = true,
        restart: boolean | null = false;
      if (name && seen.has(name)) issue('duplicate-dependency', 'error', 'structure', value);
      if (name) seen.add(name);
      if (depends.kind === 'map') {
        if (value.kind !== 'map') {
          issue('long-dependency-map-required', 'error', 'structure', value);
          supported = false;
        } else {
          checkKeys(value, ['condition', 'required', 'restart']);
          if (
            [...value.map.keys()].some(
              (key) => !['condition', 'required', 'restart'].includes(key) && !key.startsWith('x-'),
            )
          )
            supported = false;
          const cond = get(value, 'condition');
          if (cond) {
            if (cond.kind === 'string' && interpolation(cond.value).unresolved) {
              condition = null;
              supported = false;
              issue('dependency-condition-unresolved', 'warning', 'unresolved', cond);
            } else if (
              cond.kind !== 'string' ||
              !['service_started', 'service_healthy', 'service_completed_successfully'].includes(
                cond.value,
              )
            ) {
              condition = null;
              issue('dependency-condition-invalid', 'error', 'structure', cond);
              supported = false;
            } else condition = cond.value as ComposeDependency['condition'];
          } else {
            issue('long-dependency-condition-required', 'error', 'structure', value);
            supported = false;
          }
          required = boolean(get(value, 'required'), true);
          restart = boolean(get(value, 'restart'), false);
          if (required === null || restart === null) supported = false;
        }
      }
      report.dependencies.push({
        id: `dependency:${report.dependencies.length}`,
        sourceId: service.id,
        targetName: name,
        targetId: null,
        condition,
        required,
        restart,
        conditional: service.conditional,
        supported,
        status: 'unresolved',
        location: value.location,
      });
    }
  }
  function findCycles() {
    const adjacency = new Map<string, string[]>(),
      reverse = new Map<string, string[]>();
    for (const service of report.services) {
      adjacency.set(service.id, []);
      reverse.set(service.id, []);
    }
    for (const edge of report.dependencies)
      if (edge.targetId && edge.supported) {
        adjacency.get(edge.sourceId)!.push(edge.targetId);
        reverse.get(edge.targetId)!.push(edge.sourceId);
      }
    const visited = new Set<string>(),
      order: string[] = [];
    for (const service of report.services) {
      if (visited.has(service.id)) continue;
      const stack = [{ id: service.id, exit: false }];
      while (stack.length) {
        const frame = stack.pop()!;
        spend(service.location);
        if (frame.exit) {
          order.push(frame.id);
          continue;
        }
        if (visited.has(frame.id)) continue;
        visited.add(frame.id);
        stack.push({ id: frame.id, exit: true });
        for (const target of adjacency.get(frame.id)!)
          if (!visited.has(target)) stack.push({ id: target, exit: false });
      }
    }
    visited.clear();
    const components: { members: string[]; edges: ComposeDependency[] }[] = [];
    const componentOf = new Map<string, number>();
    for (const id of order.reverse()) {
      if (visited.has(id)) continue;
      const component: string[] = [],
        stack = [id];
      visited.add(id);
      while (stack.length) {
        const current = stack.pop()!;
        component.push(current);
        spend(root);
        for (const next of reverse.get(current)!)
          if (!visited.has(next)) {
            visited.add(next);
            stack.push(next);
          }
      }
      for (const member of component) componentOf.set(member, components.length);
      components.push({ members: component, edges: [] });
    }
    for (const edge of report.dependencies) {
      spend(edge.location);
      if (
        edge.supported &&
        edge.targetId &&
        componentOf.get(edge.sourceId) === componentOf.get(edge.targetId)
      )
        components[componentOf.get(edge.sourceId)!]!.edges.push(edge);
    }
    for (const { members: component, edges } of components) {
      if (component.length > 1 || edges.some((edge) => edge.sourceId === edge.targetId)) {
        const conditional = edges.some((edge) => edge.conditional);
        const indegree = new Map(component.map((id) => [id, 0])),
          forward = new Map(component.map((id) => [id, [] as string[]]));
        for (const edge of edges)
          if (!edge.conditional) {
            spend(edge.location);
            indegree.set(edge.targetId!, indegree.get(edge.targetId!)! + 1);
            forward.get(edge.sourceId)!.push(edge.targetId!);
          }
        const queue = component.filter((id) => indegree.get(id) === 0);
        let removed = 0;
        for (let i = 0; i < queue.length; i++) {
          removed++;
          spend(root);
          for (const next of forward.get(queue[i]!)!) {
            indegree.set(next, indegree.get(next)! - 1);
            if (indegree.get(next) === 0) queue.push(next);
          }
        }
        const containsUnconditionalCycle = removed < component.length;
        report.cycles.push({
          id: `cycle:${report.cycles.length}`,
          serviceIds: component.sort(),
          dependencyIds: edges.map((edge) => edge.id),
          conditional,
          containsUnconditionalCycle,
        });
        issue(
          containsUnconditionalCycle ? 'dependency-cycle' : 'conditional-dependency-cycle',
          containsUnconditionalCycle ? 'error' : 'warning',
          'cycle',
          edges[0]!.location,
        );
      }
    }
  }
  try {
    if (root.kind !== 'map') {
      issue('root-map-required', 'error', 'structure', root);
      report.status = 'invalid';
      return report;
    }
    checkKeys(root, ['services', 'networks', 'volumes', 'version'], ['include']);
    incompleteModel = !!get(root, 'include');
    if (get(root, 'version'))
      issue('version-field-obsolete-not-spec-selector', 'info', 'coverage', get(root, 'version')!);
    if (get(root, 'version') && get(root, 'version')?.kind !== 'string')
      issue('legacy-version-string-required', 'error', 'structure', get(root, 'version')!);
    // Independent string coverage, excluding explicitly ignored extensions. No values retained.
    const scan = [root];
    while (scan.length) {
      const node = scan.pop()!;
      spend(node);
      if (node.kind === 'string' && interpolation(node.value).unresolved)
        issue('interpolation-unresolved', 'warning', 'unresolved', node);
      if (node.kind === 'map')
        for (const [key, value] of node.map) {
          if (key.startsWith('x-')) continue;
          if (key.includes('$')) incompleteModel = true;
          scan.push(value);
        }
      for (const value of node.items) scan.push(value);
    }
    resourceDefinitions('network');
    resourceDefinitions('volume');
    const services = get(root, 'services');
    if (!services && get(root, 'include'))
      issue('services-from-include-unresolved', 'warning', 'unresolved', get(root, 'include')!);
    else if (services?.kind !== 'map' || !services.map.size)
      issue('services-map-required', 'error', 'structure', services ?? root);
    else
      for (const key of sorted(services)) {
        const node = services.map.get(key)!;
        if (key.startsWith('x-')) {
          issue('extension-ignored', 'info', 'coverage', node);
          continue;
        }
        const name = staticName(key, node, true);
        if (!name) {
          incompleteModel = true;
          continue;
        }
        if (report.services.length >= COMPOSE_LIMITS.services)
          throw new ResourceLimit('service-limit', node.location);
        if (node.kind !== 'map') {
          issue('service-map-required', 'error', 'structure', node);
          continue;
        }
        checkKeys(
          node,
          ['image', 'depends_on', 'profiles', 'networks', 'network_mode', 'volumes'],
          ['extends', 'env_file'],
        );
        if (get(node, 'extends')) incompleteModel = true;
        const profileNode = get(node, 'profiles'),
          profiles: string[] = [];
        let conditional = !!get(node, 'extends');
        if (profileNode) {
          if (profileNode.kind !== 'seq')
            issue('profiles-list-required', 'error', 'structure', profileNode);
          else {
            conditional ||= profileNode.items.length > 0;
            for (const value of profileNode.items) {
              if (value.kind !== 'string' || !value.value)
                issue('profile-string-required', 'error', 'structure', value);
              else {
                const name = staticName(interpolation(value.value).literal, value);
                if (name) profiles.push(name);
              }
            }
          }
          if (conditional)
            issue('profile-activation-unresolved', 'warning', 'unresolved', profileNode);
        }
        const image = get(node, 'image');
        let imageStatus: ComposeService['image'] = 'absent';
        if (image) {
          if (image.kind !== 'string' || !image.value.trim())
            issue('image-string-required', 'error', 'structure', image);
          else imageStatus = interpolation(image.value).unresolved ? 'unresolved' : 'declared';
        } else if (!get(node, 'build') && !get(node, 'extends') && !get(node, 'provider'))
          issue('image-or-build-required', 'error', 'structure', node);
        const service: ComposeService = {
          id: `service:${report.services.length}`,
          name,
          location: node.location,
          profiles: [...new Set(profiles)].sort(),
          conditional,
          image: imageStatus,
          networkModeUnsupported: false,
        };
        report.services.push(service);
        serviceByName.set(name, service);
        serviceNodes.set(service.id, node);
      }
    for (const service of report.services) {
      const node = serviceNodes.get(service.id)!;
      dependencies(service, node);
      serviceNetworks(service, node);
      volumes(service, node);
    }
    for (const edge of report.dependencies) {
      const target = edge.targetName === null ? undefined : serviceByName.get(edge.targetName);
      edge.targetId = target?.id ?? null;
      edge.conditional ||= target?.conditional ?? false;
      edge.status = !edge.supported
        ? 'unresolved'
        : target
          ? 'declared'
          : edge.targetName === null || incompleteModel
            ? 'unresolved'
            : 'missing';
      if (!target)
        issue(
          edge.status === 'unresolved'
            ? 'dependency-target-unresolved'
            : edge.required
              ? 'missing-required-dependency'
              : 'missing-optional-dependency',
          edge.status === 'missing' ? 'error' : 'warning',
          edge.status === 'missing' ? 'reference' : 'unresolved',
          edge.location,
        );
      if (edge.conditional)
        issue('dependency-profile-context-unresolved', 'warning', 'unresolved', edge.location);
      if (edge.condition !== 'service_started')
        issue('dependency-runtime-condition-unverified', 'info', 'coverage', edge.location);
    }
    findCycles();
    report.status = report.diagnostics.some((d) => d.severity === 'error')
      ? 'invalid'
      : report.diagnostics.some((d) => d.severity === 'warning')
        ? 'partial'
        : 'complete';
  } catch (error) {
    if (!(error instanceof ResourceLimit)) throw error;
    report.status = 'limit';
    report.services = [];
    report.networks = [];
    report.volumes = [];
    report.dependencies = [];
    report.attachments = [];
    report.cycles = [];
    report.diagnostics = [
      { code: error.code, severity: 'error', category: 'limit', location: error.location },
    ];
  }
  return report;
}

/** Deliberate metadata projection; no raw source/scalars, commands, env, bind paths or runtime names. */
export function exportComposeSummary(report: ComposeReport): string {
  const loc = (value: ComposeLocation) => ({
    path: value.path,
    start: value.start,
    end: value.end,
    line: value.line,
    column: value.column,
  });
  const resource = (value: ComposeResource) => ({
    id: value.id,
    name: value.name,
    kind: value.kind,
    location: value.location ? loc(value.location) : null,
    implicit: value.implicit,
    external: value.external,
    existence: value.existence,
    identity: value.identity,
  });
  return JSON.stringify(
    {
      format: 'sid-tools/compose-static/v1',
      status: report.status,
      spec: { snapshot: COMPOSE_SPEC_SNAPSHOT, url: COMPOSE_SPEC_URL },
      coverage: [...COMPOSE_SCOPE],
      services: report.services.map((s) => ({
        id: s.id,
        name: s.name,
        location: loc(s.location),
        profiles: [...s.profiles],
        conditional: s.conditional,
        image: s.image,
        networkModeUnsupported: s.networkModeUnsupported,
      })),
      networks: report.networks.map(resource),
      volumes: report.volumes.map(resource),
      dependencies: report.dependencies.map((d) => ({
        id: d.id,
        sourceId: d.sourceId,
        targetName: d.targetName,
        targetId: d.targetId,
        condition: d.condition,
        required: d.required,
        restart: d.restart,
        conditional: d.conditional,
        supported: d.supported,
        status: d.status,
        location: loc(d.location),
      })),
      attachments: report.attachments.map((a) => ({
        id: a.id,
        sourceId: a.sourceId,
        kind: a.kind,
        targetName: a.targetName,
        targetId: a.targetId,
        implicit: a.implicit,
        status: a.status,
        location: loc(a.location),
      })),
      cycles: report.cycles.map((c) => ({
        id: c.id,
        serviceIds: [...c.serviceIds],
        dependencyIds: [...c.dependencyIds],
        conditional: c.conditional,
        containsUnconditionalCycle: c.containsUnconditionalCycle,
      })),
      diagnostics: report.diagnostics.map((d) => ({
        code: d.code,
        severity: d.severity,
        category: d.category,
        location: loc(d.location),
      })),
      limits: { ...COMPOSE_LIMITS },
    },
    null,
    2,
  );
}
