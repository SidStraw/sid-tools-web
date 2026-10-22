import { parse } from '@babel/parser';
import { createRequire } from 'node:module';
const parserMetadata = createRequire(import.meta.url)('@babel/parser/package.json') as {
  version: string;
};
if (parserMetadata.version !== '8.0.7') throw new Error('Expected @babel/parser 8.0.7');
import type {
  Node,
  TSType,
  TSTypeElement,
  ObjectPattern,
  Expression,
  PatternLike,
} from '@babel/types';
import { createHash } from 'node:crypto';
import {
  parsePropsReport,
  type PropsReport,
  type PropSpan,
  type PropScalar,
  type PropCheck,
  type PropDefault,
} from '@sid-tools/core/component-docs';

export function analyzeProps(
  source: string,
  file: string,
  component: string,
  scope: string,
): PropsReport {
  if (Buffer.byteLength(source) > 256_000 || source.length > 256_000)
    throw new Error('來源超過 256 KB。');
  if (!/^[A-Z][\w$]*$/.test(component)) throw new Error('請指定具名匯出的 React 元件名稱。');
  const ast = parse(source, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
    errorRecovery: false,
  });
  const report: PropsReport = {
    format: 'sid-tools-props-report-v1',
    scope,
    component,
    engine: { name: '@babel/parser', version: '8.0.7' },
    source: {
      file,
      sha256: createHash('sha256').update(source).digest('hex'),
      length: source.length,
    },
    complete: true,
    issues: [],
    props: [],
  };
  function incomplete(message: string) {
    report.complete = false;
    report.issues.push(message);
  }
  function span(n: Node): PropSpan {
    if (n.start == null || n.end == null || !n.loc) throw new Error('Parser 未回傳來源位置。');
    return {
      start: n.start,
      end: n.end,
      line: n.loc.start.line,
      column: n.loc.start.column + 1,
      text: source.slice(n.start, n.end),
    };
  }
  const literal = (n: Node): { known: true; value: PropScalar } | { known: false } => {
    if (n.type === 'StringLiteral' || n.type === 'BooleanLiteral')
      return { known: true, value: n.value };
    if (n.type === 'NumericLiteral' && Number.isFinite(n.value))
      return { known: true, value: n.value };
    if (
      n.type === 'TemplateLiteral' &&
      n.expressions.length === 0 &&
      typeof n.quasis[0]?.value.cooked === 'string'
    )
      return { known: true, value: n.quasis[0].value.cooked };
    if (n.type === 'NullLiteral') return { known: true, value: null };
    if (
      n.type === 'UnaryExpression' &&
      n.operator === '-' &&
      n.argument.type === 'NumericLiteral' &&
      Number.isFinite(n.argument.value) &&
      n.argument.value !== 0
    )
      return { known: true, value: -n.argument.value };
    return { known: false };
  };
  function typeCheck(n: TSType | null | undefined): PropCheck {
    if (!n) return { kind: 'unknown' };
    if (n.type === 'TSStringKeyword') return { kind: 'string' };
    if (n.type === 'TSNumberKeyword') return { kind: 'number' };
    if (n.type === 'TSBooleanKeyword') return { kind: 'boolean' };
    if (n.type === 'TSNullKeyword') return { kind: 'null' };
    const types = n.type === 'TSUnionType' ? n.types : [n];
    const values: PropScalar[] = [];
    for (const t of types) {
      if (t.type !== 'TSLiteralType') return { kind: 'unknown' };
      const v = literal(t.literal);
      if (!v.known) return { kind: 'unknown' };
      values.push(v.value);
    }
    return values.length <= 32 ? { kind: 'literal', values } : { kind: 'unknown' };
  }
  const declarations = ast.program.body.flatMap((n) =>
    n.type === 'ExportNamedDeclaration' && n.declaration ? [n.declaration] : [n],
  );
  const direct = ast.program.body.flatMap((n) =>
    n.type === 'ExportNamedDeclaration' && n.declaration ? [n.declaration] : [],
  );
  const declaration = direct.find(
    (n) =>
      (n.type === 'FunctionDeclaration' && n.id?.name === component) ||
      (n.type === 'VariableDeclaration' &&
        n.declarations.some((d) => d.id.type === 'Identifier' && d.id.name === component)),
  );
  const fn =
    declaration?.type === 'FunctionDeclaration'
      ? declaration
      : declaration?.type === 'VariableDeclaration'
        ? declaration.declarations.find(
            (d) => d.id.type === 'Identifier' && d.id.name === component,
          )?.init
        : null;
  if (
    !fn ||
    (fn.type !== 'FunctionDeclaration' &&
      fn.type !== 'FunctionExpression' &&
      fn.type !== 'ArrowFunctionExpression')
  )
    incomplete(
      '找不到直接具名匯出的 function／arrow 元件；wrapper、export list 與 default export 未支援。',
    );
  else {
    if (declaration?.type === 'VariableDeclaration' && declaration.kind !== 'const')
      incomplete('可重新指派的元件宣告未支援；不推論後續執行結果。');
    if (fn.typeParameters) incomplete('泛型元件未解析型別參數，結果不完整。');
    let parameter: PatternLike | undefined = fn.params[0];
    if (parameter?.type === 'AssignmentPattern') parameter = parameter.left;
    let members: TSTypeElement[] = [];
    const annotation =
      parameter &&
      'typeAnnotation' in parameter &&
      parameter.typeAnnotation?.type === 'TSTypeAnnotation'
        ? parameter.typeAnnotation.typeAnnotation
        : undefined;
    if (!parameter && fn.params.length === 0) {
      /* A zero-argument function has no declared Props. */
    } else if (!annotation) incomplete('第一個參數缺少支援的 Props 型別宣告。');
    else if (annotation.type === 'TSTypeLiteral') members = annotation.members;
    else if (
      annotation.type === 'TSTypeReference' &&
      annotation.typeName.type === 'Identifier' &&
      !annotation.typeArguments
    ) {
      const typeName = annotation.typeName.name;
      const matches = declarations.filter(
        (n) =>
          (n.type === 'TSInterfaceDeclaration' || n.type === 'TSTypeAliasDeclaration') &&
          n.id.name === typeName,
      );
      const definition = matches[0];
      if (matches.length !== 1)
        incomplete('Props 型別不是唯一的同檔宣告；外部匯入與宣告合併未解析。');
      else if (definition?.type === 'TSInterfaceDeclaration') {
        members = definition.body.body;
        if (definition.extends?.length || definition.typeParameters)
          incomplete('Props interface 的繼承或泛型部分未解析。');
      } else if (
        definition?.type === 'TSTypeAliasDeclaration' &&
        definition.typeAnnotation.type === 'TSTypeLiteral' &&
        !definition.typeParameters
      )
        members = definition.typeAnnotation.members;
      else
        incomplete(
          'Props type alias 僅支援直接 object literal；intersection、union、泛型與引用未解析。',
        );
    } else incomplete('Props 型別超過本版語法範圍。');
    const defaults = new Map<string, Expression>(),
      duplicateDefaults = new Set<string>();
    let computedDefault: Node | undefined;
    if (parameter?.type === 'ObjectPattern')
      for (const p of (parameter as ObjectPattern).properties) {
        if (p.type !== 'ObjectProperty') continue;
        if (p.computed) {
          incomplete('computed 解構鍵無法靜態對應 Props；參數預設資訊不完整。');
          computedDefault = p;
          continue;
        }
        const key =
          p.key.type === 'Identifier'
            ? p.key.name
            : p.key.type === 'StringLiteral'
              ? p.key.value
              : null;
        if (key && p.value.type === 'AssignmentPattern') {
          if (defaults.has(key)) {
            duplicateDefaults.add(key);
            incomplete('同一 Prop 有多個解構預設，無法用單一預設值表示。');
          }
          defaults.set(key, p.value.right);
        }
      }
    const seen = new Set<string>();
    for (const m of members) {
      if (m.type !== 'TSPropertySignature' || m.computed) {
        incomplete('包含未支援的 method／index signature／computed Prop；不視為完整清單。');
        continue;
      }
      const key =
        m.key.type === 'Identifier'
          ? m.key.name
          : m.key.type === 'StringLiteral'
            ? m.key.value
            : null;
      if (!key) {
        incomplete('無法確認 Prop 名稱。');
        continue;
      }
      if (seen.has(key)) {
        incomplete('包含重複 Prop；略過重複定義並禁止產生建議文件。');
        continue;
      }
      seen.add(key);
      const value = defaults.get(key) ?? computedDefault,
        evaluated =
          value && !duplicateDefaults.has(key) && !computedDefault ? literal(value) : null;
      const defaultValue: PropDefault = !value
        ? { state: 'none' }
        : evaluated?.known
          ? { state: 'known', value: evaluated.value }
          : { state: 'unknown' };
      report.props.push({
        name: key,
        type: m.typeAnnotation ? span(m.typeAnnotation.typeAnnotation).text : '未知（未宣告）',
        required: !m.optional,
        default: defaultValue,
        defaultSource: value ? span(value) : null,
        definition: span(m),
        check: typeCheck(m.typeAnnotation?.typeAnnotation),
        description: (m.leadingComments ?? [])
          .map((c) =>
            c.value
              .replace(/^\*|\*$/g, '')
              .replace(/^\s*\* ?/gm, '')
              .trim(),
          )
          .join('\n'),
      });
    }
    for (const key of defaults.keys())
      if (!seen.has(key)) incomplete(`解構預設值 ${key} 未對應至已解析的 Props 定義。`);
  }
  for (const n of ast.program.body)
    if (n.type === 'ExpressionStatement' && n.expression.type === 'AssignmentExpression') {
      const left = n.expression.left;
      if (left.type === 'Identifier' && left.name === component)
        incomplete('偵測到元件後續重新指派，不能將初始宣告視為完整結果。');
      if (
        left.type === 'MemberExpression' &&
        left.object.type === 'Identifier' &&
        left.object.name === component &&
        ((left.property.type === 'Identifier' &&
          !left.computed &&
          left.property.name === 'defaultProps') ||
          (left.property.type === 'StringLiteral' && left.property.value === 'defaultProps'))
      )
        incomplete('偵測到 defaultProps 後續賦值；本版只提取函式參數預設，不宣告完整預設語意。');
    }
  return parsePropsReport(JSON.stringify(report));
}
