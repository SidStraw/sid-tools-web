import {
  parse,
  buildASTSchema,
  validateSchema,
  findSchemaChanges,
  Lexer,
  Source,
  TokenKind,
  getLocation,
  GraphQLError,
  print,
  specifiedDirectives,
  isTypeDefinitionNode,
  isTypeExtensionNode,
  isObjectType,
  isInterfaceType,
  isInputObjectType,
  isUnionType,
  type ASTNode,
  type DocumentNode,
  type GraphQLSchema,
  type TypeNode,
} from 'graphql';

export const SDL_LIMITS = {
  codeUnits: 100_000,
  tokens: 10_000,
  lexicalDepth: 24,
  astDepth: 64,
  astNodes: 6_000,
  types: 64,
  interfaceDepth: 16,
  members: 500,
  references: 1_000,
  changes: 1_000,
} as const;
export type SdlSide = 'before' | 'after';
export type SdlCategory = 'breaking' | 'dangerous' | 'non-breaking' | 'unknown';
export interface SdlLocation {
  start: number;
  end: number;
  line: number;
  column: number;
}
export interface SdlIssue {
  code: string;
  message: string;
  location: SdlLocation | null;
  path: string | null;
}
export interface SdlCoordinate {
  path: string;
  kind: 'type' | 'field' | 'argument' | 'enum-value' | 'directive' | 'root';
  type: string | null;
  field: string | null;
  location: SdlLocation | null;
  signature: string;
}
export interface SdlReference {
  from: string;
  to: string;
  location: SdlLocation | null;
}
export interface SdlSideReport {
  status: 'valid' | 'invalid' | 'limit';
  errors: SdlIssue[];
  warnings: SdlIssue[];
  coordinates: SdlCoordinate[];
  references: SdlReference[];
}
export interface SdlChange {
  id: string;
  category: SdlCategory;
  code: string;
  reason: string;
  type: string | null;
  field: string | null;
  path: string | null;
  mapping: 'exact' | 'candidates' | 'unmapped';
  candidatePaths: string[];
  candidateCount: number;
}
export interface SdlComparison {
  status: 'complete' | 'unknown' | 'invalid' | 'limit';
  before: SdlSideReport;
  after: SdlSideReport;
  changes: SdlChange[];
  counts: Record<SdlCategory, number>;
  scope: string[];
  limits: typeof SDL_LIMITS;
}
export const SDL_SCOPE: readonly string[] = [
  'Static GraphQL.js17.0.2 schema comparison only; no client documents, usage, resolvers, execution or network. No operational compatibility/safety proof, even when no library changes are found.',
  'Library classifications are authoritative. Optional additions shared by safe/dangerous constants are reported conservatively as dangerous. Nullable input to NonNull remains library-breaking even when a new default exists.',
  'The library exposes only code/description, not structured targets. AST deltas supply candidate coordinates without parsing prose. An unambiguous candidate is linked exactly; ambiguous or absent attribution makes coverage unknown. Type-reference edges are navigation, not transitive client impact.',
  'Custom directive applications always require human review, even when unchanged. Built-in applications are distinguished by the installed specified-directive list. Changed applications, root roles and otherwise unclassified AST changes are explicitly unknown.',
  'Custom scalar serialization/coercion and directive/resolver behavior are not proven. Descriptions and default values may appear in local library reasons; sanitized export deliberately excludes those reasons, signatures and raw SDL. Names can still be sensitive.',
];

