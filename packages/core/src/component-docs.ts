export type PropScalar = string | number | boolean | null;
export type PropSpan = { start: number; end: number; line: number; column: number; text: string };
export type PropCheck =
  | { kind: 'string' | 'number' | 'boolean' | 'null' | 'unknown' }
  | { kind: 'literal'; values: PropScalar[] };
export type PropDefault = { state: 'none' | 'unknown' } | { state: 'known'; value: PropScalar };
export type DocumentProp = {
  name: string;
  type: string;
  required: boolean;
  default: PropDefault;
  description: string;
};
export type SourceProp = DocumentProp & {
  check: PropCheck;
  definition: PropSpan;
  defaultSource: PropSpan | null;
};
export type PropsReport = {
  format: 'sid-tools-props-report-v1';
  scope: string;
  component: string;
  engine: { name: '@babel/parser'; version: '8.0.7' };
  source: { file: string; sha256: string; length: number };
  complete: boolean;
  issues: string[];
  props: SourceProp[];
};
export type PropsDocument = {
  format: 'sid-tools-props-document-v1';
  scope: string;
  component: string;
  props: DocumentProp[];
  examples: { name: string; values: Record<string, unknown> }[];
};
export const PROPS_LIMIT = 2_000_000;
export const PROPS_NOTICES = [
  '這是 React TSX 的受限靜態檢查。型別文字是來源宣告，並非 TypeScript compiler 已解析的完整型別。',
  '預設僅指函式參數的預設，後續 defaultProps／執行期修改不在範圍。只確認字面值預設；函式呼叫、外部型別、繼承與未支援語法保留未知／不完整，不執行元件或匯入。',
  '文件與報告可能包含路徑、預設值及原始程式片段；分享前請檢查。網頁不傳送輸入，不自動套用文件。',
];
const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const scalar = (v: unknown): v is PropScalar =>
  v === null ||
  typeof v === 'string' ||
  typeof v === 'boolean' ||
  (typeof v === 'number' && Number.isFinite(v));
