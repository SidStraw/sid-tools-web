import { Parser, Composer, CST, isMap, isSeq, isScalar, type Node } from 'yaml';

export const OAS_PARSE_LIMITS = {
  codeUnits: 1_000_000,
  depth: 100,
  nodes: 200_000,
  entries: 10_000,
  scalar: 100_000,
  numericKeyExpansion: 256,
} as const;
export interface OasLocation {
  pointer: string;
  start: number;
  end: number;
  line: number;
  column: number;
}
export interface OasIssue {
  code: string;
  severity: 'error' | 'unknown' | 'info';
  location: OasLocation | null;
}
export interface OasNode {
  kind: 'map' | 'seq' | 'string' | 'number' | 'boolean' | 'null' | 'nonfinite';
  text: string;
  map: Map<string, OasNode>;
  items: OasNode[];
  location: OasLocation;
}
export interface OasParsed {
  status: 'valid' | 'invalid' | 'limit';
  issues: OasIssue[];
  root: OasNode | null;
}
export const escapeOasPointer = (key: string) => key.replaceAll('~', '~0').replaceAll('/', '~1');
class Rejected extends Error {
  constructor(
    readonly code: string,
    readonly limit = false,
    readonly offset = 0,
  ) {
    super(code);
  }
}

/** Exact decimal coefficient/exponent, never expand an attacker-controlled exponent. */
function numeric(source: string): string | null {
  if (/^0[xo][\da-f]+$/i.test(source)) {
    if (source.length > 4_096) return null;
    try {
      return numeric(BigInt(source).toString());
    } catch {
      return null;
    }
  }
  const match = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(source);
  if (!match || !(match[2] || match[3]) || (match[4]?.replace(/^[+-]/, '').length ?? 0) > 6)
    return null;
  let digits = `${match[2]}${match[3] ?? ''}`.replace(/^0+/, '');
  if (!digits) return '0e0';
  let exponent = Number(match[4] ?? 0) - (match[3]?.length ?? 0);
  const stripped = digits.replace(/0+$/, '');
  exponent += digits.length - stripped.length;
  digits = stripped;
  return `${match[1] === '-' ? '-' : ''}${digits}e${exponent}`;
}
function numberKey(canonical: string): string {
  const at = canonical.lastIndexOf('e'),
    coefficient = canonical.slice(0, at),
    exponent = Number(canonical.slice(at + 1));
  const negative = coefficient.startsWith('-'),
    digits = negative ? coefficient.slice(1) : coefficient;
  if (Math.abs(exponent) + digits.length > OAS_PARSE_LIMITS.numericKeyExpansion)
    throw new Rejected('numeric-key-expansion-limit', true);
  const point = digits.length + exponent;
  return `${negative ? '-' : ''}${point <= 0 ? `0.${'0'.repeat(-point)}${digits}` : point >= digits.length ? digits + '0'.repeat(point - digits.length) : `${digits.slice(0, point)}.${digits.slice(point)}`}`;
}

