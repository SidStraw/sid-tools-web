import { Parser, Composer, CST, isMap, isSeq, isScalar, type Node } from 'yaml';
export const COMPOSE_LIMITS = {
  codeUnits: 500_000,
  tokenNodes: 100_000,
  depth: 64,
  entries: 10_000,
  scalarUnits: 65_536,
  services: 128,
  networks: 128,
  volumes: 128,
  references: 4000,
  diagnostics: 500,
  graphWork: 100_000,
  nameUnits: 256,
  pathUnits: 2048,
  totalPathUnits: 1_000_000,
} as const;
export interface ComposeLocation {
  path: string;
  start: number;
  end: number;
  line: number;
  column: number;
}
export interface ComposeNode {
  kind: 'map' | 'seq' | 'string' | 'number' | 'boolean' | 'null';
  value: string;
  map: Map<string, ComposeNode>;
  items: ComposeNode[];
  location: ComposeLocation;
  keyLocation?: ComposeLocation;
}
export interface ComposeParseResult {
  status: 'parsed' | 'invalid' | 'unsupported' | 'limit';
  root: ComposeNode | null;
  code: string | null;
  location: ComposeLocation | null;
}
const escape = (value: string) => value.replaceAll('~', '~0').replaceAll('/', '~1');
class Rejected extends Error {
  constructor(
    readonly status: ComposeParseResult['status'],
    readonly code: string,
    readonly offset = 0,
  ) {
    super(code);
  }
}
/** Private, separate bounded YAML adapter. Only accepted CST objects reach recursive Composer. */
export function parseComposeSource(source: string): ComposeParseResult {
  const lines = [0];
  const locate = (path: string, start: number, end: number): ComposeLocation => {
    let lo = 0,
      hi = lines.length;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >>> 1;
      if (lines[mid]! <= start) lo = mid;
      else hi = mid;
    }
    return { path, start, end, line: lo + 1, column: start - lines[lo]! + 1 };
  };
  try {
    if (source.length > COMPOSE_LIMITS.codeUnits) throw new Rejected('limit', 'input-limit');
    for (let i = 0; i < source.length; i++)
      if (source[i] === '\n' || (source[i] === '\r' && source[i + 1] !== '\n')) lines.push(i + 1);
    const accepted: CST.Token[] = [];
    let count = 0,
      documents = 0;
    for (const token of new Parser().parse(source)) {
      const stack: { token: unknown; depth: number }[] = [{ token, depth: 0 }];
      while (stack.length) {
        const frame = stack.pop()!;
        if (!frame.token || typeof frame.token !== 'object') continue;
        const item = frame.token as Record<string, unknown>,
          type = String(item.type),
          offset = typeof item.offset === 'number' ? item.offset : 0;
        if (++count > COMPOSE_LIMITS.tokenNodes)
          throw new Rejected('limit', 'token-node-limit', offset);
        if (type === 'document' && ++documents > 1)
          throw new Rejected('unsupported', 'multiple-documents-unsupported', offset);
        if (
          ['directive', 'directive-line', 'anchor', 'tag', 'alias', 'explicit-key-ind'].includes(
            type,
          )
        )
          throw new Rejected('unsupported', 'yaml-feature-unsupported', offset);
        if (type === 'error') throw new Rejected('invalid', 'yaml-token-invalid', offset);
        const collection = ['block-map', 'block-seq', 'flow-collection'].includes(type),
          depth = frame.depth + (collection ? 1 : 0);
        if (depth > COMPOSE_LIMITS.depth) throw new Rejected('limit', 'depth-limit', offset);
        if (collection && Array.isArray(item.items) && item.items.length > COMPOSE_LIMITS.entries)
          throw new Rejected('limit', 'collection-limit', offset);
        if (typeof item.source === 'string' && item.source.length > COMPOSE_LIMITS.scalarUnits)
          throw new Rejected('limit', 'token-text-limit', offset);
        if ('key' in item && item.key != null) {
          const key = item.key as CST.Token;
          if (!CST.isScalar(key))
            throw new Rejected('unsupported', 'complex-key-unsupported', offset);
          if (CST.resolveAsScalar(key, true)?.value === '<<')
            throw new Rejected('unsupported', 'merge-unsupported', offset);
        }
        for (const child of Object.values(item)) {
          if (Array.isArray(child)) {
            for (const value of child)
              if (value && typeof value === 'object') stack.push({ token: value, depth });
          } else if (child && typeof child === 'object') stack.push({ token: child, depth });
        }
      }
      accepted.push(token);
    }
    const docs = [
      ...new Composer({
        version: '1.2',
        schema: 'core',
        uniqueKeys: true,
        merge: false,
        strict: true,
        prettyErrors: false,
      }).compose(accepted),
    ];
    if (docs.length !== 1 || docs[0]!.errors.length || docs[0]!.warnings.length)
      throw new Rejected(
        'invalid',
        'yaml-document-invalid',
        docs[0]?.errors[0]?.pos[0] ?? docs[0]?.warnings[0]?.pos[0] ?? 0,
      );
    let root: ComposeNode | null = null,
      nodes = 0,
      pathUnits = 0;
    const stack: { node: Node | null; path: string; attach: (value: ComposeNode) => void }[] = [
      {
        node: docs[0]!.contents,
        path: '',
        attach: (value) => {
          root = value;
        },
      },
    ];
    while (stack.length) {
      const { node, path, attach } = stack.pop()!;
      pathUnits += path.length;
      if (path.length > COMPOSE_LIMITS.pathUnits || pathUnits > COMPOSE_LIMITS.totalPathUnits)
        throw new Rejected('limit', 'path-budget', node?.range?.[0]);
      if (++nodes > COMPOSE_LIMITS.tokenNodes)
        throw new Rejected('limit', 'node-limit', node?.range?.[0]);
      const result: ComposeNode = {
        kind: 'null',
        value: '',
        map: new Map(),
        items: [],
        location: locate(path, node?.range?.[0] ?? 0, node?.range?.[1] ?? 0),
      };
      attach(result);
      if (isMap(node)) {
        result.kind = 'map';
        for (let i = node.items.length - 1; i >= 0; i--) {
          const pair = node.items[i]!;
          if (!isScalar(pair.key) || typeof pair.key.value !== 'string')
            throw new Rejected('invalid', 'string-map-key-required', node.range?.[0]);
          const key = pair.key.value;
          const keyNode = pair.key;
          if (key.length > COMPOSE_LIMITS.nameUnits)
            throw new Rejected('limit', 'key-size-limit', pair.key.range?.[0]);
          // Dynamic names may contain sensitive interpolation defaults: never copy them into paths.
          const segment = key.includes('$') ? `@dynamic:${i}` : escape(key);
          stack.push({
            node: pair.value as Node | null,
            path: `${path}/${segment}`,
            attach: (value) => {
              value.keyLocation = locate(
                `${path}/${segment}`,
                keyNode.range?.[0] ?? 0,
                keyNode.range?.[1] ?? 0,
              );
              if (
                pair.value === null ||
                (value.kind === 'null' && value.location.start === value.location.end)
              )
                value.location = value.keyLocation;
              result.map.set(key, value);
            },
          });
        }
      } else if (isSeq(node)) {
        result.kind = 'seq';
        result.items = new Array<ComposeNode>(node.items.length);
        for (let i = node.items.length - 1; i >= 0; i--)
          stack.push({
            node: node.items[i] as Node | null,
            path: `${path}/${i}`,
            attach: (value) => {
              result.items[i] = value;
            },
          });
      } else if (isScalar(node)) {
        if (typeof node.value === 'string') {
          result.kind = 'string';
          result.value = node.value;
        } else if (typeof node.value === 'number') {
          result.kind = 'number';
          result.value = node.source ?? '';
        } else if (typeof node.value === 'boolean') {
          result.kind = 'boolean';
          result.value = String(node.value);
        } else if (node.value !== null)
          throw new Rejected('unsupported', 'scalar-unsupported', node.range?.[0]);
      } else if (node !== null) throw new Rejected('unsupported', 'node-unsupported');
    }
    return { status: 'parsed', root, code: null, location: null };
  } catch (error) {
    const rejected =
      error instanceof Rejected ? error : new Rejected('invalid', 'yaml-parser-invalid');
    return {
      status: rejected.status,
      root: null,
      code: rejected.code,
      location: locate('', rejected.offset, rejected.offset),
    };
  }
}
