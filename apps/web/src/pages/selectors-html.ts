import {
  defaultTreeAdapter,
  html as parse5Html,
  parse,
  parseFragment,
  type DefaultTreeAdapterMap,
  type ParserError,
} from 'parse5';
import type {
  SelectorAnalysis,
  SelectorListAnalysis,
  SelectorSpan,
  Specificity,
} from '@sid-tools/core/selectors';

export const HTML_LIMITS = {
  codeUnits: 50000,
  elements: 2000,
  depth: 64,
  attributes: 64,
  attributeValue: 2000,
  text: 10000,
} as const;
const HTML_NS = parse5Html.NS.HTML;
const safeTags = new Set(
  'a abbr address area article aside b bdi bdo blockquote br button caption cite code col colgroup data datalist dd del details dfn dialog div dl dt em fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hgroup hr i img input ins kbd label legend li main map mark menu meter nav ol optgroup option output p picture pre progress q rp rt ruby s samp search section select slot small span strong sub summary sup table tbody td textarea tfoot th thead time tr u ul var wbr'.split(
    ' ',
  ),
);
const blockedTags = new Set(
  'script style link meta base iframe frame frameset object embed applet param audio video source track template noscript portal fencedframe'.split(
    ' ',
  ),
);
const safeAttrs = new Set(
  'id class role title alt lang dir type value checked disabled selected multiple readonly required name for form list min max step minlength maxlength pattern placeholder contenteditable hidden tabindex open start reversed colspan rowspan span width height scope'.split(
    ' ',
  ),
);
const identity = (name: string) =>
  name === 'id' ||
  name === 'class' ||
  name === 'role' ||
  name.startsWith('data-') ||
  name.startsWith('aria-');
type AstNode = DefaultTreeAdapterMap['node'];
type AstElement = DefaultTreeAdapterMap['element'];
function isElement(node: AstNode): node is AstElement {
  return 'tagName' in node;
}
function children(node: AstNode): AstNode[] {
  return 'childNodes' in node
    ? [
        ...node.childNodes,
        ...('content' in node
          ? (node as DefaultTreeAdapterMap['template']).content.childNodes
          : []),
      ]
    : [];
}
function span(node: AstNode): SelectorSpan | null {
  const loc = node.sourceCodeLocation;
  return loc ? { start: loc.startOffset, end: loc.endOffset } : null;
}
export interface StructureRow {
  id: string;
  parent: string | null;
  depth: number;
  kind: 'element' | 'text';
  label: string;
  span: SelectorSpan | null;
  placeholder: boolean;
  implied: boolean;
  element: Element | null;
}
export interface HtmlNotice {
  code: string;
  message: string;
  span: SelectorSpan | null;
}
export interface StructureReport {
  doc: Document;
  scope: HTMLElement;
  rows: StructureRow[];
  byElement: WeakMap<Element, string>;
  notices: HtmlNotice[];
  removedAttributes: Set<string>;
  removedTags: Set<string>;
  placeholders: number;
  elementCount: number;
}
export type MatchState =
  | 'matched'
  | 'empty'
  | 'invalid'
  | 'parser-unsupported'
  | 'not-evaluated'
  | 'not-matchable'
  | 'browser-unsupported'
  | 'native-error'
  | 'budget-not-evaluated';
export interface BranchMatch {
  analysis: SelectorAnalysis;
  state: MatchState;
  ids: string[];
  warnings: string[];
  milliseconds: number;
}
export interface MatchingReport {
  branches: BranchMatch[];
  perElement: Map<string, { branches: number[]; highest: Specificity }>;
  milliseconds: number;
  slow: boolean;
}

