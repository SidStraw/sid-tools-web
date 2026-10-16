# STW-36 offline Markdown CLI

Review remediation replaces the unsafe worker-thread boundary with a child process
and adds failure/ignore/path regressions. Native public core + CLI build, **123 tests
across four files**, and scoped strict/type-aware checks passed after core freeze;
see [observed evidence](verification.md).
Final acceptance passed on 2026-10-16: refreshed no-cache `pnpm verify` (**937
unit/public tests, 138 production E2E tests**), independent Oracle re-review
attempt 2, and the broad structure gate plus parent child-process follow-up.
All four prior review findings are resolved; no new material issue was found.
Deployment is a separate parent-owned step after the local card commit.

## Usage

```sh
mise exec -- pnpm exec vp run --filter @sid-tools/markdown-links build
mise exec -- node apps/markdown-links/dist/cli.mjs --root ./docs --offline
mise exec -- node apps/markdown-links/dist/cli.mjs --root ./docs --json
mise exec -- node apps/markdown-links/dist/cli.mjs --root ./docs \
  --ignore 'generated/' --ignore '*.draft.md' --ignore-file rules.ignore
```

`--help` describes the whole interface. There is no online/fix/write/cache flag.
No network module is imported by the CLI; external destinations are explicitly
`external-skipped`, including HTTP(S), protocol-relative and mailto links. Rate
limiting does not apply because there is no external request capability.

Exit codes: **0** no broken/unknown (external and ignore skips do not fail);
**1** missing files/anchors or unknown coverage; **2** invocation, filesystem,
child-process, resource, policy or baseline failure. `failed-coverage` never claims a
successful empty scan or resolved baseline findings.

## Renderer and scope

Public core import only: `@sid-tools/core/markdown-links`.
The pinned AST stack is unified 11.0.5, remark-parse 11.0.0, remark-gfm 4.0.1,
mdast-util-to-string 4.0.0 and github-slugger 2.0.0. Slugs are generated from
heading plain text in document order, using a new slugger for each document;
duplicates receive suffixes. This is a **GFM-heading subset**, not complete GitHub
renderer compatibility. Fenced/indented code and inline-code examples are not
links. Reference links and images use the AST rather than a Markdown regex.
Raw HTML/custom anchors and unsupported heading text make anchor coverage
unknown and suppress all anchors, avoiding guessed collision effects; they must
not manufacture a definite missing-anchor result or known-anchor success.

Relative root-contained explicit file paths only; no directory README/index or
extension inference. Queries do not affect local file lookup. Percent encoding is
decoded once by core, never form-decoded (`+` is not a space). Malformed encoding,
encoded separators, root escapes, root-absolute/drive/ambiguous paths remain unknown.
Fragments on non-Markdown assets are unknown; bare asset existence does not read
asset contents. All Markdown sources in the selected scope are parsed, so unrelated
unsupported source constructs can make the complete scan nonpassing.
Terminal directory syntax (`target.md/`, `target.md/.`, `target.md/sub/..`, including
decoded equivalents) cannot pass against a regular file: it is unknown, after ignore
classification. Fatal parser/no-model failures invalidate global coverage and suppress
baseline deltas; ordinary unsupported HTML still yields partial unknown findings.

## Ignore and baseline semantics

`ignore` 7.0.12 implements explicit repeatable gitignore-style `--ignore` rules and
optional `--ignore-file` contents. `.git`, `node_modules`, `dist`, `.slim` are always
excluded at any depth and cannot be unignored. Ignored sources/directories are
pruned, and ignored targets are `ignored-skipped` (not missing). No implicit
`.gitignore`, global gitignore, environment expansion or configuration lookup.
Bounded metadata retains pruned directory names and their descendant prefixes, so
`hidden/`, `hidden` and `hidden/no.md` remain skipped under `hidden/`. A regular file
named `hidden` is not incorrectly treated as a directory by that rule.

To persist a baseline, explicitly redirect a complete JSON report to a file, then
pass its root-local path using `--baseline`. The CLI does not write the baseline.
Keep the baseline outside Markdown source filenames. Every run rescans inventory,
reparses sources and rechecks **all links/targets**; this is a result delta, not a
changed-source cache. Editing a target's heading therefore invalidates unchanged
inbound source links. Stable finding IDs bind source, location, destination, target,
status and reason; delta lists added/resolved/unchanged IDs, including skipped
findings. Changing a finding's status produces an old resolved/new added pair.

