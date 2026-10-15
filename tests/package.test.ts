import { readFile } from 'node:fs/promises';
import { expect, expectTypeOf, test } from 'vite-plus/test';
import { inspectImage, type ImageInfo } from '@sid-tools/core';
import { compareSemver, type SemverComparison } from '@sid-tools/core/semver';
import { compareEnv, type EnvComparison } from '@sid-tools/core/env-check';

test('public env-check subpath exposes a typed key-only comparison with template locations for missing keys', () => {
  expectTypeOf(compareEnv).returns.toEqualTypeOf<EnvComparison>();
  const result = compareEnv('# template\nAPI_TOKEN=demo-secret', 'OTHER_KEY=other-secret');
  expect(result.diagnostics).toContainEqual({
    source: 'candidate',
    code: 'missing',
    key: 'API_TOKEN',
    line: 2,
    endLine: 2,
    relatedLines: [2],
  });
  expect(JSON.stringify(result)).not.toContain('demo-secret');
  expect(JSON.stringify(result)).not.toContain('other-secret');
});

test('public SemVer subpath exposes browser-reproducible typed comparisons', () => {
  expectTypeOf(compareSemver).returns.toEqualTypeOf<SemverComparison>();
  expect(compareSemver('1.2.3 1.3.0', '~1.2.3', '^1.2.3').added).toEqual(['1.3.0']);
});

test('public exports inspect real JPEG and PNG inputs', async () => {
  expect(inspectImage(await readFile('tests/fixtures/photo.jpg'))).toEqual({
    format: 'image/jpeg',
    width: 3872,
    height: 2592,
  });
  expect(inspectImage(await readFile('tests/fixtures/transparent.png'))).toEqual({
    format: 'image/png',
    width: 706,
    height: 1442,
  });
  expectTypeOf(inspectImage).returns.toEqualTypeOf<ImageInfo>();
});
