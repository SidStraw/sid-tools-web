import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, realpath, stat } from 'node:fs/promises';
import { resolve, relative, dirname, isAbsolute, sep } from 'node:path';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { version as viteVersion, type Plugin, type ResolvedConfig } from 'vite-plus';
import {
  parseBundleReport,
  type BundleReport,
  type BundleAsset,
} from '@sid-tools/core/bundle-diff';
const hash = (text: string | Uint8Array) => createHash('sha256').update(text).digest('hex');
function fingerprint(value: unknown) {
  const seen = new WeakSet<object>();
  return hash(
    JSON.stringify(value, (_key, item: unknown) => {
      if (typeof item === 'function') return String(item);
      if (item instanceof RegExp) return String(item);
      if (item !== null && typeof item === 'object') {
        if (seen.has(item)) return '[circular]';
        seen.add(item);
      }
      return item;
    }),
  );
}
const inside = (root: string, file: string) => {
  const rel = relative(root, file);
  return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`));
};
export function bundleReport(options: {
  file: string;
  sourceRoot?: string;
  profile: string;
}): Plugin {
  let config: ResolvedConfig, outDir: string, sourceRoot: string, destination: string;
  let report: BundleReport | undefined;
  function moduleId(id: string) {
    const queryAt = id.indexOf('?');
    const clean = (queryAt < 0 ? id : id.slice(0, queryAt)).replaceAll('\\', '/');
    const query = queryAt < 0 ? '' : `?variant=${hash(id.slice(queryAt)).slice(0, 12)}`;
    if (clean.includes('\0')) return { id: `virtual:${hash(id).slice(0, 20)}`, package: null };
    const marker = '/node_modules/',
      at = clean.lastIndexOf(marker);
    if (at >= 0) {
      const part = clean.slice(at + marker.length);
      const name = part.startsWith('@')
        ? part.split('/').slice(0, 2).join('/')
        : part.split('/')[0]!;
      return { id: `npm:${part}${query}`, package: name };
    }
    if (isAbsolute(clean) && inside(sourceRoot, clean))
      return {
        id: `project:${relative(sourceRoot, clean).replaceAll('\\', '/')}${query}`,
        package: null,
      };
    return { id: `external:${hash(id).slice(0, 20)}`, package: null };
  }
  return {
    name: 'sid-tools-bundle-report',
    apply: 'build',
    enforce: 'post',
    configResolved(resolved) {
      config = resolved;
      outDir = resolve(config.root, config.build.outDir);
      sourceRoot = resolve(options.sourceRoot ?? config.root);
      destination = resolve(options.file);
      if (inside(outDir, destination)) throw new Error('Bundle report 必須寫到公開 outDir 以外。');
    },
    writeBundle: {
      order: 'post',
      sequential: true,
      async handler(output, bundle) {
        const outputDirectory = output.dir ? resolve(output.dir) : outDir;
        if (outputDirectory !== outDir) throw new Error('首版不支援多個輸出目錄。');
        const root = await realpath(outDir);
        const settings = {
          build: config.build,
          resolve: config.resolve,
          css: config.css,
          env: config.env,
          mode: config.mode,
          target: config.build.target,
          minify: config.build.minify,
          sourcemap: config.build.sourcemap,
          base: config.base,
          cssTarget: config.build.cssTarget,
          cssMinify: config.build.cssMinify,
          define: config.define,
          plugins: config.plugins.map((p) => p.name),
        };
        const configHashes: string[] = [];
        let configComplete = true;
        for (const file of [...new Set(config.configFileDependencies ?? [])].sort()) {
          try {
            configHashes.push(hash(await readFile(file)));
          } catch {
            configComplete = false;
          }
        }
        if (!configHashes.length) configComplete = false;
        report = {
          format: 'sid-tools-bundle-v1',
          environment: {
            node: process.version,
            platform: process.platform,
            arch: process.arch,
            bundler: `rolldown@${this.meta.rolldownVersion}`,
            vite: viteVersion,
            mode: config.mode,
            target: JSON.stringify(config.build.target),
            minify: JSON.stringify(config.build.minify),
            sourcemap: JSON.stringify(config.build.sourcemap),
            configHash: configComplete ? fingerprint({ settings, configHashes }) : null,
            compression: 'gzip-level-9;brotli-quality-11',
            profile: options.profile,
          },
          coverage: 'vite-emitted-bundle-only-v1',
          assets: [],
          warnings: [
            '僅量測 Vite emitted bundle；public 複製檔案不在範圍內。Worker 或其他僅以 asset 呈現的產物保留總大小，沒有 module 歸因。',
            '只輸出相對 module 路徑、套件名與摘要，不含 source code 或環境變數值。分享前仍須檢查。',
          ],
        };
        const configuredInput = config.build.rollupOptions.input;
        const inputPaths =
          typeof configuredInput === 'string'
            ? [configuredInput]
            : Array.isArray(configuredInput)
              ? configuredInput
              : configuredInput
                ? Object.values(configuredInput)
                : config.build.lib
                  ? []
                  : ['index.html'];
        const htmlEntries = new Set(
          inputPaths
            .filter((path) => path.endsWith('.html'))
            .map((path) => relative(config.root, resolve(config.root, path)).replaceAll('\\', '/')),
        );
        let total = 0;
        for (const [file, entry] of Object.entries(bundle).sort(([a], [b]) => a.localeCompare(b))) {
          const path = await realpath(resolve(outDir, file));
          if (!inside(root, path)) throw new Error('產物路徑超出輸出目錄。');
          const info = await stat(path);
          total += info.size;
          if (!info.isFile() || info.size > 50_000_000 || total > 200_000_000)
            throw new Error('報告量測超過單檔 50 MB 或總計 200 MB 限制。');
          const data = await readFile(path);
          const chunk = entry.type === 'chunk';
          const identity = chunk
            ? entry.facadeModuleId
              ? `module:${moduleId(entry.facadeModuleId).id}`
              : `shared:${entry.name}`
            : `asset:${entry.names.length ? entry.names.join('|') : file}`;
          const asset: BundleAsset = {
            file,
            identity,
            kind: entry.type,
            entry: chunk ? entry.isEntry : htmlEntries.has(file),
            dynamicEntry: chunk && entry.isDynamicEntry,
            bytes: {
              raw: data.length,
              gzip: gzipSync(data, { level: 9 }).length,
              brotli: brotliCompressSync(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } })
                .length,
            },
            sha256: hash(data),
            imports: chunk ? entry.imports : [],
            dynamicImports: chunk ? entry.dynamicImports : [],
            modules: chunk
              ? Object.entries(entry.modules).map(([id, mod]) => ({
                  ...moduleId(id),
                  renderedLength:
                    Number.isSafeInteger(mod.renderedLength) && mod.renderedLength >= 0
                      ? mod.renderedLength
                      : null,
                }))
              : [],
          };
          report.assets.push(asset);
        }
        const serialized = JSON.stringify(report, null, 2);
        parseBundleReport(serialized);
        await mkdir(dirname(destination), { recursive: true });
        if (inside(root, await realpath(dirname(destination))))
          throw new Error('Bundle report 必須寫到公開 outDir 以外。');
        // Reports are explicit local artifacts, never emitted into the deployment bundle.
        await writeFile(destination, `${serialized}\n`, { flag: 'wx', mode: 0o600 });
      },
    },
  };
}
