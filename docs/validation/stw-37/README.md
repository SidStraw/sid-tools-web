# STW-37 — SemVer validation

## Reproducible checks

Run from the repository root with the project mise toolchain:

```sh
mise exec -- pnpm exec vp test run packages/core/src/semver.test.ts tests/package.test.ts
mise exec -- pnpm build
mise exec -- pnpm exec playwright test tests/e2e/semver.spec.ts
mise exec -- pnpm exec vp check packages/core/src/semver.ts packages/core/src/semver.test.ts tests/e2e/semver.spec.ts
```

2026-10-15 post-Oracle remediation: **52 unit/public-package tests passed**, production build passed, **5 production SemVer browser tests passed**, scoped formatting/lint/types passed with no warnings. Final `mise exec -- pnpm verify` and task acceptance remain parent-owned; these focused results do not substitute for that gate.

## Acceptance coverage

- **AC 1:** `packages/core/src/semver.test.ts` tests exact, comparator, caret, tilde, prerelease, x, hyphen and OR ranges against explicit supplied version sets and native-engine parity. `tests/package.test.ts` exercises the public workspace subpath.
- **AC 2:** Core tests cover 0.x boundaries, invalid versions/unsupported syntax, bounds, and leading/trailing/repeated/whitespace-only empty OR branches in either range. Explicit `*` and `x` remain valid. Production browser regression proves an invalid OR edit hides and clears stale rows, displays a meaningful error, and recovers with explicit `x`.
- **AC 3:** Core and production browser tests verify added/removed supplied versions, both ranges' reasons, and JSON export contents.
- **AC 4:** Production browser checks compatibility caveat, reproducible exported inputs, no input network submission/storage, SPA input disposal, mobile overflow and delayed-engine invalidation. Engine-label drift test reads the installed native package version using test-only Node APIs.

## Visual evidence

Captured from the production build in Chromium 153.0.8010.12 on 2026-10-15 and visually reviewed. Accepted design is unchanged by the parser-only Oracle remediation; these screenshots show valid-input flows, not the new validation error.

- [Desktop editor, 1440px](desktop-entry.png)
- [Desktop demo results, 1440px](desktop-results.png)
- [Mobile demo results, 390px](mobile-results.png)

The demo compares `^0.2.3` → `^0.3.0-beta.1`: 10 supplied entries, 4 added, 2 removed, 4 unchanged. Mobile document width equals viewport width; screenshot run had no page errors. Tests and images in this directory's repository references are durable evidence; ignored local handoff reports are supplementary only.
