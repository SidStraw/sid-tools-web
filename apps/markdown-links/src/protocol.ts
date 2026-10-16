import { FORMAT, LIMITS, failed, type Report } from './model';

export const PROTOCOL = 'sid-tools/markdown-links/child/v1';
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const keys = (value: Record<string, unknown>, expected: string) =>
  Object.keys(value).sort().join(',') === expected;
const text = (value: unknown, maximum: number): value is string =>
  typeof value === 'string' && value.length <= maximum;
const hash = (value: unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const count = (value: unknown, maximum: number) =>
  Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= maximum;

// The child sends one bounded JSON string, never exception objects or native output.
export function decodeReport(message: unknown, identity: string): Report | null {
  if (!text(message, LIMITS.reportBytes + 256)) return null;
  if (Buffer.byteLength(message) > LIMITS.reportBytes + 256) return null;
  let envelope: unknown;
  try {
    envelope = JSON.parse(message);
  } catch {
    return null;
  }
  if (
    !object(envelope) ||
    !keys(envelope, 'identity,protocol,report') ||
    envelope.protocol !== PROTOCOL ||
    envelope.identity !== identity ||
    !object(envelope.report)
  )
    return null;
  const report = envelope.report;
  if (
    !keys(
      report,
      'counts,delta,failure,findings,format,offline,policy,renderer,rootIdentity,status',
    ) ||
    report.format !== FORMAT ||
    report.offline !== true ||
    report.renderer !== failed('').renderer ||
    !['complete', 'failed-coverage'].includes(String(report.status)) ||
    !(report.rootIdentity === '' || hash(report.rootIdentity)) ||
    !(report.policy === '' || hash(report.policy)) ||
    !object(report.counts) ||
    !keys(report.counts, 'broken,documents,links,skipped,unknown') ||
    !Array.isArray(report.findings) ||
    report.findings.length > LIMITS.findings
  )
    return null;
  for (const [key, value] of Object.entries(report.counts)) {
    if (!count(value, key === 'documents' ? LIMITS.documents : LIMITS.work)) return null;
  }
  for (const finding of report.findings) {
    if (
      !object(finding) ||
      !keys(finding, 'column,destination,id,line,reason,source,status,target') ||
      !hash(finding.id) ||
      !text(finding.source, LIMITS.pathUnits) ||
      !text(finding.reason, 4096) ||
      ![
        'missing-file',
        'missing-anchor',
        'unknown',
        'external-skipped',
        'ignored-skipped',
      ].includes(String(finding.status))
    )
      return null;
    for (const key of ['destination', 'target']) {
      if (finding[key] !== null && !text(finding[key], 8192)) return null;
    }
    for (const key of ['line', 'column']) {
      if (finding[key] !== null && (!count(finding[key], 999_999) || finding[key] === 0))
        return null;
    }
  }
  if (report.status === 'failed-coverage') {
    if (
      !text(report.failure, 128) ||
      !/^[a-z0-9-]+$/.test(report.failure) ||
      report.delta !== null ||
      report.findings.length !== 0 ||
      Object.values(report.counts).some((value) => value !== 0)
    )
      return null;
  } else if (report.failure !== null || !hash(report.rootIdentity) || !hash(report.policy))
    return null;
  if (report.delta !== null) {
    if (!object(report.delta) || !keys(report.delta, 'added,resolved,unchanged')) return null;
    for (const entries of Object.values(report.delta)) {
      if (!Array.isArray(entries) || entries.length > LIMITS.findings || !entries.every(hash))
        return null;
    }
  }
  if (Buffer.byteLength(JSON.stringify(report)) > LIMITS.reportBytes) return null;
  return report as unknown as Report;
}
