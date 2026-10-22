import { defineConfig } from 'vite-plus';
export default defineConfig({
  run: { tasks: { build: { command: 'vp pack', dependsOn: ['@sid-tools/core#build'] } } },
  pack: {
    deps: { neverBundle: ['vite-plus', '@sid-tools/core/bundle-diff'] },
    entry: ['src/index.ts'],
    format: ['esm'],
    platform: 'node',
    dts: true,
    clean: true,
  },
});
