# Cloudflare runtime recovery — STW-40

2026-10-23 Asia/Taipei. User explicitly authorized push and deployment after closure.

- Initial native Git deployment `cfb63bb7-ac20-4191-a2e2-2da607cf9cd8` for `139928d` failed: Cloudflare selected Node 22.16.0 and pnpm rejected the repository Node 24.21.0 engine constraint.
- Commit `330f86aab7d50b378c1ac1773aa5e6d9d3c32d80` adds native `.node-version` 24.21.0, aligned with mise, package engines and GitHub CI. No custom deployment workflow or new API token.
- Cloudflare native Git deployment `cd4590fe-a460-43c1-80ad-1abbc9436233` for that exact commit succeeded at 2026-10-22T20:57:02.902158Z. Build log confirmed Node 24.21.0, pnpm 12.8.2, install, build and asset publish success.
- Independent headless production check: 21 route HTTP 200 responses with matching canonical; 21 sitemap entries; SPA switches preserve the document; 320px no overflow; Mock API local-connect action disabled on public origin; unknown URL 404; no page errors. Full HTTP results: [production-check.json](production-check.json).
- GitHub repository API returned `has_pages: false`.
- GitHub macOS verification run 39853084093 exposed an independent existing Markdown timing assertion failure (12.5s versus a machine-dependent 10s expectation). Tracked separately as STW-41; native Cloudflare deployment success does not stand in for CI success.
