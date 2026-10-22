import { defineConfig } from 'vite-plus';
export default defineConfig({
  run: { tasks: { build: { command: 'vp pack', dependsOn: ['@sid-tools/core#build'] } } },
  pack: {
    entry: ['src/cli.ts'],
    format: ['esm'],
    platform: 'node',
    deps: {
      neverBundle: ['@sid-tools/core/mock-runtime', 'find-my-way'],
    },
    dts: false,
    clean: true,
  },
});
