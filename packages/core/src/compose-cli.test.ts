import { readFileSync, readdirSync } from 'node:fs';
import { expect, test } from 'vite-plus/test';
import { analyzeCompose, exportComposeSummary, type ComposeReport } from './compose.js';

// Offline contract against captured executable output, not a runtime Docker dependency.
const directory = new URL('../../../docs/validation/stw-8/cli/', import.meta.url);
interface RecordResult {
  case: string;
  mode: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  command: string[];
}
interface CliDependency {
  condition: string;
  required: boolean;
  restart?: boolean;
}
interface CliService {
  depends_on?: Record<string, CliDependency>;
  networks?: Record<string, unknown>;
  volumes?: { type: string; source?: string }[];
  environment?: Record<string, string>;
}
interface CliModel {
  services: Record<string, CliService>;
  networks?: Record<string, { external?: boolean }>;
  volumes?: Record<string, { external?: boolean }>;
}
const captured = JSON.parse(readFileSync(new URL('results.json', directory), 'utf8')) as {
  metadata: { version: { stdout: string }; sha256: string };
  results: RecordResult[];
};
function record(name: string, mode = 'normal-consistency') {
  const matches = captured.results.filter((entry) => entry.case === name && entry.mode === mode);
  expect(matches).toHaveLength(1);
  return matches[0]!;
}
function model(entry: RecordResult): CliModel {
  expect(entry.exitCode).toBe(0);
  return JSON.parse(entry.stdout) as CliModel;
}
const core = (name: string) =>
  analyzeCompose(readFileSync(new URL(`fixtures/${name}.yaml`, directory), 'utf8'));