const BREAKING = new Set([
  'TYPE_REMOVED',
  'TYPE_CHANGED_KIND',
  'TYPE_REMOVED_FROM_UNION',
  'VALUE_REMOVED_FROM_ENUM',
  'REQUIRED_INPUT_FIELD_ADDED',
  'IMPLEMENTED_INTERFACE_REMOVED',
  'FIELD_REMOVED',
  'FIELD_CHANGED_KIND',
  'REQUIRED_ARG_ADDED',
  'ARG_REMOVED',
  'ARG_CHANGED_KIND',
  'DIRECTIVE_REMOVED',
  'DIRECTIVE_ARG_REMOVED',
  'REQUIRED_DIRECTIVE_ARG_ADDED',
  'DIRECTIVE_REPEATABLE_REMOVED',
  'DIRECTIVE_LOCATION_REMOVED',
]);
const DANGEROUS = new Set([
  'VALUE_ADDED_TO_ENUM',
  'TYPE_ADDED_TO_UNION',
  'OPTIONAL_INPUT_FIELD_ADDED',
  'OPTIONAL_ARG_ADDED',
  'IMPLEMENTED_INTERFACE_ADDED',
  'ARG_DEFAULT_VALUE_CHANGE',
  'INPUT_FIELD_DEFAULT_VALUE_CHANGE',
]);
const SAFE = new Set([
  'DESCRIPTION_CHANGED',
  'TYPE_ADDED',
  'DIRECTIVE_ADDED',
  'FIELD_ADDED',
  'DIRECTIVE_REPEATABLE_ADDED',
  'DIRECTIVE_LOCATION_ADDED',
  'OPTIONAL_DIRECTIVE_ARG_ADDED',
  'FIELD_CHANGED_KIND_SAFE',
  'ARG_CHANGED_KIND_SAFE',
  'ARG_DEFAULT_VALUE_ADDED',
  'INPUT_FIELD_DEFAULT_VALUE_ADDED',
]);
const category = (code: string): SdlCategory =>
  BREAKING.has(code)
    ? 'breaking'
    : DANGEROUS.has(code)
      ? 'dangerous'
      : SAFE.has(code)
        ? 'non-breaking'
        : 'unknown';
const builtinDirectives = new Set(specifiedDirectives.map((d) => d.name));
class ResourceLimit extends Error {}
const location = (node: ASTNode): SdlLocation | null =>
  node.loc
    ? { start: node.loc.start, end: node.loc.end, ...getLocation(node.loc.source, node.loc.start) }
    : null;
function astChildren(node: ASTNode): ASTNode[] {
  const result: ASTNode[] = [];
  for (const [key, value] of Object.entries(node)) {
    if (key === 'loc') continue;
    for (const child of Array.isArray(value) ? (value as unknown[]) : [value as unknown]) {
      if (child && typeof child === 'object' && 'kind' in child) result.push(child as ASTNode);
    }
  }
  return result;
}
const namedType = (type: TypeNode): string =>
  type.kind === 'NamedType' ? type.name.value : namedType(type.type);

