import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import GithubSlugger from 'github-slugger';
import { toString } from 'mdast-util-to-string';
import type { Nodes } from 'mdast';

export const MARKDOWN_LIMITS = {
  sourceCodeUnits: 200_000,
  nodes: 30_000,
  depth: 64,
  links: 4000,
  headings: 1000,
  definitions: 4000,
  diagnostics: 200,
  work: 100_000,
  pathCodeUnits: 4096,
  destinationCodeUnits: 8192,
} as const;
export const MARKDOWN_RENDERER = 'gfm-heading-subset/v1';
export const MARKDOWN_POLICY = {
  id: 'markdown-links/offline-posix/v1',
  renderer: MARKDOWN_RENDERER,
  parser: 'unified@11.0.5/remark-parse@11.0.0/remark-gfm@4.0.1',
  headings:
    'github-slugger@2.0.0 with mdast-util-to-string@4.0.0, includeHtml:false/includeImageAlt:true; fresh slugger per document; not full GitHub renderer parity',
  uncertain:
    'Raw HTML anywhere or uncertain heading content makes anchor coverage unknown and suppresses all anchors to avoid guessed collisions. HTML links/custom IDs are not parsed.',
  paths:
    'Root-relative POSIX source paths; local targets decode once, query ignored, plus literal; no root-absolute, drive, backslash, encoded separator, control, colon-segment or root escape. Empty fragments mean document top. No directory/README/extension inference.',
  external:
    'Explicit schemes and protocol-relative URLs skipped, never requested or executed; Windows drive syntax remains unknown.',
  bounds:
    'Source limit precedes parsing; AST/node/depth/work limits apply after parsing. Parser itself is synchronous and not cancellable here: untrusted CLI input must use an independently time/memory-bounded worker or subprocess.',
} as const;
export interface MarkdownLocation {
  start: number;
  end: number;
  line: number;
  column: number;
}
export interface MarkdownLink {
  destination: string;
  kind: 'link' | 'image';
  location: MarkdownLocation;
}
export interface MarkdownParseDiagnostic {
  code: string;
  location: MarkdownLocation | null;
}
export interface MarkdownDocumentReport {
  path: string;
  status: 'complete' | 'partial' | 'limit';
  anchors: string[];
  anchorCoverage: 'complete' | 'unknown';
  links: MarkdownLink[];
  diagnostics: MarkdownParseDiagnostic[];
}
export type MarkdownDestination =
  | { kind: 'local'; path: string; fragment: string | null; directoryRequired?: true }
  | { kind: 'external-skipped'; scheme: string }
  | { kind: 'unknown'; reason: string };
