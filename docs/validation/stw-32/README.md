# STW-32 — Dockerfile review evidence

Date: 2026-10-23 Asia/Taipei.

## Engine and sample

- Official [Hadolint 2.15.1 release](https://github.com/hadolint/hadolint/releases/tag/v2.15.1), not a reimplemented lint engine. Official release asset digests are pinned in `apps/dockerfile-review/src/cli.ts`; each scan verifies binary SHA256 and `--version` before execution.
- macOS arm64 local binary SHA256: `5c09f3213f8e40406abe048233d985eebef336d4a6a20021be47fadb6cf480a2`.
- Public Dockerfile: `nodejs/docker-node` commit `84410eeaede25daf49826da8265fbf548cc604fe`, `24/bookworm-slim/Dockerfile`; source, license and source digest retained in `tests/fixtures/dockerfile-review/`.
- Actual raw output: [hadolint-raw.json](hadolint-raw.json). Six findings: DL3008 ×2, DL4006 ×2, SC2155 ×1, SC2086 ×1, at original instruction start lines 8 and 61. Positions are Hadolint's instruction positions, not an invented exact token offset.
- Direct raw command: `.cache/hadolint/2.15.1/hadolint --config /tmp/stw32-hadolint.yaml --format json --no-fail --no-color --disable-ignore-pragma - < tests/fixtures/dockerfile-review/Dockerfile`; config contains `{}`. CLI uses the same options plus clean environment and isolated temporary cwd.

## Added review capability

Hadolint provides rules and positions. This wrapper keeps those findings with source text/digest, offers browser source context and filtering, exports explicit review reasons, and compares the two fixed-version reports. A source change invalidates every old annotation. Rule count changes do not prove optimization or runtime equivalence. No search demand or user time-saving claim is inferred from this engineering validation.

## Verification

- Real binary integration: public source returns the exact saved report; inherited HADOLINT environment overrides do not change output. Dockerfile inline ignore does not suppress the tested rule.
- Controlled local fixture replaces `RUN cd /tmp` with `WORKDIR /tmp`: actual DL3003 is no longer reported; old source reasons become invalid. A `touch` canary in the Dockerfile remains absent; no Dockerfile commands are executed. No image was built.
- Bad UTF-8, excessive input, symlink source, unknown options, wrong engine version, changed digest, invalid positions, empty/unknown annotations and duplicate findings fail. Existing `--out` content is preserved. Syntax errors remain DL1000 error findings rather than empty success.
- Browser: actual native report loads, source line and original message remain visible; empty reasons rejected, reasons export/reload, changed source invalidation, severity filter, malformed evidence, clear during loading, SPA leave/return, no input network requests, no local/session storage. 320px layout screenshot visually reviewed after correcting long-hash overflow.
- Targeted tests: 4 native integration/core tests and 1 browser test passed. Full `pnpm verify` passed: 963 unit/integration tests, 148 browser tests, formatting/lint/types/build and production audit; task cache 0/15.

## Scope

Image build: **NOT RUN**. Vulnerability scan: **NOT RUN**. No image size or vulnerability result is claimed. Optional scan imports are deferred; the first version intentionally accepts only the versioned Hadolint wrapper report. Scan exit 0 means report generation, not zero lint errors. Reports include full Dockerfile source and human reasons; digest validation is consistency checking, not a signature or proof of issuer identity.
