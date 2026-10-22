import type { ReporterOptions } from 'knip';
import { isAbsolute, relative } from 'node:path';
export default function reporter(data: ReporterOptions) {
  const rel = (path: string) =>
    (isAbsolute(path) ? relative(data.cwd, path) : path).replaceAll('\\', '/') || '.';
  process.stdout.write(
    JSON.stringify({
      kind: 'sid-tools-knip-context-v1',
      failed: data.hasConfigLoadErrors,
      workspaces: data.includedWorkspaceDirs.map(rel).sort(),
      plugins: Object.fromEntries(
        Object.entries(data.enabledPlugins).map(([key, plugins]) => [
          rel(key),
          [...plugins].sort(),
        ]),
      ),
      hints: data.configurationHints.map((h) => ({
        type: h.type,
        file: h.filePath ? rel(h.filePath) : null,
      })),
    }) + '\n',
  );
}
