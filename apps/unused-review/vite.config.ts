import { defineConfig } from 'vite-plus';
export default defineConfig({
  run: { tasks: { build: { command: 'vp pack', dependsOn: ['@sid-tools/core#build'] } } },
  pack: {
    entry: ['src/cli.ts', 'src/context-reporter.ts'],
    format: ['esm'],
    platform: 'node',
    deps: { neverBundle: ['@sid-tools/core/unused-review', 'knip'] },
    dts: false,
    clean: true,
  },
});
