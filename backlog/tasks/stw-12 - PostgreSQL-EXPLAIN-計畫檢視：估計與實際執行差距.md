---
id: STW-12
title: PostgreSQL EXPLAIN 計畫檢視：估計與實際執行差距
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
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_05/28_044441.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_05/12_042852.md
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
priority: medium
type: feature
ordinal: 12
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

只貼 SQL 無法可靠判斷瓶頸；實際 EXPLAIN ANALYZE 輸出能提供 rows、loops 與時間，適合做有根據的診斷輔助。

## 首版邊界

首版解析 PostgreSQL EXPLAIN FORMAT JSON 的既有輸出；不連資料庫、不執行查詢、不自動建立索引。

## 差異與待驗證假設

強調估計 rows 與 actual rows 的差距、loops 與節點關係；來源中的泛用 SQL optimizer 詞不等於能承諾自動最佳化。

## 關鍵字證據與合併

- `sql explain analyze visualizer`：1 份報告出現。
- `sql explain analyze postgres`：1 份報告出現。
- `sql query plan visualizer`：1 份報告出現。

本卡合併 5 個唯一關鍵字，來自 2 份報告、5 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: sql-plan）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_05/12_042852.md 至 logs/2026_05/28_044441.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：本機 CLI 匯入既有 EXPLAIN 輸出。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 有效 plan 顯示節點樹、cost、rows、loops 與可用的 timing／buffer 欄位並回連原始 JSON。
- [ ] #2 區分只有 EXPLAIN 與含 ANALYZE 的輸出；缺少實測資訊時不補造實際時間。
- [ ] #3 明確說明 timing 與 loops 的呈現方式，不能直接相加重複計算父子節點時間。
- [ ] #4 以固定 PostgreSQL 計畫範例驗證估計誤差提示，輸出不把建議冒充已實測改善。
- [ ] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->
