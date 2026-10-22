import { startLsp } from './lsp.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
const root = process.cwd(),
  dir = resolve('research/ts-type-explorer-2026-10-23');
const cases = JSON.parse(readFileSync(resolve(dir, 'cases.json'), 'utf8'));
const l = await startLsp(root),
  results = [];
try {
  for (const c of cases.filter((c) => c.kind !== 'negative-control')) {
    const file = realpathSync(resolve(c.file)),
      text = readFileSync(file, 'utf8'),
      uri = pathToFileURL(file).href,
      pos = text.indexOf(`type ${c.name} `) + 5,
      lines = text.slice(0, pos).split('\n');
    l.notify('textDocument/didOpen', {
      textDocument: { uri, languageId: 'typescript', version: 1, text },
    });
    const hovers = [];
    for (const verbosityLevel of [0, 2]) {
      const times = [];
      let response;
      for (let i = 0; i < 6; i++) {
        const t = performance.now();
        response = await l.request('textDocument/hover', {
          textDocument: { uri },
          position: { line: lines.length - 1, character: lines.at(-1).length },
          verbosityLevel,
        });
        times.push(performance.now() - t);
      }
      hovers.push({
        verbosityLevel,
        response,
        firstMs: times[0],
        warmMs: times.slice(1),
        warmMedianMs: [...times.slice(1)].sort((a, b) => a - b)[2],
      });
    }
    results.push({ id: c.id, hovers });
    l.notify('textDocument/didClose', { textDocument: { uri } });
  }
} finally {
  await l.close();
}
writeFileSync(
  resolve(dir, 'native-hover-results.json'),
  JSON.stringify(
    {
      version: '7.0.2',
      protocol: 'textDocument/hover; experimental.hoverVerbosityLevel=true; verbosityLevel=0/2',
      context:
        'Language server chooses configured/inferred project at original source path. Unlike compiler-results.json, this run does not force the research tsconfig; do not attribute all differences to version or rendering.',
      initialization: l.initialization,
      results,
    },
    null,
    2,
  ) + '\n',
);
console.log(`Captured ${results.length} real source hovers`);
