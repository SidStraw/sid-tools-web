---
id: STW-20
title: 未使用程式碼與相依套件的審查工作流程
status: Needs Refinement
assignee: []
created_date: '2026-10-04 15:33'
updated_date: '2026-10-14 12:06'
labels:
  - keyword-research
  - proposal
  - monorepo-expansion
  - delivery-cli-ci
  - later-delivery
  - demand-reviewed-2026-10-14
  - deferred-evidence
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
- [ ] #1 每個候選包含來源、分析引擎版本、入口設定及判定依據。
- [ ] #2 dynamic import、框架隱式入口及外部消費的 exports 顯示限制。
- [ ] #3 支援基準與忽略原因，能區分新增問題和已接受的舊問題。
- [ ] #4 預設不刪檔；任何修正另有預覽、可回復操作與建置驗證。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

真實 issue #589（2024-04-08，已關閉）及 #1732（2026-05-08，已關閉）顯示誤報問題；Knip 已有 entry/plugin 診斷，不能把舊 bug 視為現行未解市場缺口。

提升／重新納入條件：證明現行版本可重現的複核負擔，先評估整合現成分析器，而非重寫。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-other-cards.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。
<!-- SECTION:NOTES:END -->
