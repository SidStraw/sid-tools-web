export const sqlDdlDemos = {
  resolved: {
    source: `CREATE TABLE library."Book" (
  tenant_id integer,
  book_id bigint,
  title character varying(120) NOT NULL,
  CONSTRAINT book_pk PRIMARY KEY (tenant_id, book_id)
);
CREATE TABLE library.loan (
  loan_id bigint PRIMARY KEY,
  tenant_id integer NOT NULL,
  book_id bigint NOT NULL,
  parent_id bigint,
  CONSTRAINT book_fk FOREIGN KEY (tenant_id, book_id)
    REFERENCES library."Book" (tenant_id, book_id) MATCH FULL ON DELETE CASCADE,
  CONSTRAINT parent_fk FOREIGN KEY (parent_id) REFERENCES library.loan
);`,
    note: '人工合成：明確 schema 的複合 PK／FK 保留欄位順序；loan 自我引用省略 target list，只由已知明示 PK 推導 loan_id，保留 PK 來源。實線僅表示此輸入內的綁定，不證明 DB 接受型別或 target 唯一性。',
  },
  candidate: {
    source: `CREATE TABLE account (id integer PRIMARY KEY);
CREATE TABLE purchase (
  id integer PRIMARY KEY,
  account_id integer REFERENCES account (id),
  missing_id integer REFERENCES absent (id)
);
CREATE TABLE public.note (
  id integer PRIMARY KEY,
  purchase_id integer REFERENCES purchase
);`,
    note: '人工合成：未限定名稱沒有 search_path，account 只可標 local-candidate 虛線，不猜 public 或同 schema。缺 target 不造節點；未限定 target 的 implicit PK 不猜欄位。Partial 與 edge 計數分開。',
  },
  unsupported: {
    source: `SET search_path TO public;
CREATE TABLE public.sample (
  id integer PRIMARY KEY,
  label text DEFAULT 'synthetic-private-default',
  score integer CHECK (score > 0)
);
ALTER TABLE public.sample ADD COLUMN later text;
DROP TABLE public.sample;
CREATE TABLE public.kept (id integer PRIMARY KEY);`,
    note: '人工合成：DEFAULT／CHECK 與 SET／ALTER／DROP 逐項定位，不執行、不更動先前 CREATE snapshot。圖只保留接受的宣告，partial 不是 migration 後的完整 schema；匯出不含 literal 或 unsupported statement 本文。',
  },
  lexical: {
    source: `/* synthetic-private-comment ; /* nested ; */ still a comment */
CREATE TABLE public.lexical (
  id integer PRIMARY KEY,
  normal text DEFAULT 'synthetic-private-standard;value',
  escaped text DEFAULT E'synthetic-private-escape\\';value',
  tagged text DEFAULT $sample$synthetic-private-dollar;value$sample$
);
CREATE TABLE public.after_lexical (id integer PRIMARY KEY);`,
    note: '人工合成 lexical boundaries：standard／E／tagged dollar strings、nested comments 中的分號不切斷 statement。DEFAULT 不在支援子集，保留所在欄位但 partial；字串／註解本文不保留於 model 或匯出。',
  },
  invalid: {
    source: `CREATE TABLE public.earlier (id integer PRIMARY KEY);
CREATE TABLE public.broken (label text DEFAULT 'unterminated;
CREATE TABLE public.never_guessed (id integer);`,
    note: '人工合成未終止字串：只保留已完成的 earlier 宣告，lexical remainder invalid，絕不猜出 never_guessed。Invalid 與零／非零 table 計數無關。',
  },
  limit: {
    source: '('.repeat(33) + ')'.repeat(33),
    note: '人工合成深度超限：parentheses 上限 32。Limit 清除所有 tables／edges／statements，不把截斷模型當成功。',
  },
  hostile: {
    source: `CREATE TABLE public."<img src=x onerror=alert(1)>&" (
  "id<&" integer PRIMARY KEY,
  "quote"" & column" text
);
CREATE TABLE public."child<&" (
  "ref<&" integer REFERENCES public."<img src=x onerror=alert(1)>&" ("id<&")
);`,
    note: '人工合成 XML／HTML 特殊字元：quoted 名稱以純文字顯示，SVG 使用 app-owned nodes／固定 attrs／安全 XMLSerializer，不建立圖片、script、連結或外部引用。名稱仍敏感，不是匿名化。',
  },
} as const;
