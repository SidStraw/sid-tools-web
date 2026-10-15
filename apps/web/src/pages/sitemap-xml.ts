import {
  SITEMAP_LIMITS,
  SITEMAP_NAMESPACE,
  sitemapEntryPointer,
  validateSitemap,
} from '@sid-tools/core/sitemap';
import type {
  SitemapDocument,
  SitemapEntry,
  SitemapKind,
  SitemapReport,
} from '@sid-tools/core/sitemap';

export const XML_ADAPTER_LIMITS = { elements: 100_000, depth: 128 } as const;
export interface SitemapXmlSource {
  pointer: string;
  ordinal: number | null;
  start: number;
  end: number;
  line: number;
  column: number;
}
export type SitemapXmlIssueCode =
  | 'unsafe-xml'
  | 'malformed-xml'
  | 'local-size-limit'
  | 'xml-node-limit'
  | 'xml-depth-limit'
  | 'unsupported-declaration'
  | 'unsupported-root'
  | 'namespace'
  | 'unsupported-tag'
  | 'unsupported-attribute'
  | 'mixed-text'
  | 'processing-instruction'
  | 'duplicate-field'
  | 'nested-markup'
  | 'source-map';
export interface SitemapXmlIssue {
  code: SitemapXmlIssueCode;
  severity: 'error' | 'warning';
  source: SitemapXmlSource;
}
export interface SitemapXmlInspection {
  valid: boolean;
  complete: boolean;
  rawUtf8Bytes: number | null;
  report: SitemapReport | null;
  xmlIssues: SitemapXmlIssue[];
  sources: SitemapXmlSource[];
  indexingStatus: 'not-checked';
  adapterLimits: typeof XML_ADAPTER_LIMITS;
}
interface Token {
  name: string;
  start: number;
  end: number;
}
const XMLNS = 'http://www.w3.org/2000/xmlns/';
const FIELDS = ['loc', 'lastmod', 'changefreq', 'priority'] as const;