function coreGraph(report: ComposeReport) {
  const names = new Map(report.services.map((service) => [service.id, service.name]));
  return {
    services: report.services.map((s) => s.name).sort(),
    dependencies: report.dependencies
      .map((edge) =>
        JSON.stringify([
          names.get(edge.sourceId),
          edge.targetName,
          edge.condition,
          edge.required,
          edge.restart,
        ]),
      )
      .sort(),
    attachments: report.attachments
      .map((edge) => JSON.stringify([names.get(edge.sourceId), edge.kind, edge.targetName]))
      .sort(),
  };
}
function cliGraph(input: CliModel) {
  return {
    services: Object.keys(input.services).sort(),
    dependencies: Object.entries(input.services)
      .flatMap(([name, service]) =>
        Object.entries(service.depends_on ?? {}).map(([target, value]) =>
          JSON.stringify([name, target, value.condition, value.required, value.restart ?? false]),
        ),
      )
      .sort(),
    attachments: Object.entries(input.services)
      .flatMap(([name, service]) => [
        ...Object.keys(service.networks ?? {}).map((target) =>
          JSON.stringify([name, 'network', target]),
        ),
        ...(service.volumes ?? []).map((mount) =>
          JSON.stringify([
            name,
            mount.type === 'bind' ? 'bind' : mount.source ? 'volume' : 'anonymous',
            mount.type === 'volume' ? (mount.source ?? null) : null,
          ]),
        ),
      ])
      .sort(),
  };
}
// Independent fixture expectations; counts S/D/A/N/V/C are not generated from core.
const cases = [
  ['01-depends-short', 'complete', [2, 1, 2, 1, 0, 0], 0, 0],
  ['02-depends-long', 'complete', [2, 1, 2, 1, 0, 0], 0, 0],
  ['03-missing-required', 'invalid', [1, 1, 1, 1, 0, 0], 1, 0],
  ['04-missing-optional', 'invalid', [1, 1, 1, 1, 0, 0], 1, 0],
  ['05-cycle', 'invalid', [2, 2, 2, 1, 0, 1], 1, 0],
  ['06-network-defaults', 'complete', [3, 0, 3, 1, 0, 0], 0, 0],
  ['07-network-explicit', 'partial', [2, 0, 2, 2, 0, 0], 0, 0],
  ['08-network-undeclared', 'invalid', [1, 0, 1, 0, 0, 0], 1, 0],
  ['09-volumes', 'complete', [1, 0, 6, 1, 3, 0], 0, 0],
  ['10-volume-undeclared', 'invalid', [1, 0, 2, 1, 0, 0], 1, 0],
  ['11-external', 'partial', [1, 0, 2, 1, 1, 0], 0, 0],
  ['12-profile-required', 'partial', [2, 1, 2, 1, 0, 0], 1, 0],
  ['13-profile-optional', 'partial', [2, 1, 2, 1, 0, 0], 0, 0],
  ['14-extension', 'complete', [1, 0, 1, 1, 0, 0], 0, 0],
  ['15-unknown-service-field', 'partial', [1, 0, 1, 1, 0, 0], 1, 1],
  ['16-unknown-top-field', 'partial', [1, 0, 1, 1, 0, 0], 1, 1],
  ['17-interpolated-reference', 'partial', [1, 1, 1, 1, 0, 0], 1, 0],
  ['18-interpolation', 'partial', [1, 0, 1, 1, 0, 0], 0, 0],
  ['19-include', 'partial', [1, 1, 1, 1, 0, 0], 0, 0],
  ['20-extends', 'partial', [1, 0, 0, 0, 0, 0], 0, 0],
  ['21-profile-active', 'partial', [2, 1, 2, 1, 0, 0], 0, 0],
  ['22-network-explicit-default', 'complete', [1, 0, 1, 1, 0, 0], 0, 0],
  ['23-network-null', 'invalid', [1, 0, 0, 0, 0, 0], 1, 1],
] as const;
test('all 23 fixtures and 46 captured v5.5.0 records covered', () => {
  expect(
    readdirSync(new URL('fixtures/', directory))
      .filter((name) => name.endsWith('.yaml'))
      .sort(),
  ).toEqual(cases.map(([name]) => `${name}.yaml`));
  expect(captured.metadata.version.stdout.trim()).toBe('Docker Compose version v5.5.0');
  expect(captured.metadata.sha256).toBe(
    '4a728ee98f89005a90198a9be791e8fdaebbcb5e6af9721251efe0113df37759',
  );
  expect(captured.results).toHaveLength(46);
});
test.each(cases)(
  '%s: report classification/counts and both observed exit codes',
  (name, status, counts, primaryExit, secondaryExit) => {
    const report = core(name);
    expect(report.status).toBe(status);
    expect([
      report.services.length,
      report.dependencies.length,
      report.attachments.length,
      report.networks.length,
      report.volumes.length,
      report.cycles.length,
    ]).toEqual(counts);
    expect(record(name).exitCode).toBe(primaryExit);
    expect(record(name, 'no-interpolate').exitCode).toBe(secondaryExit);
    expect(record(name).command).not.toContain('--no-interpolate');
    expect(record(name, 'no-interpolate').command).toContain('--no-interpolate');
  },
);
const excluded = [
  '15-unknown-service-field',
  '16-unknown-top-field',
  '17-interpolated-reference',
  '19-include',
  '20-extends',
  '23-network-null',
];
test.each(cases.filter(([name]) => !excluded.includes(name)))(
  '%s: normalized declaration graph vs secondary (not consistency proof)',
  (name) => {
    expect(coreGraph(core(name))).toEqual(cliGraph(model(record(name, 'no-interpolate'))));
  },
);
test.each(
  cases.filter(
    ([name, , , exit]) => exit === 0 && ![...excluded, '13-profile-optional'].includes(name),
  ),
)('%s: normalized active graph and used resources vs primary', (name) => {
  const report = core(name),
    primary = model(record(name)),
    secondary = model(record(name, 'no-interpolate'));
  expect(coreGraph(report)).toEqual(cliGraph(primary));
  for (const kind of ['network', 'volume'] as const) {
    const used = new Set(
      report.attachments.filter((a) => a.kind === kind).map((a) => a.targetName),
    );
    const resources = kind === 'network' ? report.networks : report.volumes;
    const field = kind === 'network' ? 'networks' : 'volumes';
    // Primary prunes unused declarations; core deliberately retains them like secondary.
    expect(
      resources
        .filter((r) => used.has(r.name))
        .map((r) => r.name)
        .sort(),
    ).toEqual(Object.keys(primary[field] ?? {}).sort());
    expect(resources.map((r) => r.name).sort()).toEqual(Object.keys(secondary[field] ?? {}).sort());
  }
});
test.each(['03-missing-required', '04-missing-optional'])(
  '%s: undeclared dependency invalid regardless required flag',
  (name) => {
    const report = core(name);
    expect(record(name).stderr).toContain('undefined service');
    expect(report.dependencies[0]).toMatchObject({
      targetName: 'missing',
      targetId: null,
      status: 'missing',
      required: name === '03-missing-required',
    });
    expect(
      report.diagnostics.some((d) => d.category === 'reference' && d.severity === 'error'),
    ).toBe(true);
  },
);
test('cycle: primary rejects actual SCC; secondary exit0 is not consistency evidence', () => {
  expect(record('05-cycle').stderr).toContain('dependency cycle');
  expect(core('05-cycle').cycles[0]).toMatchObject({
    containsUnconditionalCycle: true,
    conditional: false,
  });
});
test('default/explicit/unused networks and unsupported aliases', () => {
  expect(
    core('06-network-defaults').attachments.every((a) => a.implicit && a.targetName === 'default'),
  ).toBe(true);
  expect(core('22-network-explicit-default').networks[0]!.implicit).toBe(false);
  expect(core('22-network-explicit-default').attachments[0]!.implicit).toBe(true);
  expect(
    core('07-network-explicit').diagnostics.some(
      (d) => d.code === 'unsupported-or-unknown-key' && d.location.path.endsWith('/aliases'),
    ),
  ).toBe(true);
  expect(Object.keys(model(record('07-network-explicit')).networks!)).toEqual(['internal']);
  expect(core('07-network-explicit').networks.map((r) => r.name)).toEqual(['internal', 'unused']);
});
test.each([
  ['08-network-undeclared', 'undefined network'],
  ['10-volume-undeclared', 'undefined volume'],
])('%s: missing resource is a primary reference failure', (name, message) => {
  expect(record(name).stderr).toContain(message);
  expect(
    core(name).attachments.some((a) => a.targetName === 'missing' && a.status === 'missing'),
  ).toBe(true);
});
test('named/anonymous/bind categories and external flags without runtime/path values', () => {
  expect(core('09-volumes').attachments.map((a) => a.kind)).toEqual([
    'network',
    'volume',
    'bind',
    'anonymous',
    'volume',
    'bind',
  ]);
  expect(core('09-volumes').volumes.map((r) => r.name)).toEqual(['data', 'other', 'unused']);
  const external = core('11-external'),
    primary = model(record('11-external'));
  for (const resource of [...external.networks, ...external.volumes]) {
    expect(resource.external).toBe(
      primary[resource.kind === 'network' ? 'networks' : 'volumes']![resource.name]!.external,
    );
    expect(resource.existence).toBe('not-checked');
  }
  expect(exportComposeSummary(external)).not.toMatch(
    /synthetic-external-network|synthetic-external-volume/,
  );
});
test.each(['12-profile-required', '13-profile-optional', '21-profile-active'])(
  '%s: profiled declarations stay conditional, not undeclared',
  (name) => {
    expect(core(name).dependencies[0]).toMatchObject({
      status: 'declared',
      conditional: true,
      targetName: 'db',
    });
    expect(
      core(name).diagnostics.some((d) => d.category === 'reference' && d.severity === 'error'),
    ).toBe(false);
  },
);
test('optional inactive primary keeps edge but removes db; explicit activation includes both', () => {
  const inactive = model(record('13-profile-optional'));
  expect(Object.keys(inactive.services)).toEqual(['web']);
  expect(inactive.services.web!.depends_on!.db!.required).toBe(false);
  expect(record('12-profile-required').stderr).toContain('undefined service "db"');
  expect(record('21-profile-active').command).toContain('--profile');
  expect(Object.keys(model(record('21-profile-active')).services).sort()).toEqual(['db', 'web']);
});
test('extensions ignored explicitly; unknown fields narrower partial rather than CLI schema failure', () => {
  expect(
    core('14-extension').diagnostics.every(
      (d) => d.code === 'extension-ignored' && d.severity === 'info',
    ),
  ).toBe(true);
  for (const name of ['15-unknown-service-field', '16-unknown-top-field']) {
    expect(record(name).stderr).toContain('additional properties');
    expect(
      core(name).diagnostics.some(
        (d) => d.code === 'unsupported-or-unknown-key' && d.severity === 'warning',
      ),
    ).toBe(true);
  }
});
test('interpolated identity remains unknown instead of primary empty-string missing target', () => {
  expect(record('17-interpolated-reference').stderr).toContain('undefined service ""');
  expect(
    Object.keys(
      model(record('17-interpolated-reference', 'no-interpolate')).services.web!.depends_on!,
    ),
  ).toEqual(['${SYNTHETIC_DEPENDENCY}']);
  expect(core('17-interpolated-reference').dependencies[0]).toMatchObject({
    targetName: null,
    targetId: null,
    status: 'unresolved',
  });
});
test('interpolation values never blanked/defaulted in core or copied into summary', () => {
  expect(model(record('18-interpolation')).services.web!.environment).toMatchObject({
    PLAIN: '',
    BRACED: '',
    DEFAULT_COLON: 'fallback',
    DEFAULT_MINUS: 'fallback',
    ESCAPED: '$$SYNTHETIC_UNSET',
  });
  expect(
    model(record('18-interpolation', 'no-interpolate')).services.web!.environment!.DEFAULT_COLON,
  ).toBe('${SYNTHETIC_UNSET:-fallback}');
  expect(
    core('18-interpolation').diagnostics.filter((d) => d.code === 'interpolation-unresolved'),
  ).toHaveLength(4);
  expect(exportComposeSummary(core('18-interpolation'))).not.toMatch(/SYNTHETIC_UNSET|fallback/);
});
test.each(['normal-consistency', 'no-interpolate'])(
  'include/extends %s resolves synthetic files only in CLI, core never reads support files',
  (mode) => {
    expect(Object.keys(model(record('19-include', mode)).services).sort()).toEqual(['db', 'web']);
    expect(Object.keys(model(record('20-extends', mode)).services)).toEqual(['web']);
    expect(core('19-include').services.map((s) => s.name)).toEqual(['web']);
    expect(core('19-include').dependencies[0]!.status).toBe('unresolved');
    expect(
      core('19-include').diagnostics.some((d) => d.code === 'multifile-feature-unresolved'),
    ).toBe(true);
    expect(core('20-extends').services[0]!.image).toBe('absent');
    expect(core('20-extends').attachments).toEqual([]);
    expect(
      core('20-extends').diagnostics.some(
        (d) => d.code === 'inherited-network-unresolved-no-default',
      ),
    ).toBe(true);
  },
);
test('null service networks invalid in primary and secondary, no default guess', () => {
  expect(record('23-network-null').stderr).toContain('must be a array');
  expect(
    core('23-network-null').diagnostics.some(
      (d) => d.code === 'service-networks-shape' && d.severity === 'error',
    ),
  ).toBe(true);
  expect(core('23-network-null').attachments).toEqual([]);
});
