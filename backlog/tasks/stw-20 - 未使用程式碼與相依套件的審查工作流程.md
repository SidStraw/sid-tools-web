---
id: STW-20
title: 未使用程式碼與相依套件的審查工作流程
status: Done
assignee:
  - '@codex'
created_date: '2026-10-04 15:33'
updated_date: '2026-10-22 20:01'
labels:
  - keyword-research
  - monorepo-expansion
  - delivery-cli-ci
  - later-delivery
  - demand-reviewed-2026-10-14
  - implemented
  - local-verified
  - market-validation-pending
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/22_035403.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_02/20_040225.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_04/28_042816.md
  - 'https://knip.dev/guides/handling-issues'
  - 'https://github.com/webpro-nl/knip/issues/589'
  - 'https://github.com/webpro-nl/knip/issues/1732'
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-other-cards.md
priority: low
type: feature
ordinal: 120
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

清理專案需要可追溯候選與誤判處理，不只是一份 unused 名單。既有 Knip 等引擎可作為整合候選。

## 交付形式與首版邊界

主要形式：cli-ci。順序：後續交付／較高成本探索。

先聚焦 JS／TS repo 的唯讀分析；CSS 若無 runtime coverage 只列候選，不宣告可安全刪除。

## 延伸方向與相鄰題目

延伸為 baseline、忽略原因、CI 增量審查與 IDE 導覽；先驗證整合價值，不重造所有分析引擎。

## 關鍵字來源與合併

代表原始詞：`dead code detector typescript`; `unused code detector`; `detect unused css`。

本題合併 5 個相關唯一詞，來自 3 份報告、5 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: unused-review）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 每個候選包含來源、分析引擎版本、入口設定及判定依據。
- [x] #2 dynamic import、框架隱式入口及外部消費的 exports 顯示限制。
- [x] #3 支援基準與忽略原因，能區分新增問題和已接受的舊問題。
- [x] #4 預設不刪檔；任何修正另有預覽、可回復操作與建置驗證。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 整合固定版本 Knip（先查核 6.42.1 與專案 Node／三天 release-age 規則），使用原生 JSON reporter；不自製 unused 引擎、不使用 fix/remove 選項。
2. 明確記錄 JS/TS 專案入口、project 範圍、workspace 與引擎版本／設定摘要。先在本專案及可重現 fixture 跑實際分析，保留 dynamic import、框架隱式入口與外部 exports 的限制；任何結果都是審查候選。
3. 建立 readonly CLI 報告整合與既有 lazy SPA 檢視，支援 baseline、逐項接受原因、新增／既有／已接受／已消失分類；設定或引擎不同時要求重新檢視基準。報告不含 source 或 secret 值，Web 不讀 repo、不上傳輸入。
4. 使用 Knip 真實輸出測試引擎資訊、來源、基準與忽略理由；加入錯誤／不相容條件、CLI、瀏覽器、SPA 清除與完整 pnpm verify。只提供審查，不自動刪檔或套用修正。
5. 保存可重現案例與已知限制，逐項驗收後完成本機 commit；不自動 push 或部署。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

真實 issue #589（2024-04-08，已關閉）及 #1732（2026-05-08，已關閉）顯示誤報問題；Knip 已有 entry/plugin 診斷，不能把舊 bug 視為現行未解市場缺口。

提升／重新納入條件：證明現行版本可重現的複核負擔，先評估整合現成分析器，而非重寫。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-other-cards.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

## 2026-10-23 介入需求盤點

可直接推進：自行比較並整合既有 JS/TS 分析器，以本專案及可追溯公開樣本驗證唯讀結果、baseline、忽略原因與誤判限制。使用者不需先提供樣本；不自動刪檔。

本次只分類責任與下一步，不代表驗收完成、流量需求已證實或已授權遠端發佈；保留既有 AC 與狀態。

2026-10-23 選型查核：Knip 官方 JSON reporter 提供按檔案分組的 issues，workspace 設定支援各自 entry/project。來源 https://knip.dev/features/reporters、https://knip.dev/reference/configuration、https://knip.dev/features/monorepos-and-workspaces。npm registry 查得 6.42.1，發布 2026-10-19T18:24:59.186Z，engines ^20.19.0 || >=22.12.0；目前專案 Node 24.21.0 相容且已超過 4320 分鐘。尚未安裝、分析或驗收；API／輸出實際形狀須依 pinned 套件再確認。

2026-10-23 進度：Knip 6.42.1 已透過 repo-local catalog 安裝；原生 JSON 實測先得 20 檔案群組／86 候選，明示 public source、Worker 與測試入口後得 4 群組／4 候選。數量下降不等同刪除正確性；沒有使用 --fix 或移除來源。兩份真實輸出與可重現設定保存於 docs/validation/stw-20，根目錄 knip.json。已核對 pinned JSONReport、ReporterOptions 及 CLI exit 1（有候選）／2（執行或設定失敗）語意。原生 plugin 可能載入 JS/TS 設定，整合須說明僅對受信任 repo 使用。尚未完成 CLI 封裝、baseline/接受原因、SPA 與測試，所有 AC 仍未勾選。

2026-10-23 完成：固定 Knip 6.42.1 原生分析、context metadata、來源 SHA256、baseline 與逐項接受理由、CLI 增量審查及第 19 個 lazy SPA 工具頁。實際 fixture 驗證動態匯入／公開入口、來源變更撤銷接受、設定不相容、引擎失敗與唯讀行為；瀏覽器驗證下載重載、320px、清除與 history。完整 pnpm verify exit 0：950 單元／整合、141 E2E，格式／lint／type／build／production audit 通過。本專案連續兩次實掃均為 8 workspace、27 context file、5 候選，未刪除來源或代填接受理由。逐項證據：docs/validation/stw-20/README.md。未 push／部署，需求與流量效益仍未驗證。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
整合 repo-local Knip 6.42.1、唯讀 CLI 與 SPA 審查頁，提供來源／入口／引擎證據、baseline 和接受理由；設定或來源改變時不沿用舊接受。950 單元／整合與 141 E2E 及完整 pnpm verify 通過；實測與限制記錄於 docs/validation/stw-20。所有 4 項 AC 已有客觀證據，本機交付完成，未發佈。
<!-- SECTION:FINAL_SUMMARY:END -->