export function buildSelectorStructure(text: string): StructureReport {
  if (text.length > HTML_LIMITS.codeUnits)
    throw new Error('HTML 超過 50,000 UTF-16 字碼單元；整份拒絕，未建立部分樹。');
  const errors: ParserError[] = [];
  const fragment = parseFragment(defaultTreeAdapter.createElement('body', HTML_NS, []), text, {
    sourceCodeLocationInfo: true,
    scriptingEnabled: true,
    onParseError: (error) => errors.push(error),
  });
  // Diagnostic-only offline document parse: fragment mode silently discards wrappers.
  // Never use this tree to reconstruct or match the supplied HTML.
  const fullDocument = parse(text, { sourceCodeLocationInfo: true });
  // Validate the entire AST, including children which will subsequently be suppressed.
  let count = 0;
  const validate: { node: AstNode; depth: number }[] = fragment.childNodes.map((node) => ({
    node,
    depth: 1,
  }));
  while (validate.length) {
    const { node, depth } = validate.pop()!;
    if (isElement(node)) {
      count++;
      if (count > HTML_LIMITS.elements || depth > HTML_LIMITS.depth)
        throw new Error('HTML 超過 2,000 elements 或 64 層；整份拒絕。');
      if (
        node.attrs.length > HTML_LIMITS.attributes ||
        node.attrs.some((attr) => attr.value.length > HTML_LIMITS.attributeValue)
      )
        throw new Error('HTML 超過每元素 64 attrs 或每值 2,000 字碼單元；整份拒絕。');
    }
    if (
      node.nodeName === '#text' &&
      (node as DefaultTreeAdapterMap['textNode']).value.length > HTML_LIMITS.text
    )
      throw new Error('HTML text node 超過 10,000 字碼單元；整份拒絕。');
    for (const child of children(node))
      validate.push({ node: child, depth: depth + (isElement(node) ? 1 : 0) });
  }
  const doc = document.implementation.createHTMLDocument('');
  if (doc.defaultView !== null || doc.compatMode !== 'CSS1Compat')
    throw new Error('無法建立無 window 的 standards-mode document；未比對。');
  const result: StructureReport = {
    doc,
    scope: doc.body,
    rows: [],
    byElement: new WeakMap(),
    notices: [],
    removedAttributes: new Set(),
    removedTags: new Set(),
    placeholders: 0,
    elementCount: count,
  };
  for (const error of errors)
    result.notices.push({
      code: `parse5:${error.code}`,
      message: 'parse5 tokenizer 回報語法錯誤；這不是完整的樹修復診斷，部分結構修復可能沒有通知。',
      span:
        typeof error.startOffset === 'number' && error.startOffset >= 0
          ? { start: error.startOffset, end: Math.max(error.endOffset, error.startOffset) }
          : null,
    });
  const notice = (code: string, message: string, node: AstNode) =>
    result.notices.push({ code, message, span: span(node) });
  const html = fullDocument.childNodes.find(
    (node): node is AstElement => isElement(node) && node.tagName === 'html',
  );
  const wrappers = html ? [html, ...html.childNodes.filter(isElement)] : [];
  for (const wrapper of wrappers) {
    if (!['html', 'head', 'body'].includes(wrapper.tagName)) continue;
    const location = wrapper.sourceCodeLocation;
    if (!location?.startTag && !wrapper.attrs.length) continue;
    result.removedTags.add(wrapper.tagName);
    for (const attr of wrapper.attrs) result.removedAttributes.add(attr.name);
    result.notices.push({
      code: 'document-wrapper-ignored',
      message: `body fragment 不保留文件 wrapper <${wrapper.tagName}> 與其屬性；原始文件的命中可能不同。`,
      span: location?.startTag
        ? { start: location.startTag.startOffset, end: location.startTag.endOffset }
        : span(wrapper),
    });
  }
  for (const node of fullDocument.childNodes) {
    if (node.nodeName !== '#documentType') continue;
    result.removedTags.add('!doctype');
    notice(
      'document-wrapper-ignored',
      'body fragment 不保留 doctype／quirks 文件模式；原始文件的命中可能不同。',
      node,
    );
  }
  const stack: {
    node: AstNode;
    parent: Element;
    rowParent: string | null;
    depth: number;
    suppressed: boolean;
  }[] = fragment.childNodes
    .slice()
    .reverse()
    .map((node) => ({
      node,
      parent: doc.body as Element,
      rowParent: null as string | null,
      depth: 0,
      suppressed: false,
    }));
  while (stack.length) {
    const current = stack.pop()!,
      { node, parent, rowParent, depth, suppressed } = current;
    if (isElement(node)) {
      const foreign = node.namespaceURI !== HTML_NS,
        placeholder = foreign || blockedTags.has(node.tagName),
        // An empty native HTMLStyleElement can emit CSP when attached, even without a window.
        allowed = node.tagName !== 'style' && (placeholder || safeTags.has(node.tagName));
      if (suppressed || !allowed) {
        result.removedTags.add(node.tagName);
        notice(
          'omitted-element',
          `省略元素 <${node.tagName}>${suppressed ? '：位於不保留的子樹。' : node.tagName === 'style' ? '：原生空 style 仍可能觸發 CSP；無法安全表達，整個省略。' : '：不在安全標籤 allowlist（含自訂元素）。'}`,
          node,
        );
        for (const attr of node.attrs) {
          result.removedAttributes.add(attr.name);
          notice('omitted-attribute', `省略屬性 ${attr.name}：所屬元素未保留。`, node);
        }
        for (const child of children(node).reverse())
          stack.push({ ...current, node: child, suppressed: true });
        continue;
      }
      const element = foreign
        ? Document.prototype.createElementNS.call(doc, node.namespaceURI, node.tagName)
        : Document.prototype.createElement.call(doc, node.tagName);
      const kept: string[] = [];
      for (const attr of node.attrs) {
        const name = attr.name;
        const permitted =
          /^[a-z_][a-z0-9_.:-]*$/.test(name) &&
          !attr.namespace &&
          !name.startsWith('on') &&
          (placeholder
            ? identity(name)
            : identity(name) ||
              safeAttrs.has(name) ||
              (name === 'href' && (node.tagName === 'a' || node.tagName === 'area')));
        if (permitted) {
          Element.prototype.setAttribute.call(element, name, attr.value);
          kept.push(`${name}=${JSON.stringify(attr.value)}`);
        } else {
          result.removedAttributes.add(name);
          notice(
            'omitted-attribute',
            `省略屬性 ${attr.prefix ? `${attr.prefix}:` : ''}${name}：不保留資源、事件、style 或未列入 allowlist 的屬性。`,
            node,
          );
        }
      }
      Node.prototype.appendChild.call(parent, element);
      const id = `n${result.rows.length + 1}`;
      result.byElement.set(element, id);
      result.rows.push({
        id,
        parent: rowParent,
        depth,
        kind: 'element',
        label: `<${node.tagName}${kept.length ? ' ' + kept.join(' ') : ''}>`,
        span: span(node),
        placeholder,
        implied: !node.sourceCodeLocation,
        element,
      });
      if (placeholder) {
        result.placeholders++;
        notice(
          'placeholder',
          `<${node.tagName}> 僅保留同標籤／namespace 的 childless placeholder 與 identity attrs；子樹不參與匹配。`,
          node,
        );
      }
      if (!node.sourceCodeLocation)
        notice('implied', 'parse5 補入的元素沒有原始範圍；不杜撰來源。', node);
      for (const child of children(node).reverse())
        stack.push({
          node: child,
          parent: element,
          rowParent: id,
          depth: depth + 1,
          suppressed: placeholder,
        });
    } else if (node.nodeName === '#text') {
      const value = (node as DefaultTreeAdapterMap['textNode']).value;
      if (suppressed) {
        notice('omitted-text', '省略 placeholder／不支援元素子樹中的 text。', node);
        continue;
      }
      Node.prototype.appendChild.call(parent, Document.prototype.createTextNode.call(doc, value));
      if (value.trim())
        result.rows.push({
          id: `n${result.rows.length + 1}`,
          parent: rowParent,
          depth,
          kind: 'text',
          label: `#text ${JSON.stringify(value)}`,
          span: span(node),
          placeholder: false,
          implied: !node.sourceCodeLocation,
          element: null,
        });
    } else notice('omitted-node', '省略 comment／非元素節點；comments 不影響 :empty。', node);
  }
  return result;
}
export function compareSpecificity(a: Specificity, b: Specificity) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}
export function matchSelectorBranches(
  structure: StructureReport,
  list: SelectorListAnalysis,
): MatchingReport {
  const started = performance.now(),
    branches: BranchMatch[] = [],
    perElement: MatchingReport['perElement'] = new Map();
  let slow = false;
  for (const analysis of list.selectors) {
    const warnings: string[] = [];
    if (structure.notices.length)
      warnings.push('此為部分重建／修復結構；命中不是原始 live DOM 的精確承諾。');
    if (structure.placeholders)
      warnings.push('placeholder 的子樹與文字已省略，可能改變 :empty／關係／否定條件。');
    const attrs = analysis.attributes.filter((name) => structure.removedAttributes.has(name)),
      tags = analysis.tags.filter((name) => structure.removedTags.has(name));
    if (attrs.length) warnings.push(`selector 參照被省略的屬性：${attrs.join(', ')}`);
    if (tags.length) warnings.push(`selector 參照被省略子樹標籤：${tags.join(', ')}`);
    let state: MatchState =
      analysis.status === 'invalid'
        ? 'invalid'
        : analysis.status === 'unsupported'
          ? 'parser-unsupported'
          : analysis.matching === 'not-evaluated'
            ? 'not-evaluated'
            : analysis.matching !== 'eligible'
              ? 'not-matchable'
              : 'empty';
    const ids: string[] = [],
      before = performance.now();
    if (state === 'empty') {
      if (before - started > 2000) {
        state = 'budget-not-evaluated';
        slow = true;
      } else
        try {
          for (const element of structure.scope.querySelectorAll(analysis.text)) {
            const id = structure.byElement.get(element);
            if (id) ids.push(id);
          }
          state = ids.length ? 'matched' : 'empty';
        } catch (error) {
          state =
            error instanceof DOMException && error.name === 'SyntaxError'
              ? 'browser-unsupported'
              : 'native-error';
        }
    }
    const milliseconds = performance.now() - before;
    if (milliseconds > 200) slow = true;
    const index = branches.length;
    if (state === 'matched' && analysis.specificity)
      for (const id of ids) {
        const record = perElement.get(id);
        if (record) {
          record.branches.push(index);
          if (compareSpecificity(analysis.specificity, record.highest) > 0)
            record.highest = analysis.specificity;
        } else perElement.set(id, { branches: [index], highest: analysis.specificity });
      }
    branches.push({ analysis, state, ids, warnings, milliseconds });
  }
  return { branches, perElement, milliseconds: performance.now() - started, slow };
}
