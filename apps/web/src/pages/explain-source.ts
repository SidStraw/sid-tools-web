export interface ExplainSourceRange {
  start: number;
  end: number;
}

/** Source locator for already validated/bounded JSON only; never a substitute for parseExplain. */
export function locateExplainSources(
  text: string,
  wanted: ReadonlySet<string>,
): Map<string, ExplainSourceRange> {
  const ranges = new Map<string, ExplainSourceRange>(),
    ancestors = new Set<string>(['']),
    lastStarts = new Map<string, number>();
  for (const pointer of wanted) {
    let parent = pointer;
    while (parent) {
      ancestors.add(parent);
      parent = parent.slice(0, parent.lastIndexOf('/'));
    }
  }
  let index = 0;
  const whitespace = () => {
    while (/[\t\r\n ]/.test(text[index] ?? 'x')) index++;
  };
  function stringEnd() {
    index++;
    while (index < text.length) {
      const char = text[index++];
      if (char === '\\') index++;
      else if (char === '"') return;
    }
  }
  function value(pointer: string | null) {
    whitespace();
    const start = index,
      char = text[index];
    if (pointer !== null) lastStarts.set(pointer, start);
    if (char === '{') {
      index++;
      whitespace();
      while (text[index] !== '}') {
        const keyStart = index;
        stringEnd();
        const key = pointer === null ? null : (JSON.parse(text.slice(keyStart, index)) as string);
        whitespace();
        index++; // Colon, certified by the core's JSON.parse.
        const child =
          key === null ? null : `${pointer}/${key.replaceAll('~', '~0').replaceAll('/', '~1')}`;
        const tracked = child !== null && ancestors.has(child) ? child : null;
        value(tracked);
        whitespace();
        if (text[index] !== ',') break;
        index++;
        whitespace();
      }
      index++;
    } else if (char === '[') {
      index++;
      whitespace();
      let ordinal = 0;
      while (text[index] !== ']') {
        const child = pointer === null ? null : `${pointer}/${ordinal++}`;
        value(child !== null && ancestors.has(child) ? child : null);
        whitespace();
        if (text[index] !== ',') break;
        index++;
        whitespace();
      }
      index++;
    } else if (char === '"') stringEnd();
    else while (index < text.length && !/[\t\r\n ,}\]]/.test(text[index]!)) index++;
    if (pointer !== null && wanted.has(pointer)) ranges.set(pointer, { start, end: index });
  }
  value('');
  // JSON.parse is last-wins. A replaced parent can omit earlier descendants, so
  // prune those stale ranges once, rather than scanning all ranges per duplicate.
  for (const [pointer, range] of ranges) {
    let ancestor = pointer;
    while (true) {
      if (range.start < (lastStarts.get(ancestor) ?? 0)) {
        ranges.delete(pointer);
        break;
      }
      if (!ancestor) break;
      ancestor = ancestor.slice(0, ancestor.lastIndexOf('/'));
    }
  }
  return ranges;
}