export function parseOpenApiSource(text: string): OasParsed {
  const issues: OasIssue[] = [];
  const lines = [0];
  const locate = (pointer: string, start: number, end: number): OasLocation => {
    let lo = 0,
      hi = lines.length;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >>> 1;
      if (lines[mid]! <= start) lo = mid;
      else hi = mid;
    }
    return { pointer, start, end, line: lo + 1, column: start - lines[lo]! + 1 };
  };
  try {
    if (text.length > OAS_PARSE_LIMITS.codeUnits) throw new Rejected('input-limit', true);
    for (let i = 0; i < text.length; i++) if (text[i] === '\n') lines.push(i + 1);
    const accepted: CST.Token[] = [];
    let documents = 0,
      nodes = 0;
    for (const token of new Parser().parse(text)) {
      const pending: { token: unknown; depth: number }[] = [{ token, depth: 0 }];
      const keys: CST.Token[] = [];
      while (pending.length) {
        const current = pending.pop()!;
        if (!current.token || typeof current.token !== 'object') continue;
        const item = current.token as Record<string, unknown>;
        const type = item.type;
        if (++nodes > OAS_PARSE_LIMITS.nodes) throw new Rejected('token-node-limit', true);
        if (type === 'document' && ++documents > 1) throw new Rejected('multiple-documents');
        if (
          [
            'directive',
            'directive-line',
            'anchor',
            'tag',
            'alias',
            'explicit-key-ind',
            'error',
          ].includes(String(type))
        )
          throw new Rejected(
            'forbidden-yaml-token',
            false,
            typeof item.offset === 'number' ? item.offset : 0,
          );
        const collection =
          type === 'block-map' || type === 'block-seq' || type === 'flow-collection';
        const depth = current.depth + (collection ? 1 : 0);
        if (depth > OAS_PARSE_LIMITS.depth) throw new Rejected('token-depth-limit', true);
        if (collection && Array.isArray(item.items) && item.items.length > OAS_PARSE_LIMITS.entries)
          throw new Rejected('entry-limit', true);
        if (
          typeof item.source === 'string' &&
          ['scalar', 'single-quoted-scalar', 'double-quoted-scalar', 'block-scalar'].includes(
            String(type),
          ) &&
          item.source.length > OAS_PARSE_LIMITS.scalar
        )
          throw new Rejected('scalar-limit', true);
        if ('key' in item && item.key === null) throw new Rejected('complex-key');
        if ('key' in item && item.key != null) {
          const key = item.key as CST.Token;
          if (!CST.isScalar(key)) throw new Rejected('complex-key');
          keys.push(key);
        }
        for (const value of Object.values(item)) {
          if (Array.isArray(value)) {
            for (const child of value)
              if (child && typeof child === 'object') pending.push({ token: child, depth });
          }
        }
        // Object-valued properties are separate from array children (avoid dangling-else ambiguity).
        for (const value of Object.values(item))
          if (!Array.isArray(value) && value && typeof value === 'object')
            pending.push({ token: value, depth });
      }
      for (const key of keys)
        if (CST.resolveAsScalar(key, true)?.value === '<<') throw new Rejected('merge-key');
      accepted.push(token);
    }
    // The exact accepted token objects, never reparsed text, enter recursive Composer.
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
        'yaml-document-error',
        false,
        docs[0]?.errors[0]?.pos[0] ?? docs[0]?.warnings[0]?.pos[0] ?? 0,
      );
    const doc = docs[0]!;
    let root: OasNode | null = null;
    const stack: { source: Node | null; pointer: string; attach: (node: OasNode) => void }[] = [
      {
        source: doc.contents,
        pointer: '',
        attach: (node) => {
          root = node;
        },
      },
    ];
    while (stack.length) {
      const { source, pointer, attach } = stack.pop()!;
      const node: OasNode = {
        kind: 'null',
        text: '',
        map: new Map(),
        items: [],
        location: locate(pointer, source?.range?.[0] ?? 0, source?.range?.[1] ?? 0),
      };
      attach(node);
      if (isMap(source)) {
        node.kind = 'map';
        const pairs: { key: string; value: Node | null }[] = [];
        for (const pair of source.items) {
          if (!isScalar(pair.key)) throw new Rejected('non-scalar-key');
          let key: string;
          if (typeof pair.key.value === 'string') key = pair.key.value;
          else if (typeof pair.key.value === 'number') {
            const canonical = numeric(pair.key.source ?? '');
            if (canonical === null) throw new Rejected('non-json-key');
            key = numberKey(canonical);
          } else throw new Rejected('non-json-key');
          if (key === '<<') throw new Rejected('merge-key');
          if (node.map.has(key))
            throw new Rejected('normalized-duplicate-key', false, pair.key.range?.[0] ?? 0);
          node.map.set(key, node); // Reservation detects duplicates before child projection.
          pairs.push({ key, value: pair.value as Node | null });
        }
        for (const pair of pairs.reverse())
          stack.push({
            source: pair.value,
            pointer: `${pointer}/${escapeOasPointer(pair.key)}`,
            attach: (child) => {
              node.map.set(pair.key, child);
            },
          });
      } else if (isSeq(source)) {
        node.kind = 'seq';
        node.items = new Array<OasNode>(source.items.length);
        for (let i = source.items.length - 1; i >= 0; i--)
          stack.push({
            source: source.items[i] as Node | null,
            pointer: `${pointer}/${i}`,
            attach: (child) => {
              node.items[i] = child;
            },
          });
      } else if (isScalar(source)) {
        if (typeof source.value === 'string') {
          node.kind = 'string';
          node.text = source.value;
        } else if (typeof source.value === 'boolean') {
          node.kind = 'boolean';
          node.text = String(source.value);
        } else if (typeof source.value === 'number') {
          const canonical = numeric(source.source ?? '');
          node.kind = canonical === null ? 'nonfinite' : 'number';
          node.text = canonical ?? '';
        } else if (source.value !== null) throw new Rejected('unsupported-scalar');
      } else if (source !== null) throw new Rejected('unsupported-node');
    }
    return { status: 'valid', issues, root };
  } catch (error) {
    const reject = error instanceof Rejected ? error : new Rejected('yaml-parser-error');
    issues.push({
      code: reject.code,
      severity: 'error',
      location: locate('', reject.offset, reject.offset),
    });
    return { status: reject.limit ? 'limit' : 'invalid', issues, root: null };
  }
}
