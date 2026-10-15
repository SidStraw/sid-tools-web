import { ident, parse, walk, type CssNode } from 'css-tree';

export const SELECTOR_LIMITS = {
  selectors: 20,
  selectorCodeUnits: 1_000,
  inputCodeUnits: 20_000,
  nesting: 16,
  astNodes: 2_048,
} as const;
export type Specificity = [number, number, number];
export interface SelectorSpan {
  start: number;
  end: number;
}
export interface SelectorContribution {
  rule:
    | 'id'
    | 'class'
    | 'attribute'
    | 'type'
    | 'pseudo-class'
    | 'pseudo-element'
    | 'maximum'
    | 'where'
    | 'nth'
    | 'branch';
  span: SelectorSpan;
  specificity: Specificity;
  children: SelectorContribution[];
}
export interface SelectorAnalysis {
  text: string;
  span: SelectorSpan;
  status: 'ok' | 'invalid' | 'unsupported';
  reason: string | null;
  specificity: Specificity | null;
  contributions: SelectorContribution[];
  matching: 'eligible' | 'not-evaluated' | 'not-matchable' | 'unsupported';
  dynamicPseudos: string[];
  pseudoElements: string[];
  attributes: string[];
  tags: string[];
  namespaces: string[];
}
export interface SelectorListAnalysis {
  status: 'ok' | 'invalid' | 'unsupported' | 'limit';
  reason: string | null;
  selectors: SelectorAnalysis[];
  limits: typeof SELECTOR_LIMITS;
  supportRules: string[];
}
export const SELECTOR_SUPPORT_RULES: readonly string[] = [
  'Each top-level complex selector has its own (ID, class/attribute/pseudo-class, type/pseudo-element) tuple, not a maximum for the input list. Specificity is not a complete cascade simulation.',
  ':is/:not/:has substitute the lexicographic maximum argument; :where contributes zero but every argument must be understood. nth-child/nth-last-child add one pseudo-class plus the maximum of-list. No forgiving-list branch is silently discarded.',
  'Only explicitly allowlisted pseudo semantics are scored. Unknown/Raw/nesting selectors, nested :has, pseudo-elements in logical arguments and unrecognized functions have no rank. Functional pseudo-elements, lang/dir and nth-of-type functions are not supported in this subset.',
  'Known state-dependent pseudos have specificity but are never evaluated. Pseudo-elements have specificity only. Namespaced names have specificity but matching needs a namespace context unavailable to this adapter. Eligible means only safe to attempt inert native matching, not browser support or actual matches.',
  'Spans are zero-based UTF-16 offsets into the original selector list, end-exclusive. Metadata records all argument branches, not just the specificity-winning branch. Raw source and decoded names remain untrusted text.',
];

const STATIC = new Set([
  'root',
  'empty',
  'scope',
  'first-child',
  'last-child',
  'only-child',
  'first-of-type',
  'last-of-type',
  'only-of-type',
  'checked',
  'disabled',
  'enabled',
  'default',
  'optional',
  'required',
  'read-only',
  'read-write',
  'link',
  'any-link',
]);
const DYNAMIC = new Set([
  'hover',
  'active',
  'focus',
  'focus-within',
  'focus-visible',
  'target',
  'target-within',
  'visited',
  'valid',
  'invalid',
  'user-valid',
  'user-invalid',
  'in-range',
  'out-of-range',
  'autofill',
  'modal',
  'popover-open',
  'fullscreen',
  'picture-in-picture',
  'playing',
  'paused',
  'defined',
  'indeterminate',
  'placeholder-shown',
]);
const ELEMENTS = new Set([
  'before',
  'after',
  'first-line',
  'first-letter',
  'marker',
  'placeholder',
  'selection',
  'backdrop',
]);
const LEGACY = new Set(['before', 'after', 'first-line', 'first-letter']);
const add = (a: Specificity, b: Specificity): Specificity => [
  a[0] + b[0],
  a[1] + b[1],
  a[2] + b[2],
];
const compare = (a: Specificity, b: Specificity) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const span = (node: CssNode): SelectorSpan => ({
  start: node.loc!.start.offset,
  end: node.loc!.end.offset,
});
class Unsupported extends Error {}
class Invalid extends Error {}

