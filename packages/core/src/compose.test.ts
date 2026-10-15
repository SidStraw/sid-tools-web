import { expect, test } from 'vite-plus/test';
import {
  analyzeCompose,
  exportComposeSummary,
  COMPOSE_SPEC_SNAPSHOT,
  COMPOSE_LIMITS,
} from './compose.js';
const run = (services: object, root: object = {}) =>
  analyzeCompose(JSON.stringify({ services, ...root }));
const image = { image: 'synthetic:1' };
test('pinned reference, plain clone-safe typed static graph, short dependency and implicit default', () => {
  const report = run({ app: { ...image, depends_on: ['db'] }, db: image });
  expect(report).toMatchObject({
    status: 'complete',
    spec: { snapshot: '914ec15d1fa498969c0df5c1d672306db3256089' },
  });
  expect(COMPOSE_SPEC_SNAPSHOT).toHaveLength(40);
  expect(report.services.map((s) => s.name)).toEqual(['app', 'db']);
  expect(report.dependencies[0]).toMatchObject({
    targetName: 'db',
    targetId: report.services[1]!.id,
    required: true,
    restart: false,
    condition: 'service_started',
    status: 'declared',
  });
  expect(report.networks).toHaveLength(1);
  expect(report.networks[0]).toMatchObject({ name: 'default', implicit: true });
  expect(report.attachments).toHaveLength(2);
  expect(structuredClone(report)).toEqual(report);
  expect(run({ app: { ...image, depends_on: ['db'] }, db: image })).toEqual(report);
});
test.each(['service_started', 'service_healthy', 'service_completed_successfully'])(
  'long condition %s required/restart metadata',
  (condition) => {
    const report = run({
      app: { ...image, depends_on: { db: { condition, required: false, restart: true } } },
      db: image,
    });
    expect(report.status).toBe('complete');
    expect(report.dependencies[0]).toMatchObject({
      condition,
      required: false,
      restart: true,
      supported: true,
    });
  },
);
test('concrete undeclared required and optional dependencies are reference errors', () => {
  const required = run({ app: { ...image, depends_on: ['absent'] } });
  expect(required.status).toBe('invalid');
  expect(required.diagnostics).toContainEqual(
    expect.objectContaining({ code: 'missing-required-dependency', severity: 'error' }),
  );
  const optional = run({
    app: { ...image, depends_on: { absent: { condition: 'service_started', required: false } } },
  });
  expect(optional.status).toBe('invalid');
  expect(optional.dependencies[0]!.status).toBe('missing');
  expect(optional.diagnostics).toContainEqual(
    expect.objectContaining({
      code: 'missing-optional-dependency',
      severity: 'error',
      category: 'reference',
    }),
  );
});
test('actual SCC cycles/self cycles and acyclic shared targets; profile cycles only conditional warnings', () => {
  for (const services of [
    { a: { ...image, depends_on: ['b'] }, b: { ...image, depends_on: ['a'] } },
    { a: { ...image, depends_on: ['a'] } },
  ]) {
    const report = run(services);
    expect(report.status).toBe('invalid');
    expect(report.cycles).toHaveLength(1);
    expect(report.diagnostics.some((d) => d.code === 'dependency-cycle')).toBe(true);
  }
  const dag = run({
    a: { ...image, depends_on: ['c'] },
    b: { ...image, depends_on: ['c'] },
    c: image,
  });
  expect(dag.cycles).toEqual([]);
  expect(dag.status).toBe('complete');
  const conditional = run({
    a: { ...image, depends_on: ['b'] },
    b: { ...image, profiles: ['test'], depends_on: ['a'] },
  });
  expect(conditional.status).toBe('partial');
  expect(conditional.cycles[0]!.conditional).toBe(true);
  expect(conditional.dependencies.every((d) => d.conditional)).toBe(true);
  expect(conditional.diagnostics.some((d) => d.severity === 'error')).toBe(false);
});
test('profiles retain activation conditions without choosing active set or implicitly enabling dependencies', () => {
  const report = run({
    web: { ...image, depends_on: ['db'] },
    db: { ...image, profiles: ['test', 'debug'] },
  });
  expect(report.status).toBe('partial');
  expect(report.services.find((s) => s.name === 'db')).toMatchObject({
    conditional: true,
    profiles: ['debug', 'test'],
  });
  expect(report.dependencies[0]!.conditional).toBe(true);
  expect(report.diagnostics.some((d) => d.code === 'dependency-profile-context-unresolved')).toBe(
    true,
  );
});
test('explicit/empty/absent networks and explicit default declaration, no graph inference from unused resources', () => {
  const report = run(
    {
      a: { ...image, networks: ['front'] },
      b: { ...image, networks: [] },
      c: { ...image, networks: {} },
      d: image,
    },
    { networks: { default: {}, front: {}, unused: {} } },
  );
  expect(report.status).toBe('complete');
  expect(report.networks).toHaveLength(3);
  expect(report.networks.every((n) => !n.implicit)).toBe(true);
  expect(report.attachments.map((a) => a.targetName)).toEqual([
    'front',
    'default',
    'default',
    'default',
  ]);
  expect(report.attachments.some((a) => a.targetName === 'unused')).toBe(false);
  expect(run({ a: { ...image, networks: ['missing'] } }).status).toBe('invalid');
});
test('unsupported network_mode suppresses ALL default guesses; conflicting explicit networks diagnosed', () => {
  for (const mode of ['host', 'none', 'service:db', '${MODE:-host}']) {
    const report = run({ app: { ...image, network_mode: mode } });
    expect(report.status).toBe('partial');
    expect(report.attachments).toEqual([]);
    expect(report.networks).toEqual([]);
    expect(report.services[0]!.networkModeUnsupported).toBe(true);
  }
  expect(run({ app: { ...image, network_mode: 'host', networks: ['default'] } }).status).toBe(
    'invalid',
  );
});
test('external resources unverified, named/anonymous/POSIX bind mounts distinguished with no path values retained', () => {
  const report = run(
    {
      app: {
        ...image,
        networks: { ext: null },
        volumes: [
          'data:/data:ro',
          './SECRET_BIND:/bind',
          '/anonymous',
          { type: 'volume', source: 'data', target: '/other', read_only: true },
          { type: 'bind', source: '/SECRET_PATH', target: '/path' },
        ],
      },
    },
    {
      networks: { ext: { external: true, name: 'SECRET_EXTERNAL' } },
      volumes: { data: { external: true } },
    },
  );
  expect(report.status).toBe('partial');
  expect(report.diagnostics.some((d) => d.severity === 'error')).toBe(false);
  expect(report.networks[0]).toMatchObject({ external: true, existence: 'not-checked' });
  expect(report.attachments.map((a) => a.kind)).toEqual([
    'network',
    'volume',
    'bind',
    'anonymous',
    'volume',
    'bind',
  ]);
  expect(JSON.stringify(report)).not.toMatch(/SECRET_BIND|SECRET_PATH|SECRET_EXTERNAL/);
  expect(
    run({ app: image }, { networks: { a: { external: true, driver: 'bridge' } } }).status,
  ).toBe('invalid');
});
test('missing named volume, Windows/unknown mount modes and unsupported long fields never falsely complete', () => {
  expect(run({ app: { ...image, volumes: ['missing:/dst'] } }).status).toBe('invalid');
  for (const mount of [
    'C:\\source:/dst',
    'data:/dst:ro,z',
    'data:/dst:cached',
    { type: 'tmpfs', target: '/dst' },
    { type: 'volume', source: 'data', target: '/dst', volume: { nocopy: true } },
  ])
    expect(run({ app: { ...image, volumes: [mount] } }, { volumes: { data: {} } }).status).toBe(
      'partial',
    );
  expect(
    run(
      { app: { ...image, volumes: ['data:/dst', '/dst'] } },
      { volumes: { data: {} } },
    ).diagnostics.some((d) => d.code === 'duplicate-mount-target'),
  ).toBe(true);
});
test.each([
  '$VAR',
  '${VAR}',
  '${VAR:-SECRET_DEFAULT}',
  '${VAR-SECRET_DEFAULT}',
  '${VAR:?SECRET_ERROR}',
  '${VAR:+SECRET_ALTERNATIVE}',
  '${A:-${B}}',
])(
  'interpolation %s unresolved even defaults, never substitutes empty or leaks value',
  (expression) => {
    const report = run({
      app: { image: expression, depends_on: [expression], volumes: [`${expression}:/dst`] },
    });
    expect(report.status).toBe('partial');
    expect(report.services[0]!.image).toBe('unresolved');
    expect(report.dependencies[0]).toMatchObject({ status: 'unresolved', targetName: null });
    expect(report.diagnostics.some((d) => d.severity === 'error')).toBe(false);
    expect(exportComposeSummary(report)).not.toMatch(/SECRET_|\$VAR|\$\{/);
  },
);
test('$$ literal escapes are not interpolated, unknown graph booleans/condition/long mount paths stay unknown not hard invalid', () => {
  const escaped = run({ app: { image: 'synthetic:$$VAR' } });
  expect(escaped.status).toBe('complete');
  expect(escaped.diagnostics.some((d) => d.code === 'interpolation-unresolved')).toBe(false);
  const report = run({
    app: {
      ...image,
      depends_on: {
        absent: { condition: '${COND:-SECRET}', required: '${REQ:-true}', restart: '${RESTART}' },
      },
      volumes: [{ type: 'bind', source: '${HOST}', target: '${TARGET}' }],
    },
  });
  expect(report.status).toBe('partial');
  expect(report.dependencies[0]).toMatchObject({
    condition: null,
    required: null,
    restart: null,
    status: 'unresolved',
    supported: false,
  });
  expect(report.diagnostics.some((d) => d.severity === 'error')).toBe(false);
});
test('dynamic declaration keys/graph identities redacted, no literal missing target guesses', () => {
  const report = run(
    { '${SERVICE:-SECRET_NAME}': image, app: { ...image, depends_on: ['maybe'] } },
    { networks: { '${NET:-SECRET_NET}': {} } },
  );
  expect(report.status).toBe('partial');
  expect(report.services).toHaveLength(1);
  expect(report.dependencies[0]!.status).toBe('unresolved');
  expect(JSON.stringify(report)).not.toMatch(/SECRET_|\$\{/);
  const source = 'services:\r\n  "${SERVICE:-SECRET}": {image: x}\r\n';
  const issue = analyzeCompose(source).diagnostics.find(
    (d) => d.code === 'dynamic-graph-identity',
  )!;
  expect(source.slice(issue.location.start, issue.location.end)).toBe('"${SERVICE:-SECRET}"');
  expect(issue.location.path).toBe('/services/@dynamic:0');
  expect(issue.location).toMatchObject({ line: 2, column: 3 });
});
test.each(['include', 'extends', 'env_file'])(
  'multifile %s unresolved; missing dependency may exist externally, not false hard failure',
  (field) => {
    const report =
      field === 'include'
        ? run({ app: { ...image, depends_on: ['external'] } }, { include: ['SECRET_FILE'] })
        : run({ app: { ...image, depends_on: ['external'], [field]: 'SECRET_FILE' } });
    expect(report.status).toBe(field === 'env_file' ? 'invalid' : 'partial');
    expect(JSON.stringify(report)).not.toContain('SECRET_FILE');
    expect(report.diagnostics.some((d) => d.code === 'multifile-feature-unresolved')).toBe(true);
  },
);
test('unknown and known unsupported keys partial; extensions ignored explicitly not invalid, no secret scalar bodies', () => {
  for (const field of [
    'command',
    'environment',
    'ports',
    'build',
    'healthcheck',
    'links',
    'secrets',
    'deploy',
    'future',
  ]) {
    const report = run({ app: { ...image, [field]: 'SECRET_BODY' } });
    expect(report.status).toBe('partial');
    expect(JSON.stringify(report)).not.toContain('SECRET_BODY');
  }
  const extended = run(
    { app: { ...image, 'x-private': { secret: '${IGNORED:-SECRET}' } } },
    { 'x-extension': 'SECRET' },
  );
  expect(extended.status).toBe('complete');
  expect(extended.diagnostics.map((d) => d.code)).toEqual([
    'extension-ignored',
    'extension-ignored',
  ]);
  expect(JSON.stringify(extended)).not.toMatch(/SECRET|IGNORED/);
});
test.each([
  { app: null },
  { app: { image: 12 } },
  { app: {} },
  { app: { ...image, depends_on: true } },
  { app: { ...image, depends_on: [12] } },
  { app: { ...image, depends_on: { db: { required: false } } } },
  { app: { ...image, depends_on: { db: { condition: 'bad' } } } },
  { app: { ...image, depends_on: { db: { condition: 'service_started', required: 'false' } } } },
  { app: { ...image, profiles: 'test' } },
  { app: { ...image, networks: 1 } },
  { app: { ...image, volumes: {} } },
])('malformed known structures never complete %#', (services) => {
  expect(run(services).status).toBe('invalid');
});
test('unsupported YAML yields partial/no graph; invalid YAML/duplicate keys invalid; root and services structural errors', () => {
  expect(analyzeCompose('services: &services\n  app: {image: x}')).toMatchObject({
    status: 'partial',
    services: [],
    attachments: [],
  });
  expect(analyzeCompose('services: {app: {image: x}, app: {image: y}}').status).toBe('invalid');
  for (const source of ['[]', '{}', 'services: []', 'services: {}'])
    expect(analyzeCompose(source).status).toBe('invalid');
});
test('prototype-safe exact name matching, stable structural IDs and location for missing scalar reference', () => {
  const source =
    '\uFEFFservices:\r\n  __proto__: {image: x, depends_on: [constructor]}\r\n  constructor: {image: x}\r\n';
  const report = analyzeCompose(source);
  expect(report.status).toBe('complete');
  expect(report.dependencies[0]!.targetName).toBe('constructor');
  expect(report.services[0]!.id).toBe('service:0');
  const missingSource = 'services:\n  a:\n    image: synthetic\n    depends_on: [missing]\n';
  const diagnostic = analyzeCompose(missingSource).diagnostics.find(
    (d) => d.code === 'missing-required-dependency',
  )!;
  expect(diagnostic.location).toMatchObject({
    path: '/services/a/depends_on/0',
    line: 4,
    column: 18,
  });
  expect(missingSource.slice(diagnostic.location.start, diagnostic.location.end)).toBe('missing');
});
test('summary projects only metadata, strips injected report fields and sensitive source/command/env/literal values', () => {
  const report = run({
    app: {
      ...image,
      command: 'SECRET_COMMAND<script>',
      environment: { TOKEN: 'SECRET_TOKEN' },
      volumes: ['./SECRET_HOST:/SECRET_TARGET'],
    },
  });
  const raw = { ...report, source: 'SECRET_SQL', values: { token: 'SECRET_TOKEN' } };
  const summary = exportComposeSummary(raw);
  expect(summary).not.toMatch(/SECRET_|<script>|"source"\s*:|"values"\s*:/);
  expect(summary).toContain('app');
  expect(JSON.parse(summary).status).toBe('partial');
});
test('service/resource/name/diagnostic/reference bounds clear every model array', () => {
  const serviceLimit = run(
    Object.fromEntries(Array.from({ length: 129 }, (_, i) => [`s${i}`, image])),
  );
  const resourceLimit = run(
    { a: image },
    { volumes: Object.fromEntries(Array.from({ length: 129 }, (_, i) => [`v${i}`, {}])) },
  );
  const nameLimit = run({ a: { ...image, depends_on: ['x'.repeat(257)] } });
  const diagLimit = run({
    a: { ...image, future: Array.from({ length: 501 }, () => '${SECRET}') },
  });
  const refs = Object.fromEntries(
    Array.from({ length: 100 }, (_, i) => [
      `s${i}`,
      { ...image, depends_on: Array.from({ length: 40 }, (_, j) => `s${j}`) },
    ]),
  );
  const refLimit = run(refs);
  for (const report of [serviceLimit, resourceLimit, nameLimit, diagLimit, refLimit])
    expect(report).toMatchObject({
      status: 'limit',
      services: [],
      networks: [],
      volumes: [],
      dependencies: [],
      attachments: [],
      cycles: [],
    });
  expect(COMPOSE_LIMITS.services).toBe(128);
});
test('iterative dense SCC/deep hostile and realistic graph measurements', () => {
  const realistic = Object.fromEntries(
    Array.from({ length: 100 }, (_, i) => [
      `s${i}`,
      {
        ...image,
        ...(i ? { depends_on: [`s${i - 1}`] } : {}),
        networks: ['net'],
        volumes: ['data:/data'],
      },
    ]),
  );
  const start = performance.now(),
    report = run(realistic, { networks: { net: {} }, volumes: { data: {} } }),
    elapsed = performance.now() - start;
  expect(report.status).toBe('complete');
  expect(report.dependencies).toHaveLength(99);
  expect(report.attachments).toHaveLength(200);
  expect(elapsed).toBeLessThan(5000);
  console.info(`Compose100services/99deps/200attachments: ${elapsed.toFixed(1)}ms`);
  const dense = Object.fromEntries(
    Array.from({ length: 100 }, (_, i) => [
      `s${i}`,
      { ...image, depends_on: Array.from({ length: 30 }, (_, j) => `s${j}`) },
    ]),
  );
  const denseStart = performance.now(),
    denseReport = run(dense),
    denseElapsed = performance.now() - denseStart;
  expect(denseReport.status).toBe('invalid');
  expect(denseReport.cycles).toHaveLength(1);
  expect(denseReport.dependencies).toHaveLength(3000);
  expect(denseElapsed).toBeLessThan(5000);
  console.info(`Compose dense100services/3000deps SCC: ${denseElapsed.toFixed(1)}ms`);
  const deepStart = performance.now(),
    deep = analyzeCompose('['.repeat(50_000) + '0' + ']'.repeat(50_000)),
    deepElapsed = performance.now() - deepStart;
  expect(deep).toMatchObject({ status: 'limit', services: [] });
  expect(deepElapsed).toBeLessThan(5000);
  console.info(`Compose50Kdepth rejected: ${deepElapsed.toFixed(1)}ms`);
});

test('include-only and extends remain unresolved, inherited networks never get guessed default edges', () => {
  const included = analyzeCompose('include: [SECRET_FILE]');
  expect(included.status).toBe('partial');
  expect(included.services).toEqual([]);
  expect(included.diagnostics.some((d) => d.severity === 'error')).toBe(false);
  const inherited = run({ app: { extends: { file: 'SECRET_FILE', service: 'base' } } });
  expect(inherited.status).toBe('partial');
  expect(inherited.services[0]!.conditional).toBe(true);
  expect(inherited.networks).toEqual([]);
  expect(inherited.attachments).toEqual([]);
  expect(
    inherited.diagnostics.some((d) => d.code === 'inherited-network-unresolved-no-default'),
  ).toBe(true);
  expect(JSON.stringify(inherited)).not.toContain('SECRET_FILE');
});

test('empty YAML values retain actual key location; unsupported resource details/null roots do not false complete', () => {
  const source = 'services:\n  app:\n';
  const report = analyzeCompose(source),
    issue = report.diagnostics.find((d) => d.code === 'service-map-required')!;
  expect(report.status).toBe('invalid');
  expect(issue.location).toMatchObject({ path: '/services/app', line: 2, column: 3 });
  expect(source.slice(issue.location.start, issue.location.end)).toBe('app');
  expect(run({ app: image }, { networks: null }).status).toBe('partial');
  expect(run({ app: image }, { networks: { default: { driver: 'bridge' } } }).status).toBe(
    'partial',
  );
});

test('a conditional larger SCC cannot hide an always-active smaller dependency cycle', () => {
  const report = run({
    a: { ...image, depends_on: ['b'] },
    b: { ...image, depends_on: ['a', 'c'] },
    c: { ...image, profiles: ['debug'], depends_on: ['b'] },
  });
  expect(report.status).toBe('invalid');
  expect(report.cycles[0]).toMatchObject({ conditional: true, containsUnconditionalCycle: true });
  expect(
    report.diagnostics.some((d) => d.code === 'dependency-cycle' && d.severity === 'error'),
  ).toBe(true);
});

test('observed v5.5.0 null service networks is invalid without guessed default; empty collections remain default', () => {
  for (const source of [
    'services: {app: {image: synthetic, networks: null}}',
    'services:\n  app:\n    image: synthetic\n    networks:\n',
  ]) {
    const report = analyzeCompose(source);
    expect(report.status).toBe('invalid');
    expect(report.networks).toEqual([]);
    expect(report.attachments).toEqual([]);
    expect(
      report.diagnostics.some((d) => d.code === 'service-networks-shape' && d.severity === 'error'),
    ).toBe(true);
  }
  for (const networks of [[], {}])
    expect(run({ app: { ...image, networks } }).attachments[0]).toMatchObject({
      implicit: true,
      targetName: 'default',
    });
});

test('optional undeclared dependency matches CLI rejection, distinct from declared inactive profile', () => {
  const absent = run({
    app: { ...image, depends_on: { db: { condition: 'service_started', required: false } } },
  });
  expect(absent.status).toBe('invalid');
  expect(
    absent.diagnostics.some(
      (d) =>
        d.code === 'missing-optional-dependency' &&
        d.category === 'reference' &&
        d.severity === 'error',
    ),
  ).toBe(true);
  expect(exportComposeSummary(absent)).toContain(
    'Concrete undeclared dependencies are reference errors even required:false',
  );
  const inactive = run({
    app: { ...image, depends_on: { db: { condition: 'service_started', required: false } } },
    db: { ...image, profiles: ['database'] },
  });
  expect(inactive.status).toBe('partial');
  expect(inactive.dependencies[0]).toMatchObject({
    status: 'declared',
    conditional: true,
    required: false,
  });
  expect(
    inactive.diagnostics.some((d) => d.category === 'reference' && d.severity === 'error'),
  ).toBe(false);
});

test('optional dependencies with incomplete declaration context remain unknown, not concrete undeclared errors', () => {
  const depends_on = { db: { condition: 'service_started', required: false } };
  for (const report of [
    run({ app: { ...image, depends_on } }, { include: ['synthetic.yaml'] }),
    run({ app: { ...image, depends_on, extends: { file: 'synthetic.yaml', service: 'base' } } }),
    run({ app: { ...image, depends_on }, '${SERVICE:-db}': image }),
    run({ app: { ...image, depends_on: ['${DEPENDENCY:-db}'] } }),
  ]) {
    expect(report.status).toBe('partial');
    expect(report.dependencies[0]!.status).toBe('unresolved');
    expect(
      report.diagnostics.some((d) => d.category === 'reference' && d.severity === 'error'),
    ).toBe(false);
  }
});
