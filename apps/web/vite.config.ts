import { defineConfig } from 'vite-plus';
import { fileURLToPath } from 'node:url';
import { renderPage } from './scripts/ssg';
import { routes, SITE_ORIGIN } from './src/routes';

export default defineConfig({
  base: './',
  worker: { format: 'es' },
  build: {
    rollupOptions: {
      input: Object.fromEntries(
        [
          'index.html',
          'tools/lighthouse/index.html',
          'tools/json-diff/index.html',
          'tools/cron/index.html',
          'tools/semver/index.html',
          'tools/env-check/index.html',
          'tools/git-diff/index.html',
          'tools/sitemap/index.html',
          'tools/explain/index.html',
          'tools/palette/index.html',
          'tools/selectors/index.html',
          'tools/sdl/index.html',
          'tools/openapi/index.html',
          'tools/openapi-fixture/index.html',
          'tools/sql-ddl/index.html',
          'tools/compose/index.html',
          'tools/dependency-graph/index.html',
          'tools/bundle-diff/index.html',
          'tools/unused-review/index.html',
          'tools/component-docs/index.html',
          'tools/mock-api/index.html',
          'tools/dockerfile-review/index.html',
        ].map((path) => [path, fileURLToPath(new URL(path, import.meta.url))]),
      ),
    },
  },
  plugins: [
    process.env.STW_BUNDLE_REPORT
      ? import('@sid-tools/bundle-report').then(({ bundleReport }) =>
          bundleReport({
            file: process.env.STW_BUNDLE_REPORT!,
            sourceRoot: fileURLToPath(new URL('../../', import.meta.url)),
            profile: 'sid-tools-web',
          }),
        )
      : null,
    {
      name: 'tool-ssg',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${routes.map((route) => `<url><loc>${SITE_ORIGIN}/${route.path}</loc></url>`).join('')}</urlset>`,
        });
        this.emitFile({
          type: 'asset',
          fileName: 'robots.txt',
          source: `User-agent: *\nAllow: /\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`,
        });
      },
      transformIndexHtml: { order: 'pre', handler: (_html, ctx) => renderPage(ctx.filename) },
    },
    {
      name: 'development-connections',
      apply: 'serve',
      transformIndexHtml: (html) =>
        html.replace(
          'connect-src https://tools.sid.tw/cdn-cgi/rum',
          "connect-src 'self' ws: https://tools.sid.tw/cdn-cgi/rum",
        ),
    },
  ],
  run: {
    tasks: {
      dev: { command: 'vp dev', cache: false },
      build: { command: 'vp build', dependsOn: [{ task: 'build', from: 'dependencies' }] },
    },
  },
});
