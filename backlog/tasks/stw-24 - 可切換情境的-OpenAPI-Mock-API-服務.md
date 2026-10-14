---
id: STW-24
title: 可切換情境的 OpenAPI Mock API 服務
status: Needs Refinement
assignee: []
created_date: '2026-10-04 15:33'
labels:
  - keyword-research
  - proposal
  - monorepo-expansion
  - delivery-web-service
  - later-delivery
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/09_035100.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_07/06_044458.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_04/11_040629.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_02/03_040231.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_09/01_033208.md
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
priority: low
type: feature
ordinal: 31
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

前端整合需要真的可呼叫 endpoint，以及延遲、錯誤與不同 response 情境，這超過下載 fixture 的需求。

## 交付形式與首版邊界

主要形式：web-service。順序：後續交付／較高成本探索。

先跑本機單一 OpenAPI 合約的 mock service，Web 選擇情境；Prism 等既有引擎列為優先比較基準。

## 延伸方向與相鄰題目

與 STW-14 的 fixture 能力可協作；後續可加入 CI 啟動與團隊分享，先不承諾多租戶平台。

## 關鍵字來源與合併

代表原始詞：`openapi mock server generator`; `openapi to mock server`; `api mock server online`。

本題合併 13 個相關唯一詞，來自 15 份報告、28 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: mock-runtime）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 依 operation／status 選擇固定 fixture 或可重現產生規則。
- [ ] #2 延遲與錯誤情境可切換並記錄當次設定，重啟後可重現。
- [ ] #3 不支援規格、未解析引用與無匹配路由明確回報。
- [ ] #4 本機服務有明確啟停與監聽範圍，不默默轉發真實 API 或公開敏感 schema。
<!-- AC:END -->
