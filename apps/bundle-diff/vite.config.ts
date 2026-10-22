import { defineConfig } from 'vite-plus';
export default defineConfig({
  run: { tasks: { build: { command: 'vp pack', dependsOn: ['@sid-tools/core#build'] } } },
  pack: {
    entry: ['src/cli.ts'],
    format: ['esm'],
    platform: 'node',
    deps: { neverBundle: ['@sid-tools/core/bundle-diff'] },
    dts: false,
    clean: true,
  },
});