// Lexical resource guard only, not a selector parser. Syntax/AST comes from css-tree.
function preflight(text: string): number | { status: 'limit' | 'invalid'; reason: string } {
  let depth = 0,
    start = 0,
    count = 1,
    quote = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '\\') {
      i++;
      continue;
    }
    if (quote) {
      if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      if (end < 0) return { status: 'invalid', reason: 'unfinished-comment' };
      i = end + 1;
      continue;
    }
    if (c === '(' || c === '[') {
      if (++depth > SELECTOR_LIMITS.nesting) return { status: 'limit', reason: 'nesting-limit' };
    }
    if (c === ')' || c === ']') depth--;
    if (c === ',' && depth === 0) {
      if (i - start > SELECTOR_LIMITS.selectorCodeUnits)
        return { status: 'limit', reason: 'selector-length-limit' };
      start = i + 1;
      if (++count > SELECTOR_LIMITS.selectors)
        return { status: 'limit', reason: 'selector-count-limit' };
    }
  }
  return text.length - start > SELECTOR_LIMITS.selectorCodeUnits
    ? { status: 'limit', reason: 'selector-length-limit' }
    : count;
}

function namespacePart(name: string): {
  local: string;
  namespace: string | null;
  universal: boolean;
} {
  for (let i = 0; i < name.length; i++) {
    if (name[i] === '\\') {
      i++;
      continue;
    }
    if (name[i] === '|')
      return {
        local: ident.decode(name.slice(i + 1)),
        namespace: ident.decode(name.slice(0, i)),
        universal: name.slice(i + 1) === '*',
      };
  }
  return { local: ident.decode(name), namespace: null, universal: name === '*' };
}

