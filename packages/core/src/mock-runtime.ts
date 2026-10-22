import { inspectOpenApiFixtures, generateOpenApiFixture } from './openapi-fixture.js';
export const MOCK_LIMITS = {
  sourceBytes: 524_288,
  stateBytes: 262_144,
  choices: 64,
  fixtureBytes: 2_000_000,
  totalFixtureBytes: 8_000_000,
  delayMs: 5000,
} as const;
export interface MockChoice {
  id: string;
  operation: string;
  method: string;
  path: string;
  status: string;
  mediaType: string;
  example: string | null;
  origin: string;
  fixtureJson: string;
  pointer: string;
}
export interface MockContract {
  seed: string;
  choices: MockChoice[];
  notices: string[];
}
export interface MockSetting {
  operation: string;
  choice: string;
  delayMs: number;
}
export interface MockState {
  version: 1;
  sourceHash: string;
  seed: string;
  revision: number;
  settings: MockSetting[];
}
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
export function compileMockContract(source: string, seed: string): MockContract {
  if (new TextEncoder().encode(source).length > MOCK_LIMITS.sourceBytes)
    throw new Error('source-size-limit');
  if (!seed || seed.length > 128) throw new Error('seed-required-max-128');
  // The runtime accepts JSON only. No loader, resolver, callbacks or server URLs execute here.
  let raw: unknown;
  try {
    raw = JSON.parse(source);
  } catch {
    throw new Error('json-required');
  }
  if (!object(raw)) throw new Error('object-required');
  let count = 0;
  function references(value: unknown, depth: number) {
    if (++count > 40_000 || depth > 64) throw new Error('structure-limit');
    if (!value || typeof value !== 'object') return;
    if (object(value) && '$ref' in value) {
      const ref = value.$ref;
      if (typeof ref !== 'string' || !ref.startsWith('#/'))
        throw new Error('external-reference-unsupported');
      let target: unknown = raw;
      let tokens: string[];
      try {
        tokens = decodeURIComponent(ref.slice(2))
          .split('/')
          .map((s) => {
            if (/~[^01]|~$/.test(s)) throw new Error();
            return s.replaceAll('~1', '/').replaceAll('~0', '~');
          });
      } catch {
        throw new Error('invalid-reference');
      }
      for (const token of tokens) {
        if (!target || typeof target !== 'object' || !Object.hasOwn(target, token))
          throw new Error('unresolved-reference');
        target = (target as Record<string, unknown>)[token];
      }
    }
    for (const child of Object.values(value)) references(child, depth + 1);
  }
  references(raw, 0);
  const inspection = inspectOpenApiFixtures(source);
  if (inspection.status !== 'ready' || !inspection.selections.length)
    throw new Error(
      `contract-${inspection.status}: ${inspection.issues.map((i) => i.code).join(',')}`,
    );
  // Never silently omit operations or statuses which the fixture inspector cannot represent.
  if (!object(raw.paths)) throw new Error('paths-map-required');
  for (const [path, item] of Object.entries(raw.paths)) {
    if (path.startsWith('x-')) continue;
    if (!object(item) || '$ref' in item) throw new Error('path-item-reference-unsupported');
    for (const [method, operation] of Object.entries(item)) {
      if (!['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'].includes(method))
        continue;
      if (!object(operation) || !object(operation.responses)) throw new Error('responses-required');
      for (const status of Object.keys(operation.responses)) {
        if (status.startsWith('x-')) continue;
        if (
          !inspection.selections.some(
            (c) => c.path === path && c.method === method.toUpperCase() && c.status === status,
          )
        )
          throw new Error('response-media-or-bodyless-unsupported');
      }
    }
  }
  const choices: MockChoice[] = [],
    patterns = new Map<string, string>();
  let bytes = 0;
  for (const selection of inspection.selections) {
    const { method, path, status, mediaType } = selection;
    if (
      !/^\/(?:[A-Za-z0-9._~-]+|\{[A-Za-z_][A-Za-z0-9_]*\})?(?:\/(?:[A-Za-z0-9._~-]+|\{[A-Za-z_][A-Za-z0-9_]*\}))*\/?$/.test(
        path,
      )
    )
      throw new Error('route-template-unsupported');
    if (
      ['HEAD', 'TRACE'].includes(method) ||
      !/^[2-5]\d\d$/.test(status) ||
      ['204', '205', '304'].includes(status)
    )
      throw new Error('bodyless-or-status-unsupported');
    if (/[\r\n\0]/.test(mediaType)) throw new Error('media-type-invalid');
    const variables = [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
    if (
      new Set(variables).size !== variables.length ||
      path.split('/').some((p) => p === '.' || p === '..')
    )
      throw new Error('route-template-unsupported');
    const operation = `${method.toUpperCase()} ${path}`,
      pattern = `${method} ${path.replace(/\{[^}]+\}/g, '{}')}`;
    if (patterns.has(pattern) && patterns.get(pattern) !== operation)
      throw new Error('ambiguous-route-template');
    patterns.set(pattern, operation);
    for (const example of selection.examples.length
      ? selection.examples.map((e) => e.name)
      : [null]) {
      if (choices.length >= MOCK_LIMITS.choices) throw new Error('choice-count-limit');
      const report = generateOpenApiFixture(source, {
        method,
        path,
        status,
        mediaType,
        seed,
        sourceConfirmedSynthetic: true,
        ...(example === null ? {} : { exampleName: example }),
      });
      if (
        report.status !== 'ready' ||
        report.validation.status !== 'passed' ||
        report.fixtureJson === null ||
        report.issues.some((i) => i.severity === 'error') ||
        report.provenance.some((p) => p.outcome === 'rejected')
      )
        throw new Error(
          `fixture-refused: ${operation} ${status} ${report.issues.map((i) => i.code).join(',')}`,
        );
      const size = new TextEncoder().encode(report.fixtureJson).length;
      bytes += size;
      if (size > MOCK_LIMITS.fixtureBytes || bytes > MOCK_LIMITS.totalFixtureBytes)
        throw new Error('fixture-size-limit');
      choices.push({
        id: `choice-${choices.length + 1}`,
        operation,
        method,
        path,
        status,
        mediaType,
        example,
        origin:
          [
            ...new Set(report.provenance.filter((p) => p.outcome === 'used').map((p) => p.kind)),
          ].join(',') || 'generated',
        fixtureJson: report.fixtureJson,
        pointer: selection.location.pointer,
      });
    }
  }
  return {
    seed,
    choices,
    notices: [
      'OpenAPI 3.0.x JSON response 子集；不驗證 request、認證或真實 API 行為。',
      '不套用自訂 response headers、cookies、請求條件或內容協商；回應由明示情境決定。',
      '只使用已驗證的固定範例或固定 seed 產生值；不執行 servers、callbacks、外部引用或任意轉送。',
      '來源範例可能含敏感資料；--confirm-test-data 是使用者確認，並非自動匿名化。',
      '最多 64 個情境，延遲上限 5 秒；不支援無 body 回應、HEAD、TRACE、萬用 status 或串流。',
    ],
  };
}
export function initialMockState(contract: MockContract, sourceHash: string): MockState {
  return {
    version: 1,
    sourceHash,
    seed: contract.seed,
    revision: 0,
    settings: [...new Set(contract.choices.map((c) => c.operation))].map((operation) => ({
      operation,
      choice: contract.choices.find((c) => c.operation === operation)!.id,
      delayMs: 0,
    })),
  };
}
export function parseMockState(
  value: unknown,
  contract: MockContract,
  sourceHash: string,
): MockState {
  if (
    !object(value) ||
    value.version !== 1 ||
    value.sourceHash !== sourceHash ||
    value.seed !== contract.seed ||
    !Number.isSafeInteger(value.revision) ||
    (value.revision as number) < 0 ||
    !Array.isArray(value.settings) ||
    value.settings.length !== new Set(contract.choices.map((c) => c.operation)).size ||
    Object.keys(value).some(
      (k) => !['version', 'sourceHash', 'seed', 'revision', 'settings'].includes(k),
    )
  )
    throw new Error('state-contract-or-version-mismatch');
  const seen = new Set<string>();
  const settings = value.settings.map((s: unknown): MockSetting => {
    if (
      !object(s) ||
      Object.keys(s).some((k) => !['operation', 'choice', 'delayMs'].includes(k)) ||
      typeof s.operation !== 'string' ||
      typeof s.choice !== 'string' ||
      typeof s.delayMs !== 'number' ||
      !Number.isInteger(s.delayMs) ||
      s.delayMs < 0 ||
      s.delayMs > MOCK_LIMITS.delayMs ||
      seen.has(s.operation) ||
      !contract.choices.some((c) => c.operation === s.operation && c.id === s.choice)
    )
      throw new Error('invalid-scenario-setting');
    seen.add(s.operation);
    return { operation: s.operation, choice: s.choice, delayMs: s.delayMs };
  });
  return {
    version: 1,
    sourceHash,
    seed: contract.seed,
    revision: value.revision as number,
    settings,
  };
}
