---
id: STW-13
title: SQL DDL 轉 ER 關聯圖與可匯出的資料表文件
status: Needs Refinement
assignee: []
created_date: '2026-10-04 14:23'
updated_date: '2026-10-04 15:33'
labels:
  - keyword-research
  - proposal
  - database
  - delivery-web
  - web-first
  - extension-cli
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
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
priority: medium
type: feature
ordinal: 13
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
- [ ] #1 解析支援範圍內的資料表、欄位、主鍵與外鍵，圖上的關聯均能回到原始定義。
- [ ] #2 複合鍵、自我引用與 schema-qualified 名稱有固定範例，無外鍵不自動編造關聯。
- [ ] #3 未知方言或未支援 DDL 逐項顯示，不產生看似完整的錯誤 schema。
- [ ] #4 可匯出 SVG 與資料表摘要；匯出保留表名、欄位與關聯的可讀性。
- [ ] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->
