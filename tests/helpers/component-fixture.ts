import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { parsePropsReport } from '@sid-tools/core/component-docs';
export function runProps(args: string[]) {
  return spawnSync(process.execPath, [resolve('apps/component-docs/dist/cli.mjs'), ...args], {
    encoding: 'utf8',
    timeout: 15_000,
    maxBuffer: 4_000_000,
  });
}
export function scanProps(file: string, component = 'Button') {
  const result = runProps(['scan', file, '--component', component, '--scope', 'storybook']);
  if (result.error || ![0, 2].includes(result.status ?? -1))
    throw new Error(`Props scan failed: ${result.stderr}`);
  return parsePropsReport(result.stdout);
}
export const storybookPropFixture = (name: string) =>
  resolve('tests/fixtures/component-docs/storybook', name);