function hasControls(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const unit = value.charCodeAt(i);
    if (unit < 32 || (unit >= 127 && unit <= 159)) return true;
  }
  return false;
}
function illFormedUnicode(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const unit = value.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(++i);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return true;
  }
  return false;
}
function validSourcePath(path: string): boolean {
  return (
    path.length > 0 &&
    path.length <= MARKDOWN_LIMITS.pathCodeUnits &&
    !hasControls(path) &&
    !illFormedUnicode(path) &&
    !/[\\:]/.test(path) &&
    !path.startsWith('/') &&
    path.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
  );
}
/** Pure filesystem-independent URL policy. Never feed the returned path to another URL decoder. */
export function resolveMarkdownDestination(
  fromPath: string,
  destination: string,
): MarkdownDestination {
  const unknown = (reason: string): MarkdownDestination => ({ kind: 'unknown', reason });
  if (!validSourcePath(fromPath)) return unknown('invalid-source-path');
  if (destination.length > MARKDOWN_LIMITS.destinationCodeUnits)
    return unknown('destination-limit');
  if (hasControls(destination)) return unknown('control-character');
  if (illFormedUnicode(destination)) return unknown('ill-formed-unicode');
  if (destination.includes('\\')) return unknown('backslash-ambiguous');
  if (destination.trim() !== destination) return unknown('surrounding-whitespace');
  if (/^[A-Za-z]:/.test(destination)) return unknown('drive-absolute-or-relative');
  if (destination.startsWith('//'))
    return { kind: 'external-skipped', scheme: 'protocol-relative' };
  const scheme = /^([A-Za-z][A-Za-z0-9+.-]*):/.exec(destination)?.[1];
  if (scheme) return { kind: 'external-skipped', scheme: scheme.toLowerCase() };
  if (destination.startsWith('/')) return unknown('root-absolute-unsupported');
  if (/%(?:2f|5c|00)/i.test(destination)) return unknown('encoded-separator-or-nul');
  const hash = destination.indexOf('#'),
    beforeFragment = hash < 0 ? destination : destination.slice(0, hash);
  const query = beforeFragment.indexOf('?'),
    rawPath = query < 0 ? beforeFragment : beforeFragment.slice(0, query);
  let path: string, fragment: string | null;
  try {
    path = decodeURIComponent(rawPath);
    // Validate ignored query encodings as well, without using their contents.
    if (query >= 0) decodeURIComponent(beforeFragment.slice(query + 1));
    fragment = hash < 0 ? null : decodeURIComponent(destination.slice(hash + 1)) || null;
  } catch {
    return unknown('malformed-encoding');
  }
  if (hasControls(path) || (fragment !== null && hasControls(fragment)))
    return unknown('decoded-control-character');
  if (path.includes('\\') || fragment?.includes('\\')) return unknown('decoded-backslash');
  if (path.startsWith('/')) return unknown('root-absolute-unsupported');
  if (path.includes(':')) return unknown('colon-path-ambiguous');
  if (path === '') return { kind: 'local', path: fromPath, fragment };
  // Preserve directory syntax before dot normalization discards it. The caller
  // must still classify ignored directories before rejecting regular-file targets.
  const directoryRequired = path.endsWith('/') || /(?:^|\/)\.{1,2}$/.test(path);
  const parts = fromPath.split('/');
  parts.pop();
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (!parts.length) return unknown('root-escape');
      parts.pop();
    } else parts.push(segment);
  }
  const resolved = parts.join('/');
  if (!resolved) return unknown('root-directory-target');
  if (resolved.length > MARKDOWN_LIMITS.pathCodeUnits) return unknown('resolved-path-limit');
  return {
    kind: 'local',
    path: resolved,
    fragment,
    ...(directoryRequired ? { directoryRequired: true } : {}),
  };
}

