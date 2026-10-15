import { defineConfig } from 'vite-plus';

export default defineConfig({
  lint: {
    plugins: ['typescript', 'vitest'],
    ignorePatterns: ['backlog/**', 'research/**', '.agents/**', '.codex/**', '.toolchain/**'],
    options: { typeAware: true, typeCheck: true },
    rules: { 'vitest/no-disabled-tests': 'error', 'vitest/no-focused-tests': 'error' },
  },
  fmt: {
    singleQuote: true,
    semi: true,
    ignorePatterns: ['backlog/**', 'research/**', '.agents/**', '.codex/**', '.toolchain/**'],
  },
  test: {
    include: ['packages/*/src/**/*.test.ts', 'tests/**/*.test.ts'],
    passWithNoTests: false,
  },
  run: {
    tasks: {
      'deploy-cloudflare': {
        command: 'wrangler pages deploy --project-name sid-tools-web',
        dependsOn: ['@sid-tools/web#build'],
        cache: false,
      },
      develop: {
        command: "vp run --filter './apps/*' --filter './packages/*' --parallel dev",
        dependsOn: ['@sid-tools/core#build'],
        cache: false,
      },
      'check-all': { command: 'vp check', dependsOn: ['@sid-tools/core#build'] },
      'test-all': {
        command: ['vp test run', 'playwright test'],
        dependsOn: ['@sid-tools/web#build'],
        cache: false,
      },
      'verify-all': {
        command: 'pnpm audit --prod --audit-level high',
        dependsOn: ['check-all', 'test-all'],
        cache: false,
      },
    },
  },
});
