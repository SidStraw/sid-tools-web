---
id: STW-18
title: Monorepo 相依圖與重複套件追蹤
status: Needs Refinement
assignee: []
created_date: '2026-10-04 15:33'
updated_date: '2026-10-14 12:06'
labels:
  - keyword-research
  - proposal
  - monorepo-expansion
  - delivery-local-cli-web
  - later-delivery
  - demand-reviewed-2026-10-14
  - deferred-evidence
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_06/17_045338.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/16_033245.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/17_033251.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_02/08_041306.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_09/08_032927.md
  - 'https://nx.dev/docs/features/explore-graph'
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-other-cards.md
priority: low
type: feature
ordinal: 118
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

大型專案難以追查套件為何被引入、重複版本來自哪些 workspace。需要讀取 repo 不再是排除理由。

## 交付形式與首版邊界

主要形式：local-cli-web。順序：後續交付／較高成本探索。

先支援一種明示版本的 lockfile 與 workspace 設定；本機 CLI 收集，Web 檢視直接／間接相依與重複版本。

## 延伸方向與相鄰題目

後續可加入版本升級影響與 CI 差異報告；未使用程式碼另見對應候選，這張只回答相依關係。

## 關鍵字來源與合併

代表原始詞：`monorepo dependency graph`; `npm find duplicate packages`; `dependency graph visualization online`。

本題合併 30 個相關唯一詞，來自 26 份報告、63 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: dependency-graph）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 每條邊可追到 manifest／lockfile，能查出某套件由哪些 workspace 引入。
- [ ] #2 同名多版本與 peer context 有清楚區分，不直接把每個重複版本判定為可刪。
- [ ] #3 遇到不支援 lockfile 或不完整資料顯示限制；不執行 repo 內任意 script。
- [ ] #4 本機輸出可由 Web 開啟並移除機密路徑；不預設上傳整個 repo。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

Nx 已提供圖、依賴路徑與靜態輸出；跨 package-manager 重複套件追蹤需 repo 整合，流量入口未證實。

提升／重新納入條件：取得 Nx 現有流程不能完成且使用者要獨立工具的跨 workspace 案例。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-other-cards.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。
<!-- SECTION:NOTES:END -->
