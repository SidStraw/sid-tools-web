import { describe, expect, test } from 'vite-plus/test';
import { compareEnv, ENV_LIMITS } from './env-check.js';

describe('bounded key-only dotenv preflight', () => {
  test('compares CRLF assignments and preserves source lines, not values', () => {
    const r = compareEnv(
      '\uFEFF# template\r\nA=required\r\nB=x\r\n',
      '# candidate\r\nA=\r\nC=value',
    );
    expect(r.summary).toMatchObject({ complete: true, missing: 1, extra: 1, empty: 1, errors: 0 });
    expect(r.diagnostics).toContainEqual({
      source: 'candidate',
      code: 'missing',
      key: 'B',
      line: 3,
      endLine: 3,
      relatedLines: [3],
    });
    expect(r.candidate.entries[0]).toEqual({
      key: 'A',
      line: 2,
      endLine: 2,
      valid: true,
      empty: true,
    });
    expect(r.keys).toEqual([
      { key: 'A', templateLines: [2], candidateLines: [2] },
      { key: 'B', templateLines: [3], candidateLines: [] },
      { key: 'C', templateLines: [], candidateLines: [3] },
    ]);
  });

  test('quotes preserve #, = and whitespace; unquoted comments and equals are explicit', () => {
    const r = compareEnv(
      '',
      ' A = "#=text" # ignored\nB=one=two#comment\nC= #empty\nD=\' \'\nE=""\nF=\'\'',
    );
    expect(r.candidate.entries.map((e) => [e.key, e.empty])).toEqual([
      ['A', false],
      ['B', false],
      ['C', true],
      ['D', false],
      ['E', true],
      ['F', true],
    ]);
    expect(r.summary.errors).toBe(0);
  });

  test('duplicates keep every occurrence and reference only the first start line', () => {
    const r = compareEnv('A=x\nA=y', 'A=x\nA=\nA=z');
    expect(r.summary.duplicate).toBe(3);
    expect(
      r.candidate.diagnostics.filter((d) => d.code === 'duplicate').map((d) => d.relatedLines),
    ).toEqual([[1], [1]]);
    expect(r.keys[0]).toEqual({ key: 'A', templateLines: [1, 2], candidateLines: [1, 2, 3] });
    expect(r.summary.empty).toBe(1);
  });

  test('single-line armor with literal backslash-n does not consume subsequent assignments', () => {
    const input =
      'A=1\nPRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\nU3ludGhldGlj\\n-----END PRIVATE KEY-----\nB=2';
    const r = compareEnv('A=1\nPRIVATE_KEY=example\nB=2', input);
    expect(r.candidate.entries).toEqual([
      { key: 'A', line: 1, endLine: 1, valid: true, empty: false },
      { key: 'PRIVATE_KEY', line: 2, endLine: 2, valid: false, empty: null },
      { key: 'B', line: 3, endLine: 3, valid: true, empty: false },
    ]);
    expect(r.candidate.diagnostics).toEqual([
      {
        source: 'candidate',
        code: 'unsupported-syntax',
        key: 'PRIVATE_KEY',
        line: 2,
        endLine: 2,
        relatedLines: [],
      },
    ]);
    expect(r.summary.missing).toBe(0);
    expect(r.diagnostics.some((d) => d.code === 'unterminated-quote')).toBe(false);
  });

  test('space-separated single-line certificate is a plain value and preserves following keys', () => {
    const input =
      'A=1\nCERT=-----BEGIN CERTIFICATE----- U3ludGhldGlj -----END CERTIFICATE-----\nB=2';
    const r = compareEnv('A=1\nCERT=example\nB=2', input);
    expect(r.candidate.entries).toEqual([
      { key: 'A', line: 1, endLine: 1, valid: true, empty: false },
      { key: 'CERT', line: 2, endLine: 2, valid: true, empty: false },
      { key: 'B', line: 3, endLine: 3, valid: true, empty: false },
    ]);
    expect(r.candidate.diagnostics).toEqual([]);
    expect(r.summary).toMatchObject({ complete: true, missing: 0 });
    expect(r.diagnostics.some((d) => d.code === 'unterminated-quote')).toBe(false);
  });

  test('5000 duplicate lines on both sides retain all locations with linear related-line counts', () => {
    const input = Array.from({ length: ENV_LIMITS.maxLines }, () => 'KEY=synthetic').join('\n');
    const r = compareEnv(input, input);
    const locations = Array.from({ length: ENV_LIMITS.maxLines }, (_, i) => i + 1);
    expect(r.keys).toEqual([{ key: 'KEY', templateLines: locations, candidateLines: locations }]);
    expect(r.template.entries).toHaveLength(ENV_LIMITS.maxLines);
    expect(r.candidate.entries).toHaveLength(ENV_LIMITS.maxLines);
    const duplicates = r.diagnostics.filter((d) => d.code === 'duplicate');
    expect(duplicates).toHaveLength(2 * (ENV_LIMITS.maxLines - 1));
    expect(duplicates.reduce((sum, d) => sum + d.relatedLines.length, 0)).toBe(duplicates.length);
    expect(duplicates.every((d) => d.relatedLines[0] === 1)).toBe(true);
    for (const side of [r.template, r.candidate]) {
      expect(side.diagnostics.map((d) => d.line)).toEqual(locations.slice(1));
      expect(side.entries.at(-1)).toMatchObject({ line: 5000, endLine: 5000 });
    }
    expect(r.summary).toMatchObject({
      complete: true,
      duplicate: 9998,
      empty: 0,
      missing: 0,
      extra: 0,
    });
  });

  test.each(
    (['template', 'candidate'] as const).flatMap((source) =>
      ['PRIVATE KEY', 'PGP PRIVATE KEY BLOCK', 'OPENSSH PRIVATE KEY'].flatMap((label) =>
        [true, false].map((closed) => ({ source, label, closed })),
      ),
    ),
  )(
    'quarantines synthetic unquoted $label body on $source (end marker: $closed)',
    ({ source, label, closed }) => {
      const fragment = 'U3ludGhldGljUHJpdmF0ZUZyYWdtZW50';
      const secondFragment = 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo';
      const lines = [
        'BEFORE=ok',
        `PRIVATE_KEY=  -----BEGIN ${label}-----`,
        '',
        `${fragment}=`,
        `${secondFragment}==`,
        ...(closed ? [`  -----END ${label}-----  `] : []),
        'AFTER=ok',
      ];
      const input = lines.join('\r\n');
      const other = 'BEFORE=x\nPRIVATE_KEY=x\nAFTER=x';
      const r = source === 'template' ? compareEnv(input, other) : compareEnv(other, input);
      const side = r[source];
      expect(side.entries.map((e) => e.key)).toEqual(
        closed ? ['BEFORE', 'PRIVATE_KEY', 'AFTER'] : ['BEFORE', 'PRIVATE_KEY'],
      );
      expect(side.entries[1]).toEqual({
        key: 'PRIVATE_KEY',
        line: 2,
        endLine: 6,
        valid: false,
        empty: null,
      });
      expect(side.diagnostics).toContainEqual({
        source,
        code: 'unsupported-syntax',
        key: 'PRIVATE_KEY',
        line: 2,
        endLine: 2,
        relatedLines: [],
      });
      expect(side.diagnostics.filter((d) => d.code === 'unterminated-quote')).toEqual(
        closed
          ? []
          : [
              {
                source,
                code: 'unterminated-quote',
                key: 'PRIVATE_KEY',
                line: 2,
                endLine: 6,
                relatedLines: [],
              },
            ],
      );
      expect(r.summary).toMatchObject({ complete: false, comparisonPerformed: true, empty: 0 });
      const serialized = JSON.stringify(r);
      for (const body of [fragment, secondFragment]) expect(serialized).not.toContain(body);
      expect(r.keys.every((row) => ['BEFORE', 'PRIVATE_KEY', 'AFTER'].includes(row.key))).toBe(
        true,
      );
      expect(side.entries.find((entry) => entry.key === 'AFTER')).toEqual(
        closed ? { key: 'AFTER', line: 7, endLine: 7, valid: true, empty: false } : undefined,
      );
    },
  );

  test('multiline quotes consume assignment-looking content and preserve end lines', () => {
    const r = compareEnv(
      'A=x\nB=x',
      'A="first\r\nSECRET=not-a-key\r\nlast" # comment\r\nB=\'\r\n\'',
    );
    expect(r.candidate.entries).toEqual([
      { key: 'A', line: 1, endLine: 3, valid: true, empty: false },
      { key: 'B', line: 4, endLine: 5, valid: true, empty: false },
    ]);
    expect(r.summary).toMatchObject({ missing: 0, extra: 0, errors: 0 });
  });

  test('supported double escapes do not turn an escaped quote into a terminator', () => {
    const r = compareEnv('', 'A="a\\"b\\n\\r\\t\\\\"\nB=\'a\\b\'');
    expect(r.summary.errors).toBe(0);
    expect(r.candidate.entries.every((e) => e.valid && !e.empty)).toBe(true);
  });

  test.each(['$NAME', '${NAME}', '$(touch nope)', '`touch nope`', "'$NAME'", '"${NAME}"'])(
    'flags unsupported interpolation without executing %s',
    (value) => {
      const r = compareEnv('A=x', `A=${value}`);
      expect(r.candidate.diagnostics.some((d) => d.code === 'unsupported-interpolation')).toBe(
        true,
      );
      expect(r.candidate.entries[0]).toMatchObject({ valid: false, empty: null });
      expect(r.summary).toMatchObject({ complete: false, missing: 0, empty: 0 });
    },
  );

  test('does not interpret interpolation-like comments, allows non-variable dollar signs', () => {
    const r = compareEnv('', '# $NAME\nA=$5 # ${IGNORED}\nB="ok" # $(ignored)');
    expect(r.summary.errors).toBe(0);
  });

  test('malformed syntax reports static codes and recovers on later physical assignments', () => {
    const r = compareEnv(
      'GOOD=x\nBAD=x',
      'export A=secret\ninvalid.secret\n9BAD=secret\nBAD="x" tail\nGOOD=ok\nESC="\\q"\nRAW=a\\b\nCTRL=a\u0000b',
    );
    expect(r.candidate.diagnostics.map((d) => d.code)).toEqual([
      'unsupported-syntax',
      'invalid-assignment',
      'invalid-assignment',
      'trailing-content',
      'unsupported-syntax',
      'unsupported-syntax',
      'invalid-control',
    ]);
    expect(r.summary.complete).toBe(false);
    expect(r.summary.missing).toBe(0);
    expect(r.candidate.entries.find((e) => e.key === 'GOOD')?.valid).toBe(true);
  });

  test('unterminated multiline cannot pretend consumed lines are new keys', () => {
    const r = compareEnv('A=x\nB=x', 'A="secret\nB=still-a-value');
    expect(r.candidate.entries).toEqual([
      { key: 'A', line: 1, endLine: 2, valid: false, empty: null },
    ]);
    expect(r.candidate.diagnostics).toContainEqual({
      source: 'candidate',
      code: 'unterminated-quote',
      key: 'A',
      line: 1,
      endLine: 2,
      relatedLines: [],
    });
    expect(r.summary).toMatchObject({ complete: false, comparisonPerformed: true, missing: 1 });
  });

  test('bare CR and control characters within multiline values are invalid', () => {
    expect(compareEnv('', 'A=x\rB=y').summary.complete).toBe(false);
    expect(compareEnv('', 'A="ok\nbad\u0000\nend"').candidate.entries[0]?.valid).toBe(false);
  });

  test('prototype-like names are ordinary keys without prototype mutation', () => {
    const r = compareEnv('__proto__=x\nconstructor=y', '__proto__=\nconstructor=z');
    expect(r.summary).toMatchObject({ missing: 0, extra: 0, candidateKeys: 2, empty: 1 });
  });

  test('never returns raw values, snippets, comments or malformed tokens', () => {
    const secrets = [
      'secret-template-483',
      'secret-candidate-729',
      'secret-invalid-196',
      'secret-comment-635',
      'secret-multiline-028',
    ];
    const r = compareEnv(
      `TOKEN=${secrets[0]}`,
      `TOKEN=${secrets[1]}\n${secrets[2]}\n# ${secrets[3]}\nM="${secrets[4]}\nmore"`,
    );
    const serialized = JSON.stringify(r);
    for (const secret of secrets) expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain('more');
    expect(
      r.candidate.entries.every(
        (e) => Object.keys(e).sort().join(',') === 'empty,endLine,key,line,valid',
      ),
    ).toBe(true);
  });

  test.each([
    ['size-limit', 'x'.repeat(ENV_LIMITS.maxCodeUnits + 1)],
    ['line-limit', '\n'.repeat(ENV_LIMITS.maxLines)],
    ['line-length-limit', `A=${'x'.repeat(ENV_LIMITS.maxLineCodeUnits - 1)}`],
  ])('returns bounded %s report and suppresses incomplete comparison', (code, input) => {
    const r = compareEnv('REQUIRED=x', input);
    expect(r.candidate.limited).toBe(true);
    expect(r.candidate.diagnostics[0]?.code).toBe(code);
    expect(r.candidate.entries).toEqual([]);
    expect(r.summary).toMatchObject({
      complete: false,
      comparisonPerformed: false,
      missing: 0,
      extra: 0,
    });
    expect(compareEnv(input, 'A=x').summary.comparisonPerformed).toBe(false);
  });

  test('accepts exact size/line boundaries and returns fresh rule/limit copies', () => {
    expect(compareEnv('', '#'.repeat(ENV_LIMITS.maxLineCodeUnits)).summary.complete).toBe(true);
    expect(compareEnv('', '\n'.repeat(ENV_LIMITS.maxLines - 1)).summary.complete).toBe(true);
    const input = Array.from({ length: 20 }, () => '#'.repeat(9_999)).join('\n') + '\n';
    expect(input.length).toBe(ENV_LIMITS.maxCodeUnits);
    expect(compareEnv('', input).summary.complete).toBe(true);
    const r = compareEnv('', '');
    r.supportRules.length = 0;
    expect(compareEnv('', '').supportRules.length).toBeGreaterThan(0);
  });
});