/** Browser-only, inert XML inspection. No fetch, HTML insertion, DTD or entity expansion. */
export function inspectSitemapXml(text: string): SitemapXmlInspection {
  const result: SitemapXmlInspection = {
    valid: false,
    complete: false,
    rawUtf8Bytes: null,
    report: null,
    xmlIssues: [],
    sources: [],
    indexingStatus: 'not-checked',
    adapterLimits: XML_ADAPTER_LIMITS,
  };
  const lineStarts = [0];
  // Oversize text is rejected before allocating a source index, encoder buffer or XML document.
  if (text.length > SITEMAP_LIMITS.localBytes) {
    result.xmlIssues.push({
      code: 'local-size-limit',
      severity: 'error',
      source: { pointer: '/', ordinal: null, start: 0, end: 0, line: 1, column: 1 },
    });
    return result;
  }
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\r' && text[i + 1] === '\n') {
      lineStarts.push(i + 2);
      i++;
    } else if (text[i] === '\n' || text[i] === '\r') lineStarts.push(i + 1);
  }
  function source(
    pointer: string,
    ordinal: number | null,
    token?: Pick<Token, 'start' | 'end'>,
  ): SitemapXmlSource {
    const start = token?.start ?? 0;
    let low = 0,
      high = lineStarts.length;
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2);
      if (lineStarts[middle]! <= start) low = middle;
      else high = middle;
    }
    return {
      pointer,
      ordinal,
      start,
      end: token?.end ?? start,
      line: low + 1,
      column: start - lineStarts[low]! + 1,
    };
  }
  function issue(
    code: SitemapXmlIssueCode,
    at: SitemapXmlSource,
    severity: SitemapXmlIssue['severity'] = 'error',
  ) {
    result.xmlIssues.push({ code, severity, source: at });
  }
  result.rawUtf8Bytes = new TextEncoder().encode(text).byteLength;
  if (result.rawUtf8Bytes > SITEMAP_LIMITS.localBytes) {
    issue('local-size-limit', source('/', null));
    return result;
  }
  // Deliberately conservative: declaration-like text is rejected even inside comments or CDATA.
  const unsafe = /<!\s*(?:DOCTYPE|ENTITY)\b/i.exec(text);
  if (unsafe) {
    issue(
      'unsafe-xml',
      source('/', null, { start: unsafe.index, end: unsafe.index + unsafe[0].length }),
    );
    return result;
  }
  const declaration = /^\uFEFF?<\?xml\s+([\s\S]*?)\?>/.exec(text);
  if (declaration) {
    const version = /\bversion\s*=\s*(['"])(.*?)\1/.exec(declaration[1]!);
    const encoding = /\bencoding\s*=\s*(['"])(.*?)\1/.exec(declaration[1]!);
    if ((version && version[2] !== '1.0') || (encoding && encoding[2]?.toUpperCase() !== 'UTF-8')) {
      issue('unsupported-declaration', source('/', null, { start: 0, end: declaration[0].length }));
      return result;
    }
  }
  // Lexical opening-tag positions: quoted >, comments, CDATA and PI cannot fake entry positions.
  // This is a locator/resource gate, not an XML parser. DOMParser still certifies well-formedness.
  const tokens: Token[] = [],
    instructions: Token[] = [];
  let cursor = 0,
    depth = 0;
  while (cursor < text.length) {
    const start = text.indexOf('<', cursor);
    if (start < 0) break;
    if (text.startsWith('<!--', start)) {
      const end = text.indexOf('-->', start + 4);
      cursor = end < 0 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith('<![CDATA[', start)) {
      const end = text.indexOf(']]>', start + 9);
      cursor = end < 0 ? text.length : end + 3;
      continue;
    }
    if (text.startsWith('<?', start)) {
      const end = text.indexOf('?>', start + 2);
      cursor = end < 0 ? text.length : end + 2;
      if (!/^<\?xml[\t\n\r ]/.test(text.slice(start, start + 7)))
        instructions.push({ name: 'PI', start, end: cursor });
      continue;
    }
    let quote = '',
      end = start + 1;
    for (; end < text.length; end++) {
      const char = text[end]!;
      if (quote) {
        if (char === quote) quote = '';
      } else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
    }
    cursor = Math.min(end + 1, text.length);
    if (text.startsWith('</', start)) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (text.startsWith('<!', start)) continue;
    const name = /^[^\t\n\r />]+/.exec(text.slice(start + 1, cursor))?.[0] ?? '';
    tokens.push({ name, start, end: cursor });
    if (tokens.length > XML_ADAPTER_LIMITS.elements) {
      issue('xml-node-limit', source('/', null, tokens.at(-1)));
      return result;
    }
    if (depth + 1 > XML_ADAPTER_LIMITS.depth) {
      issue('xml-depth-limit', source('/', null, tokens.at(-1)));
      return result;
    }
    if (!text.slice(start, cursor).endsWith('/>')) depth++;
  }
  const xml = new DOMParser().parseFromString(text, 'application/xml');
  if (
    Array.from(xml.getElementsByTagNameNS('*', 'parsererror')).some(
      (element) =>
        element.namespaceURI === 'http://www.w3.org/1999/xhtml' ||
        element.namespaceURI === 'http://www.mozilla.org/newlayout/xml/parsererror.xml',
    ) ||
    !xml.documentElement
  ) {
    // Browser error prose may contain raw user input; never surface it.
    issue('malformed-xml', source('/', null));
    return result;
  }
  const elements = Array.from(xml.getElementsByTagName('*'));
  if (
    elements.length !== tokens.length ||
    elements.some((element, i) => element.tagName !== tokens[i]?.name)
  ) {
    issue('source-map', source('/', null));
    return result;
  }
  const positions = new WeakMap<Element, Token>();
  elements.forEach((element, i) => positions.set(element, tokens[i]!));
  const root = xml.documentElement,
    rootPointer = `/${root.localName}`;
  const rootSource = source(rootPointer, null, positions.get(root));
  result.sources.push(rootSource);
  if (root.localName !== 'urlset' && root.localName !== 'sitemapindex') {
    issue('unsupported-root', rootSource);
    return result;
  }
  const kind: SitemapKind = root.localName,
    entryName = kind === 'urlset' ? 'url' : 'sitemap';
  const document: SitemapDocument = {
    kind,
    namespace: root.namespaceURI ?? '',
    entries: [],
    unknownTagCount: 0,
    structureIssueCount: 0,
    rawUtf8Bytes: result.rawUtf8Bytes,
    xmlPolicy: {
      wellFormed: true,
      doctypeDetected: false,
      entityDeclarationDetected: false,
      structureChecked: true,
    },
  };
  if (root.namespaceURI !== SITEMAP_NAMESPACE) issue('namespace', rootSource);
  for (const instruction of instructions) {
    issue('processing-instruction', source('/', null, instruction), 'warning');
    document.structureIssueCount++;
  }
  function hasAttributes(element: Element, at: SitemapXmlSource): number {
    const count = Array.from(element.attributes).filter(
      (attribute) => attribute.namespaceURI !== XMLNS,
    ).length;
    if (count) issue('unsupported-attribute', at, 'warning');
    return count;
  }
  function hasMixedText(element: Element, at: SitemapXmlSource): number {
    const count = Array.from(element.childNodes).filter(
      (node) =>
        (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.CDATA_SECTION_NODE) &&
        !/^[\t\n\r ]*$/.test(node.textContent ?? ''),
    ).length;
    if (count) issue('mixed-text', at, 'warning');
    return count;
  }
  document.structureIssueCount += hasAttributes(root, rootSource) + hasMixedText(root, rootSource);
  const entries: SitemapEntry[] = [];
  for (const [childIndex, child] of Array.from(root.children).entries()) {
    if (child.localName !== entryName) {
      document.unknownTagCount++;
      const at = source(`/${kind}/*[${childIndex + 1}]`, null, positions.get(child));
      result.sources.push(at);
      issue('unsupported-tag', at, 'warning');
      continue;
    }
    const ordinal = entries.length + 1,
      pointer = sitemapEntryPointer(kind, ordinal),
      at = source(pointer, ordinal, positions.get(child));
    result.sources.push(at);
    const entry: SitemapEntry = {
      ordinal,
      pointer,
      unknownTagCount: 0,
      duplicateFieldCount: 0,
      nestedMarkup: false,
    };
    const namespaceCorrect = child.namespaceURI === SITEMAP_NAMESPACE;
    if (!namespaceCorrect) {
      entry.unknownTagCount++;
      issue('namespace', at);
    }
    entry.unknownTagCount += hasAttributes(child, at) + hasMixedText(child, at);
    const seen = new Map<string, number>();
    for (const [fieldIndex, field] of Array.from(child.children).entries()) {
      const name = FIELDS.find((value) => value === field.localName);
      const recognized = name !== undefined && field.namespaceURI === SITEMAP_NAMESPACE;
      if (!recognized) {
        entry.unknownTagCount++;
        const unknown = source(`${pointer}/*[${fieldIndex + 1}]`, ordinal, positions.get(field));
        result.sources.push(unknown);
        issue(
          field.namespaceURI !== SITEMAP_NAMESPACE ? 'namespace' : 'unsupported-tag',
          unknown,
          'warning',
        );
        continue;
      }
      const occurrence = (seen.get(name) ?? 0) + 1;
      seen.set(name, occurrence);
      const fieldSource = source(
        `${pointer}/${name}${occurrence > 1 ? `[${occurrence}]` : ''}`,
        ordinal,
        positions.get(field),
      );
      result.sources.push(fieldSource);
      if (occurrence > 1) {
        entry.duplicateFieldCount++;
        issue('duplicate-field', fieldSource);
      }
      entry.unknownTagCount += hasAttributes(field, fieldSource);
      if (
        field.children.length ||
        Array.from(field.childNodes).some(
          (node) => node.nodeType === Node.PROCESSING_INSTRUCTION_NODE,
        )
      ) {
        entry.nestedMarkup = true;
        issue('nested-markup', fieldSource);
      }
      // Preserve the first field and every entry, but do not certify a foreign-namespace entry.
      if (occurrence === 1 && namespaceCorrect) entry[name] = field.textContent ?? '';
    }
    entries.push(entry);
  }
  document.entries = entries;
  result.report = validateSitemap(document);
  result.valid = result.report.valid && !result.xmlIssues.some((item) => item.severity === 'error');
  result.complete = result.report.complete && result.xmlIssues.length === 0;
  return result;
}
