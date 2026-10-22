export const UNUSED_TYPES = [
  'files',
  'dependencies',
  'devDependencies',
  'optionalPeerDependencies',
  'exports',
  'types',
  'nsExports',
  'nsTypes',
  'enumMembers',
  'namespaceMembers',
] as const;
export type UnusedType = (typeof UNUSED_TYPES)[number];
export type UnusedFinding = {
  id: string;
  type: UnusedType;
  file: string;
  name: string;
  namespace: string;
  line: number | null;
  col: number | null;
  sourceHash: string | null;
  reason: string;
};
export type UnusedSettings = {
  configPath: string;
  configHash: string;
  fingerprint: string;
  node: string;
  workspaces: string[];
  plugins: Record<string, string[]>;
  declared: { workspace: string; entry: string[]; project: string[] }[];
  contextFiles: { path: string; sha256: string }[];
};
export type UnusedReport = {
  format: 'sid-tools-unused-v1';
  engine: { name: 'knip'; version: string };
  scope: string;
  settings: UnusedSettings;
  findings: UnusedFinding[];
  warnings: string[];
};
export type UnusedBaseline = {
  format: 'sid-tools-unused-baseline-v1';
  report: UnusedReport;
  accepted: { id: string; sourceHash: string; reason: string }[];
};
export type UnusedRow = {
  finding: UnusedFinding;
  status: 'new' | 'existing' | 'changed' | 'accepted' | 'resolved' | 'review-needed';
  reason: string | null;
};
export const UNUSED_WARNINGS = [
  '結果是 Knip 在記錄的入口／project 範圍內產生的審查候選，不是安全刪除證明。',
  '動態組合的 import、反射與 runtime 使用可能無法靜態解析；framework 隱式入口需正確 plugin／entry 設定。',
  '公開 exports 可能由 repo 外使用，不能以本機未找到引用就移除。CSS 未執行 runtime coverage，不提供可刪除判定。',
  '設定指紋只涵蓋記錄的檔案與條件，不保證未記錄的 plugin 設定、外部資料與環境相同。',
];
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const string = (v: unknown): v is string => typeof v === 'string' && v.length <= 2000;
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length <= 2000 && v.every(string);
const sha = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const position = (v: unknown) =>
  v === null || (Number.isSafeInteger(v) && Number(v) >= 1 && Number(v) <= 100_000_000);