class MarkdownLimit extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}
const parser = unified().use(remarkParse).use(remarkGfm).freeze();
function location(node: Nodes, bomUnits: number): MarkdownLocation | null {
  const start = node.position?.start,
    end = node.position?.end;
  if (start?.offset === undefined || end?.offset === undefined) return null;
  // micromark strips a leading BOM before indexing; map its positions back to
  // the original input, without string-searching link text or normalizing CRLF.
  return {
    start: start.offset + bomUnits,
    end: end.offset + bomUnits,
    line: start.line,
    column: start.column + (start.line === 1 ? bomUnits : 0),
  };
}
/** AST only: no HTML parser/rendering, filesystem, environment, execution or network. */
export function parseMarkdownDocument(path: string, source: string): MarkdownDocumentReport {
  const bomUnits = source.charCodeAt(0) === 0xfeff ? 1 : 0;
  const report: MarkdownDocumentReport = {
    path,
    status: 'complete',
    anchors: [],
    anchorCoverage: 'complete',
    links: [],
    diagnostics: [],
  };
  function issue(code: string, node?: Nodes) {
    if (report.diagnostics.length >= MARKDOWN_LIMITS.diagnostics)
      throw new MarkdownLimit('diagnostic-limit');
    report.status = 'partial';
    report.diagnostics.push({ code, location: node ? location(node, bomUnits) : null });
  }
  function failed(code: string, status: 'partial' | 'limit'): MarkdownDocumentReport {
    return {
      path,
      status,
      anchors: [],
      anchorCoverage: 'unknown',
      links: [],
      diagnostics: [{ code, location: null }],
    };
  }
  if (source.length > MARKDOWN_LIMITS.sourceCodeUnits) return failed('source-limit', 'limit');
  if (!validSourcePath(path)) return failed('invalid-source-path', 'partial');
  if (illFormedUnicode(source)) return failed('ill-formed-unicode', 'partial');
  try {
    // Library parsing precedes AST bounds; process isolation is the caller's responsibility.
    const tree = parser.parse(source);
    const nodes: Nodes[] = [],
      stack: { node: Nodes; depth: number }[] = [{ node: tree, depth: 0 }];
    const definitions = new Map<string, string>();
    let work = 0,
      definitionCount = 0,
      headingCount = 0;
    function spend() {
      if (++work > MARKDOWN_LIMITS.work) throw new MarkdownLimit('work-limit');
    }
    while (stack.length) {
      const { node, depth } = stack.pop()!;
      spend();
      if (nodes.length >= MARKDOWN_LIMITS.nodes) throw new MarkdownLimit('node-limit');
      if (depth > MARKDOWN_LIMITS.depth) throw new MarkdownLimit('depth-limit');
      nodes.push(node);
      if (node.type === 'definition') {
        if (++definitionCount > MARKDOWN_LIMITS.definitions)
          throw new MarkdownLimit('definition-limit');
        // mdast has already normalized identifiers. First definition in source order wins.
        const identifier = node.identifier.toUpperCase();
        if (!definitions.has(identifier)) definitions.set(identifier, node.url);
      }
      if (node.type === 'heading' && ++headingCount > MARKDOWN_LIMITS.headings)
        throw new MarkdownLimit('heading-limit');
      if (node.type === 'html') {
        report.anchorCoverage = 'unknown';
        issue('raw-html-unsupported', node);
      }
      if (node.type === 'footnoteReference' || node.type === 'footnoteDefinition') {
        report.anchorCoverage = 'unknown';
        issue('generated-footnote-anchors-unsupported', node);
      }
      if (node.type !== 'code' && node.type !== 'inlineCode' && 'children' in node) {
        for (let i = node.children.length - 1; i >= 0; i--)
          stack.push({ node: node.children[i]!, depth: depth + 1 });
      }
    }
    const slugger = new GithubSlugger();
    for (const node of nodes) {
      spend();
      if (
        node.type === 'link' ||
        node.type === 'image' ||
        node.type === 'linkReference' ||
        node.type === 'imageReference'
      ) {
        const destination =
          node.type === 'link' || node.type === 'image'
            ? node.url
            : definitions.get(node.identifier.toUpperCase());
        if (destination === undefined) {
          issue('reference-definition-unresolved', node);
          continue;
        }
        if (destination.length > MARKDOWN_LIMITS.destinationCodeUnits)
          throw new MarkdownLimit('destination-limit');
        const loc = location(node, bomUnits);
        if (!loc) {
          issue('source-location-unavailable', node);
          continue;
        }
        if (report.links.length >= MARKDOWN_LIMITS.links) throw new MarkdownLimit('link-limit');
        report.links.push({
          destination,
          kind: node.type === 'image' || node.type === 'imageReference' ? 'image' : 'link',
          location: loc,
        });
      }
      if (node.type === 'heading') {
        const children: Nodes[] = [...node.children];
        let uncertain = false;
        while (children.length) {
          const child = children.pop()!;
          spend();
          if (
            ![
              'text',
              'emphasis',
              'strong',
              'delete',
              'inlineCode',
              'link',
              'linkReference',
              'image',
              'imageReference',
              'break',
            ].includes(child.type)
          )
            uncertain = true;
          if ('children' in child) for (const nested of child.children) children.push(nested);
        }
        if (uncertain) {
          report.anchorCoverage = 'unknown';
          issue('heading-text-uncertain', node);
        }
        // AST was already depth/node bounded before this helper's recursive text walk.
        report.anchors.push(
          slugger.slug(toString(node, { includeHtml: false, includeImageAlt: true })),
        );
      }
    }
    // Unknown HTML/custom heading content can affect slug collisions anywhere: never
    // expose guessed known anchors that could turn an uncertain link into a false pass.
    if (report.anchorCoverage === 'unknown') report.anchors = [];
    return report;
  } catch (error) {
    return error instanceof MarkdownLimit
      ? failed(error.code, 'limit')
      : failed('markdown-parser-failed', 'partial');
  }
}