const text = (v: unknown, max = 4000): v is string => typeof v === 'string' && v.length <= max;
const name = (v: unknown): v is string => text(v, 200) && v.length > 0;
function json(raw: string): unknown {
  if (new TextEncoder().encode(raw).length > PROPS_LIMIT) throw new Error('輸入超過 2 MB。');
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error('JSON 無法解析。');
  }
}
function defaultValue(v: unknown): v is PropDefault {
  return (
    object(v) &&
    ((v.state === 'known' && scalar(v.value) && (typeof v.value !== 'string' || text(v.value))) ||
      ((v.state === 'none' || v.state === 'unknown') && !Object.hasOwn(v, 'value')))
  );
}
function prop(v: unknown): v is DocumentProp & Record<string, unknown> {
  return (
    object(v) &&
    name(v.name) &&
    text(v.type) &&
    typeof v.required === 'boolean' &&
    defaultValue(v.default) &&
    text(v.description)
  );
}
function check(v: unknown): v is PropCheck {
  if (!object(v)) return false;
  if (['string', 'number', 'boolean', 'null', 'unknown'].includes(String(v.kind))) return true;
  return (
    v.kind === 'literal' &&
    Array.isArray(v.values) &&
    v.values.length > 0 &&
    v.values.length <= 32 &&
    v.values.every(scalar)
  );
}
function span(v: unknown, length: number): v is PropSpan {
  return (
    object(v) &&
    Number.isInteger(v.start) &&
    Number.isInteger(v.end) &&
    Number.isInteger(v.line) &&
    Number.isInteger(v.column) &&
    (v.start as number) >= 0 &&
    (v.end as number) > (v.start as number) &&
    (v.end as number) <= length &&
    (v.line as number) > 0 &&
    (v.column as number) > 0 &&
    text(v.text) &&
    v.text.length === (v.end as number) - (v.start as number)
  );
}
function unique(props: DocumentProp[]) {
  return new Set(props.map((p) => p.name)).size === props.length;
}
export function parsePropsReport(raw: string): PropsReport {
  const v = json(raw);
  if (
    !object(v) ||
    v.format !== 'sid-tools-props-report-v1' ||
    !name(v.scope) ||
    !name(v.component) ||
    !object(v.engine) ||
    v.engine.name !== '@babel/parser' ||
    v.engine.version !== '8.0.7' ||
    !object(v.source) ||
    !name(v.source.file) ||
    !text(v.source.sha256, 64) ||
    !/^[a-f0-9]{64}$/.test(v.source.sha256) ||
    !Number.isInteger(v.source.length) ||
    (v.source.length as number) < 0 ||
    (v.source.length as number) > 256_000 ||
    typeof v.complete !== 'boolean' ||
    !Array.isArray(v.issues) ||
    v.issues.length > 100 ||
    !v.issues.every((i) => text(i)) ||
    !Array.isArray(v.props) ||
    v.props.length > 500
  )
    throw new Error('分析報告格式或來源資訊無效。');
  const length = v.source.length as number;
  const props = v.props;
  if (
    !props.every(
      (p) =>
        prop(p) &&
        object(p) &&
        check(p.check) &&
        span(p.definition, length) &&
        (p.defaultSource === null
          ? p.default.state === 'none'
          : span(p.defaultSource, length) && p.default.state !== 'none'),
    ) ||
    !unique(props)
  )
    throw new Error('Props 或來源位置無效。');
  return v as unknown as PropsReport;
}
export function parsePropsDocument(raw: string): PropsDocument {
  const v = json(raw);
  if (
    !object(v) ||
    v.format !== 'sid-tools-props-document-v1' ||
    !name(v.scope) ||
    !name(v.component) ||
    !Array.isArray(v.props) ||
    v.props.length > 500 ||
    !v.props.every(prop) ||
    !unique(v.props) ||
    !Array.isArray(v.examples) ||
    v.examples.length > 100 ||
    !v.examples.every(
      (e) =>
        object(e) &&
        name(e.name) &&
        object(e.values) &&
        Object.keys(e.values).length <= 500 &&
        JSON.stringify(e.values).length <= 16_000,
    ) ||
    new Set(v.examples.map((e) => (e as { name: string }).name)).size !== v.examples.length
  )
    throw new Error('文件格式無效，或含重複 Props／範例。');
  return v as unknown as PropsDocument;
}
function sameIdentity(report: PropsReport, doc: PropsDocument) {
  if (report.scope !== doc.scope || report.component !== doc.component)
    throw new Error('scope 或元件不同，不能比較或套用文件。');
}
export function proposePropsDocument(
  report: PropsReport,
  previous: PropsDocument | null = null,
): PropsDocument {
  if (!report.complete) throw new Error('分析不完整，不能產生可能刪除既有欄位的建議文件。');
  if (previous) sameIdentity(report, previous);
  const descriptions = new Map(previous?.props.map((p) => [p.name, p.description]) ?? []);
  const proposed: PropsDocument = {
    format: 'sid-tools-props-document-v1',
    scope: report.scope,
    component: report.component,
    props: report.props.map((p) => ({
      name: p.name,
      type: p.type,
      required: p.required,
      default: p.default,
      description: descriptions.get(p.name) ?? p.description,
    })),
    examples: previous?.examples ?? [],
  };
  return parsePropsDocument(JSON.stringify(proposed));
}
export type PropsChange = {
  name: string;
  status: 'added' | 'removed' | 'changed' | 'same' | 'unverified';
  fields: string[];
  before: DocumentProp | null;
  after: SourceProp | null;
};
export type ExampleCheck = {
  example: string;
  prop: string;
  state: 'invalid' | 'unknown';
  message: string;
};
export function reviewProps(report: PropsReport, doc: PropsDocument | null) {
  if (doc) sameIdentity(report, doc);
  const old = new Map(doc?.props.map((p) => [p.name, p]) ?? []),
    current = new Map(report.props.map((p) => [p.name, p]));
  const rows: PropsChange[] = report.props.map((p) => {
    const before = old.get(p.name) ?? null;
    const fields = before
      ? (['type', 'required', 'default'] as const).filter(
          (k) => JSON.stringify(before[k]) !== JSON.stringify(p[k]),
        )
      : [];
    return {
      name: p.name,
      status: !before ? 'added' : fields.length ? 'changed' : 'same',
      fields: [...fields],
      before,
      after: p,
    };
  });
  for (const p of old.values())
    if (!current.has(p.name))
      rows.push({
        name: p.name,
        status: report.complete ? 'removed' : 'unverified',
        fields: [],
        before: p,
        after: null,
      });
  if (
    (doc?.examples.reduce((n, e) => n + report.props.length + Object.keys(e.values).length, 0) ??
      0) > 10000
  )
    throw new Error('範例比較超過 10000 個欄位檢查，請減少範例。');
  const examples: ExampleCheck[] = [];
  for (const e of doc?.examples ?? []) {
    for (const p of report.props)
      if (p.required && !Object.hasOwn(e.values, p.name))
        examples.push({
          example: e.name,
          prop: p.name,
          state: 'invalid',
          message: '缺少宣告為必填的 Prop。',
        });
    for (const [key, value] of Object.entries(e.values)) {
      const p = current.get(key);
      if (!p) {
        examples.push({
          example: e.name,
          prop: key,
          state: report.complete ? 'invalid' : 'unknown',
          message: report.complete ? '未宣告此 Prop。' : '分析不完整，無法確認此 Prop。',
        });
        continue;
      }
      const c = p.check;
      if (c.kind === 'unknown') {
        examples.push({
          example: e.name,
          prop: key,
          state: 'unknown',
          message: '此型別超過範例值檢查範圍；未判定相容。',
        });
        continue;
      }
      const valid =
        c.kind === 'literal'
          ? c.values.some((v) => Object.is(v, value))
          : c.kind === 'null'
            ? value === null
            : typeof value === c.kind && (c.kind !== 'number' || Number.isFinite(value));
      if (!valid)
        examples.push({
          example: e.name,
          prop: key,
          state: 'invalid',
          message: '範例值不符合已支援的宣告型別／字面值。',
        });
    }
  }
  return {
    hasDocument: !!doc,
    complete: report.complete,
    rows,
    examples,
    exampleCount: doc?.examples.length ?? 0,
    notices: PROPS_NOTICES,
  };
}
