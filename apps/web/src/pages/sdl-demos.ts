export const sdlDemos = {
  review: {
    before:
      'type Query {\n  book(id: ID!): Book\n}\ntype Book {\n  title: String!\n  legacyCode: String\n}\nenum Format { PAPER EBOOK }',
    after:
      'type Query {\n  book(id: ID!): Book\n}\ntype Book {\n  title: String\n  summary: String\n}\nenum Format { PAPER EBOOK AUDIO }',
    note: '人工合成審查：Book.title output 放寬為 nullable 是 breaking；移除 legacyCode 是 breaking，新增 summary 是 non-breaking；新增 enum AUDIO 是 dangerous。分類與來源歸屬分開看，不代表查詢一定受影響。',
  },
  variance: {
    before: 'type Query {\n  find(filter: Filter): String\n}\ninput Filter {\n  term: String\n}',
    after: 'type Query {\n  find(filter: Filter): String!\n}\ninput Filter {\n  term: String!\n}',
    note: '方向核對：output String → String! 增強回傳保證，non-breaking；input String → String! 收緊可接受輸入，breaking。這不是 resolver 能否遵守新保證的證明。',
  },
  defaults: {
    before: 'type Query {\n  search(limit: Int = 10): String\n}',
    after: 'type Query {\n  search(limit: Int = 20, page: Int): String\n}',
    note: 'Default 核對：既有 default 改動／移除是 dangerous，新增既有 default 是 non-breaking。這裡新增 optional argument 依固定分類器保守列 dangerous；同碼多筆時來源可能只有候選。',
  },
  unknown: {
    before:
      'directive @policy(note: String) on FIELD_DEFINITION\ntype Query {\n  book: String @policy(note: "synthetic policy")\n}',
    after:
      'directive @policy(note: String) on FIELD_DEFINITION\ntype Query {\n  book: String @policy(note: "synthetic policy")\n}',
    note: '兩份相同仍 unknown：自訂 directive application 的執行語意不在 SDL 靜態判斷內。不要把沒有已分類差異當成安全。',
  },
  ambiguous: {
    before: 'type Query {\n  first: String\n  second: String\n}',
    after: 'type Query {\n  replacement: String\n}',
    note: '兩個同碼 field removals：分類可能都是 breaking，但無法把函式庫 reason 精確歸屬。status unknown 可以同時 unknown count = 0；候選只是導覽，不是確定目標。',
  },
  invalid: {
    before: 'type Query {\n  book: String\n}',
    after: 'type Query {\n  book: String\n}\nextend type Missing {\n  title: String\n}',
    note: '未解析 extension：after 無效，不產生比較結論。零筆 changes 不是「沒有變更」；可查看原始座標與實際錯誤範圍。',
  },
} as const;
