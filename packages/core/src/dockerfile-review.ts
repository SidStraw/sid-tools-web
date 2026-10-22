export const HADOLINT_VERSION = '2.15.1';
export const DOCKERFILE_POLICY = 'all-rules/ignore-pragmas-disabled/v1';
export const DOCKERFILE_LIMIT = 128_000;
export const DOCKER_REPORT_LIMIT = 2_000_000;
export interface DockerFinding {
  id: string;
  code: string;
  level: 'error' | 'warning' | 'info' | 'style';
  line: number;
  column: number;
  message: string;
}
export interface DockerReport {
  format: 'sid-tools-dockerfile-v1';
  engine: { name: 'hadolint'; version: string; policy: string };
  source: { name: string; text: string; sha256: string };
  findings: DockerFinding[];
  annotations: { id: string; reason: string }[];
  imageScan: 'NOT RUN';
  imageBuild: 'NOT RUN';
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid object');
  return value as Record<string, unknown>;
}
function string(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max || value.includes('\0'))
    throw new Error('Invalid text');
  return value;
}
export async function dockerHash(text: string): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
export function parseHadolint(raw: unknown, source: string): DockerFinding[] {
  if (!Array.isArray(raw) || raw.length > 1000) throw new Error('Invalid findings');
  const lines = source.split('\n');
  const ids = new Set<string>();
  return raw.map((value: unknown) => {
    const f = object(value);
    const code = string(f.code, 20),
      message = string(f.message, 4000);
    if (
      !/^(?:DL|SC)\d+$/.test(code) ||
      !['error', 'warning', 'info', 'style'].includes(String(f.level)) ||
      !Number.isSafeInteger(f.line) ||
      Number(f.line) < 1 ||
      Number(f.line) > lines.length ||
      !Number.isSafeInteger(f.column) ||
      Number(f.column) < 1 ||
      Number(f.column) > 128_000
    )
      throw new Error('Invalid finding position or rule');
    const finding = {
      code,
      message,
      level: f.level as DockerFinding['level'],
      line: f.line as number,
      column: f.column as number,
    };
    const id = JSON.stringify([
      finding.code,
      finding.level,
      finding.line,
      finding.column,
      finding.message,
    ]);
    if (ids.has(id)) throw new Error('Duplicate finding');
    ids.add(id);
    return { id, ...finding };
  });
}
export async function createDockerReport(
  name: string,
  text: string,
  raw: unknown,
): Promise<DockerReport> {
  if (
    !text.trim() ||
    new TextEncoder().encode(text).length > DOCKERFILE_LIMIT ||
    text.includes('\0') ||
    text.split('\n').length > 5000
  )
    throw new Error('Invalid Dockerfile');
  if (
    !name ||
    name.length > 200 ||
    /[/\\]/.test(name) ||
    name.split('').some((c) => c.charCodeAt(0) < 32)
  )
    throw new Error('Invalid source name');
  return {
    format: 'sid-tools-dockerfile-v1',
    engine: { name: 'hadolint', version: HADOLINT_VERSION, policy: DOCKERFILE_POLICY },
    source: { name, text, sha256: await dockerHash(text) },
    findings: parseHadolint(raw, text),
    annotations: [],
    imageScan: 'NOT RUN',
    imageBuild: 'NOT RUN',
  };
}
export async function parseDockerReport(text: string): Promise<DockerReport> {
  if (new TextEncoder().encode(text).length > DOCKER_REPORT_LIMIT) throw new Error('Report limit');
  const input = object(JSON.parse(text)),
    engine = object(input.engine),
    source = object(input.source);
  if (
    input.format !== 'sid-tools-dockerfile-v1' ||
    engine.name !== 'hadolint' ||
    engine.version !== HADOLINT_VERSION ||
    engine.policy !== DOCKERFILE_POLICY ||
    input.imageScan !== 'NOT RUN' ||
    input.imageBuild !== 'NOT RUN'
  )
    throw new Error('Unsupported evidence');
  const report = await createDockerReport(
    string(source.name, 200),
    string(source.text, DOCKERFILE_LIMIT),
    input.findings,
  );
  if (source.sha256 !== report.source.sha256) throw new Error('Source digest mismatch');
  if (!Array.isArray(input.annotations) || input.annotations.length > report.findings.length)
    throw new Error('Invalid annotations');
  const ids = new Set(report.findings.map((f) => f.id)),
    seen = new Set<string>();
  report.annotations = input.annotations.map((value: unknown) => {
    const a = object(value),
      id = string(a.id, 5000),
      reason = string(a.reason, 1000).trim();
    if (!ids.has(id) || seen.has(id)) throw new Error('Unknown or duplicate annotation');
    seen.add(id);
    return { id, reason };
  });
  return report;
}
export function compareDockerReports(current: DockerReport, previous?: DockerReport) {
  const sameSource = previous?.source.sha256 === current.source.sha256;
  const prior = new Set(previous?.findings.map((f) => f.id) ?? []);
  const now = new Set(current.findings.map((f) => f.id));
  const reasons = new Map(sameSource ? previous?.annotations.map((a) => [a.id, a.reason]) : []);
  for (const a of current.annotations) reasons.set(a.id, a.reason);
  return {
    hasBaseline: Boolean(previous),
    sameSource,
    rows: current.findings.map((f) => ({
      finding: f,
      change: previous ? (prior.has(f.id) ? 'unchanged' : 'added') : 'current',
      reason: reasons.get(f.id) ?? null,
    })),
    removed: previous?.findings.filter((f) => !now.has(f.id)) ?? [],
    invalidatedAnnotations: !sameSource ? (previous?.annotations.length ?? 0) : 0,
  };
}