Baselines are bounded, schema/version checked, validate finding identities/counts,
and require the same canonical-root/inode identity plus policy fingerprint. Policy
includes renderer label, fixed limits/exclusions and exact explicit ignore inputs.
Different roots/rules/version/limits refuse comparison, never claim false resolved
findings. Prior failed-coverage reports are refused. Baselines are caller-provided
data, not authenticated audit records. JSON edits that fabricate otherwise valid
data cannot be detected cryptographically.

## Filesystem and resource safety

The explicitly chosen root is canonicalized once. Root itself may be a symlink
provided by the caller; its canonical directory is the boundary. Each read checks
root device/inode, all path ancestors with lstat/realpath, and the regular file's
size/type. Open uses O_NOFOLLOW and O_NONBLOCK; fstat identity/size and post-read
inode/path checks detect observed replacements. Symlink directories are never
traversed; linked targets are unknown, not missing. Markdown symlink sources are
also unknown. Policy/baseline files must be explicit root-local regular files.
Special files are not read. Invalid UTF-8, read failures and oversize sources are
coverage failures, never empty documents. Assets receive metadata checks only.

**Race limitation:** portable Node lacks openat(dirfd)-relative traversal. These
checks prevent static symlink escapes and detect many changes, but are **not a
sandbox against hostile concurrent parent-directory renames/replacements**, mounts
or hard links. Run against a trusted, quiescent checkout (or isolated read-only
snapshot). Hard-linked regular files inside root count as root-local content.
Inventory/check results are an observation of a changing filesystem, not an atomic
repository snapshot. Do not run this tool with elevated privileges on hostile trees.

Limits: 10,000 inventory entries, 256 Markdown documents, 512,000 source bytes/file,
16,000,000 aggregate source bytes, 1,024 UTF-16 path units, depth 32, 50,000 scan
work steps, 10,000 findings, 4,000,000 report/baseline bytes, 32,000 ignore-file bytes,
256 ignore-file lines, 32 explicit ignore rules (1,024 units each). Core's stricter
parser limits also apply. The entire filesystem/parser scan runs inside one
independent child process: 128-MiB V8 old-generation limit, 4-MiB stack, 30-second wall-time
watchdog. Parent never parses Markdown or falls back after child failure.
Child exception/native stdout/stderr details are not forwarded. Its environment is
empty, with explicit Node resource arguments rather than inherited `NODE_OPTIONS` or
credentials. One bounded, identity-bound JSON IPC result receives strict shape checks;
signal/nonzero exit, malformed result and timeout are sanitized failed coverage with
null delta. V8 heap limits do not
constitute an OS total-memory quota; bounded buffers/input/output supplement them.
Output beyond the report bound is a coverage failure, not truncated success.

## Privacy, no rewrite and cleanup

No source excerpts, raw exceptions, environment/configuration values or source
bodies in reports. Reports intentionally contain source/target paths, link
destinations and locations: these names/URLs can themselves contain sensitive
information, so inspect before sharing. Obvious external URL userinfo credentials
are replaced with `[redacted]`, but arbitrary queries/names can still contain secrets;
this is not a secret detector or
anonymizer. Human output escapes terminal controls, bidi/format controls and
surrogates; JSON escapes those code points without changing parsed values.
Root identity is hashed; canonical absolute root is not printed.

The CLI opens inputs read-only, provides no fixes and never overwrites documents,
creates caches or stores reports implicitly. Caller redirection is outside that
guarantee: do not redirect to a source document or use the same file as both input
baseline and output. No diff/rollback flow is necessary because fixes are not
offered. The child exits after sending its result; failure/timeout or parent
SIGINT/SIGTERM/SIGHUP terminates it. The parent waits for close/reaping and releases
IPC before reporting; process memory is
discarded on exit. Synthetic integration fixtures are removed by test cleanup.

## Acceptance evidence mapping (focused tests executed)

1. Source/target/location and missing-file/missing-anchor/unknown: passing built-bin fixture
   test, public package projection test and filesystem-boundary fixtures.
2. Explicit heading rules/code exclusions: passing public AST tests plus real-bin
   reference/image/duplicate/entity/Unicode/query/percent fixture.
3. Ignore and incremental results, zero requests: passing pruning fixtures, baseline
   target-anchor edit and root/policy mismatch fixtures, actual HTTP canary.
4. No rewrite: passing actual built-bin run and rejected `--fix` bracketed by an identical
   full synthetic-tree SHA-256 digest; preexisting file preserved.

Focused commands/results and limits are recorded in [verification.md](verification.md).
These checks do not claim full verification, live GitHub rendering, atomic filesystem
snapshots, external resource verification or an OS security sandbox.
