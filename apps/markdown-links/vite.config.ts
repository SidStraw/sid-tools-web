import { defineConfig } from 'vite-plus';

export default defineConfig({
  run: {
    tasks: {
      build: { command: 'vp pack', dependsOn: ['@sid-tools/core#build'] },
    },
  },
  pack: {
    entry: ['src/cli.ts', 'src/scan-worker.ts'],
    format: ['esm'],
    platform: 'node',
    deps: { neverBundle: ['@sid-tools/core/markdown-links', 'ignore'] },
    dts: false,
    clean: true,
  },
});
