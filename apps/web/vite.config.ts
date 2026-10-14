import { defineConfig } from 'vite-plus';
import { fileURLToPath } from 'node:url';
import { renderPage } from './scripts/ssg';

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
        ].map((path) => [path, fileURLToPath(new URL(path, import.meta.url))]),
      ),
    },
  },
  plugins: [
    {
      name: 'tool-ssg',
      transformIndexHtml: { order: 'pre', handler: (_html, ctx) => renderPage(ctx.filename) },
    },
    {
      name: 'development-connections',
      apply: 'serve',
      transformIndexHtml: (html) => html.replace("connect-src 'none'", "connect-src 'self' ws:"),
    },
  ],
  run: {
    tasks: {
      dev: { command: 'vp dev', cache: false },
      build: { command: 'vp build', dependsOn: [{ task: 'build', from: 'dependencies' }] },
    },
  },
});
