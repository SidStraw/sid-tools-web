export const BUNDLE_FORMAT = 'sid-tools-bundle-v1';
export type ByteMetric = 'raw' | 'gzip' | 'brotli';
export type BundleModule = { id: string; package: string | null; renderedLength: number | null };
export type BundleAsset = {
  file: string;
  identity: string;
  kind: 'chunk' | 'asset';
  entry: boolean;
  dynamicEntry: boolean;
  bytes: Record<ByteMetric, number>;
  sha256: string;
  imports: string[];
  dynamicImports: string[];
  modules: BundleModule[];
};
export const ENV_FIELDS = [
  'node',
  'platform',
  'arch',
  'bundler',
  'vite',
  'mode',
  'target',
  'minify',
  'sourcemap',
  'configHash',
  'compression',
  'profile',
] as const;
export type BundleEnvironment = Record<(typeof ENV_FIELDS)[number], string | null>;
export type BundleReport = {
  format: typeof BUNDLE_FORMAT;
  environment: BundleEnvironment;
  coverage: string;
  assets: BundleAsset[];
  warnings: string[];
};
export type BundleAssetChange = {
  identity: string;
  status: 'added' | 'removed' | 'changed' | 'unchanged' | 'ambiguous';
  before: BundleAsset | null;
  after: BundleAsset | null;
  delta: Record<ByteMetric, number> | null;
};
export type BundleLengthChange = {
  id: string;
  package: string | null;
  before: number | null;
  after: number | null;
  delta: number | null;
  beforeChunks: string[];
  afterChunks: string[];
};
export type BundleComparison = {
  format: 'sid-tools-bundle-comparison-v1';
  comparable: boolean;
  reasons: string[];
  environments: { before: BundleEnvironment; after: BundleEnvironment };
  totals: {
    before: Record<ByteMetric, number>;
    after: Record<ByteMetric, number>;
    delta: Record<ByteMetric, number>;
  };
  budget: {
    metric: ByteMetric;
    limit: number;
    measured: number;
    status: 'pass' | 'exceeded' | 'not-evaluated';
  } | null;
  assets: BundleAssetChange[];
  modules: BundleLengthChange[];
  packages: BundleLengthChange[];
  warnings: string[];
};
const metrics = ['raw', 'gzip', 'brotli'] as const;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.length <= 2000;
const size = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 1_000_000_000;
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length <= 2000 && value.every(text);
export function parseBundleReport(input: string): BundleReport {
  if (new TextEncoder().encode(input).length > 8_000_000) throw new Error('單份報告上限 8 MB。');
  const value: unknown = JSON.parse(input);
  if (
    !record(value) ||
    value.format !== BUNDLE_FORMAT ||
    !Array.isArray(value.assets) ||
    !value.assets.length ||
    value.assets.length > 2000 ||
    !text(value.coverage) ||
    !strings(value.warnings)
  )
    throw new Error('不支援的 bundle 報告格式或數量。');
  const environment = Object.fromEntries(
    ENV_FIELDS.map((key) => {
      const field = record(value.environment) ? value.environment[key] : null;
      return [key, text(field) && field.length ? field : null];
    }),
  ) as BundleEnvironment;
  const files = new Set<string>();
  let moduleCount = 0;
  for (const asset of value.assets) {
    if (
      !record(asset) ||
      !text(asset.file) ||
      !asset.file ||
      files.has(asset.file) ||
      !text(asset.identity) ||
      !asset.identity ||
      (asset.kind !== 'chunk' && asset.kind !== 'asset') ||
      typeof asset.entry !== 'boolean' ||
      typeof asset.dynamicEntry !== 'boolean' ||
      !record(asset.bytes) ||
      !metrics.every((m) => size((asset.bytes as Record<string, unknown>)[m])) ||
      !text(asset.sha256) ||
      !/^[a-f0-9]{64}$/.test(asset.sha256) ||
      !strings(asset.imports) ||
      !strings(asset.dynamicImports) ||
      !Array.isArray(asset.modules)
    )
      throw new Error('產物資料、大小或來源結構無效。');
    files.add(asset.file);
    const ids = new Set<string>();
    for (const module of asset.modules) {
      if (
        ++moduleCount > 50_000 ||
        !record(module) ||
        !text(module.id) ||
        !module.id ||
        ids.has(module.id) ||
        (module.package !== null && !text(module.package)) ||
        (module.renderedLength !== null && !size(module.renderedLength))
      )
        throw new Error('Module 資料無效或超過 50,000 筆。');
      ids.add(module.id);
    }
  }
  return { ...value, environment } as unknown as BundleReport;
}
function totals(report: BundleReport): Record<ByteMetric, number> {
  const result = { raw: 0, gzip: 0, brotli: 0 };
  for (const asset of report.assets)
    for (const metric of metrics) result[metric] += asset.bytes[metric];
  return result;
}
function subtract(before: Record<ByteMetric, number>, after: Record<ByteMetric, number>) {
  return {
    raw: after.raw - before.raw,
    gzip: after.gzip - before.gzip,
    brotli: after.brotli - before.brotli,
  };
}
function lengths(report: BundleReport, byPackage: boolean) {
  const result = new Map<
    string,
    { value: number | null; package: string | null; chunks: Set<string> }
  >();
  for (const asset of report.assets)
    for (const module of asset.modules) {
      const key = byPackage ? (module.package ?? '(project / virtual / external)') : module.id;
      const row = result.get(key) ?? {
        value: 0,
        package: module.package,
        chunks: new Set<string>(),
      };
      row.value =
        row.value === null || module.renderedLength === null
          ? null
          : row.value + module.renderedLength;
      row.chunks.add(asset.file);
      result.set(key, row);
    }
  return result;
}
function compareLengths(
  before: BundleReport,
  after: BundleReport,
  byPackage: boolean,
): BundleLengthChange[] {
  const a = lengths(before, byPackage),
    b = lengths(after, byPackage);
  return [...new Set([...a.keys(), ...b.keys()])].sort().map((id) => {
    const av = a.has(id) ? a.get(id)!.value : 0,
      bv = b.has(id) ? b.get(id)!.value : 0;
    return {
      id,
      package: b.get(id)?.package ?? a.get(id)?.package ?? null,
      before: av,
      after: bv,
      delta: av === null || bv === null ? null : bv - av,
      beforeChunks: [...(a.get(id)?.chunks ?? [])],
      afterChunks: [...(b.get(id)?.chunks ?? [])],
    };
  });
}
export function compareBundles(
  before: BundleReport,
  after: BundleReport,
  budget: { metric: ByteMetric; limit: number } | null = null,
): BundleComparison {
  if (budget && (!metrics.includes(budget.metric) || !size(budget.limit)))
    throw new Error('預算須為 0–1,000,000,000 的整數位元組。');
  const reasons: string[] = [];
  for (const key of ENV_FIELDS) {
    if (!before.environment[key] || !after.environment[key])
      reasons.push(`缺少 ${key} metadata；不可直接比較。`);
    else if (before.environment[key] !== after.environment[key])
      reasons.push(`${key} 不同；不可直接比較。`);
  }
  if (before.coverage !== after.coverage) reasons.push('產物收集範圍不同；不可直接比較。');
  const comparable = !reasons.length;
  const group = (report: BundleReport) => {
    const map = new Map<string, BundleAsset[]>();
    for (const item of report.assets) {
      const rows = map.get(item.identity) ?? [];
      rows.push(item);
      map.set(item.identity, rows);
    }
    return map;
  };
  const a = group(before),
    b = group(after),
    assets: BundleAssetChange[] = [];
  for (const identity of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    const av = a.get(identity) ?? [],
      bv = b.get(identity) ?? [];
    if (av.length > 1 || bv.length > 1) {
      for (const asset of av)
        assets.push({ identity, status: 'ambiguous', before: asset, after: null, delta: null });
      for (const asset of bv)
        assets.push({ identity, status: 'ambiguous', before: null, after: asset, delta: null });
      continue;
    }
    const left = av[0] ?? null,
      right = bv[0] ?? null;
    assets.push({
      identity,
      status: !left
        ? 'added'
        : !right
          ? 'removed'
          : left.sha256 === right.sha256
            ? 'unchanged'
            : 'changed',
      before: left,
      after: right,
      delta: subtract(
        left?.bytes ?? { raw: 0, gzip: 0, brotli: 0 },
        right?.bytes ?? { raw: 0, gzip: 0, brotli: 0 },
      ),
    });
  }
  const beforeTotal = totals(before),
    afterTotal = totals(after);
  return {
    format: 'sid-tools-bundle-comparison-v1',
    comparable,
    reasons,
    environments: { before: before.environment, after: after.environment },
    totals: { before: beforeTotal, after: afterTotal, delta: subtract(beforeTotal, afterTotal) },
    budget: budget
      ? {
          ...budget,
          measured: afterTotal[budget.metric],
          status: !comparable
            ? 'not-evaluated'
            : afterTotal[budget.metric] <= budget.limit
              ? 'pass'
              : 'exceeded',
        }
      : null,
    assets,
    modules: compareLengths(before, after, false),
    packages: compareLengths(before, after, true),
    warnings: [
      ...new Set([
        ...before.warnings,
        ...after.warnings,
        '大小總和為各產物獨立壓縮的位元組，並非單一頁面的網路下載量。',
        'Module/package renderedLength 是 bundler 提供的長度，不等於最終 raw/gzip/Brotli 位元組；壓縮與 wrapper 差額未歸因，不分攤。',
        '條件相同只代表已記錄的設定一致，不證明外部服務、未記錄環境或非確定性插件相同。',
      ]),
    ],
  };
}
