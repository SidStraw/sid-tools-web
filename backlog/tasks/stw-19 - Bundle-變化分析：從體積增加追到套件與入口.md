---
id: STW-19
title: Bundle 變化分析：從體積增加追到套件與入口
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
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_07/03_043208.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/17_034242.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/08_034536.md
  - 'https://relative-ci.com/documentation/metrics-and-data'
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-other-cards.md
priority: low
type: feature
ordinal: 119
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

只有 build 大小警告無法知道是哪個 import 或共用 chunk 造成成長；這是需真實 build 資料的工具機會。

## 交付形式與首版邊界

主要形式：local-cli-web。順序：後續交付／較高成本探索。

先支援一個 bundler 的固定報告格式，比較 base／candidate 兩次產物並用 Web 呈現。

## 延伸方向與相鄰題目

可延伸 CI 體積預算與 PR 報告；與 Lighthouse 的 runtime audit 比較分開。

## 關鍵字來源與合併

代表原始詞：`bundle size analyzer vite`; `bundle size analyzer online`; `npm package size comparison`。

本題合併 12 個相關唯一詞，來自 7 份報告、19 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: bundle-diff）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 區分 raw、gzip 與可取得的其他壓縮大小，明列量測環境與入口。
- [ ] #2 變化能追到 module／package／chunk，無法歸因的部分明確保留。
- [ ] #3 不同 build 設定或缺少 metadata 時提示不可直接比較。
- [ ] #4 先提供唯讀差異與預算判定，不自動移除套件或重寫 imports。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

RelativeCI 已有跨 build 資產與模組、重複套件分析；需要 build metadata 的導入成本不能當成搜尋流量。

提升／重新納入條件：以同一組 build 報告證明歸因品質或比較成本的增量；不要用單套件體積取代真實 build。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-other-cards.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。
<!-- SECTION:NOTES:END -->
