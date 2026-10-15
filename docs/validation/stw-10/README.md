# STW-10 — Git diff review and explicit-selection extract

## Reproduce

```sh
mise exec -- pnpm exec vp test run packages/core/src/git-diff.test.ts tests/package.test.ts
mise exec -- pnpm build
mise exec -- pnpm exec playwright test tests/e2e/git-diff.spec.ts tests/e2e/tools.spec.ts tests/e2e/env-check.spec.ts tests/e2e/semver.spec.ts
```

Integration evidence on 2026-10-15: **35/35 focused unit/public-package tests** (31 parser/selection cases, four public package cases), production core/web build, **27/27 production browser tests** (5 Git diff, 12 shared route/tool, 5 env, 5 SemVer). Scoped formatting/lint/type checks pass without warnings. Parent retains final cache-disabled `mise exec -- pnpm verify`, independent Oracle review, acceptance and commit; this lane does not run full verify while unrelated writers are active.

## Acceptance mapping

| AC                                                             | Repository evidence                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Added/deleted/modified/renamed files and hunks              | Core tests, public `@sid-tools/core/git-diff` test, and production demo assertions cover all four kinds, metadata-only rename, exact hunk/source positions and old/new file line numbers.                                                                                                                                                                                                                                  |
| 2. Binary/truncated/unsupported input is explicitly incomplete | Core validates bounds/counts/headers/paths. Browser malformed demo plus unsupported preamble proves static source-located diagnostics, incomplete/observed-only wording, disabled incomplete-file selectors, and valid-file export from an incomplete original with an explicit original-input warning. Empty and oversized-line input also covered.                                                                       |
| 3. Deterministic, source-grounded summary                      | Browser checks four files, four hunks, +3/−3 observed lines in synthetic demo. Code columns distinguish diff source line from old/new file lines; clicking source location selects the exact original hunk header. No AI/causal inference or patch application.                                                                                                                                                            |
| 4. Exclude sensitive files/hunks before export                 | Defaults select nothing. Browser keyboard-selects file and proves neither hunk is selected; file-only preview refuses content until hunk explicitly selected. Preview JSON is parsed, real JSON download equals it, TXT equals helper `patch`. Both exclude unselected sensitive hunk/body/path and even section labels, index hashes and other unselected source names. Selection changes hide preview/disable downloads. |
| 5. Local-only/no persistence/share + clear                     | Same-origin GET static-asset-only request assertions; localStorage/sessionStorage and query/hash stay empty. Browser checks clear, fresh selections/IDs after edits, SPA document identity/back/reload disposal, gated engine load cancellation and 320px overflow. Seven-route mobile/deep-link/no-JS/sitemap/lazy/privacy regression tests pass.                                                                         |

## Important boundaries

- Parser loads only on **檢視變更**, through the built public workspace subpath; dedicated controller avoids generic tool/worker Cron fallback. No new dependencies or CSP changes. Paste-only input, no file-upload control or repo access.
- Every file and hunk has an explicit checkbox. Selecting a file never includes hunks automatically; deselecting it clears/disables its hunk selections. Incomplete files remain visible but cannot be selected for export. Metadata-only complete files require the explicit file checkbox.
- Only the unmodified parser report feeds `exportGitDiffSelection`. Preview/download use **only that helper's returned `GitDiffExport`**, never serialized original report/input/global diagnostics. JSON preview is exact download JSON; TXT is helper's `patch` field.
- This is a **selection-only review extract, not complete/apply-ready patch**. Original hash, mode and hunk section labels are omitted. Mode-only extracts omit their original mode change; added/deleted extracts are not guaranteed to round-trip through the strict parser. Selected paths and all selected hunk content/context still appear; this is not automatic secret detection or line-level redaction. Inspect the preview before sharing.
- Original report completeness and selected-export completeness are distinct. A complete selected file can be exported from an incomplete original, and UI retains that warning rather than leaking unselected diagnostics into the export.
- IDs derive from original physical source lines, not stable cross-revision identities. Editing/rerunning clears report/selections/preview; selection changes invalidate preview; all Blob URLs are revoked on changes/clear/disposal/re-export. Render-scoped event handlers are aborted when input/report changes, releasing old hunk closures.
- Displayed paths are safely text-rendered (JSON-quoted for visible control-character spelling); body text uses textContent. Git C-quoted path serialization is delegated to the helper. Browser test uses literal HTML-like paths/body and verifies no image/SVG/script element is created.
- Bounds: 1,000,000 UTF-16 code units, 20,000 physical lines, 20,000 code units/line, **not bytes**. LF/CRLF normalized; one final framing newline ignored. Help publishes all supported metadata/path/hunk/no-newline rules and unsupported formats. Hunk bodies load on disclosure and display 200 lines at a time; browser verifies final five lines of a 205-line hunk remain accessible.
- Input/source review itself may contain secrets; there is a screen-sharing warning and no promise of automatic masking in this tool. Downloads are explicit local actions, not public shares. No upload/login/storage/URL-sharing/apply/exec/eval behavior added.

## Synthetic samples and visual review

`apps/web/src/pages/git-diff-demos.ts` contains the reproducible built-in fixtures:

1. Complete: modified `src/app.ts` with one safe and one sensitive synthetic hunk, an unselected sensitive added path, deleted text file and metadata-only rename. Expected 4 files, 4 hunks, +3/−3. The screenshot preview selects only safe first hunk (1 file, 1 hunk, +1/−1); raw original review intentionally still contains other data.
2. Incomplete: valid text change, binary marker and truncated text hunk. Expected 3 observed files, 2 hunks, two incomplete diagnostics; only first file selectable.

Captured in production Chromium **153.0.8010.12**, 2026-10-15, and visually reviewed:

- [Desktop source review and safe-selection preview, 1440px](desktop-review-preview.png)
- [Mobile source review and preview, 390px](mobile-review-preview.png)
- [Desktop incomplete/binary report, 1440px](desktop-incomplete.png)

390px screenshot run: document width 390px, zero runtime errors. Automated hostile-input review also passes at 320px. Existing off-white/forest-green shell preserved; review uses monospace, labeled source/old/new columns, explicit prefix symbols and internal code scrolling rather than page overflow. Mobile navigation retains every link, and the file rail stacks above content.
