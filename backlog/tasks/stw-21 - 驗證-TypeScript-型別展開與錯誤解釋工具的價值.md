---
id: STW-21
title: 驗證 TypeScript 型別展開與錯誤解釋工具的價值
status: Needs Refinement
assignee: []
created_date: '2026-10-04 15:33'
labels:
  - keyword-research
  - proposal
  - monorepo-expansion
  - delivery-ide
  - later-delivery
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_07/13_042615.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_06/10_044805.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/18_035246.md
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
priority: low
type: spike
ordinal: 28
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

conditional／mapped／generic 型別難以從 hover 看懂；IDE 可利用真實專案設定取得比孤立片段更有用的上下文。

## 交付形式與首版邊界

主要形式：ide。順序：後續交付／較高成本探索。

先用一種固定 TypeScript 版本比較既有 hover 與候選的展開／定位成果；不承諾自動改正型別。

## 延伸方向與相鄰題目

可發展 Web Playground 示範與 IDE 深入檢視；是否共用能力要由原型證據決定。

## 關鍵字來源與合併

代表原始詞：`typescript type expansion`; `typescript type debug`; `typescript debug type inference`。

本題合併 6 個相關唯一詞，來自 6 份報告、11 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: ts-type-explorer）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 整理至少 5 個真實複雜型別案例與既有工具基準。
- [ ] #2 展開結果以 TypeScript compiler 的實際結果為準，無法解析不得補造。
- [ ] #3 比較可理解性、回應時間與 tsconfig／版本差異並保存重現資料。
- [ ] #4 產出繼續／縮小／停止建議及第一個可驗收場景，研究完成不等於 IDE 外掛已完成。
<!-- AC:END -->
