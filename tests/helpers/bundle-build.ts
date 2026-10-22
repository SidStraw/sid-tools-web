import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite-plus';
import { bundleReport } from '@sid-tools/bundle-report';
import { parseBundleReport } from '@sid-tools/core/bundle-diff';
export async function buildBundlePair() {
  const dir = await mkdtemp(join(tmpdir(), 'stw-bundle-'));
  const root = join(dir, 'fixture');
  await mkdir(root);
  const configFile = join(root, 'vite.config.mjs');
  await writeFile(configFile, "export default { build: { target: 'es2022', minify: false } };");
  await writeFile(join(root, 'index.html'), '<script type="module" src="/main.js"></script>');
  await mkdir(join(root, 'node_modules/sample-package'), { recursive: true });
  await writeFile(
    join(root, 'node_modules/sample-package/package.json'),
    JSON.stringify({
      name: 'sample-package',
      version: '1.0.0',
      type: 'module',
      exports: './index.js',
    }),
  );
  await writeFile(
    join(root, 'node_modules/sample-package/index.js'),
    "export const label = 'package contribution';",
  );
  const source = (extra: string) =>
    `import { label } from 'sample-package'; document.body.textContent = label + ${JSON.stringify(extra)}; import('./lazy.js');`;
  await writeFile(join(root, 'lazy.js'), "console.log('dynamic entry');");
  const run = async (name: string) => {
    const file = join(dir, name + '.json');
    await build({
      root,
      configFile,
      logLevel: 'silent',
      plugins: [bundleReport({ file, profile: 'fixture' })],
    });
    return parseBundleReport(await readFile(file, 'utf8'));
  };
  try {
    await writeFile(join(root, 'main.js'), source('base'));
    const before = await run('base');
    await writeFile(
      join(root, 'main.js'),
      source('candidate with a meaningful extra string and 中文'),
    );
    const after = await run('candidate');
    return {
      run,
      configFile,
      dir,
      root,
      before,
      after,
      cleanup: () => rm(dir, { recursive: true, force: true }),
    };
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
}
