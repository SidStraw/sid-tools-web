import { test, expect } from 'vite-plus/test';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  parsePropsReport,
  parsePropsDocument,
  proposePropsDocument,
  reviewProps,
} from '@sid-tools/core/component-docs';
import { scanProps, runProps, storybookPropFixture } from './helpers/component-fixture';
test('pinned real Storybook components preserve props, parameter defaults and actual definition locations without executing imports', () => {
  const meta = JSON.parse(readFileSync(storybookPropFixture('source.json'), 'utf8')) as {
    files: { local: string; sha256: string }[];
  };
  for (const file of meta.files)
    expect(
      createHash('sha256')
        .update(readFileSync(storybookPropFixture(file.local)))
        .digest('hex'),
    ).toBe(file.sha256);
  const source = readFileSync(storybookPropFixture('Button.tsx.txt'), 'utf8'),
    r = scanProps(storybookPropFixture('Button.tsx.txt'));
  expect(r.engine).toEqual({ name: '@babel/parser', version: '8.0.7' });
  expect(r.complete).toBe(true);
  expect(r.props.map((p) => p.name)).toEqual([
    'primary',
    'backgroundColor',
    'size',
    'label',
    'onClick',
  ]);
  expect(r.props.find((p) => p.name === 'primary')?.default).toEqual({
    state: 'known',
    value: false,
  });
  expect(r.props.find((p) => p.name === 'size')?.default).toEqual({
    state: 'known',
    value: 'medium',
  });
  expect(r.props.find((p) => p.name === 'label')?.required).toBe(true);
  for (const span of r.props
    .flatMap((p) => [p.definition, p.defaultSource])
    .filter((s) => s !== null)) {
    expect(source.slice(span.start, span.end)).toBe(span.text);
    const before = source.slice(0, span.start).split('\n');
    expect(span.line).toBe(before.length);
    expect(span.column).toBe(before.at(-1)!.length + 1);
  }
  const header = scanProps(storybookPropFixture('Header.tsx.txt'), 'Header');
  expect(header.props).toHaveLength(4);
  expect(header.props[0]).toMatchObject({ name: 'user', type: 'User', check: { kind: 'unknown' } });
  const wrapped = scanProps(storybookPropFixture('WrappedButton.tsx.txt'));
  expect(wrapped.complete).toBe(false);
  expect(wrapped.props).toEqual([]);
  expect(() => proposePropsDocument(wrapped)).toThrow(/不完整/);
  expect(readFileSync(storybookPropFixture('Button.tsx.txt'), 'utf8')).toBe(source);
});
test('dynamic defaults and top-level side effects remain inert; unsupported members never become confirmed removals', () => {
  const dir = mkdtempSync(join(tmpdir(), 'props-inert-'));
  try {
    const marker = join(dir, 'executed'),
      file = join(dir, 'Danger.tsx');
    const source = `import {writeFileSync} from 'node:fs';\nwriteFileSync(${JSON.stringify(marker)},'executed');\ninterface Props extends External { label:string; flag?:boolean; action?():void; }\nexport function Danger({label,flag=(()=>{writeFileSync(${JSON.stringify(marker)},'default');return true;})()}:Props){return <div>{label}</div>}`;
    writeFileSync(file, source);
    const r = scanProps(file, 'Danger');
    expect(existsSync(marker)).toBe(false);
    expect(readFileSync(file, 'utf8')).toBe(source);
    expect(r.complete).toBe(false);
    expect(r.props.find((p) => p.name === 'flag')?.default).toEqual({ state: 'unknown' });
    expect(r.issues.join(' ')).toContain('繼承');
    const base = proposePropsDocument(scanProps(storybookPropFixture('Button.tsx.txt')));
    base.component = 'Danger';
    const review = reviewProps(r, base);
    expect(review.rows.some((x) => x.status === 'removed')).toBe(false);
    expect(review.rows.some((x) => x.name === 'primary' && x.status === 'unverified')).toBe(true);
    writeFileSync(
      file,
      "interface Props { n?:number; x?:string; } export const Danger=({n=-2,x=String('dynamic')}:Props)=><div/>;",
    );
    const scalar = scanProps(file, 'Danger');
    expect(scalar.props[0]?.default).toEqual({ state: 'known', value: -2 });
    expect(scalar.props[1]?.default).toEqual({ state: 'unknown' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test('document drift and example checks are reviewable; proposed docs preserve human text and never overwrite input', () => {
  const r = scanProps(storybookPropFixture('Button.tsx.txt')),
    doc = proposePropsDocument(r);
  doc.props = doc.props.filter((p) => p.name !== 'primary');
  doc.props.push({
    name: 'retired',
    type: 'number',
    required: false,
    default: { state: 'none' },
    description: 'Historical prop',
  });
  doc.props.find((p) => p.name === 'size')!.default = { state: 'known', value: 'large' };
  doc.props.find((p) => p.name === 'label')!.description = '保留人工說明';
  doc.examples = [
    { name: 'valid', values: { label: 'Save', size: 'medium' } },
    { name: 'invalid', values: { size: 'huge', retired: 1 } },
    { name: 'callback', values: { label: 'Save', onClick: 'handler' } },
  ];
  const review = reviewProps(r, doc);
  expect(review.rows.find((p) => p.name === 'primary')?.status).toBe('added');
  expect(review.rows.find((p) => p.name === 'retired')?.status).toBe('removed');
  expect(review.rows.find((p) => p.name === 'size')?.fields).toEqual(['default']);
  expect(review.examples.filter((e) => e.example === 'valid')).toEqual([]);
  expect(review.examples.filter((e) => e.example === 'invalid')).toHaveLength(3);
  expect(review.examples.find((e) => e.example === 'callback')?.state).toBe('unknown');
  const proposed = proposePropsDocument(r, doc);
  expect(proposed.props.find((p) => p.name === 'label')?.description).toBe('保留人工說明');
  expect(proposed.examples).toEqual(doc.examples);
  expect(proposed.props.some((p) => p.name === 'retired')).toBe(false);
  const dir = mkdtempSync(join(tmpdir(), 'props-docs-'));
  try {
    const report = join(dir, 'report.json'),
      document = join(dir, 'document.json');
    writeFileSync(report, JSON.stringify(r));
    const original = JSON.stringify(doc);
    writeFileSync(document, original);
    expect(runProps(['review', report, '--document', document]).status).toBe(2);
    const result = runProps(['document', report, '--document', document]);
    expect(result.status).toBe(0);
    expect(parsePropsDocument(result.stdout)).toEqual(proposed);
    expect(readFileSync(document, 'utf8')).toBe(original);
    writeFileSync(document, JSON.stringify(proposePropsDocument(r)));
    expect(runProps(['review', report, '--document', document]).status).toBe(0);
    doc.scope = 'different';
    writeFileSync(document, JSON.stringify(doc));
    expect(runProps(['review', report, '--document', document]).status).toBe(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test('malformed evidence, duplicate members, limits and invalid syntax fail without echoing source or implying a match', () => {
  const r = scanProps(storybookPropFixture('Button.tsx.txt'));
  const invalid = structuredClone(r);
  invalid.props[0]!.definition.end = 999999;
  expect(() => parsePropsReport(JSON.stringify(invalid))).toThrow(/來源位置/);
  const doc = proposePropsDocument(r);
  doc.props.push(doc.props[0]!);
  expect(() => parsePropsDocument(JSON.stringify(doc))).toThrow(/重複/);
  expect(() => parsePropsReport(' '.repeat(2_000_001))).toThrow(/2 MB/);
  const overloaded = proposePropsDocument(r);
  overloaded.examples = Array.from({ length: 100 }, (_, i) => ({
    name: `example-${i}`,
    values: Object.fromEntries(Array.from({ length: 100 }, (_, j) => [`unknown-${j}`, 0])),
  }));
  expect(() => reviewProps(r, parsePropsDocument(JSON.stringify(overloaded)))).toThrow(/10000/);
  const dir = mkdtempSync(join(tmpdir(), 'props-invalid-'));
  try {
    const file = join(dir, 'Secret.tsx');
    writeFileSync(file, 'export const Secret = ( SECRET_PRIVATE_INPUT');
    const result = runProps(['scan', file, '--component', 'Secret', '--scope', 'test']);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).not.toContain('SECRET_PRIVATE_INPUT');
    writeFileSync(file, ' '.repeat(256_001));
    expect(runProps(['scan', file, '--component', 'Secret', '--scope', 'test']).status).toBe(1);
    expect(
      runProps(['scan', file, '--component', 'Secret', '--scope', 'test', '--fix']).status,
    ).toBe(1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test('JSON-unsafe numbers, ambiguous destructuring and reassignable exports do not become invented defaults', () => {
  const dir = mkdtempSync(join(tmpdir(), 'props-edge-'));
  try {
    const file = join(dir, 'Button.tsx');
    writeFileSync(
      file,
      'interface Props { n?:number; zero?:number; word?:string; } export const Button=({n=1e999,zero=-0,word=`static`}:Props)=><div/>;',
    );
    const r = scanProps(file);
    expect(r.props.map((p) => p.default)).toEqual([
      { state: 'unknown' },
      { state: 'unknown' },
      { state: 'known', value: 'static' },
    ]);
    writeFileSync(
      file,
      "interface Props { label?:string; } export const Button=({label:a='a',label:b='b'}:Props)=><div/>;",
    );
    const duplicate = scanProps(file);
    expect(duplicate.complete).toBe(false);
    expect(duplicate.props[0]?.default).toEqual({ state: 'unknown' });
    writeFileSync(
      file,
      "interface Props { label?:string; } export const Button=({[getKey()]:a='a'}:Props)=><div/>;",
    );
    const computed = scanProps(file);
    expect(computed.complete).toBe(false);
    expect(computed.props[0]?.default).toEqual({ state: 'unknown' });
    writeFileSync(
      file,
      'interface Props { label:string; } export let Button=(props:Props)=><div/>;',
    );
    expect(scanProps(file).complete).toBe(false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
