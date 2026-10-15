export const SITEMAP_NAMESPACE = 'http://www.sitemaps.org/schemas/sitemap/0.9';
export const SITEMAP_LIMITS = {
  protocolEntries: 50_000,
  protocolBytes: 52_428_800,
  localEntries: 10_000,
  localBytes: 2_000_000,
  normalizedCodeUnits: 2_000_000,
  fieldCodeUnits: 4_096,
  locCodeUnits: 2_047,
} as const;
export const SITEMAP_SUPPORT_RULES: readonly string[] = [
  'Sitemap 0.9 only: exact http://www.sitemaps.org/schemas/sitemap/0.9 namespace, urlset/url or sitemapindex/sitemap. This core validates normalized data, not XML bytes.',
  'A trusted browser adapter must reject DOCTYPE/entity declarations before DOMParser, require well-formed XML, inspect direct-child structure/namespaces, count unknown tags/duplicate fields/nested markup, and never fetch URLs. XML built-in character references may be decoded only after the unsafe-declaration gate.',
  'Adapter must supply every original entry in document order, one-based ordinal and pointer /urlset/url[N] or /sitemapindex/sitemap[N]. Do not truncate or silently drop invalid entries. Byte length is original uncompressed UTF-8 size, measured by adapter, not inferred from normalized fields.',
  'loc is trimmed XML-decoded text and must be absolute HTTP(S), contain no credentials, fragment, whitespace, invalid percent escape or backslash, and have fewer than 2048 UTF-16 code units in this supported subset. No URL is requested.',
  'Duplicates compare exact trimmed decoded loc strings, case-sensitive including query/percent spelling. No sorting query parameters, case folding, slash insertion or URL canonicalization is used for duplicate detection. Host comparison uses URL.host (case/default-port normalization by the platform URL parser).',
  'lastmod supports all six W3C Datetime forms: YYYY, YYYY-MM, YYYY-MM-DD, YYYY-MM-DDTHH:mmTZD, YYYY-MM-DDTHH:mm:ssTZD and YYYY-MM-DDTHH:mm:ss.fractionTZD. TZD is Z or ±HH:mm; fractional seconds have one or more digits within the field limit. Years 0001..9999, valid Gregorian calendar dates, hours 00..23, minutes/seconds 00..59, offsets 00..23:00..59. Time without timezone and leap seconds are unsupported.',
  'urlset optional changefreq uses the seven sitemap keywords; priority uses decimal 0..1 with a leading 0 or 1 and no exponent. Index entries support only loc/lastmod. Child sitemaps are always UNCHECKED, never fetched or claimed valid.',
  'Protocol limits are 50000 entries and 52428800 uncompressed bytes; this local subset caps 10000 entries, 2000000 bytes and 2000000 normalized text code units. Unmeasured byte size and unknown structure make coverage incomplete.',
  'Path groups use parsed origin + pathname and source entry ordinals, without recursively splitting path segments. Text remains untrusted data, not HTML. No crawl, HTTP-status, indexing-success, network, storage or execution claims.',
];

export type SitemapKind = 'urlset' | 'sitemapindex';
export interface SitemapEntry {
  ordinal: number;
  pointer: string;
  loc?: string | null;
  lastmod?: string | null;
  changefreq?: string | null;
  priority?: string | null;
  unknownTagCount: number;
  duplicateFieldCount: number;
  nestedMarkup: boolean;
}
export interface SitemapDocument {
  kind: SitemapKind;
  namespace: string;
  entries: readonly SitemapEntry[];
  unknownTagCount: number;
  structureIssueCount: number;
  rawUtf8Bytes?: number;
  xmlPolicy: {
    wellFormed: boolean;
    doctypeDetected: boolean;
    entityDeclarationDetected: boolean;
    structureChecked: boolean;
  };
}
export type SitemapDiagnosticCode =
  | 'invalid-document'
  | 'unsafe-xml'
  | 'malformed-xml'
  | 'structure-unchecked'
  | 'namespace'
  | 'unknown-structure'
  | 'protocol-count-limit'
  | 'local-count-limit'
  | 'protocol-size-limit'
  | 'local-size-limit'
  | 'normalized-size-limit'
  | 'size-unmeasured'
  | 'empty-document'
  | 'source-mismatch'
  | 'invalid-field'
  | 'missing-loc'
  | 'invalid-loc'
  | 'duplicate-loc'
  | 'mixed-host'
  | 'invalid-lastmod'
  | 'invalid-changefreq'
  | 'invalid-priority'
  | 'unsupported-index-field'
  | 'unchecked-children';
