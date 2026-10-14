---
id: STW-26
title: API Rate Limit 模擬器：突發流量與等待時間預覽
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
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_09/02_033041.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_07/21_042241.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_02/10_041242.md
  - 'https://theinfinity.dev/simulators/rate-limiter'
  - 'https://github.com/request-routing/ratelimit-simulator'
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-other-cards.md
priority: low
type: feature
ordinal: 926
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

選擇 token bucket／window 參數前，開發者需要了解突發流量、拒絕比例與等待時間，這可先做純 Web 模擬。

## 交付形式與首版邊界

主要形式：web。順序：Web 優先候選。

輸入合成請求時序及限流參數，明示演算法假設並顯示結果；不向真實 API 壓測。

## 延伸方向與相鄰題目

後續可匯出設定範例或匯入去識別的流量摘要；不把模擬直接視為供應商的實際行為。

## 關鍵字來源與合併

代表原始詞：`api rate limit calculator`; `api rate limit tester`; `api rate limit threshold`。

本題合併 13 個相關唯一詞，來自 9 份報告、23 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: rate-limit-sim）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 至少兩種明示的限流演算法能重現固定請求序列的接受／拒絕結果。
- [ ] #2 圖表顯示 token／window 狀態、等待時間與邊界行為。
- [ ] #3 參數非法、極端數量與同時到達請求有明確限制及規則。
- [ ] #4 可匯出情境設定，結果標示 synthetic 且不發送任何測試請求。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / archive。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

The Infinity 已有三種演算法、burst 流量與允許／拒絕預覽；互動本身不足差異，本輪未找到本站增量需求。

提升／重新納入條件：重新納入須有真實流量案例與現成 simulator 缺口，不能只做動畫／演算法解說。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-other-cards.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。
<!-- SECTION:NOTES:END -->
