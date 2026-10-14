---
id: STW-29
title: API 範例推導 TypeScript／Zod：呈現型別依據與不確定性
status: Needs Refinement
assignee: []
created_date: '2026-10-04 15:33'
updated_date: '2026-10-14 12:06'
labels:
  - keyword-research
  - proposal
  - monorepo-expansion
  - delivery-web
  - web-first
  - demand-reviewed-2026-10-14
  - excluded-standalone
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/07_041011.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_04/13_042419.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_06/24_044317.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/31_033132.md
  - 'https://quicktype.io/'
  - 'https://github.com/weitaishan/schemato'
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-pruning.md
priority: low
type: feature
ordinal: 929
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

從一份 JSON 猜 schema 容易把偶然出現的值視為必填或 enum；可發展多份樣本對照及推導依據，與單純程式碼產生器區分。

## 交付形式與首版邊界

主要形式：web。順序：Web 優先候選。

Web 貼上多份 JSON，展示 inferred 型別、missing／null 差異與使用者確認的限制，再匯出 TypeScript 或 Zod。

## 延伸方向與相鄰題目

後續可提供 CLI 與 CI schema drift 檢查；quicktype 等既有工具是基準，不能假設本題已填補市場缺口。

## 關鍵字來源與合併

代表原始詞：`json to typescript interface`; `json to typescript type generator`; `typescript interface to zod`。

本題合併 29 個相關唯一詞，來自 12 份報告、33 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: sample-types）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 每個推導欄位可追到樣本，區分 absent、null、空陣列及異質型別。
- [ ] #2 不可只因單一樣本推定 enum、字串格式或商業驗證限制。
- [ ] #3 輸出可通過所選版本的型別／schema 驗證，且標明推導假設。
- [ ] #4 原始範例只在瀏覽器處理；提供使用者確認選項與可重現輸出。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / archive。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

排除獨立生成器排程；保留樣本追溯研究線索，可未來與 STW-3 schema drift 評估整合。 quicktype 官方直接涵蓋多樣本、missing/null、union、Zod；Schemato 亦宣告多樣本瀏覽器輸出。

提升／重新納入條件：至少 3 組真實 API 樣本能展示基準誤推造成實際返工，且來源追溯比現成工具可量測改善；不能只重述多樣本。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-pruning.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。
<!-- SECTION:NOTES:END -->