function readSide(text: string): {
  report: SdlSideReport;
  schema: GraphQLSchema | null;
  document: DocumentNode | null;
  applications: Map<string, string>;
} {
  const report: SdlSideReport = {
    status: 'invalid',
    errors: [],
    warnings: [],
    coordinates: [],
    references: [],
  };
  const applications = new Map<string, string>();
  let document: DocumentNode | null = null;
  try {
    if (text.length > SDL_LIMITS.codeUnits) throw new ResourceLimit('input-limit');
    const lexer = new Lexer(new Source(text));
    let tokens = 0,
      depth = 0;
    while (lexer.advance().kind !== TokenKind.EOF) {
      if (++tokens > SDL_LIMITS.tokens) throw new ResourceLimit('token-limit');
      if (['{', '[', '('].includes(lexer.token.kind) && ++depth > SDL_LIMITS.lexicalDepth)
        throw new ResourceLimit('nesting-limit');
      if (['}', ']', ')'].includes(lexer.token.kind)) depth--;
    }
    document = parse(text, { maxTokens: SDL_LIMITS.tokens });
    let nodes = 0,
      types = 0,
      members = 0;
    const stack = [{ node: document as ASTNode, depth: 0 }];
    while (stack.length) {
      const item = stack.pop()!;
      if (++nodes > SDL_LIMITS.astNodes || item.depth > SDL_LIMITS.astDepth)
        throw new ResourceLimit('ast-limit');
      if (isTypeDefinitionNode(item.node) || isTypeExtensionNode(item.node)) {
        if (++types > SDL_LIMITS.types) throw new ResourceLimit('type-limit');
      }
      if (
        ['FieldDefinition', 'InputValueDefinition', 'EnumValueDefinition'].includes(
          item.node.kind,
        ) &&
        ++members > SDL_LIMITS.members
      )
        throw new ResourceLimit('member-limit');
      for (const child of astChildren(item.node))
        stack.push({ node: child, depth: item.depth + 1 });
    }
    const interfaces = new Map<string, { node: ASTNode; parents: string[] }>();
    for (const definition of document.definitions) {
      if (
        definition.kind === 'InterfaceTypeDefinition' ||
        definition.kind === 'InterfaceTypeExtension'
      ) {
        const key = definition.name.value;
        interfaces.set(key, {
          node: definition,
          parents: [
            ...(interfaces.get(key)?.parents ?? []),
            ...(definition.interfaces ?? []).map((i) => i.name.value),
          ],
        });
      }
    }
    // Bound recursive interface validation independently of SDL's shallow lexical layout.
    const heights = new Map<string, number>(),
      active = new Set<string>();
    const height = (name: string, depth: number): number => {
      if (depth > SDL_LIMITS.interfaceDepth) throw new ResourceLimit('interface-depth-limit');
      if (active.has(name))
        throw new GraphQLError('Circular interface inheritance is invalid.', {
          nodes: interfaces.get(name)!.node,
        });
      const cached = heights.get(name);
      if (cached !== undefined) return cached;
      active.add(name);
      let longest = 0;
      for (const parent of interfaces.get(name)?.parents ?? [])
        longest = Math.max(longest, height(parent, depth + 1));
      active.delete(name);
      heights.set(name, longest + 1);
      if (longest + 1 > SDL_LIMITS.interfaceDepth) throw new ResourceLimit('interface-depth-limit');
      return longest + 1;
    };
    for (const name of interfaces.keys()) height(name, 1);
    const declaredBuiltins = new Set(
      document.definitions
        .filter(
          (d) =>
            (d.kind === 'DirectiveDefinition' || d.kind === 'DirectiveExtension') &&
            builtinDirectives.has(d.name.value),
        )
        .map((d) => ('name' in d ? (d.name?.value ?? '') : '')),
    );
    const coordinate = (
      node: ASTNode,
      path: string,
      kind: SdlCoordinate['kind'],
      type: string | null,
      field: string | null,
    ) => {
      report.coordinates.push({
        path,
        kind,
        type,
        field,
        location: location(node),
        signature: print(node),
      });
    };
    const refs = (node: ASTNode, path: string) => {
      const pending = [node];
      while (pending.length) {
        const current = pending.pop()!;
        if (current.kind === 'NamedType')
          report.references.push({
            from: path,
            to: current.name.value,
            location: location(current),
          });
        if (current.kind === 'Directive') {
          const key = `${path}/@${current.name.value}`;
          applications.set(key, `${applications.get(key) ?? ''}${print(current)}\n`);
          if (
            !builtinDirectives.has(current.name.value) ||
            declaredBuiltins.has(current.name.value)
          )
            report.warnings.push({
              code: declaredBuiltins.has(current.name.value)
                ? 'builtin-directive-redefinition'
                : 'custom-directive-application',
              message: declaredBuiltins.has(current.name.value)
                ? 'An explicitly redefined built-in directive is applied; semantics require human review.'
                : 'Custom directive application semantics are unknown; human review required.',
              path,
              location: location(current),
            });
        }
        for (const child of astChildren(current)) pending.push(child);
      }
    };
    for (const definition of document.definitions) {
      if (isTypeDefinitionNode(definition) || isTypeExtensionNode(definition)) {
        const type = definition.name.value;
        coordinate(definition, type, 'type', type, null);
        // References/applications get the nearest field/argument coordinate, not prose-derived targets.
        if ('interfaces' in definition)
          for (const int of definition.interfaces ?? [])
            report.references.push({ from: type, to: int.name.value, location: location(int) });
        if ('types' in definition)
          for (const member of definition.types ?? [])
            report.references.push({
              from: type,
              to: member.name.value,
              location: location(member),
            });
        for (const directive of definition.directives ?? []) refs(directive, type);
        if ('fields' in definition)
          for (const field of definition.fields ?? []) {
            const path = `${type}.${field.name.value}`;
            coordinate(field, path, 'field', type, field.name.value);
            // Exclude argument subtrees here to avoid duplicated navigation edges.
            if ('type' in field)
              report.references.push({
                from: path,
                to: namedType(field.type),
                location: location(field.type),
              });
            for (const directive of field.directives ?? []) refs(directive, path);
            if ('arguments' in field)
              for (const arg of field.arguments ?? []) {
                const argPath = `${path}(${arg.name.value}:)`;
                coordinate(arg, argPath, 'argument', type, field.name.value);
                refs(arg, argPath);
              }
          }
        if ('values' in definition)
          for (const value of definition.values ?? []) {
            const path = `${type}.${value.name.value}`;
            coordinate(value, path, 'enum-value', type, null);
            refs(value, path);
          }
      } else if (
        definition.kind === 'DirectiveDefinition' ||
        definition.kind === 'DirectiveExtension'
      ) {
        const path = `@${definition.name.value}`;
        coordinate(definition, path, 'directive', null, null);
        for (const directive of definition.directives ?? []) refs(directive, path);
        for (const arg of ('arguments' in definition ? definition.arguments : []) ?? []) {
          coordinate(arg, `${path}(${arg.name.value}:)`, 'argument', null, null);
          refs(arg, `${path}(${arg.name.value}:)`);
        }
      } else if (definition.kind === 'SchemaDefinition' || definition.kind === 'SchemaExtension') {
        coordinate(definition, 'schema', 'root', null, null);
        for (const root of definition.operationTypes ?? []) {
          const path = `schema.${root.operation}`;
          coordinate(root, path, 'root', root.type.name.value, null);
          refs(root, path);
        }
        for (const directive of definition.directives ?? []) refs(directive, 'schema');
      } else
        throw new GraphQLError('Only SDL type-system definitions are supported.', {
          nodes: definition,
        });
    }
    if (report.references.length > SDL_LIMITS.references)
      throw new ResourceLimit('reference-limit');
    // Preserve precise source errors for the common buildASTSchema aggregate-error cases.
    const definitions = new Set<string>(),
      directiveDefinitions = new Set<string>();
    for (const definition of document.definitions) {
      if (isTypeDefinitionNode(definition)) {
        if (definitions.has(definition.name.value))
          throw new GraphQLError('Duplicate type definition.', { nodes: definition });
        definitions.add(definition.name.value);
      }
      if (definition.kind === 'DirectiveDefinition') {
        if (directiveDefinitions.has(definition.name.value))
          throw new GraphQLError('Duplicate directive definition.', { nodes: definition });
        directiveDefinitions.add(definition.name.value);
      }
    }
    for (const definition of document.definitions)
      if (isTypeExtensionNode(definition) && !definitions.has(definition.name.value))
        throw new GraphQLError('Unresolved type extension.', { nodes: definition });
    for (const definition of document.definitions)
      if (
        definition.kind === 'DirectiveExtension' &&
        !directiveDefinitions.has(definition.name.value) &&
        !builtinDirectives.has(definition.name.value)
      )
        throw new GraphQLError('Unresolved directive extension.', { nodes: definition });
    const paths = new Set<string>();
    for (const c of report.coordinates) {
      if (c.kind === 'type' || c.kind === 'directive' || c.path === 'schema') continue;
      if (paths.has(c.path)) {
        report.errors.push({
          code: 'duplicate-coordinate',
          message: 'Duplicate schema member or directive definition.',
          path: c.path,
          location: c.location,
        });
      }
      paths.add(c.path);
    }
    const knownTypes = new Set([...definitions, 'String', 'Int', 'Float', 'Boolean', 'ID']);
    for (const ref of report.references)
      if (!knownTypes.has(ref.to))
        report.errors.push({
          code: 'unknown-type',
          message: 'Referenced type is not defined.',
          location: ref.location,
          path: ref.from,
        });
    if (report.errors.length) return { report, schema: null, document, applications };
    const schema = buildASTSchema(document);
    const errors = validateSchema(schema);
    if (errors.length) {
      for (const error of errors)
        report.errors.push({
          code: 'schema-error',
          message: error.message.slice(0, 2_000),
          path: null,
          location: error.nodes?.[0] ? location(error.nodes[0]) : null,
        });
      return { report, schema: null, document, applications };
    }
    report.status = 'valid';
    return { report, schema, document, applications };
  } catch (error) {
    report.status = error instanceof ResourceLimit ? 'limit' : 'invalid';
    const loc =
      error instanceof GraphQLError && error.positions?.[0] !== undefined
        ? {
            start: error.positions[0],
            end: error.positions[0],
            ...getLocation(new Source(text), error.positions[0]),
          }
        : null;
    report.errors.push({
      code: error instanceof ResourceLimit ? error.message : 'parse-or-build-error',
      message:
        error instanceof ResourceLimit
          ? 'Supported local resource limit exceeded; entire side rejected.'
          : error instanceof GraphQLError
            ? error.message.slice(0, 2_000)
            : 'SDL schema construction failed; no comparison was performed.',
      location: loc,
      path: null,
    });
    report.coordinates = [];
    report.references = [];
    return { report, schema: null, document: null, applications };
  }
}