export function unusedId(type: string, file: string, name: string, namespace: string) {
  return JSON.stringify([type, file, name, namespace]);
}
function decode(text: string): unknown {
  if (new TextEncoder().encode(text).length > 8_000_000) throw new Error('報告上限 8 MB。');
  return JSON.parse(text);
}
function validate(value: unknown): UnusedReport {
  if (
    !record(value) ||
    value.format !== 'sid-tools-unused-v1' ||
    !record(value.engine) ||
    value.engine.name !== 'knip' ||
    !string(value.engine.version) ||
    !value.engine.version ||
    !string(value.scope) ||
    !value.scope ||
    !strings(value.warnings) ||
    !Array.isArray(value.findings) ||
    value.findings.length > 10_000 ||
    !record(value.settings)
  )
    throw new Error('不支援的 unused 報告。');
  const s = value.settings;
  if (
    !string(s.configPath) ||
    !sha(s.configHash) ||
    !sha(s.fingerprint) ||
    !string(s.node) ||
    !strings(s.workspaces) ||
    !record(s.plugins) ||
    Object.keys(s.plugins).length > 1000 ||
    !Object.entries(s.plugins).every(([k, v]) => string(k) && strings(v)) ||
    !Array.isArray(s.declared) ||
    s.declared.length > 1000 ||
    !s.declared.every(
      (d) => record(d) && string(d.workspace) && strings(d.entry) && strings(d.project),
    ) ||
    !Array.isArray(s.contextFiles) ||
    s.contextFiles.length > 5000 ||
    !s.contextFiles.every((f) => record(f) && string(f.path) && sha(f.sha256))
  )
    throw new Error('缺少分析設定或 metadata。');
  const ids = new Set<string>();
  for (const f of value.findings) {
    if (
      !record(f) ||
      !UNUSED_TYPES.includes(f.type as UnusedType) ||
      !string(f.file) ||
      !f.file ||
      !string(f.name) ||
      !string(f.namespace) ||
      !position(f.line) ||
      !position(f.col) ||
      (f.sourceHash !== null && !sha(f.sourceHash)) ||
      !string(f.reason) ||
      !f.reason ||
      f.id !== unusedId(f.type as string, f.file, f.name, f.namespace) ||
      ids.has(f.id as string)
    )
      throw new Error('候選來源、識別或位置無效。');
    ids.add(f.id as string);
  }
  return value as unknown as UnusedReport;
}
export function parseUnusedReport(text: string) {
  return validate(decode(text));
}
export function createUnusedBaseline(
  report: UnusedReport,
  decisions: { id: string; reason: string }[] = [],
): UnusedBaseline {
  const findings = new Map(report.findings.map((f) => [f.id, f])),
    ids = new Set<string>();
  const accepted = decisions.map((d) => {
    const f = findings.get(d.id);
    if (
      !f ||
      !f.sourceHash ||
      ids.has(d.id) ||
      typeof d.reason !== 'string' ||
      !d.reason.trim() ||
      d.reason.length > 1000
    )
      throw new Error('接受項目必須有來源摘要與 1–1000 字的理由，且不可重複。');
    ids.add(d.id);
    return { id: d.id, sourceHash: f.sourceHash, reason: d.reason.trim() };
  });
  const baseline: UnusedBaseline = { format: 'sid-tools-unused-baseline-v1', report, accepted };
  if (new TextEncoder().encode(JSON.stringify(baseline)).length > 8_000_000)
    throw new Error('基準上限 8 MB。');
  return baseline;
}
export function parseUnusedBaseline(text: string): UnusedBaseline {
  const value = decode(text);
  if (
    !record(value) ||
    value.format !== 'sid-tools-unused-baseline-v1' ||
    !Array.isArray(value.accepted) ||
    value.accepted.length > 10_000
  )
    throw new Error('基準格式無效。');
  const report = validate(value.report);
  const hashes = new Map(report.findings.map((f) => [f.id, f.sourceHash]));
  for (const d of value.accepted)
    if (
      !record(d) ||
      typeof d.id !== 'string' ||
      typeof d.reason !== 'string' ||
      !sha(d.sourceHash) ||
      hashes.get(d.id) !== d.sourceHash
    )
      throw new Error('基準接受紀錄與來源不符。');
  return createUnusedBaseline(report, value.accepted as { id: string; reason: string }[]);
}
export function reviewUnused(report: UnusedReport, baseline: UnusedBaseline | null = null) {
  const reasons: string[] = [];
  if (baseline) {
    if (baseline.report.scope !== report.scope) reasons.push('專案 scope 不同。');
    if (baseline.report.engine.version !== report.engine.version) reasons.push('Knip 版本不同。');
    if (baseline.report.settings.fingerprint !== report.settings.fingerprint)
      reasons.push('分析設定／環境指紋不同，請重新審查。');
  }
  const comparable = !reasons.length;
  const old = new Map(baseline?.report.findings.map((f) => [f.id, f]) ?? []),
    accepted = new Map(baseline?.accepted.map((d) => [d.id, d]) ?? []);
  const rows: UnusedRow[] = report.findings.map((f) => {
    const prior = old.get(f.id),
      decision = accepted.get(f.id);
    const status = !comparable
      ? 'review-needed'
      : !prior
        ? 'new'
        : !f.sourceHash || f.sourceHash !== prior.sourceHash
          ? 'changed'
          : decision
            ? 'accepted'
            : 'existing';
    return { finding: f, status, reason: status === 'accepted' ? decision!.reason : null };
  });
  if (comparable && baseline) {
    const current = new Set(report.findings.map((f) => f.id));
    for (const f of baseline.report.findings)
      if (!current.has(f.id)) rows.push({ finding: f, status: 'resolved', reason: null });
  }
  return {
    comparable,
    reasons,
    hasBaseline: Boolean(baseline),
    unverifiedBaselineCount: comparable ? 0 : old.size,
    rows,
  };
}
