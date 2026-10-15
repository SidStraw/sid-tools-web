const json = (value: unknown) => JSON.stringify(value, null, 2);
const base = (paths: unknown, schemas?: unknown) => ({
  openapi: '3.0.3',
  info: { title: 'Synthetic contract', version: '1' },
  paths,
  ...(schemas ? { components: { schemas } } : {}),
});
const response = (schema: unknown) => ({
  description: 'Synthetic response',
  content: { 'application/json': { schema } },
});
const operation = (schema: unknown) => ({
  post: {
    requestBody: { content: { 'application/json': { schema } } },
    responses: { '200': response(schema) },
  },
});
const schema = (changed: boolean) => ({
  type: 'object',
  required: changed ? ['label'] : [],
  properties: {
    label: { type: 'string' },
    quantity: { type: changed ? 'integer' : 'number' },
    choice: { type: 'string', enum: changed ? ['PAPER', 'EBOOK'] : ['PAPER'] },
    optional: { type: 'string', nullable: !changed },
  },
});
export const openapiDemos = {
  directional: {
    before: json(base({ '/books': operation(schema(false)) })),
    after: json(base({ '/books': operation(schema(true)) })),
    note: '人工合成：request 新增 required、number → integer、nullable true → false 收緊可接受輸入，breaking；response 相同變動增強保證，non-breaking。Enum 新值在 request 為 non-breaking，在 response 為 review，非保證 breaking。',
  },
  shared: {
    before: json(
      base(
        { '/books': operation({ $ref: '#/components/schemas/Book~1item~0' }) },
        { 'Book/item~': { type: 'object', properties: { title: { type: 'string' } } } },
      ),
    ),
    after: json(
      base(
        { '/books': operation({ $ref: '#/components/schemas/Book~1item~0' }) },
        {
          'Book/item~': {
            type: 'object',
            required: ['title'],
            properties: { title: { type: 'string' } },
          },
        },
      ),
    ),
    note: '內部引用：同一個含 / 與 ~ 的 component 同時用於 request／response。保留真正 $ref 使用點與 resolved definition 的 required 位置；JSON Pointer 分別以 ~1／~0 跳脫，不猜原始範圍。',
  },
  unknown: {
    before: json(
      base(
        {
          '/remote': {
            get: {
              responses: {
                '200': response({ $ref: 'https://invalid.example/synthetic-contract.yaml#/Book' }),
              },
            },
          },
          '/recursive': {
            get: { responses: { '200': response({ $ref: '#/components/schemas/Node' }) } },
          },
        },
        { Node: { type: 'object', properties: { child: { $ref: '#/components/schemas/Node' } } } },
      ),
    ),
    after: json(
      base(
        {
          '/remote': {
            get: {
              responses: {
                '200': response({ $ref: 'https://invalid.example/synthetic-contract.yaml#/Book' }),
              },
            },
          },
          '/recursive': {
            get: { responses: { '200': response({ $ref: '#/components/schemas/Node' }) } },
          },
        },
        { Node: { type: 'object', properties: { child: { $ref: '#/components/schemas/Node' } } } },
      ),
    ),
    note: '兩份相同也 unknown：external refs 絕不載入，recursive schema 不猜測完整相容。請看逐側 issues，不只看 findings 計數。',
  },
  equivalent: {
    before: json(
      base({ '/health': { get: { responses: { '200': { description: 'Synthetic' } } } } }),
    ),
    after:
      'paths:\n  /health:\n    get:\n      responses:\n        "200":\n          description: Synthetic\ninfo: {version: "1", title: Synthetic contract}\nopenapi: 3.0.3\n',
    note: 'JSON／YAML 順序等價：mapping 順序及格式不構成合約變更。Complete／0 findings 仍只表示已覆蓋的靜態子集，不是 consumer safety。',
  },
  unsupported: {
    before: json(base({})),
    after: json({ ...base({}), openapi: '3.1.0' }),
    note: '版本界線：只支援 3.0.x；3.1／Swagger 2 顯示 unsupported，不以零筆 findings 宣告無變更。',
  },
  invalid: {
    before: json(base({})),
    after:
      'openapi: 3.0.3\ninfo: {title: Synthetic, version: "1"}\npaths: &paths {}\ncopy: *paths\n',
    note: '無效 YAML：anchors／aliases 不在接受語法內，在建立文件前拒絕。不把 parser 拒絕當成乾淨零差異。',
  },
  deep: {
    before: json(base({})),
    after: '['.repeat(5000) + ']'.repeat(5000),
    note: '合成深度攻擊：5,000 層 flow collections 應在 Composer 前被限額拒絕；比較隔離在可終止 worker，不主執行緒重試。',
  },
} as const;