export interface SitemapDiagnostic {
  code: SitemapDiagnosticCode;
  severity: 'error' | 'warning' | 'info';
  pointer: string;
  ordinal: number | null;
  relatedOrdinal: number | null;
}
export interface ValidatedSitemapEntry {
  ordinal: number;
  pointer: string;
  loc: string | null;
  lastmod: string | null;
  changefreq: string | null;
  priority: string | null;
  url: { origin: string; host: string; pathname: string; search: string } | null;
  duplicateOf: number | null;
  valid: boolean;
  childStatus: 'unchecked' | null;
}
export interface SitemapReport {
  kind: SitemapKind | null;
  valid: boolean;
  complete: boolean;
  rawUtf8Bytes: number | null;
  sourceEntryCount: number;
  checkedEntryCount: number;
  uncheckedChildCount: number;
  entries: ValidatedSitemapEntry[];
  diagnostics: SitemapDiagnostic[];
  pathGroups: { origin: string; pathname: string; entryOrdinals: number[] }[];
  indexingStatus: 'not-checked';
  supportRules: string[];
  limits: typeof SITEMAP_LIMITS;
}

export function sitemapEntryPointer(kind: SitemapKind, ordinal: number): string {
  return `/${kind}/${kind === 'urlset' ? 'url' : 'sitemap'}[${ordinal}]`;
}

const counter = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const FIELDS = ['loc', 'lastmod', 'changefreq', 'priority'] as const;
const FREQUENCIES = new Set(['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never']);

function validLastmod(text: string): boolean {
  const match =
    /^(\d{4})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2}))?)?)?$/.exec(
      text,
    );
  if (!match) return false;
  const year = Number(match[1]),
    month = Number(match[2] ?? 1),
    day = Number(match[3] ?? 1);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]!) return false;
  if (match[4] !== undefined) {
    if (Number(match[4]) > 23 || Number(match[5]) > 59 || Number(match[6] ?? 0) > 59) return false;
    const zone = match[7]!;
    if (zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4, 6)) > 59))
      return false;
  }
  return true;
}

