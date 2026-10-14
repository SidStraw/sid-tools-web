type RecordValue = Record<string, unknown>;
const textValue = (v: unknown): string => (typeof v === 'string' ? v : '');
const isRecord = (v: unknown): boolean => v !== null && typeof v === 'object' && !Array.isArray(v);
function object(value: unknown): RecordValue {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(object(value))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
export function parseLighthouse(text: string) {
  if (new TextEncoder().encode(text).byteLength > 10_000_000)
    throw new Error('每份報告上限 10 MB。');
  const report = object(JSON.parse(text));
  const version = textValue(report.lighthouseVersion);
  if (!/^(11|12|13)\./.test(version) || !isRecord(report.categories) || !isRecord(report.audits))
    throw new Error('請提供 Lighthouse 11–13 的原始 JSON 報告（不是 HTML 或 LHCI 包裝檔）。');
  if (report.runtimeError)
    throw new Error(
      `這份 Lighthouse 報告執行失敗：${textValue(object(report.runtimeError).message) || 'runtimeError'}`,
    );
  return report;
}
export function compareLighthouse(beforeText: string, afterText: string) {
  const before = parseLighthouse(beforeText),
    after = parseLighthouse(afterText);
  function conditions(r: RecordValue) {
    const c = object(r.configSettings);
    return {
      url: r.finalDisplayedUrl ?? r.finalUrl ?? r.requestedUrl ?? null,
      requestedUrl: r.requestedUrl ?? null,
      version: r.lighthouseVersion,
      fetchedAt: r.fetchTime ?? null,
      formFactor: c.formFactor ?? null,
      throttlingMethod: c.throttlingMethod ?? null,
      throttling: c.throttling ?? null,
      screenEmulation: c.screenEmulation ?? null,
      environment: r.environment ?? null,
      runWarnings: r.runWarnings ?? [],
    };
  }
  const a = conditions(before),
    b = conditions(after);
  const warnings: string[] = [
    '單次測試只顯示觀測差異，不能推論程式修改造成改善或退步；請以相同條件重複測量。',
  ];
  for (const key of [
    'url',
    'formFactor',
    'throttlingMethod',
    'throttling',
    'screenEmulation',
  ] as const) {
    if (a[key] === null || b[key] === null) warnings.push(`${key} 條件不完整，無法確認可比性。`);
    else if (stable(a[key]) !== stable(b[key])) warnings.push(`${key} 不同：測試條件不一致。`);
  }
  if (String(a.version).split('.')[0] !== String(b.version).split('.')[0])
    warnings.push('Lighthouse 主版本不同，評分規則可能不同。');
  const categories = [
    ...new Set([
      ...Object.keys(object(before.categories)),
      ...Object.keys(object(after.categories)),
    ]),
  ].map((id) => {
    const x = object(object(before.categories)[id]),
      y = object(object(after.categories)[id]);
    const av = number(x.score),
      bv = number(y.score);
    return {
      id,
      title: textValue(y.title) || textValue(x.title) || id,
      before: av === null ? null : av * 100,
      after: bv === null ? null : bv * 100,
      delta: av === null || bv === null ? null : Math.round((bv - av) * 10000) / 100,
    };
  });
  const audits = [
    ...new Set([...Object.keys(object(before.audits)), ...Object.keys(object(after.audits))]),
  ].map((id) => {
    const x = object(object(before.audits)[id]),
      y = object(object(after.audits)[id]);
    const snapshot = (v: RecordValue) => ({
      score: number(v.score),
      numericValue: number(v.numericValue),
      numericUnit: typeof v.numericUnit === 'string' ? v.numericUnit : null,
      displayValue: typeof v.displayValue === 'string' ? v.displayValue : null,
      mode: textValue(v.scoreDisplayMode) || 'unavailable',
    });
    const av = snapshot(x),
      bv = snapshot(y);
    return {
      id,
      title: textValue(y.title) || textValue(x.title) || id,
      before: av,
      after: bv,
      delta:
        av.numericValue !== null &&
        bv.numericValue !== null &&
        av.numericUnit !== null &&
        av.numericUnit === bv.numericUnit
          ? bv.numericValue - av.numericValue
          : null,
      changed: stable(av) !== stable(bv),
    };
  });
  const metricIds = [
    'first-contentful-paint',
    'largest-contentful-paint',
    'total-blocking-time',
    'cumulative-layout-shift',
    'speed-index',
    'interactive',
  ];
  return {
    conditions: { before: a, after: b },
    warnings,
    categories,
    metrics: audits.filter((row) => metricIds.includes(row.id)),
    audits,
  };
}
