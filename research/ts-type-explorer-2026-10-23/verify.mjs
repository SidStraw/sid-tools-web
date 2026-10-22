import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
const dir = resolve('research/ts-type-explorer-2026-10-23');
const data = JSON.parse(readFileSync(resolve(dir, 'compiler-results.json'), 'utf8'));
const hover = JSON.parse(readFileSync(resolve(dir, 'native-hover-results.json'), 'utf8'));
assert.equal(data.cases.filter((c) => c.kind !== 'negative-control').length, 7);
for (const c of data.cases)
  assert.equal(
    createHash('sha256')
      .update(readFileSync(realpathSync(c.file)))
      .digest('hex'),
    c.sourceSha256,
  );
for (const [file, sha] of Object.entries(data.configHashes))
  assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), sha);
const caseAt = (r, id) => r.cases.find((c) => c.id === id).value;
const property = (r, id, name) => caseAt(r, id).properties.find((p) => p.name === name);
for (const version of ['7.0.2', '5.9.3']) {
  const strict = data.results.find(
    (r) => r.version === version && r.config.endsWith('/tsconfig.json'),
  );
  const relaxed = data.results.find(
    (r) => r.version === version && r.config.endsWith('/tsconfig.null-relaxed.json'),
  );
  const negative = data.results.find(
    (r) => r.version === version && r.config.endsWith('/tsconfig.negative.json'),
  );
  assert.deepEqual(strict.diagnostics, []);
  assert.deepEqual(relaxed.diagnostics, []);
  assert.equal(strict.cases.length, 7);
  assert.equal(relaxed.cases.length, 7);
  for (const c of [...strict.cases, ...relaxed.cases]) {
    assert.equal(c.value.status, 'resolved');
    assert.equal(c.warmMs.length, 5);
    assert(c.warmMs.every((n) => Number.isFinite(n) && n >= 0));
  }
  assert.equal(property(strict, 'nullable-finding', 'line').type, 'number | null');
  assert.equal(property(relaxed, 'nullable-finding', 'line').type, 'number');
  assert.equal(property(strict, 'knip-counters', 'processed').type, 'number');
  assert.equal(property(strict, 'knip-counters', 'total').type, 'number');
  assert(caseAt(strict, 'knip-report').properties.every((p) => p.type === 'boolean'));
  const rows = property(strict, 'semver-return', 'rows');
  assert.equal(rows.type, 'SemverRow[]');
  assert(
    rows.sources.some(
      (s) =>
        s.file === 'packages/core/src/semver.ts' &&
        Number.isInteger(s.start) &&
        s.end > s.start &&
        readFileSync(s.file, 'utf8').slice(s.start, s.end).includes('rows'),
    ),
  );
  assert.equal(caseAt(strict, 'knip-exports').branches.length, 5);
  assert.equal(caseAt(relaxed, 'knip-exports').branches.length, 4);
  assert(negative.diagnostics.some((d) => d.code === 2304 && d.text.includes('MissingType')));
  assert.deepEqual(caseAt(negative, 'unresolved-control'), { status: 'unresolved' });
}
assert.equal(hover.results.length, 7);
for (const c of hover.results) {
  assert.deepEqual(
    c.hovers.map((h) => h.verbosityLevel),
    [0, 2],
  );
  for (const h of c.hovers) {
    assert(h.response?.contents?.value.includes('type '));
    assert.equal(h.warmMs.length, 5);
  }
}
const strict = data.results.filter((r) => r.config.endsWith('/tsconfig.json'));
for (const c of strict[0].cases) {
  const other = caseAt(strict[1], c.id);
  assert.deepEqual(
    c.value.properties.map((p) => p.name).sort(),
    other.properties.map((p) => p.name).sort(),
  );
}
console.log(
  'PASS: 7 real cases, source/config hashes, two compilers and config variants, native hover, unresolved control, source location and semantic invariants.',
);
