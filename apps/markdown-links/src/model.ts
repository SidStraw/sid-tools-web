export const FORMAT = 'sid-tools/markdown-links/v1';
export const LIMITS = {
  entries: 10_000,
  documents: 256,
  fileBytes: 512_000,
  totalBytes: 16_000_000,
  pathUnits: 1024,
  depth: 32,
  work: 50_000,
  findings: 10_000,
  reportBytes: 4_000_000,
  policyBytes: 32_000,
  durationMs: 30_000,
  workerMemoryMb: 128,
} as const;

export interface Options {
  root: string;
  ignores: string[];
  ignoreFile: string | null;
  baseline: string | null;
  json: boolean;
}

export interface Finding {
  id: string;
  source: string;
  target: string | null;
  destination: string | null;
  line: number | null;
  column: number | null;
  status: 'missing-file' | 'missing-anchor' | 'unknown' | 'external-skipped' | 'ignored-skipped';
  reason: string;
}

export interface Report {
  format: typeof FORMAT;
  status: 'complete' | 'failed-coverage';
  rootIdentity: string;
  policy: string;
  renderer: string;
  offline: true;
  counts: { documents: number; links: number; broken: number; unknown: number; skipped: number };
  findings: Finding[];
  delta: { added: string[]; resolved: string[]; unchanged: string[] } | null;
  failure: string | null;
}

export function failed(reason: string): Report {
  return {
    format: FORMAT,
    status: 'failed-coverage',
    rootIdentity: '',
    policy: '',
    renderer: 'GFM-heading subset; github-slugger 2.0.0',
    offline: true,
    counts: { documents: 0, links: 0, broken: 0, unknown: 0, skipped: 0 },
    findings: [],
    delta: null,
    failure: reason,
  };
}

export function exitCode(report: Report): number {
  return report.status === 'failed-coverage'
    ? 2
    : report.counts.broken + report.counts.unknown > 0
      ? 1
      : 0;
}

// Paths/destinations are intentionally visible, but never executable terminal controls.
export function terminalSafe(value: string): string {
  return value.replace(
    /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/gu,
    (unit) => `\\u{${unit.codePointAt(0)!.toString(16)}}`,
  );
}
