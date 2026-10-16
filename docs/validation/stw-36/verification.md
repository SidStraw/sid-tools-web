# STW-36 focused execution evidence

## Final acceptance — 2026-10-16

Parent supplied and accepted the refreshed frozen-tree run
`mise exec -- pnpm verify` (`sh_14279ec32001VKRZrY51I3Xpro`): **PASS 937
unit/public tests + 138 production E2E tests**, 218 formatted files, 113 strict
files with zero warnings/lint/type errors; public core, CLI and web builds plus
audit passed, task cache **0/7**. Existing experimental TypeScript 7 API notice
remains. Finalization changes only this documentation and task metadata, so no
unnecessary full-suite rerun was performed.

Fresh user-requested independent Oracle re-review
`ses_ebd93c0e0ffeZ2oLtfqNhaSIFX`, attempt 2: **PASS**, all four material findings
resolved and no new material issue. The reviewer additionally probed five built-core
directory cases, fragment-only behavior, normal built CLI and sanitized missing-root
failure; both CLI probes had empty stderr. Broad structure review passed; the
changed child/build boundary passed a bounded parent follow-up (not a new independent
explorer verdict). Current authoritative isolation evidence is the independent
**child process** below, not the historical worker-thread observation.

All four acceptance criteria are evidenced by source/target/location and unknown
fixtures; explicit GFM-heading/code exclusions; full-recheck baseline and ignore
regressions with **zero HTTP canary requests**; and identical read-only tree hashes
with `--fix` rejected. No Definition of Done items are defined. Known limits remain
trusted quiescent checkout, non-atomic filesystem observations/hardlinks, GFM subset,
potentially sensitive requested path/URL metadata, V8 rather than OS memory quotas,
and no external verification or fixes. Local commit finalization does not authorize
push or deployment; deployment remains parent owned after the actual commit.

## Review remediation (current; focused validation passed)

The historical first-pass evidence below predates Oracle's four material findings
and is **not** proof that worker-thread native OOM was contained. Current source
replaces that boundary with an independent child process (empty environment,
128-MiB V8 old-generation / 4-MiB stack, explicit exec arguments, ignored native
stdout/stderr, 30-second watchdog). Parent validates one bounded identity-bound
JSON IPC report, waits for child close/reaping, and translates signal/nonzero exit,
timeout and invalid protocol into sanitized failed coverage with null delta.
No parser fallback, OS sandbox or total-memory quota is claimed.

Added regressions:

- Exact short native-failure fixture: `'> '.repeat(12000) + '[x](missing.md)'`,
  **24,015 UTF-16 units**. Actual-bin test requires exit2, failed coverage, null
  delta, empty stderr and no native OOM/abort/core-dump diagnostic in stdout.
- Existing 180,001-unit emphasis fixture still uses the 30-second deadline,
  accepting sanitized child resource failure as well as timeout/parser limit.
- Real scanner/public-parser mock at the test boundary deterministically returns
  `markdown-parser-failed` (also invalid-source-path/ill-formed-unicode no-model
  failures), proving an existing broken baseline finding cannot become resolved.
  Ordinary unsupported HTML remains complete scan / unknown coverage.
- Root/nested pruned `hidden/` targets with slash, no slash and descendant paths
  remain ignored, while a regular asset named `hidden` is not ignored by that rule.
- Actual bin rejects `target.md/`, `target.md/.`, `target.md/sub/..` against a
  regular file as unknown, including encoded terminal dots; ignored `hidden/`
  classification wins first.

After explicit parent core-freeze release, ran:

```sh
mise exec -- pnpm exec vp run --filter @sid-tools/markdown-links build
mise exec -- pnpm exec vp test run packages/core/src/markdown-links.test.ts tests/package.test.ts tests/markdown-links-cli.test.ts tests/markdown-links-scanner.test.ts --reporter=verbose --silent=false
mise exec -- pnpm exec vp check apps/markdown-links/src/cli.ts apps/markdown-links/src/model.ts apps/markdown-links/src/scanner.ts apps/markdown-links/src/scan-worker.ts apps/markdown-links/src/protocol.ts apps/markdown-links/vite.config.ts tests/markdown-links-cli.test.ts tests/markdown-links-scanner.test.ts
```