/** All local static data; no schema execution or client compatibility claim. */
export function compareSdl(beforeText: string, afterText: string): SdlComparison {
  const before = readSide(beforeText),
    after = readSide(afterText);
  const report: SdlComparison = {
    status: 'complete',
    before: before.report,
    after: after.report,
    changes: [],
    counts: { breaking: 0, dangerous: 0, 'non-breaking': 0, unknown: 0 },
    scope: [...SDL_SCOPE],
    limits: { ...SDL_LIMITS },
  };
  if (!before.schema || !after.schema) {
    report.status =
      before.report.status === 'limit' || after.report.status === 'limit' ? 'limit' : 'invalid';
    return report;
  }
  const index = (coordinates: SdlCoordinate[]) => {
    const map = new Map<string, SdlCoordinate>();
    for (const c of coordinates)
      map.set(c.path, { ...c, signature: `${map.get(c.path)?.signature ?? ''}\n${c.signature}` });
    return map;
  };
  const oldCoordinates = index(before.report.coordinates);
  const newCoordinates = index(after.report.coordinates);
  const deltas = [...new Set([...oldCoordinates.keys(), ...newCoordinates.keys()])]
    .filter((path) => oldCoordinates.get(path)?.signature !== newCoordinates.get(path)?.signature)
    .map((path) => newCoordinates.get(path) ?? oldCoordinates.get(path)!);
  const present = (c: SdlCoordinate, side: 'old' | 'new') =>
    (side === 'old' ? oldCoordinates : newCoordinates).has(c.path);
  const fieldType = (schema: GraphQLSchema, c: SdlCoordinate) => {
    const type = c.type ? schema.getType(c.type) : null;
    return type &&
      c.field &&
      (isObjectType(type) || isInterfaceType(type) || isInputObjectType(type))
      ? type.getFields()[c.field]?.type.toString()
      : undefined;
  };
  const candidates = (code: string): SdlCoordinate[] => {
    if (code === 'TYPE_REMOVED' || code === 'TYPE_ADDED')
      return deltas.filter(
        (c) =>
          c.kind === 'type' && (code === 'TYPE_REMOVED' ? !present(c, 'new') : !present(c, 'old')),
      );
    if (code === 'TYPE_CHANGED_KIND')
      return deltas.filter(
        (c) =>
          c.kind === 'type' &&
          before.schema!.getType(c.path)?.constructor !==
            after.schema!.getType(c.path)?.constructor,
      );
    if (code.includes('UNION'))
      return deltas.filter(
        (c) =>
          c.kind === 'type' &&
          (isUnionType(before.schema!.getType(c.path)) ||
            isUnionType(after.schema!.getType(c.path))),
      );
    if (code.startsWith('IMPLEMENTED_INTERFACE'))
      return deltas.filter(
        (c) =>
          c.kind === 'type' &&
          (isObjectType(before.schema!.getType(c.path)) ||
            isInterfaceType(before.schema!.getType(c.path))),
      );
    if (code.startsWith('DIRECTIVE_'))
      return deltas.filter((c) => c.kind === 'directive' || c.path.startsWith('@'));
    if (code.startsWith('ARG_') || code.endsWith('_ARG_ADDED'))
      return deltas.filter((c) => c.kind === 'argument');
    if (code.includes('ENUM'))
      return deltas.filter(
        (c) =>
          c.kind === 'enum-value' &&
          (code === 'VALUE_REMOVED_FROM_ENUM' ? !present(c, 'new') : !present(c, 'old')),
      );
    if (code.includes('FIELD'))
      return deltas.filter(
        (c) =>
          c.kind === 'field' &&
          (code === 'FIELD_REMOVED'
            ? !present(c, 'new')
            : code.includes('ADDED') && !code.includes('DEFAULT')
              ? !present(c, 'old')
              : code === 'FIELD_CHANGED_KIND' || code === 'FIELD_CHANGED_KIND_SAFE'
                ? fieldType(before.schema!, c) !== fieldType(after.schema!, c)
                : true),
      );
    if (code === 'DESCRIPTION_CHANGED') return deltas;
    return deltas.filter((c) => c.kind === 'type');
  };
  const idOccurrences = new Map<string, number>();
  const push = (
    code: string,
    reason: string,
    targets: SdlCoordinate[],
    kind: SdlCategory = category(code),
    exactAllowed = true,
  ) => {
    const target = targets.length === 1 && exactAllowed ? targets[0]! : null;
    let hash = 2166136261;
    for (let i = 0; i < reason.length; i++) hash = Math.imul(hash ^ reason.charCodeAt(i), 16777619);
    const baseId = `${code}:${(hash >>> 0).toString(16)}`;
    const occurrence = (idOccurrences.get(baseId) ?? 0) + 1;
    idOccurrences.set(baseId, occurrence);
    report.changes.push({
      id: `${baseId}:${occurrence}`,
      category: kind,
      code,
      reason: reason.slice(0, 2_000),
      type: target?.type ?? null,
      field: target?.field ?? null,
      path: target?.path ?? null,
      mapping: target ? 'exact' : targets.length ? 'candidates' : 'unmapped',
      candidatePaths: targets.slice(0, 20).map((t) => t.path),
      candidateCount: targets.length,
    });
  };
  const libraryChanges = findSchemaChanges(before.schema, after.schema);
  const codeCounts = new Map<string, number>();
  for (const change of libraryChanges)
    codeCounts.set(change.type, (codeCounts.get(change.type) ?? 0) + 1);
  for (const change of libraryChanges)
    push(
      change.type,
      change.description,
      candidates(change.type),
      category(change.type),
      codeCounts.get(change.type) === 1,
    );
  const warningKeys = new Set<string>();
  for (const side of [before.report, after.report])
    for (const warning of side.warnings) {
      const key = `${warning.code}:${warning.path}`;
      if (!warningKeys.has(key))
        push(
          warning.code,
          warning.message,
          side.coordinates.filter((c) => c.path === warning.path),
          'unknown',
        );
      warningKeys.add(key);
    }
  for (const key of new Set([...before.applications.keys(), ...after.applications.keys()])) {
    if (before.applications.get(key) !== after.applications.get(key))
      push(
        'directive-application-change',
        'Directive application changed; operational effects require human review.',
        [],
        'unknown',
      );
  }
  const roots = (schema: GraphQLSchema) => [
    schema.getQueryType()?.name ?? null,
    schema.getMutationType()?.name ?? null,
    schema.getSubscriptionType()?.name ?? null,
  ];
  if (JSON.stringify(roots(before.schema)) !== JSON.stringify(roots(after.schema)))
    push(
      'schema-roots-changed',
      'Operation root roles changed; library type changes do not prove root compatibility.',
      deltas.filter((c) => c.kind === 'root'),
      'unknown',
    );
  const linked = report.changes.flatMap((c) => c.candidatePaths);
  const uncovered = deltas.filter(
    (c) =>
      !linked.some(
        (path) => path === c.path || path.startsWith(`${c.path}.`) || path.startsWith(`${c.path}(`),
      ),
  );
  if (uncovered.length)
    push(
      'unclassified-ast-change',
      'AST metadata changed without a library classification; inspect source coordinates.',
      uncovered,
      'unknown',
    );
  if (report.changes.length > SDL_LIMITS.changes) {
    report.changes = [];
    report.status = 'limit';
    report.after.errors.push({
      code: 'change-limit',
      message: 'Too many changes; no partial comparison returned.',
      path: null,
      location: null,
    });
    return report;
  }
  for (const change of report.changes) report.counts[change.category]++;
  if (report.changes.some((c) => c.category === 'unknown' || c.mapping !== 'exact'))
    report.status = 'unknown';
  return report;
}

/** Explicit safe-default projection: never raw SDL, AST signatures, library prose/default values or error excerpts. */
export function exportSdlComparison(report: SdlComparison): string {
  const side = (value: SdlSideReport) => ({
    status: value.status,
    errors: value.errors.map(({ code, location, path }) => ({ code, location, path })),
    warnings: value.warnings.map(({ code, location, path }) => ({ code, location, path })),
    coordinates: value.coordinates.map(({ path, kind, type, field, location }) => ({
      path,
      kind,
      type,
      field,
      location,
    })),
    references: value.references.map(({ from, to, location }) => ({ from, to, location })),
  });
  return JSON.stringify(
    {
      format: 'sid-tools/sdl-static/v1',
      status: report.status,
      before: side(report.before),
      after: side(report.after),
      changes: report.changes.map(
        ({ id, category, code, type, field, path, mapping, candidatePaths, candidateCount }) => ({
          id,
          category,
          code,
          type,
          field,
          path,
          mapping,
          candidatePaths,
          candidateCount,
        }),
      ),
      counts: { ...report.counts },
      scope: [...SDL_SCOPE],
      limits: { ...SDL_LIMITS },
    },
    null,
    2,
  );
}