/** Normalized adapter input only; flags are adapter attestations, not proof of XML safety. */
export function validateSitemap(document: SitemapDocument): SitemapReport {
  const report: SitemapReport = {
    kind: null,
    valid: false,
    complete: false,
    rawUtf8Bytes: null,
    sourceEntryCount: 0,
    checkedEntryCount: 0,
    uncheckedChildCount: 0,
    entries: [],
    diagnostics: [],
    pathGroups: [],
    indexingStatus: 'not-checked',
    supportRules: [...SITEMAP_SUPPORT_RULES],
    limits: { ...SITEMAP_LIMITS },
  };
  const issue = (
    code: SitemapDiagnosticCode,
    pointer = '',
    ordinal: number | null = null,
    severity: SitemapDiagnostic['severity'] = 'error',
    relatedOrdinal: number | null = null,
  ) => {
    report.diagnostics.push({ code, pointer, ordinal, severity, relatedOrdinal });
  };
  if (
    !record(document) ||
    (document.kind !== 'urlset' && document.kind !== 'sitemapindex') ||
    !Array.isArray(document.entries) ||
    !counter(document.unknownTagCount) ||
    !counter(document.structureIssueCount) ||
    !record(document.xmlPolicy)
  ) {
    issue('invalid-document');
    return report;
  }
  const { kind, xmlPolicy } = document;
  report.kind = kind;
  report.sourceEntryCount = document.entries.length;
  report.uncheckedChildCount = kind === 'sitemapindex' ? document.entries.length : 0;
  if (document.namespace !== SITEMAP_NAMESPACE) issue('namespace', `/${kind}`);
  if (xmlPolicy.wellFormed !== true) issue('malformed-xml');
  if (xmlPolicy.doctypeDetected !== false || xmlPolicy.entityDeclarationDetected !== false)
    issue('unsafe-xml');
  if (xmlPolicy.structureChecked !== true) issue('structure-unchecked');
  if (document.entries.length > SITEMAP_LIMITS.protocolEntries) issue('protocol-count-limit');
  if (document.entries.length > SITEMAP_LIMITS.localEntries) issue('local-count-limit');
  if (document.rawUtf8Bytes === undefined) issue('size-unmeasured', '', null, 'warning');
  else if (!counter(document.rawUtf8Bytes)) issue('invalid-document');
  else {
    report.rawUtf8Bytes = document.rawUtf8Bytes;
    if (document.rawUtf8Bytes > SITEMAP_LIMITS.protocolBytes) issue('protocol-size-limit');
    if (document.rawUtf8Bytes > SITEMAP_LIMITS.localBytes) issue('local-size-limit');
  }
  if (report.diagnostics.some((d) => d.severity === 'error')) return report;
  if (document.unknownTagCount || document.structureIssueCount)
    issue('unknown-structure', `/${kind}`, null, 'warning');
  if (!document.entries.length) issue('empty-document', `/${kind}`);
  let normalizedSize = 0;
  // Preflight all normalized shapes/strings before allocating result entries or groups.
  for (const entry of document.entries) {
    if (
      !record(entry) ||
      !counter(entry.unknownTagCount) ||
      !counter(entry.duplicateFieldCount) ||
      typeof entry.nestedMarkup !== 'boolean' ||
      typeof entry.pointer !== 'string'
    ) {
      issue('invalid-document');
      return report;
    }
    normalizedSize += entry.pointer.length;
    for (const field of FIELDS) {
      const value: unknown = entry[field];
      if (typeof value === 'string') normalizedSize += value.length;
    }
    if (normalizedSize > SITEMAP_LIMITS.normalizedCodeUnits) {
      issue('normalized-size-limit');
      return report;
    }
  }
  const seen = new Map<string, number>();
  const groups = new Map<string, SitemapReport['pathGroups'][number]>();
  let firstHost: { host: string; ordinal: number } | undefined;
  for (let i = 0; i < document.entries.length; i++) {
    const input = document.entries[i]!;
    const ordinal = i + 1,
      pointer = sitemapEntryPointer(kind, ordinal);
    const startDiagnostics = report.diagnostics.length;
    if (input.ordinal !== ordinal || input.pointer !== pointer)
      issue('source-mismatch', pointer, ordinal);
    if (input.unknownTagCount || input.duplicateFieldCount || input.nestedMarkup)
      issue('unknown-structure', pointer, ordinal, 'warning');
    const fields: Record<(typeof FIELDS)[number], string | null> = {
      loc: null,
      lastmod: null,
      changefreq: null,
      priority: null,
    };
    for (const field of FIELDS) {
      const value: unknown = input[field];
      if (value !== undefined && value !== null) {
        if (typeof value !== 'string' || value.length > SITEMAP_LIMITS.fieldCodeUnits)
          issue('invalid-field', `${pointer}/${field}`, ordinal);
        else fields[field] = value.trim();
      }
    }
    let url: ValidatedSitemapEntry['url'] = null;
    let duplicateOf: number | null = null;
    if (!fields.loc) issue('missing-loc', `${pointer}/loc`, ordinal);
    else {
      try {
        const loc = fields.loc;
        if (
          loc.length > SITEMAP_LIMITS.locCodeUnits ||
          !/^https?:\/\/[^/?#]+(?:[/?#]|$)/i.test(loc) ||
          loc.includes('#') ||
          /\s|\\/.test(loc) ||
          /%(?![a-f0-9]{2})/i.test(loc) ||
          Array.from(loc).some((c) => c.charCodeAt(0) <= 31 || c.charCodeAt(0) === 127)
        )
          throw new Error('Unsupported loc.');
        const parsed = new URL(loc);
        const authority = loc.slice(loc.indexOf('://') + 3).split(/[/?#]/, 1)[0]!;
        if (
          !parsed.host ||
          authority.includes('@') ||
          parsed.username ||
          parsed.password ||
          parsed.hash
        )
          throw new Error('Unsupported loc.');
        url = {
          origin: parsed.origin,
          host: parsed.host,
          pathname: parsed.pathname,
          search: parsed.search,
        };
        const prior = seen.get(loc);
        if (prior !== undefined) {
          duplicateOf = prior;
          issue('duplicate-loc', `${pointer}/loc`, ordinal, 'warning', prior);
        } else seen.set(loc, ordinal);
        if (firstHost && firstHost.host !== parsed.host)
          issue('mixed-host', `${pointer}/loc`, ordinal, 'error', firstHost.ordinal);
        firstHost ??= { host: parsed.host, ordinal };
        const groupKey = `${parsed.origin}\0${parsed.pathname}`;
        const group = groups.get(groupKey) ?? {
          origin: parsed.origin,
          pathname: parsed.pathname,
          entryOrdinals: [],
        };
        group.entryOrdinals.push(ordinal);
        groups.set(groupKey, group);
      } catch {
        issue('invalid-loc', `${pointer}/loc`, ordinal);
      }
    }
    if (fields.lastmod !== null && !validLastmod(fields.lastmod))
      issue('invalid-lastmod', `${pointer}/lastmod`, ordinal);
    if (kind === 'sitemapindex') {
      if (input.changefreq !== undefined || input.priority !== undefined)
        issue('unsupported-index-field', pointer, ordinal);
    } else {
      if (fields.changefreq !== null && !FREQUENCIES.has(fields.changefreq))
        issue('invalid-changefreq', `${pointer}/changefreq`, ordinal);
      if (
        fields.priority !== null &&
        (!/^[01](?:\.\d+)?$/.test(fields.priority) || Number(fields.priority) > 1)
      )
        issue('invalid-priority', `${pointer}/priority`, ordinal);
    }
    report.entries.push({
      ordinal,
      pointer,
      ...fields,
      url,
      duplicateOf,
      valid: !report.diagnostics.slice(startDiagnostics).some((d) => d.severity === 'error'),
      childStatus: kind === 'sitemapindex' ? 'unchecked' : null,
    });
  }
  report.pathGroups = [...groups.values()];
  report.checkedEntryCount = report.entries.length;
  report.uncheckedChildCount = kind === 'sitemapindex' ? report.entries.length : 0;
  if (kind === 'sitemapindex') issue('unchecked-children', '/sitemapindex', null, 'info');
  report.valid = !report.diagnostics.some((d) => d.severity === 'error');
  report.complete =
    report.valid &&
    !report.diagnostics.some(
      (d) =>
        d.code === 'size-unmeasured' ||
        d.code === 'unknown-structure' ||
        d.code === 'unchecked-children',
    );
  return report;
}
