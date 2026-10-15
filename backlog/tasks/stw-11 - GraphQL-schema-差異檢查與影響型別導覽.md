---
id: STW-11
title: GraphQL schema 差異檢查與影響型別導覽
status: Done
assignee:
  - '@opencode'
created_date: '2026-10-04 14:23'
updated_date: '2026-10-15 18:51'
labels:
  - keyword-research
  - proposal
  - api
  - delivery-web
  - web-first
  - extension-cli
  - extension-ci
  - demand-reviewed-2026-10-14
  - deferred-evidence
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_06/12_045343.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_09/04_033127.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_06/20_044432.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_02/26_040253.md
  - 'https://the-guild.dev/graphql/inspector/docs/commands/diff'
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-other-cards.md
priority: low
type: feature
ordinal: 111
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

GraphQL schema 的欄位刪除、nullability 與 enum 改動可能影響既有查詢，單純 SDL 文字差異不容易審查。

## 首版邊界

比較兩份 SDL，列出變更與相關型別引用；只針對 schema 靜態相容性，不模擬 resolver 或連線至正式 API。

## 差異與待驗證假設

把變更、引用路徑與判斷原因一起呈現，保留需人工判讀的 directive 影響。

## 關鍵字證據與合併

- `graphql schema diff online`：1 份報告出現。
- `graphql schema diff`：2 份報告出現。
- `graphql schema checker online`：3 份報告出現。

本卡合併 11 個唯一關鍵字，來自 9 份報告、25 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: graphql-diff）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_02/26_040253.md 至 logs/2026_09/04_033127.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI／CI schema 變更檢查。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 有效 SDL 可比較 type、field、argument、enum 與 nullability 的增刪改。
- [x] #2 分開 input 與 output 的相容性規則，標示 breaking／dangerous／non-breaking 及原因。
- [x] #3 無效 SDL、未解析 extension 或自訂 directive 的影響不能宣告安全。
- [x] #4 可依型別與欄位導覽並匯出結果，提供固定相容性範例核對。
- [x] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 使用固定 graphql@17.0.2 建立純核心：有限長度／token／結構預檢、SDL parse/build/validate，無效或未解析 extension 不產生安全結論。
2. 依固定版本分類 type、field、argument、enum、nullability 與 default 變更，區分 input/output；自訂 directive 影響及未知分類明確標為待人工判讀，附來源與型別引用導覽資料。
3. 整合既有本機 lazy Web 工具介面，提供兩份 SDL、固定範例、型別／欄位導覽、結果匯出及清除；不連線、不保存、不放分享 URL。
4. 核心矩陣與公開套件測試、production E2E／隱私／生命週期／手機版及證據；程式碼凍結後完整 pnpm verify、獨立 Oracle 與結構審查。
5. 通過驗收才逐項勾 AC、Done，僅精確暫存本卡檔案並獨立 commit；遇實際阻塞則在卡片註記後跳過。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

Inspector 已含 breaking/dangerous/safe 分類、使用量規則與 CI；現卡影響導航的使用者增量未證實。

提升／重新納入條件：找實際 schema 審查，證明獨立 Web 導航比 Inspector／Hive 多完成一個必要任務。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-other-cards.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

2026-10-16：依使用者實作全部未完成卡片的授權啟動，舊市場 defer 不再作為跳過理由。先查證 GraphQL SDL parser、input/output 相容性規則及現有整合位置；研究完成後記錄實作計畫。不連線正式 API、不執行 resolver，保留 directive 與不完整輸入的人工判讀限制。

2026-10-16：完成純本機 GraphQL SDL 比較與型別／欄位來源導覽、保守未知狀態、明確同意的精簡匯出及清除。固定 graphql17.0.2，input/output nullability 分開判斷；無效 extension、自訂 directive、歸屬不明不宣告安全。完整 mise exec -- pnpm verify 無快取通過：449 單元／套件、88 production E2E、格式與 strict、build、audit；既有 TypeScript7 experimental API 提示保留。獨立 Oracle1 與結構審查 PASS、七張目前合成截圖已檢視。證據 docs/validation/stw-11/README.md。接受靜態／單層引用／歸屬保守及非匿名匯出限制；沒有 push 或部署。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
已交付 GraphQL SDL 靜態差異、input/output 相容性分類、型別／欄位來源導覽、固定範例及本機精簡匯出。449 單元／套件與88 E2E、完整 verify、獨立安全及結構審查通過；五項 AC 皆有證據，詳見 docs/validation/stw-11/README.md。
<!-- SECTION:FINAL_SUMMARY:END -->
