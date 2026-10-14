import { parse, stringify, isLosslessNumber, compareLosslessNumber } from 'lossless-json';
export const serializeJson = (value: unknown) => stringify(value, null, 2) ?? 'null';
function kind(v: unknown): string {
  return isLosslessNumber(v)
    ? 'number'
    : v === null
      ? 'null'
      : Array.isArray(v)
        ? 'array'
        : typeof v;
}
function parseInput(text: string, label: string): unknown {
  if (new TextEncoder().encode(text).byteLength > 2_000_000)
    throw new Error(`${label}：上限 2 MB。`);
  let depth = 0,
    quoted = false,
    escaped = false;
  for (const c of text) {
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === '{' || c === '[') {
      if (++depth > 100) throw new Error(`${label}：巢狀上限 100 層。`);
    } else if (c === '}' || c === ']') depth--;
  }
  // Prefix property names before parsing: lossless-json assigns into ordinary objects,
  // where a raw __proto__ key would otherwise be consumed by a prototype setter.
  const insertions: number[] = [];
  let begin = -1,
    inString = false,
    escapeNext = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inString) {
      if (escapeNext) escapeNext = false;
      else if (char === '\\') escapeNext = true;
      else if (char === '"') {
        inString = false;
        let next = i + 1;
        while (/\s/.test(text[next] ?? '') && next < text.length) next++;
        if (text[next] === ':') insertions.push(begin + 1);
      }
    } else if (char === '"') {
      inString = true;
      begin = i;
    }
  }
  let source = '',
    previous = 0;
  for (const offset of insertions) {
    source += text.slice(previous, offset) + '$';
    previous = offset;
  }
  source += text.slice(previous);
  function restore(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(restore);
    if (kind(v) === 'object') {
      const result: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
      for (const [key, value] of Object.entries(v as Record<string, unknown>))
        result[key.slice(1)] = restore(value);
      return result;
    }
    return v;
  }
  try {
    return restore(parse(source));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const pos = /position (\d+)/.exec(message);
    const transformedOffset = pos ? Number(pos[1]) : 0;
    const offset =
      transformedOffset - insertions.filter((at, index) => at + index < transformedOffset).length;
    const prefix = text.slice(0, offset).split('\n');
    throw new Error(
      `${label}：第 ${prefix.length} 行、第 ${(prefix.at(-1)?.length ?? 0) + 1} 欄。${message.replace("Duplicate key '$", "Duplicate key '").replace(/position \d+/, `position ${offset}`)}`,
    );
  }
}
export interface JsonChange {
  path: string;
  type: 'added' | 'removed' | 'type' | 'value';
  before?: unknown;
  after?: unknown;
}
export function compareJson(beforeText: string, afterText: string, ignoreText = '', arrayKey = '') {
  const before = parseInput(beforeText, '左側 JSON'),
    after = parseInput(afterText, '右側 JSON');
  const rules = ignoreText
    .split('\n')
    .map((x) => x.trim())
    .filter(Boolean);
  if (rules.length > 50 || rules.some((r) => !r.startsWith('/') || /~(?![01])/.test(r)))
    throw new Error('忽略規則上限 50 條；每行以 / 開頭，~ 寫成 ~0，/ 寫成 ~1；* 代表一層。');
  const changes: JsonChange[] = [],
    ignored = new Set<string>(),
    conflicts: string[] = [];
  let visited = 0;
  const escape = (s: string) => s.replace(/~/g, '~0').replace(/\//g, '~1');
  const ignoredAt = (path: string) =>
    rules.some((rule) => {
      const a = rule.split('/'),
        b = path.split('/');
      return a.length === b.length && a.every((v, i) => v === '*' || v === b[i]);
    });
  function walk(a: unknown, b: unknown, path: string, hasA = true, hasB = true) {
    if (++visited > 100_000 || changes.length >= 5000)
      throw new Error('比較超出 100,000 個節點或 5,000 筆差異；請縮小輸入，不會輸出不完整結果。');
    if (ignoredAt(path)) {
      ignored.add(path);
      return;
    }
    if (!hasA) {
      changes.push({ path, type: 'added', after: b });
      return;
    }
    if (!hasB) {
      changes.push({ path, type: 'removed', before: a });
      return;
    }
    if (kind(a) !== kind(b)) {
      changes.push({ path, type: 'type', before: a, after: b });
      return;
    }
    if (isLosslessNumber(a) && isLosslessNumber(b)) {
      if (compareLosslessNumber(a, b) !== 0)
        changes.push({ path, type: 'value', before: a, after: b });
      return;
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      if (arrayKey && [...a, ...b].some((v) => kind(v) === 'object')) {
        const index = (values: unknown[], side: string) => {
          const entries = new Map<string, unknown>();
          for (const value of values) {
            const id =
              kind(value) === 'object' ? (value as Record<string, unknown>)[arrayKey] : undefined;
            if (typeof id !== 'string' && !isLosslessNumber(id)) {
              conflicts.push(`${path || '/'}：${side}缺少有效 ${arrayKey}（僅支援字串或數字）。`);
              return null;
            }
            // Number IDs retain their source spelling so distinct large integers never collapse.
            const key = `${kind(id)}:${serializeJson(id)}`;
            if (entries.has(key)) {
              conflicts.push(
                `${path || '/'}：${side}重複 ${arrayKey}=${serializeJson(id)}，未自動配對。`,
              );
              return null;
            }
            entries.set(key, value);
          }
          return entries;
        };
        const x = index(a, '左側'),
          y = index(b, '右側');
        if (!x || !y) return;
        for (const id of new Set([...x.keys(), ...y.keys()]))
          walk(
            x.get(id),
            y.get(id),
            `${path}/${escape('@' + arrayKey + '=' + id)}`,
            x.has(id),
            y.has(id),
          );
      } else
        for (let i = 0; i < Math.max(a.length, b.length); i++)
          walk(a[i], b[i], `${path}/${i}`, i < a.length, i < b.length);
    } else if (kind(a) === 'object') {
      const x = a as Record<string, unknown>,
        y = b as Record<string, unknown>;
      for (const key of new Set([...Object.keys(x), ...Object.keys(y)]))
        walk(
          x[key],
          y[key],
          `${path}/${escape(key)}`,
          Object.hasOwn(x, key),
          Object.hasOwn(y, key),
        );
    } else if (a !== b) changes.push({ path, type: 'value', before: a, after: b });
  }
  walk(before, after, '');
  return {
    changes,
    ignoredPaths: [...ignored],
    ignoreRules: rules,
    arrayKey: arrayKey || null,
    conflicts,
    summary: conflicts.length
      ? '存在配對衝突，結果不完整'
      : changes.length
        ? `${changes.length} 筆差異${ignored.size ? '（已套用忽略規則）' : ''}`
        : rules.length
          ? '未忽略部分相同（不代表完整 JSON 相同）'
          : '兩份 JSON 相同',
  };
}
