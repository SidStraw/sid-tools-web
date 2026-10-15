import { Range, SemVer } from 'semver';

export const SEMVER_ENGINE = 'node-semver 7.7.3';
export const SEMVER_LIMITS = {
  input: 64_000,
  versions: 500,
  range: 512,
  alternatives: 16,
  tokens: 64,
} as const;
export const SEMVER_RULES = {
  prerelease:
    '預設排除 prerelease；只有同一個 OR 分支明寫相同 major.minor.patch 的 prerelease 比較條件才可納入。* 也不包含 prerelease。',
  zero: '0.x 不代表穩定 API。^0.2.3 為 >=0.2.3 <0.3.0-0；^0.0.3 為 >=0.0.3 <0.0.4-0；~0.2.3 為 >=0.2.3 <0.3.0-0。',
  compatibility: 'SemVer 範圍只檢查版本宣告，不保證實際 API 相容性。請另查變更紀錄並執行測試。',
  scope:
    '只比較你提供的版本集合；不是所有可能版本的交集或子集證明。不查詢套件 registry。建置資訊不影響匹配。',
} as const;

export type SemverDecision = { matches: boolean; reason: string };
export type SemverRow = {
  version: string;
  before: SemverDecision;
  after: SemverDecision;
  change: 'added' | 'removed' | 'unchanged';
};

function parseRange(raw: string, label: string): Range {
  const value = raw.trim();
  if (!value) throw new Error(`${label}不可空白；若要所有穩定版本，請明寫 *。`);
  if (
    raw.length > SEMVER_LIMITS.range ||
    value.split('||').length > SEMVER_LIMITS.alternatives ||
    value.split(/\s+/).length > SEMVER_LIMITS.tokens
  )
    throw new Error(`${label}超過限制：最多 512 字元、16 個 OR 分支、64 個條件詞。`);
  if (value.split('||').some((branch) => !branch.trim()))
    throw new Error(
      `${label}的 || OR 分支不可空白；請補上版本條件，若要所有穩定版本，請明寫 * 或 x。`,
    );
  try {
    // Use the native strict npm range grammar; never coerce or drop invalid branches.
    return new Range(value, { loose: false, includePrerelease: false });
  } catch {
    throw new Error(
      `${label}無效或不支援。支援 npm 精確版本、比較子、空白 AND、|| OR、^、~、x/* 與有空格的連字範圍；不支援逗號、標籤 latest、workspace:、URL 或其他套件管理器語法。`,
    );
  }
}

function decide(version: SemVer, range: Range): SemverDecision {
  const failures: string[] = [];
  for (const branch of range.set) {
    const normalized =
      branch
        .map((c) => c.value)
        .filter(Boolean)
        .join(' ') || '*';
    const failed = branch.filter((c) => !c.test(version));
    if (failed.length) {
      failures.push(`不符合 ${failed.map((c) => c.value).join('、')}`);
      continue;
    }
    const admitsPrerelease =
      !version.prerelease.length ||
      branch.some(
        (c) =>
          c.semver instanceof SemVer &&
          c.semver.prerelease.length > 0 &&
          c.semver.major === version.major &&
          c.semver.minor === version.minor &&
          c.semver.patch === version.patch,
      );
    if (!admitsPrerelease) {
      failures.push('prerelease 預設排除：此分支未明寫相同 major.minor.patch 的 prerelease 條件');
      continue;
    }
    return {
      matches: true,
      reason: `符合 ${normalized}${version.prerelease.length ? '；相同基底版本的 prerelease 已明確納入' : ''}`,
    };
  }
  return {
    matches: false,
    reason: failures
      .map((reason, i) => (range.set.length > 1 ? `分支 ${i + 1}：${reason}` : reason))
      .join('；'),
  };
}

export function compareSemver(versionsText: string, beforeText: string, afterText: string) {
  if (versionsText.length > SEMVER_LIMITS.input) throw new Error('版本清單超過 64,000 字元限制。');
  const versions = versionsText
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (!versions.length) throw new Error('請提供至少一個完整版本，例如 1.2.3。');
  if (versions.length > SEMVER_LIMITS.versions) throw new Error('版本清單最多 500 筆（含重複）。');
  const before = parseRange(beforeText, '範圍 A');
  const after = parseRange(afterText, '範圍 B');
  const parsed = versions.map((value, i) => {
    // Native SemVer accepts a v prefix; our supplied-version contract deliberately does not.
    if (
      value.length > 256 ||
      !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
        value,
      )
    )
      throw new Error(
        `第 ${i + 1} 筆版本無效：${value.slice(0, 80)}。請用完整嚴格 SemVer；不接受 v 前綴、部分版本或前導零。未產生任何匹配結果。`,
      );
    try {
      return new SemVer(value, { loose: false });
    } catch {
      throw new Error(
        `第 ${i + 1} 筆版本無效：${value.slice(0, 80)}。請檢查 prerelease 前導零、識別字與數字上限。未產生任何匹配結果。`,
      );
    }
  });
  const rows: SemverRow[] = parsed.map((version, i) => {
    const a = decide(version, before),
      b = decide(version, after);
    return {
      version: versions[i]!,
      before: a,
      after: b,
      change: a.matches === b.matches ? 'unchanged' : b.matches ? 'added' : 'removed',
    };
  });
  return {
    engine: SEMVER_ENGINE,
    options: { loose: false, includePrerelease: false },
    rules: SEMVER_RULES,
    input: { versions: versionsText, before: beforeText, after: afterText },
    ranges: {
      before: before.raw,
      after: after.raw,
      normalizedBefore: before.range || '*',
      normalizedAfter: after.range || '*',
    },
    rows,
    added: rows.filter((r) => r.change === 'added').map((r) => r.version),
    removed: rows.filter((r) => r.change === 'removed').map((r) => r.version),
  };
}
export type SemverComparison = ReturnType<typeof compareSemver>;