/** Pure specificity analysis. No DOM, HTML parsing, native matching or URL requests. */
export function analyzeSelectors(text: string): SelectorListAnalysis {
  const report: SelectorListAnalysis = {
    status: 'ok',
    reason: null,
    selectors: [],
    limits: { ...SELECTOR_LIMITS },
    supportRules: [...SELECTOR_SUPPORT_RULES],
  };
  if (text.length > SELECTOR_LIMITS.inputCodeUnits)
    return { ...report, status: 'limit', reason: 'input-length-limit' };
  const checked = preflight(text);
  if (typeof checked !== 'number') return { ...report, ...checked };
  let ast: CssNode;
  try {
    ast = parse(text, {
      context: 'selectorList',
      positions: true,
      onParseError(error) {
        throw error;
      },
    });
  } catch {
    return { ...report, status: 'invalid', reason: 'parser-error' };
  }
  let count = 0;
  try {
    walk(ast, () => {
      if (++count > SELECTOR_LIMITS.astNodes) throw new Unsupported('ast-node-limit');
    });
  } catch {
    return { ...report, status: 'limit', reason: 'ast-node-limit' };
  }
  if (ast.type !== 'SelectorList' || ast.children.isEmpty)
    return { ...report, status: 'invalid', reason: 'empty-selector-list' };
  if (ast.children.size > SELECTOR_LIMITS.selectors)
    return { ...report, status: 'limit', reason: 'selector-count-limit' };
  if (ast.children.size !== checked)
    return { ...report, status: 'invalid', reason: 'empty-selector-branch' };
  for (const branch of ast.children) {
    const result: SelectorAnalysis = {
      text: text.slice(span(branch).start, span(branch).end),
      span: span(branch),
      status: 'ok',
      reason: null,
      specificity: null,
      contributions: [],
      matching: 'eligible',
      dynamicPseudos: [],
      pseudoElements: [],
      attributes: [],
      tags: [],
      namespaces: [],
    };
    const remember = (list: string[], value: string) => {
      if (!list.includes(value)) list.push(value);
    };
    const named = (name: string, target: string[]) => {
      const part = namespacePart(name);
      remember(target, part.local);
      if (part.namespace !== null) remember(result.namespaces, part.namespace);
      return part.local;
    };
    const contribution = (
      node: CssNode,
      rule: SelectorContribution['rule'],
      specificity: Specificity,
      children: SelectorContribution[] = [],
    ): SelectorContribution => ({ rule, span: span(node), specificity, children });
    function selector(
      node: CssNode,
      relative: boolean,
      inHas: boolean,
      argument: boolean,
    ): SelectorContribution {
      if (node.type !== 'Selector' || node.children.isEmpty) throw new Invalid('empty-selector');
      const children: SelectorContribution[] = [];
      let needsSimple = true,
        compoundType = false,
        afterElement = false,
        leadingCombinator = false;
      for (const child of node.children) {
        if (child.type === 'Combinator') {
          if (![' ', '>', '+', '~'].includes(child.name)) throw new Unsupported('combinator');
          if (needsSimple && !(relative && children.length === 0 && !leadingCombinator))
            throw new Invalid('combinator-position');
          if (children.length === 0) leadingCombinator = true;
          if (afterElement) throw new Unsupported('pseudo-element-position');
          needsSimple = true;
          compoundType = false;
          continue;
        }
        if (afterElement) throw new Unsupported('pseudo-element-position');
        if (child.type === 'TypeSelector') {
          if (compoundType || !needsSimple) throw new Invalid('type-position');
          compoundType = true;
        }
        children.push(simple(child, inHas, argument));
        afterElement =
          child.type === 'PseudoElementSelector' ||
          (child.type === 'PseudoClassSelector' &&
            LEGACY.has(ident.decode(child.name).toLowerCase()));
        needsSimple = false;
      }
      if (needsSimple) throw new Invalid('trailing-combinator');
      return contribution(
        node,
        'branch',
        children.reduce((sum, item) => add(sum, item.specificity), [0, 0, 0] as Specificity),
        children,
      );
    }
    function maximum(node: CssNode, relative: boolean, inHas: boolean): SelectorContribution[] {
      if (node.type !== 'SelectorList' || node.children.isEmpty)
        throw new Invalid('selector-arguments');
      return [...node.children].map((child) => selector(child, relative, inHas, true));
    }
    const max = (items: SelectorContribution[]): Specificity =>
      items.reduce<Specificity>(
        (best, item) => (compare(item.specificity, best) > 0 ? item.specificity : best),
        [0, 0, 0],
      );
    function simple(node: CssNode, inHas: boolean, argument: boolean): SelectorContribution {
      switch (node.type) {
        case 'IdSelector':
          return contribution(node, 'id', [1, 0, 0]);
        case 'ClassSelector':
          return contribution(node, 'class', [0, 1, 0]);
        case 'TypeSelector':
          named(node.name, result.tags);
          return contribution(node, 'type', [0, 0, namespacePart(node.name).universal ? 0 : 1]);
        case 'AttributeSelector':
          named(node.name.name, result.attributes);
          if (node.flags && !['i', 's'].includes(node.flags.toLowerCase()))
            throw new Unsupported('attribute-flag');
          return contribution(node, 'attribute', [0, 1, 0]);
        case 'PseudoElementSelector': {
          const name = ident.decode(node.name).toLowerCase();
          if (argument || node.children !== null || !ELEMENTS.has(name))
            throw new Unsupported('pseudo-element');
          remember(result.pseudoElements, name);
          return contribution(node, 'pseudo-element', [0, 0, 1]);
        }
        case 'PseudoClassSelector': {
          const name = ident.decode(node.name).toLowerCase();
          if (node.children === null) {
            if (LEGACY.has(name)) {
              if (argument) throw new Unsupported('pseudo-element-argument');
              remember(result.pseudoElements, name);
              return contribution(node, 'pseudo-element', [0, 0, 1]);
            }
            if (DYNAMIC.has(name)) remember(result.dynamicPseudos, name);
            else if (!STATIC.has(name)) throw new Unsupported('unknown-pseudo');
            return contribution(node, 'pseudo-class', [0, 1, 0]);
          }
          const args = [...node.children];
          if (['is', 'not', 'where', 'has'].includes(name)) {
            if (name === 'has' && inHas) throw new Unsupported('nested-has');
            if (args.length !== 1) throw new Unsupported('logical-arguments');
            const children = maximum(args[0]!, name === 'has', inHas || name === 'has');
            return contribution(
              node,
              name === 'where' ? 'where' : 'maximum',
              name === 'where' ? [0, 0, 0] : max(children),
              children,
            );
          }
          if (name === 'nth-child' || name === 'nth-last-child') {
            const nth = args[0];
            if (args.length !== 1 || nth?.type !== 'Nth') throw new Unsupported('nth-arguments');
            if (
              nth.nth.type === 'Identifier' &&
              !['odd', 'even'].includes(ident.decode(nth.nth.name).toLowerCase())
            )
              throw new Invalid('nth-expression');
            const children = nth.selector ? maximum(nth.selector, false, inHas) : [];
            return contribution(node, 'nth', add([0, 1, 0], max(children)), children);
          }
          throw new Unsupported('unknown-function');
        }
        default:
          throw new Unsupported(node.type === 'Raw' ? 'raw-syntax' : 'unknown-node');
      }
    }
    try {
      const scored = selector(branch, false, false, false);
      result.specificity = scored.specificity;
      result.contributions = scored.children;
      result.matching =
        result.pseudoElements.length || result.namespaces.length
          ? 'not-matchable'
          : result.dynamicPseudos.length
            ? 'not-evaluated'
            : 'eligible';
    } catch (error) {
      result.status = error instanceof Invalid ? 'invalid' : 'unsupported';
      result.reason =
        error instanceof Invalid || error instanceof Unsupported
          ? error.message
          : 'unsupported-ast';
      result.matching = 'unsupported';
    }
    report.selectors.push(result);
  }
  report.status = report.selectors.some((s) => s.status === 'invalid')
    ? 'invalid'
    : report.selectors.some((s) => s.status === 'unsupported')
      ? 'unsupported'
      : 'ok';
  return report;
}
