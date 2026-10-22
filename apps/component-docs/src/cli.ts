import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { parseArgs } from 'node:util';
import { analyzeProps } from './analyze';
import {
  parsePropsReport,
  parsePropsDocument,
  proposePropsDocument,
  reviewProps,
  PROPS_LIMIT,
} from '@sid-tools/core/component-docs';
function read(file: string, limit: number) {
  if (!statSync(file).isFile() || statSync(file).size > limit)
    throw new Error('檔案類型或大小不符。');
  return readFileSync(file, 'utf8');
}
try {
  const { values, positionals } = parseArgs({
    options: {
      component: { type: 'string' },
      scope: { type: 'string' },
      document: { type: 'string' },
      help: { type: 'boolean' },
    },
    allowPositionals: true,
    strict: true,
  });
  if (values.help) {
    console.log(
      'component-docs scan FILE --component Button --scope PROJECT\ncomponent-docs document REPORT [--document OLD_DOCUMENT]\ncomponent-docs review REPORT --document DOCUMENT\nReact TSX static subset; reads source only, never executes imports or Babel config. JSON output contains source snippets and defaults. No file writes or automatic apply. Exit: 0 complete/no differences, 2 review required/incomplete, 1 invalid input.',
    );
  } else {
    const [command, file] = positionals;
    if (positionals.length !== 2 || !file) throw new Error('參數錯誤。');
    if (command === 'scan') {
      if (!values.component || !values.scope || values.document)
        throw new Error('scan 需要 component 與 scope。');
      const result = analyzeProps(
        read(file, 256_000),
        basename(file),
        values.component,
        values.scope,
      );
      console.log(JSON.stringify(result, null, 2));
      if (!result.complete) process.exitCode = 2;
    } else if (command === 'document' || command === 'review') {
      if (values.scope || values.component) throw new Error('此指令不接受 scope／component。');
      const report = parsePropsReport(read(file, PROPS_LIMIT)),
        doc = values.document ? parsePropsDocument(read(values.document, PROPS_LIMIT)) : null;
      if (command === 'document')
        console.log(JSON.stringify(proposePropsDocument(report, doc), null, 2));
      else {
        if (!doc) throw new Error('review 需要文件。');
        const result = reviewProps(report, doc);
        console.log(JSON.stringify(result, null, 2));
        if (
          !result.complete ||
          result.rows.some((r) => r.status !== 'same') ||
          result.examples.length
        )
          process.exitCode = 2;
      }
    } else throw new Error('未知指令。');
  }
} catch {
  console.error('輸入、來源語法、格式或參數無效；未修改檔案。使用 --help 查看範圍。');
  process.exitCode = 1;
}
