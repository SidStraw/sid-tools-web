// Research runner: reads real source; never executes the inspected project.
import { API, SymbolFlags } from 'typescript/unstable/sync';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
const root = process.cwd(),
  dir = resolve('research/ts-type-explorer-2026-10-23');
const require = createRequire(import.meta.url),
  legacyRoot = process.argv[2];
if (!legacyRoot) throw Error('Pass an integrity-verified TypeScript 5.9.3 package directory');
const ts = require(resolve(legacyRoot, 'lib/typescript.js'));
if (ts.version !== '5.9.3') throw Error('Expected 5.9.3');
const nativeVersion = require('typescript/package.json').version;
if (nativeVersion !== '7.0.2') throw Error('Expected 7.0.2');
const hash = (s) => createHash('sha256').update(s).digest('hex');
const rel = (s) => (typeof s === 'string' ? relative(root, s).replaceAll('\\', '/') : null);
const cases = JSON.parse(readFileSync(resolve(dir, 'cases.json'), 'utf8')).map((c) => {
  const file = realpathSync(resolve(c.file)),
    source = readFileSync(file, 'utf8');
  const needle = `type ${c.name} `,
    start = source.indexOf(needle);
  if (start < 0 || source.indexOf(needle, start + 1) >= 0) throw Error(`ambiguous ${c.id}`);
  const pos = start + 5,
    before = source.slice(0, pos).split('\n');
  return {
    ...c,
    absolute: file,
    pos,
    line: before.length,
    column: before.at(-1).length + 1,
    sourceSha256: hash(source),
  };
});
function measure(fn) {
  const times = [];
  let value;
  for (let i = 0; i < 6; i++) {
    const t = performance.now();
    value = fn();
    times.push(performance.now() - t);
  }
  return {
    value,
    firstMs: times[0],
    warmMs: times.slice(1),
    warmMedianMs: [...times.slice(1)].sort((a, b) => a - b)[2],
  };
}
const contextOptions = (o) =>
  Object.fromEntries(
    [
      'strict',
      'strictNullChecks',
      'exactOptionalPropertyTypes',
      'noUncheckedIndexedAccess',
      'target',
      'module',
      'moduleResolution',
      'skipLibCheck',
      'allowImportingTsExtensions',
      'types',
      'lib',
    ].map((k) => [k, o[k] ?? null]),
  );