**PASS:** native public core + CLI build; **123 tests / four files, 34.26 seconds**
(86 core, 14 public package, 18 actual-bin CLI, five scanner/protocol tests).
Scoped strict/type-aware check: eight formatted files, zero warnings/lint/type errors.
Core pack retains its existing experimental TypeScript 7 API warning.

Actual observations: emphasis **`scan-time-limit`, 30,039 ms, exit2**. Exact short
blockquote regression passed; a targeted rerun after adding observation logging
reported **`child-failed`, exit2, stderr=0 bytes; parent survived**, 380 ms. No native
OOM/abort/core-dump diagnostic was printed. Deterministic parser mock proves no
false resolved delta, and an additional actual-bin invalid-source-path/no-model
fixture also refuses baseline resolution. HTTP canary remains **0 requests** and
AC4 tree hashes remain identical to the historical digest below.

Two preliminary test failures were corrected without weakening production guards:
the old ESC-named Markdown source now correctly causes fatal no-model failure, so
the normal terminal-escaping fixture uses a valid bidi-named source instead, and
the ESC filename has a separate actual-bin failed-coverage/baseline regression.
A proposed numeric ESC entity fixture was dropped because Markdown replaces that
invalid control entity; encoded ESC destination and actual bidi metadata remain
covered. Initial pre-release strict check saw stale core declarations and one mock
generic warning; rebuild and explicit mock typing resolved both.

Full verification and Oracle attempt 2 subsequently passed as recorded above. Existing race, privacy,
zero-network and no-fix limitations remain intact. No installs/dependency edits,
Backlog/progress changes, staging, commit, deployment, browser or full verification
were performed in this remediation lane.

## Historical initial implementation evidence (before remediation)

Observed 2026-10-16 on macOS, project-scoped Node 24.21.0 / pnpm 12.8.2.
No Backlog changes, commit, push, service/daemon, web route, browser/server or full
verification command was run in this lane. Linux CI remains parent/CI-owned;
tests use portable Node APIs and are registered in the same root verification
graph used by Linux/macOS CI.

## Build and scope

After parent explicitly accepted the frozen core lane and relinquished lock/install
ownership, created the CLI manifest and ran **one** `mise exec -- pnpm install`.
Observed one added package (`ignore` 7.0.12), all four workspaces recognized.
Existing 25 deprecated transitive dependencies were warned about; no new runtime
or global tool version was installed. Core owns the inherited parser catalog pins.

Native multi-document lock inspection confirmed toolchain lock document and root/web
importers unchanged from HEAD; project importer list is exactly `.`,
`apps/markdown-links`, `apps/web`, `packages/core`. Installed CLI `ignore/package.json`
reports 7.0.12. Initial diagnostic picked the toolchain lock document rather than
the project document and failed its expected-new-importer assertion; corrected
selection by `packages/core` importer, without another install. A subsequent
diagnostic also used a wrong require-relative path; corrected to the CLI's direct
dependency resolver. Final structural checks passed.

```sh
mise exec -- pnpm exec vp run --filter @sid-tools/markdown-links build
```

**PASS:** builds public core .mjs/.d.mts, then CLI ESM entries with native `vp pack`.
CLI output: `dist/cli.mjs` (shebang and execute permission), `scan-worker.mjs`,
and a shared model chunk. Worker keeps `@sid-tools/core/markdown-links` and `ignore`
external rather than source aliases or bundled copies. Initial task configuration
duplicated a package build script and native task; native vp rejected the graph.
Removed the redundant script (no dependencies changed); graph then passed. Replaced
deprecated pack `external` option with native `deps.neverBundle`, final build had
no such warning. Core pack still reports the existing experimental TS 7 API warning.

Root `check-all` and `test-all` both depend on the CLI build. The app's native build
task depends on public core build. Root test discovery includes the actual CLI
spawn tests, so `pnpm verify` on either CI platform cannot silently omit them.
Final no-cache full verification subsequently passed; see final acceptance above.

## Focused tests

```sh
mise exec -- pnpm exec vp test run \
  packages/core/src/markdown-links.test.ts \
  tests/package.test.ts tests/markdown-links-cli.test.ts \
  --reporter=verbose --silent=false
```

**PASS: 107 tests / 3 files, 32.80 seconds.**
79 core tests, 14 public package tests (including the new Markdown subpath),
14 production CLI tests. The CLI tests invoke the built .mjs with the actual
project Node executable in a noninherited empty environment. Fixtures are fresh
synthetic temporary roots and are removed after each test.

