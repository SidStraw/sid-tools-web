# STW-1 — .env preflight validation

## Oracle remediation — authored, integrated validation pending

The UI/docs lane authored these changes without modifying core, building or running browser/integrated tests. Parent coordinates validation after the separate core lane completes:

- Unquoted multiline PEM/PGP/OpenSSH must be quoted. For the core's recognized unquoted `-----BEGIN ` value, consume the armor body through `-----END` or EOF and flag unsupported syntax; missing terminator also reports the existing unterminated diagnostic. UI messages/help now explain this policy. This is not a general detector for arbitrary unquoted multiline secrets: assignment-shaped fragments may still become visible keys. Inspect key names before sharing/exporting.
- `tests/e2e/env-check.spec.ts` adds a synthetic PEM regression with an assignment-shaped body fragment. It asserts incomplete report, only APP/PRIVATE_KEY in key inventory, and no body fragments in rendered report, key list or downloaded JSON. Existing masking/reveal behavior is unchanged.
- Duplicate diagnostic pointer label is now **首次出現行** (first occurrence), matching the core's single first-origin reference. Full occurrence lists remain in `keys`, not in diagnostic histories.
- The results below describe the **pre-remediation** integration, not a pass claim for these new regressions. Parent must rerun focused unit/public tests, build and env browser tests, then Oracle/final verify.

## Reproduce

```sh
mise exec -- pnpm exec vp test run packages/core/src/env-check.test.ts tests/package.test.ts
mise exec -- pnpm build
mise exec -- pnpm exec playwright test tests/e2e/env-check.spec.ts tests/e2e/tools.spec.ts tests/e2e/semver.spec.ts
```

2026-10-15 integration results: **24/24 unit/public-package tests**, **21/21 production browser tests** (4 env, 12 shared tools/routes, 5 SemVer regression), production core/web build passed. Scoped `vp check` on all 15 relevant source/config/doc/test paths passed with no lint/type warnings or errors. Final cache-disabled `mise exec -- pnpm verify`, Oracle review, acceptance and commit remain parent-owned; not run by this UI lane while other core work is active.

## Acceptance evidence

| AC                                                       | Durable evidence                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Missing / extra / duplicate / empty with source lines | Core tests and public-subpath test; production browser checks REQUIRED at **template line 3**, EXTRA at candidate line 5, DUP at candidate line 4 with prior line 3, EMPTY at candidate line 2. Location button selects the correct template text while preserving masking.                                                                                            |
| 2. Published grammar, unsupported syntax never executed  | Static SSG help documents quotes, comments, equals, multiline, escapes and conservative interpolation rejection. Core's 21 tests cover parser edges; production normal/malformed demos check multiline span and unsupported interpolation. Browser proves command-like input is not executed and HTML is not rendered.                                                 |
| 3. Default masking and key-only report                   | Both textareas use masked rendering from initial HTML/CSS, verified through computed `-webkit-text-security: disc` in Chromium. Keyboard paste/edit works while masked; explicit reveal/hide uses a labeled button with `aria-pressed`. Production test parses a real download and verifies synthetic secret values and comments are absent from both output and JSON. |
| 4. Reproducible examples, empty vs missing               | Four on-page synthetic examples: normal, missing/empty/extra, duplicate and malformed. All run in browser tests; static help distinguishes missing assignment from zero-length value and quoted whitespace.                                                                                                                                                            |
| 5. Browser-only, no persistence/share, clear             | Network assertions allow only same-origin GET static assets during check/export/edit/clear. localStorage/sessionStorage and URL query/hash remain empty. Browser covers clear, restore masking, SPA disposal/back/reload, delayed engine invalidation and narrow-width overflow. No login/upload/storage API added; CSP unchanged.                                     |

## Intentional behavior

- Standalone route/controller; built public `@sid-tools/core/env-check` loads only on Check. No generic Cron fallback. Syntax failures produce static, non-echoed diagnostics and a **provisional** report. Limits skip missing/extra comparison, rather than guessing. Blank template is not shown as a clean preflight.
- Every diagnostic maps from a fixed code to fixed text. Missing has `source=candidate` in core but its line is in **template**; UI/export explain that exception. Duplicate keys do not select a first/last winning value.
- Masking is visual, **not encryption**. The actual editable text remains in page memory; this is explicitly disclosed. Entire text is masked (including keys/comments) to avoid exposing secrets during entry. A transparent-text fallback keeps input obscured if the browser lacks text-security rendering. Reveal is explicit; demo/clear/navigation restore masking. This does not promise protection against developer tools, browser extensions, assistive access or someone explicitly copying input.
- Key names are intentionally shown and exported; this is not a secret classifier for secrets embedded in key names or arbitrary unquoted multiline input. Parsed assignment values are not exported, but assignment-shaped unquoted secret fragments may be classified as keys. Quote multiline values and inspect the key list before sharing. Recognized unquoted armor blocks are rejected and consumed rather than exposing their body as keys. No raw exception text is surfaced.
- Compact JSON format `sid-tools/env-check/v1` exports summary, keys with complete occurrence lists, diagnostics with source/code/key/line/span, static descriptions/rules and limits. Complete key locations live once under `keys`; duplicate diagnostics point only to the first occurrence, not an expanding history. Export does not intentionally preserve parsed values for replay, but key names must still be reviewed for sensitive content.
- Input limits: each source 200,000 UTF-16 code units, 5,000 physical lines, 10,000 code units/line; trailing newline counts as a line. These are **not bytes**. Results and key inventory show 100 items per page, keeping every result available; related-line text previews 10 positions, with full locations in exported keys.
- Existing warm off-white/forest-green design retained. Desktop paired editor, stacked mobile editor, subdued safety strip, explicit text issue labels and navigable source-line buttons. Six tool links remain reachable, including no-JS SSG. No dependencies or CSP permissions added.

## Visual evidence

Captured against the pre-remediation production build in Chromium **153.0.8010.12** on 2026-10-15 and visually reviewed. Only built-in synthetic examples are pictured. Layout, masking and reveal interactions are unchanged; screenshots predate the corrected safety wording and first-occurrence label.

- [Desktop masked input + findings, 1440px](desktop-masked-results.png)
- [Desktop explicit reveal, 1440px](desktop-explicit-reveal.png)
- [Mobile masked input + findings, 390px](mobile-masked-results.png)

Screenshot run: three findings (missing API_TOKEN, empty API_URL, extra EXTRA_FLAG), 390px document width equals viewport, masking computed as `disc`, zero runtime errors. Browser tests separately pass at 320px.
