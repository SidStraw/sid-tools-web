import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseUnusedReport } from '@sid-tools/core/unused-review';
export const unusedCli = resolve('apps/unused-review/dist/cli.mjs');
export const runUnused = (args: string[]) =>
  spawnSync(process.execPath, [unusedCli, ...args], { encoding: 'utf8', timeout: 95_000 });
export function unusedFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'stw-unused-')),
    root = join(dir, 'repo');
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({
      name: 'unused-fixture',
      private: true,
      type: 'module',
      dependencies: { 'not-needed': '1.0.0' },
    }),
  );
  writeFileSync(
    join(root, 'knip.json'),
    JSON.stringify({ entry: ['src/index.ts'], project: ['src/**/*.ts'] }),
  );
  writeFileSync(
    join(root, 'src/index.ts'),
    "import { used } from './used.js'; console.log(used); void import('./dynamic.js'); export const publicApi = 42;\n",
  );
  writeFileSync(
    join(root, 'src/used.ts'),
    "export const used = 1;\nexport const unusedExport = 'unused';\n",
  );
  writeFileSync(join(root, 'src/dynamic.ts'), "console.log('loaded dynamically');\n");
  writeFileSync(join(root, 'src/unused.ts'), "console.log('not referenced');\n");
  writeFileSync(join(root, 'src/runtime.ts'), "console.log('implicit entry');\n");
  const scan = () => {
    const result = runUnused(['scan', root, '--config', 'knip.json', '--scope', 'unused-fixture']);
    if (result.status !== 0) throw new Error(`Fixture scan failed: ${result.stderr}`);
    return parseUnusedReport(result.stdout);
  };
  return { dir, root, scan, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}
