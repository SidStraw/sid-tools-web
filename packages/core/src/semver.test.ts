import { describe, expect, test } from 'vite-plus/test';
import { satisfies } from 'semver';
import { createRequire } from 'node:module';
import { compareSemver, SEMVER_ENGINE, SEMVER_LIMITS } from './semver';

describe('strict bounded supplied-version SemVer comparison', () => {
  test('engine label matches the installed native semver version', () => {
    const require = createRequire(import.meta.url);
    const metadata = require('semver/package.json') as { version: string };
    expect(SEMVER_ENGINE).toBe(`node-semver ${metadata.version}`);
  });
  const versions =
    '0.0.3 0.0.4 0.2.3 0.2.9 0.3.0 1.2.3-alpha.1 1.2.3-beta.1 1.2.3-beta.2 1.2.3 1.2.3+build.5 1.2.4 1.3.0-beta.1 1.3.0 1.9.0 2.0.0-beta.1 2.0.0';
  test.each([
    ['1.2.3', ['1.2.3', '1.2.3+build.5']],
    ['>=1.2.3 <1.3.0', ['1.2.3', '1.2.3+build.5', '1.2.4']],
    ['^1.2.3', ['1.2.3', '1.2.3+build.5', '1.2.4', '1.3.0', '1.9.0']],
    ['~1.2.3', ['1.2.3', '1.2.3+build.5', '1.2.4']],
    ['^0.2.3', ['0.2.3', '0.2.9']],
    ['^0.0.3', ['0.0.3']],
    ['~0.2.3', ['0.2.3', '0.2.9']],
    [
      '>=1.2.3-beta.1 <2',
      ['1.2.3-beta.1', '1.2.3-beta.2', '1.2.3', '1.2.3+build.5', '1.2.4', '1.3.0', '1.9.0'],
    ],
    ['1.2.3-beta.1', ['1.2.3-beta.1']],
    ['1.2.x', ['1.2.3', '1.2.3+build.5', '1.2.4']],
    ['1.2.3 - 1.3.0', ['1.2.3', '1.2.3+build.5', '1.2.4', '1.3.0']],
    ['^0.0.3 || 2.x', ['0.0.3', '2.0.0']],
  ])('%s matches the known version set', (range, expected) => {
    const result = compareSemver(versions, range, range);
    expect(result.rows.filter((r) => r.before.matches).map((r) => r.version)).toEqual(expected);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
  });
  test('wildcard excludes prerelease and retains build metadata and supplied order/duplicates', () => {
    const result = compareSemver('1.0.0+one,1.0.0-beta.1\n1.0.0+two 1.0.0+one', '*', '*');
    expect(result.rows.map((r) => r.version)).toEqual([
      '1.0.0+one',
      '1.0.0-beta.1',
      '1.0.0+two',
      '1.0.0+one',
    ]);
    expect(result.rows[1]?.before).toEqual({
      matches: false,
      reason: expect.stringContaining('prerelease 預設排除'),
    });
    expect(result.rows[0]?.before.matches).toBe(true);
  });
  test('added and removed rows carry both range reasons and reproducible raw input', () => {
    const result = compareSemver('0.2.3\n0.3.0-beta.2\n0.3.0', '^0.2.3', '^0.3.0-beta.1');
    expect(result.engine).toBe(SEMVER_ENGINE);
    expect(result.added).toEqual(['0.3.0-beta.2', '0.3.0']);
    expect(result.removed).toEqual(['0.2.3']);
    expect(result.rows[0]?.after.reason).toContain('不符合 >=0.3.0-beta.1');
    expect(result.rows[1]?.after.reason).toContain('prerelease 已明確納入');
    expect(result.rows[1]?.before.reason).toContain('<0.3.0-0');
    expect(result.options).toEqual({ loose: false, includePrerelease: false });
    expect(compareSemver(result.input.versions, result.input.before, result.input.after)).toEqual(
      result,
    );
  });
  test('native strict engine parity for OR-branch prerelease gating and comparator edges', () => {
    const ranges = [
      '*',
      '<0.0.0',
      '>=1.2.3-beta.1 <2',
      '>=1.2.3 || <1.0.0-beta.1',
      '<=1.3.0-beta.1',
      '^0',
      '^0.0',
      '~1',
      '=1.2.3',
      '1.2.3 || >=1.3.0-beta.1 <2',
    ];
    for (const range of ranges)
      for (const row of compareSemver(versions, range, range).rows) {
        expect(row.before.matches, `${row.version} in ${range}`).toBe(
          satisfies(row.version, range, { loose: false, includePrerelease: false }),
        );
        expect(row.before.reason).not.toBe('');
      }
  });
  test.each([
    '1.2',
    'v1.2.3',
    '=1.2.3',
    '01.2.3',
    '1.2.3-01',
    '1.2.3-a..b',
    '1.2.3+',
    '1.2.3-你好',
    '9007199254740992.0.0',
    '<img src=x>',
  ])('rejects invalid supplied version %s without partial output', (value) => {
    expect(() => compareSemver(`1.0.0 ${value}`, '*', '*')).toThrow(/版本無效/);
  });
  test.each([
    '',
    'latest',
    'workspace:^1',
    'https://example.com',
    '>=1, <2',
    '^01.2.3',
    '1.2.3 || nonsense',
    '1.2.3 || >=2 garbage',
    '!=1.2.3',
    '1.2.3 | 2.0.0',
  ])('rejects invalid/unsupported range %s atomically', (range) => {
    expect(() => compareSemver('1.2.3', '*', range)).toThrow(/範圍 B/);
  });
  test.each([
    '1.2.3 ||',
    '|| 1.2.3',
    '1.2.3 || || 2.0.0',
    '1.2.3 |||| 2.0.0',
    '1.2.3 || \t ',
    ' \t || 1.2.3',
    '1.2.3 || \n\t || 2.0.0',
    '||',
    ' \t || \n ',
  ])('rejects empty OR branches in either range: %j', (range) => {
    expect(() => compareSemver('1.2.3 9.0.0', range, '*')).toThrow('範圍 A的 || OR 分支不可空白');
    expect(() => compareSemver('1.2.3 9.0.0', '*', range)).toThrow('範圍 B的 || OR 分支不可空白');
  });
  test.each(['*', 'x', '1.2.3 || *', 'x || 1.2.3'])(
    'accepts explicit wildcard %s without admitting prerelease',
    (range) => {
      const result = compareSemver('1.2.3 9.0.0 9.0.1-beta.1', range, range);
      expect(result.rows.filter((row) => row.before.matches).map((row) => row.version)).toEqual([
        '1.2.3',
        '9.0.0',
      ]);
    },
  );
  test('all bounded inputs reject over-limit work and accept maximum supplied count', () => {
    expect(() => compareSemver('', '*', '*')).toThrow('至少一個');
    expect(() => compareSemver(' '.repeat(SEMVER_LIMITS.input + 1), '*', '*')).toThrow('64,000');
    expect(() => compareSemver(Array(501).fill('1.0.0').join(' '), '*', '*')).toThrow('500');
    expect(compareSemver(Array(500).fill('1.0.0').join(' '), '*', '*').rows).toHaveLength(500);
    expect(() => compareSemver('1.0.0', '1'.repeat(513), '*')).toThrow('512');
    expect(() => compareSemver('1.0.0', Array(17).fill('*').join(' || '), '*')).toThrow('16');
    expect(() => compareSemver('1.0.0', Array(65).fill('*').join(' '), '*')).toThrow('64');
    expect(() => compareSemver('1.0.0-' + 'a'.repeat(251), '*', '*')).toThrow('版本無效');
  });
});