function nativeDetail(p, c) {
  const checker = p.checker,
    type = checker.getTypeAtPosition(c.absolute, c.pos);
  if (!type || type.isErrorType()) return { status: 'unresolved' };
  const label = (t) => checker.typeToString(t, undefined, 1);
  const props = checker.getPropertiesOfType(type);
  return {
    status: 'resolved',
    display: label(type),
    propertyCount: props.length,
    properties: props.map((s) => ({
      name: s.name,
      optional: !!(s.flags & SymbolFlags.Optional),
      type: label(checker.getTypeOfSymbol(s)),
      sources: s.declarations.map((d) => {
        const n = d.resolve(p);
        return {
          file: rel(p.program.getSourceFile(d.path)?.fileName ?? d.path),
          start: n?.pos ?? null,
          end: n?.end ?? null,
        };
      }),
    })),
    branches: type.getTypes()?.map(label) ?? [],
    indexes: checker
      .getIndexInfosOfType(type)
      .map((i) => ({ key: label(i.keyType), value: label(i.type) })),
  };
}
function legacyNode(sf, pos) {
  let found;
  function visit(n) {
    if (n.pos <= pos && n.end > pos) {
      found = n;
      ts.forEachChild(n, visit);
    }
  }
  visit(sf);
  return found;
}
function legacyDetail(p, c) {
  const checker = p.getTypeChecker(),
    sf = p.getSourceFile(c.absolute);
  if (!sf) return { status: 'unresolved', reason: 'source absent' };
  const node = legacyNode(sf, c.pos),
    type = checker.getTypeAtLocation(node);
  if (type.intrinsicName === 'error') return { status: 'unresolved' };
  const label = (t) => checker.typeToString(t, undefined, ts.TypeFormatFlags.NoTruncation),
    props = checker.getPropertiesOfType(type);
  return {
    status: 'resolved',
    display: label(type),
    propertyCount: props.length,
    properties: props.map((s) => ({
      name: s.name,
      optional: !!(s.flags & ts.SymbolFlags.Optional),
      type: label(checker.getTypeOfSymbolAtLocation(s, node)),
      sources: (s.declarations ?? []).map((d) => ({
        file: rel(d.getSourceFile().fileName),
        start: d.pos,
        end: d.end,
      })),
    })),
    branches: type.isUnionOrIntersection() ? type.types.map(label) : [],
    indexes: checker
      .getIndexInfosOfType(type)
      .map((i) => ({ key: label(i.keyType), value: label(i.type) })),
  };
}
const results = [];
for (const name of ['tsconfig.json', 'tsconfig.null-relaxed.json', 'tsconfig.negative.json']) {
  const selected = cases.filter(
    (c) => (c.kind === 'negative-control') === (name === 'tsconfig.negative.json'),
  );
  const config = resolve(dir, name),
    started = performance.now(),
    api = new API({ cwd: root });
  try {
    const snap = api.updateSnapshot({ openProjects: [config] }),
      p = snap.getProject(config);
    if (!p) throw Error('Missing native project');
    const openMs = performance.now() - started,
      diagnostics = p.program
        .getSemanticDiagnostics()
        .map((d) => ({ file: rel(d.fileName), code: d.code, pos: d.pos, text: d.text }));
    results.push({
      version: nativeVersion,
      config: rel(config),
      options: contextOptions(p.compilerOptions),
      openMs,
      diagnostics,
      cases: selected.map((c) => ({ id: c.id, ...measure(() => nativeDetail(p, c)) })),
    });
    snap.dispose();
  } finally {
    api.close();
  }
  const load = performance.now(),
    configRead = ts.readConfigFile(config, ts.sys.readFile);
  if (configRead.error) throw Error('Invalid config');
  const parsed = ts.parseJsonConfigFileContent(configRead.config, ts.sys, dirname(config));
  const host = {
    ...ts.sys,
    getScriptFileNames: () => parsed.fileNames,
    getScriptVersion: () => '0',
    getScriptSnapshot: (f) => {
      const x = ts.sys.readFile(f);
      return x === undefined ? undefined : ts.ScriptSnapshot.fromString(x);
    },
    getCurrentDirectory: () => root,
    getCompilationSettings: () => parsed.options,
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
  };
  const service = ts.createLanguageService(host);
  try {
    const p = service.getProgram(),
      openMs = performance.now() - load,
      diagnostics = ts
        .getPreEmitDiagnostics(p)
        .map((d) => ({
          file: rel(d.file?.fileName),
          code: d.code,
          pos: d.start ?? null,
          text: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
        }));
    results.push({
      version: ts.version,
      config: rel(config),
      options: contextOptions(parsed.options),
      openMs,
      diagnostics,
      cases: selected.map((c) => ({
        id: c.id,
        ...measure(() => legacyDetail(p, c)),
        hover: [0, 2].map((verbosityLevel) => ({
          verbosityLevel,
          ...measure(() => {
            const h = service.getQuickInfoAtPosition(c.absolute, c.pos, 1000, verbosityLevel);
            return h ? { text: ts.displayPartsToString(h.displayParts), span: h.textSpan } : null;
          }),
        })),
      })),
    });
  } finally {
    service.dispose();
  }
}
const output = {
  sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  method:
    'Six sequential calls: first and five warm; no human timings, no statistical performance claim. Candidate is one-level compiler properties/union/indexes, not a reimplemented evaluator.',
  configHashes: Object.fromEntries(
    [
      'tsconfig.base.json',
      rel(resolve(dir, 'tsconfig.json')),
      rel(resolve(dir, 'tsconfig.null-relaxed.json')),
      rel(resolve(dir, 'tsconfig.negative.json')),
    ].map((f) => [f, hash(readFileSync(f))]),
  ),
  cases: cases.map(({ absolute, pos, ...c }) => c),
  results,
};
writeFileSync(resolve(dir, 'compiler-results.json'), JSON.stringify(output, null, 2) + '\n');
console.log(
  JSON.stringify(
    results.map((r) => ({
      version: r.version,
      config: r.config,
      diagnostics: r.diagnostics.length,
      cases: r.cases.map((c) => ({
        id: c.id,
        status: c.value.status,
        properties: c.value.propertyCount,
        medianMs: c.warmMedianMs,
      })),
    })),
    null,
    2,
  ),
);
