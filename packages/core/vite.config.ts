import { defineConfig } from 'vite-plus';

export default defineConfig({
  run: { tasks: { dev: { command: 'vp pack --watch --no-clean', cache: false } } },
  pack: {
    entry: [
      'src/index.ts',
      'src/images.ts',
      'src/lighthouse.ts',
      'src/json-diff.ts',
      'src/cron.ts',
      'src/semver.ts',
      'src/env-check.ts',
      'src/git-diff.ts',
      'src/sitemap.ts',
      'src/explain.ts',
      'src/palette.ts',
    ],
    format: ['esm'],
    dts: true,
    clean: true,
  },
  test: { include: ['src/**/*.test.ts'], passWithNoTests: false },
});