Observed proof points:

- Direct/reference/image/code exclusions, duplicate heading slugs, entity text,
  Unicode anchors, percent path encoding and query handling passed through the
  built executable. Binary asset contains invalid UTF-8 and is only existence
  checked, demonstrating no asset content decoding.
- Missing file and missing anchor have distinct statuses, normalized targets and
  1-based source locations. Raw HTML/custom anchors, directory inference, malformed
  encoding and non-Markdown fragments remain unknown rather than fabricated results.
- Actual local HTTP server canary received **0 requests** for external destinations.
  All four external cases were skipped, including protocol-relative/mailto and a
  URL with obvious credentials; userinfo was redacted from the emitted report.
- Ignored/default trees pruned; ignored targets skipped, not missing; repository
  `.gitignore` is inert unless explicitly supplied. Symlink file/directory targets
  remain unknown; root escape and policy-file symlink cannot read outside content.
- Baseline run with unchanged source but edited target heading adds a missing-anchor
  finding; existing missing-file finding remains unchanged. Restoring target and
  creating the missing file resolves the previous finding. Root/ignore-policy/schema
  mismatches return exit2 with no resolved delta.
- Invalid UTF-8, oversized source/policy/baseline and unavailable root return exit2,
  `failed-coverage`, no baseline delta. Human and JSON terminal controls are escaped;
  no private source excerpt or raw filesystem exception is emitted.

### Historical worker-thread parser deadline evidence (superseded)

The synthetic source is `'*_'.repeat(45000) + 'x' + '_*'.repeat(45000)` (180,001
UTF-16 units, within core source ceiling). The parser is synchronous and cannot
honor main-thread cancellation itself; scan/parse occurs only in an independent
worker with 128-MiB old-generation heap and 4-MiB stack limits.

Actual built CLI observation: **`scan-time-limit`, 30,038 ms, exit2**;
`failed-coverage`, null delta, never valid empty. Parent watchdog terminated the
busy worker. This single deadline observation did not contain the later native-OOM
counterexample, and is superseded by the child-process remediation above. It is
not a promise that arbitrary filesystem
or native calls provide hard real-time scheduling or an OS memory quota. No parser
fallback runs on the main thread. Smaller core emphasis fixture took 1,471.7 ms
before postparse checks in the same focused run, confirming why AST limits alone
are insufficient.

### AC4 actual no-rewrite evidence

Fresh fixture contains `a.md` with a broken link, `existing.json` with preexisting
synthetic contents and `asset.bin`. SHA-256 includes sorted relative tree paths,
entry kinds and all file bytes. An actual normal run exits1; attempted `--fix`
exits2 because the feature does not exist. Before/after digests:

```text
before 96fdfad21b7112d08eed0e123b3f2f6e9b32c0260bc85dbc6040bd140274211c
after  96fdfad21b7112d08eed0e123b3f2f6e9b32c0260bc85dbc6040bd140274211c
```

All original files remain. No output/cache file was created. The test is reproducible
and prints both digests. Tool offers no fixes, so there is no undisclosed overwrite,
diff application or rollback mechanism. Caller redirection can still overwrite a
file; documentation explicitly warns against redirecting to sources/input baseline.

## Scoped strict/type-aware and formatting checks

```sh
mise exec -- pnpm exec vp check \
  apps/markdown-links/src/cli.ts apps/markdown-links/src/model.ts \
  apps/markdown-links/src/scanner.ts apps/markdown-links/src/scan-worker.ts \
  apps/markdown-links/vite.config.ts tests/markdown-links-cli.test.ts \
  tests/package.test.ts vite.config.ts
git diff --check
```

**PASS: 8 correctly formatted files, zero warnings/lint/type errors; diff check exit0.**
Project root `strict`, `typeAware` and `typeCheck` remain enabled; the CLI has its
own strict project tsconfig, no source aliases, tsx or transitive dependency APIs.
An initial string-spread lint warning was fixed by escaping the single matched
Unicode codepoint directly. No frozen core changes or test weakening were needed.

Repository formatter was also applied to the exact owned package/tsconfig/docs
paths. This initial lane did not perform final full checks or independent Oracle
review; both subsequently passed as recorded in final acceptance above.
