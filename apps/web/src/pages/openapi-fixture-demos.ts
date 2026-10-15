const doc = (schema: unknown, mediaExtra: Record<string, unknown> = {}, components?: unknown) =>
  JSON.stringify(
    {
      openapi: '3.0.3',
      info: { title: 'Synthetic fixture study', version: '1' },
      paths: {
        '/books/~sample': {
          get: {
            responses: {
              '200': {
                description: 'Synthetic response',
                content: { 'application/json': { schema, ...mediaExtra } },
              },
            },
          },
        },
      },
      ...(components ? { components } : {}),
    },
    null,
    2,
  );
const basic = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'kind', 'tags', 'secret'],
  properties: {
    id: { type: 'integer', readOnly: true, minimum: 10, maximum: 99 },
    kind: { type: 'string', enum: ['paper', 'ebook'] },
    tags: {
      type: 'array',
      minItems: 2,
      maxItems: 4,
      uniqueItems: true,
      items: { type: 'integer', minimum: 0, maximum: 100 },
    },
    label: { type: 'string', minLength: 3, maxLength: 8 },
    secret: { type: 'string', writeOnly: true },
  },
};
export const fixtureDemos = {
  basic: {
    source: doc(basic),
    note: '人工合成：required、enum、array uniqueItems 與基本 bounds。Response readOnly id 保留，writeOnly secret 不輸出也不視為 response 必填。改 seed 可影響符合條件的生成值；enum 仍是沿用來源 literals。',
  },
  inline: {
    source: doc(
      {
        type: 'object',
        required: ['title'],
        additionalProperties: false,
        properties: { title: { type: 'string' } },
      },
      { example: { title: 'Synthetic library copy' } },
    ),
    note: '人工合成 inline example。先獨立驗證，通過才沿用；改 seed 不覆蓋有效 example。這是使用者確認為測試資料的來源內容，不是匿名化或觀測到的 server 回應。',
  },
  fallback: {
    source: doc(
      { type: 'integer', minimum: 10, maximum: 20, default: 999 },
      { example: 'Synthetic invalid number' },
    ),
    note: '人工合成無效 example：字串不符合 integer，保留 rejected provenance 與 warning，再 seeded fallback。Default 999 被忽略，不能當成觀測回應；fallback 通過也不隱藏拒絕原因。',
  },
  schema: {
    source: doc(
      { $ref: '#/components/schemas/Book~1copy~0' },
      {},
      {
        schemas: {
          'Book/copy~': {
            type: 'object',
            required: ['title'],
            properties: { title: { type: 'string' } },
            example: { title: 'Synthetic schema example' },
          },
        },
      },
    ),
    note: '人工合成本機 $ref 與 root schema.example。分開顯示引用使用點與定義，/ 與 ~ 以 ~1／~0 表示，來源按鈕選取原始 UTF-16 範圍。',
  },
  named: {
    source: doc(
      { type: 'integer', minimum: 1, maximum: 100 },
      { examples: { Zulu: { value: 90 }, Alpha: { value: 10 } } },
    ),
    note: '人工合成 named examples：未指定名稱時依排序選 Alpha，不依 seed 隨機選。可明確切換 Zulu；有效候選優先於生成。',
  },
  unsupported: {
    source: JSON.stringify(
      {
        openapi: '3.0.3',
        info: { title: 'Synthetic unsupported', version: '1' },
        paths: Object.fromEntries(
          [
            ['/oneOf', { type: 'string', oneOf: [{ type: 'string' }] }],
            ['/format', { type: 'string', format: 'uuid' }],
            ['/external', { $ref: 'https://invalid.example/synthetic.yaml#/Book' }],
            ['/cycle', { $ref: '#/components/schemas/Node' }],
          ].map(([path, schema]) => [
            path,
            {
              get: {
                responses: {
                  '200': { description: 'Synthetic', content: { 'application/json': { schema } } },
                },
              },
            },
          ]),
        ),
        components: {
          schemas: {
            Node: { type: 'object', properties: { next: { $ref: '#/components/schemas/Node' } } },
          },
        },
      },
      null,
      2,
    ),
    note: '人工合成拒絕案例：檢查可列出選擇，但 oneOf／format／external／recursive schema 不在支援子集內。檢查 ready 不代表 schema 有效；不 fetch、不猜、不產出可下載 fixture。',
  },
  invalid: {
    source: 'openapi: 3.0.3\ninfo: {title: Synthetic, version: "1"}\npaths: &blocked {}\n',
    note: '人工合成無效 YAML：anchors 不在允許的 YAML 1.2 JSON-compatible grammar。只在按檢查後解析，不把拒絕當成功。',
  },
  version: {
    source: 'openapi: 3.1.0\ninfo: {title: Synthetic, version: "1"}\npaths: {}\n',
    note: '人工合成 3.1：只支援 OpenAPI 3.0.x，unsupported 無 fixture，不能推論完整 schema 有效性。',
  },
} as const;
