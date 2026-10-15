---
id: STW-13
title: SQL DDL 轉 ER 關聯圖與可匯出的資料表文件
status: Done
assignee:
  - '@opencode'
created_date: '2026-10-04 14:23'
updated_date: '2026-10-15 20:55'
labels:
  - keyword-research
  - proposal
  - database
  - delivery-web
  - web-first
  - extension-cli
  - demand-reviewed-2026-10-14
  - deferred-evidence
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_06/30_044113.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_03/10_035755.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/30_035819.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/18_033023.md
  - 'https://docs.dbdiagram.io/dbdocs/features/generate-dbml-from-db/'
  - 'https://dbms.co.jp/sql-to-erd'
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-pruning.md
priority: low
type: feature
ordinal: 113
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

已有建表 DDL 卻缺少可讀的關聯圖時，開發者需要快速看清外鍵與表結構，手工重畫容易跟原始 schema 不一致。

## 首版邊界

首版限定 PostgreSQL CREATE TABLE 與明示外鍵的子集；不連 DB、不猜測無外鍵的關聯、不處理 migration 執行。

## 差異與待驗證假設

從原始欄位定位到圖與文件，未支援 DDL 明確列出；是否優於現有 ERD 工具仍需以實際匯入案例驗證。

## 關鍵字證據與合併

- `database schema visualizer online`：7 份報告出現。
- `database schema visualization tools`：5 份報告出現。
- `sql schema visualizer online`：1 份報告出現。

本卡合併 20 個唯一關鍵字，來自 11 份報告、37 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: schema-erd）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/30_035819.md 至 logs/2026_08/18_033023.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI 匯出 ERD 與文件。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 解析支援範圍內的資料表、欄位、主鍵與外鍵，圖上的關聯均能回到原始定義。
- [x] #2 複合鍵、自我引用與 schema-qualified 名稱有固定範例，無外鍵不自動編造關聯。
- [x] #3 未知方言或未支援 DDL 逐項顯示，不產生看似完整的錯誤 schema。
- [x] #4 可匯出 SVG 與資料表摘要；匯出保留表名、欄位與關聯的可讀性。
- [x] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 不新增相依套件；以有界 PostgreSQL lexer 處理巢狀註解、字串／識別字／dollar quote 與正確 statement 邊界，再解析窄版 CREATE TABLE／明示 PK／FK，保留原始 UTF16 範圍。
2. 明確支援複合鍵、自我引用與 schema-qualified 名稱；關聯僅來自 FK，未提供 search_path 的未限定名稱僅標本機候選，缺少欄位或隱含 PK 無法確認時不編造綁定。未知 statement／clause 逐項定位，partial 不代表執行 migration 後完整 schema。
3. 整合專用可終止 module worker、來源／表欄位／關聯導覽與可讀 ER 圖，app-owned 安全 SVG renderer 及資料表摘要匯出；不含 raw SQL/default/comment，名稱仍可能敏感需同意。
4. 固定 composite/self/schema 案例與 lexical／unsupported／limits／來源測試；production E2E 覆蓋圖與 SVG／摘要可讀性、惡意文字、實際來源選取、worker/Blob生命週期及手機版。
5. 程式碼凍結後完整 pnpm verify、獨立 Oracle 與結構審查，通過五項 AC 才 Done 與本卡獨立 commit；實際阻塞註記後跳過。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

Low 保留窄比較；免 DB、免費與 SVG 不是足夠差異，不能宣稱競品都不能呈現來源。 dbdiagram 官方提供 DDL 流程，DBC 有免費瀏覽器端 PostgreSQL DDL 圖與匯出；大量供給只是競爭訊號。

提升／重新納入條件：3 組真實 DDL（複合鍵／自我引用／schema）比較現成基準，找到可重現且有使用者需要的匯入／文件缺口。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-pruning.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

2026-10-16：依使用者實作所有未完成卡片的授權啟動，舊市場 defer 不再作為跳過理由。採固定 PostgreSQL18 文件定義的窄版子集，不連 DB／不執行 DDL／不推測無 FK 關聯；未限定名稱缺 search_path 僅本機候選，unknown/partial 明示。圖與 SVG 為本機安全文字呈現，不新增第三方圖形或 SQL parser 套件。

Final acceptance 2026-10-16: Parent accepted frozen no-cache mise exec -- pnpm verify PASS (sh_141541d02001z7m5JpmtM7QJdc): 697 unit/public tests,126 production E2E,164 formatted/94 strict clean,build/audit PASS,0/6 cache hits; inherited TS7 experimental API notice retained. Independent Oracle1 PASS with no material findings; structure gate PASS. Detailed five-AC mapping and nine reviewed screenshots preserved in docs/validation/stw-13/README.md, updated with final acceptance and accepted limitations. All five AC checked; no DoD items configured. Bounded PG18 CREATE snapshot only: no DB/catalog/type/target uniqueness/migration-state proof; unqualified candidates, unsupported-tail no-guess policy, conservative implicit PK eligibility and invalid-FK binding invalidation retained. SVG remains app-owned static safe XML, bounded and incomplete-labeled when needed; names/types consent-gated. Sources unchanged during docs/CLI-only finalization; accepted fullverify not rerun. Isolated31-path local commit authorized; no push/deploy or reserved-lane changes.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Delivered bounded PostgreSQL CREATE TABLE lexer/parser, source-linked table/PK/FK model, dedicated local worker, readable ER/SVG and metadata exports with explicit partial/unresolved semantics. Verified focused92 core/public and24 DDL/shared E2E plus nine production screenshots; final frozen pnpm verify passed697 unit/public and126 production E2E,164 formatted/94 strict checks,build/audit,cache0/6. Oracle1 and structure PASS without material findings. Five AC accepted; durable evidence and accepted limitations in docs/validation/stw-13/README.md. No database execution, upload, push or deployment.
<!-- SECTION:FINAL_SUMMARY:END -->
