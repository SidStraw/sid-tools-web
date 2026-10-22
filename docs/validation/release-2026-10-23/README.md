# Verified release — 2026-10-23

Scope: STW-18, STW-19, STW-20, STW-21, STW-22, STW-24, STW-32. STW-21 is a completed research spike; it does not add a tool page. Other completed cards add six tool pages to the existing 16, for 22 SSG routes in one SPA. STW-40 restores native Cloudflare build runtime detection; STW-41 repairs the machine-dependent Markdown test assertion.

Local final acceptance: `mise exec -- pnpm verify`, exit 0, 963 unit/integration tests and 148 browser tests, formatting/lint/types/build and production audit passed, no task cache (0/15).

## Native Cloudflare deployment

- Source commit: `84ec9af8ab99900db9a2ac84b30311173a41bb08`.
- Production deployment: `592ee99d-3835-4cd4-9f4a-2676463b4463`, triggered by GitHub push, completed successfully at `2026-10-22T21:12:59.736634Z`.
- Public site: <https://tools.sid.tw/>.
- Independent headless Chromium loaded the public site and actual Dockerfile report. 22 routes returned HTTP 200 with matching canonical; menu switches preserved the same SPA document; 320px layout stayed within the viewport. Public Mock API local-connect button remained disabled. Sitemap contained 22 entries; unknown route returned 404; no page errors.
- HTTP/browser evidence: [production-check.json](production-check.json). Dockerfile report loaded Hadolint 2.15.1 source context successfully on the production origin.

## Remaining work requiring user input

STW-15, STW-23, STW-25, STW-27, STW-28, STW-30 and STW-33 remain Needs Refinement with their intervention requirements recorded in the board. They are not included as implemented features in this release.

## GitHub CI and Pages

[Verify run 39855305476](https://github.com/SidStraw/sid-tools-web/actions/runs/39855305476) passed on the exact source commit above: Linux x64 in 3m21s, macOS arm64 in 3m46s. Both run the full `pnpm verify` including the real downloaded/verified Hadolint binary; [ci-check.json](ci-check.json) records the selected log evidence. No tests were disabled and no retries were introduced.

GitHub repository API confirmed `has_pages: false` after this deployment. The closure commit following this evidence changes only Backlog/documentation files; it carries these results into the repository without changing application code.
