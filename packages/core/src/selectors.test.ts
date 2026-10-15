import { expect, test } from 'vite-plus/test';
import { analyzeSelectors, SELECTOR_LIMITS, type Specificity } from './selectors.js';

test.each<[string, Specificity]>([
  ['*', [0, 0, 0]],
  ['div', [0, 0, 1]],
  ['#id', [1, 0, 0]],
  ['.a[data-x]', [0, 2, 0]],
  ['ul > li.active + li::before', [0, 1, 4]],
  ['p:before', [0, 0, 2]],
  [':is(#id, .a.b.c)', [1, 0, 0]],
  [':not(.a, div)', [0, 1, 0]],
  ['article:has(> #id, + .x)', [1, 0, 1]],
  [':where(#id, .a):not(:is(div, .x))', [0, 1, 0]],
  [':is(:where(#id), :not(.x, #y))', [1, 0, 0]],
  [':nth-child(2n + 1)', [0, 1, 0]],
  [':nth-last-child(odd of .a, #id)', [1, 1, 0]],
  [':nth-child(-n+3 of :is(.a, #b) > p)', [1, 1, 1]],
  ['#\\31 23.\\E9 lement', [1, 1, 0]],
  ['.你好', [0, 1, 0]],
  ['svg|a', [0, 0, 1]],
  ['*|*', [0, 0, 0]],
  ['|a', [0, 0, 1]],
  ['[x|href="a" i]', [0, 1, 0]],
  ['a\\|b', [0, 0, 1]],
  ['\\*', [0, 0, 1]],
])('specificity vector %s', (input, expected) => {
  const result = analyzeSelectors(input);
  expect(result.status).toBe('ok');
  expect(result.selectors[0]?.specificity).toEqual(expected);
});

test('top-level selectors are separate, contributions have exact source spans and max/zero explanation trees', () => {
  const input = ' #id, p:is(.a, #b):where(#c)';
  const result = analyzeSelectors(input);
  expect(result.selectors.map((s) => s.specificity)).toEqual([
    [1, 0, 0],
    [1, 0, 1],
  ]);
  const branch = result.selectors[1]!;
  expect(input.slice(branch.span.start, branch.span.end)).toBe(branch.text);
  const logical = branch.contributions[1]!;
  expect(input.slice(logical.span.start, logical.span.end)).toBe(':is(.a, #b)');
  expect(logical.specificity).toEqual([1, 0, 0]);
  expect(logical.children.map((c) => c.specificity)).toEqual([
    [0, 1, 0],
    [1, 0, 0],
  ]);
  expect(branch.contributions[2]).toMatchObject({ rule: 'where', specificity: [0, 0, 0] });
});

test('all branches contribute safety metadata even when :where zeroes or a different argument wins', () => {
  const result = analyzeSelectors(':is(#x, :hover):where([src], iframe)').selectors[0]!;
  expect(result.specificity).toEqual([1, 0, 0]);
  expect(result.matching).toBe('not-evaluated');
  expect(result.dynamicPseudos).toEqual(['hover']);
  expect(result.attributes).toEqual(['src']);
  expect(result.tags).toEqual(['iframe']);
  expect(analyzeSelectors('a::before').selectors[0]?.matching).toBe('not-matchable');
  expect(analyzeSelectors('a:after').selectors[0]?.pseudoElements).toEqual(['after']);
  expect(analyzeSelectors('svg|a').selectors[0]).toMatchObject({
    matching: 'not-matchable',
    namespaces: ['svg'],
  });
  expect(analyzeSelectors('a\\|b').selectors[0]?.matching).toBe('eligible');
});

test.each([
  ':future',
  ':future(x)',
  ':lang(en)',
  ':dir(rtl)',
  ':nth-of-type(2n)',
  '::part(x)',
  '::slotted(.a)',
  '& .a',
  ':is(.ok, :future)',
  ':where(.ok, :future())',
  ':has(:has(.a))',
  ':has(:is(:has(.a)))',
  ':is(::before)',
  ':not(:before)',
  'a::before.x',
  '[x=y q]',
  'a || b',
])('unsupported semantics never receive a score: %s', (input) => {
  const result = analyzeSelectors(input);
  expect(['unsupported', 'invalid']).toContain(result.status);
  for (const branch of result.selectors.filter((s) => s.status !== 'ok')) {
    expect(branch.specificity).toBeNull();
    expect(branch.contributions).toEqual([]);
    expect(branch.matching).toBe('unsupported');
  }
});

test.each([
  '',
  'a,,b',
  'a,',
  '[',
  ':is()',
  ':nth-child(nope)',
  '> a',
  'a >',
  ':is(> a)',
  ':is(.a,)',
  ':where(.a, [broken)',
  'a { color: red }',
  'a/* unfinished',
  '[data-x="unfinished]',
  ':has(> > a)',
  ':is(.a, :unknown(raw))',
])('malformed selector never silently scores a forgiving survivor: %s', (input) => {
  const result = analyzeSelectors(input);
  expect(result.status).not.toBe('ok');
  expect(result.selectors.every((s) => s.specificity === null)).toBe(true);
});

test('branches with understood syntax stay individually identifiable when another branch is unsupported', () => {
  const report = analyzeSelectors('.ok, :unknown');
  expect(report.status).toBe('unsupported');
  expect(report.selectors.map((s) => s.status)).toEqual(['ok', 'unsupported']);
  expect(report.selectors.map((s) => s.specificity)).toEqual([[0, 1, 0], null]);
});

test('exact limits and adversarial nesting/list/string/comment/escape guards', () => {
  expect(analyzeSelectors('a'.repeat(1000)).status).toBe('ok');
  expect(analyzeSelectors('a'.repeat(1001))).toMatchObject({
    status: 'limit',
    reason: 'selector-length-limit',
    selectors: [],
  });
  expect(analyzeSelectors(Array.from({ length: 20 }, () => '.a').join(',')).selectors).toHaveLength(
    20,
  );
  expect(analyzeSelectors(Array.from({ length: 21 }, () => '.a').join(','))).toMatchObject({
    status: 'limit',
    reason: 'selector-count-limit',
  });
  expect(analyzeSelectors('a'.repeat(20_001))).toMatchObject({
    status: 'limit',
    reason: 'input-length-limit',
  });
  expect(analyzeSelectors(':is('.repeat(17) + '.a' + ')'.repeat(17))).toMatchObject({
    status: 'limit',
    reason: 'nesting-limit',
  });
  expect(analyzeSelectors('[data-x="' + ',('.repeat(100) + '"] /* ((( */ .a').status).toBe('ok');
  expect(analyzeSelectors('.a\\,b').status).toBe('ok');
  const manyNodes = Array.from({ length: 20 }, () => '.a'.repeat(200)).join(',');
  expect(analyzeSelectors(manyNodes)).toMatchObject({
    status: 'limit',
    reason: 'ast-node-limit',
    selectors: [],
  });
  expect(SELECTOR_LIMITS.astNodes).toBe(2048);
});

test('state pseudos stay unevaluated and outputs remain deterministic serializable untrusted data', () => {
  const source = '[data-x="<script>"].__proto__:visited';
  const result = analyzeSelectors(source);
  expect(result.selectors[0]).toMatchObject({
    matching: 'not-evaluated',
    dynamicPseudos: ['visited'],
    specificity: [0, 3, 0],
  });
  expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  expect(analyzeSelectors(source)).toEqual(result);
});
