---
id: STW-33
title: 驗證截圖轉元件草稿與視覺差異檢查的可行性
status: Needs Refinement
assignee: []
created_date: '2026-10-04 15:33'
labels:
  - keyword-research
  - proposal
  - monorepo-expansion
  - delivery-web-ai
  - later-delivery
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_05/12_042852.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/26_033603.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_06/05_044726.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/30_035819.md
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
priority: low
type: spike
ordinal: 36
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

值得保留較長期的 AI 輔助 UI 方向，但圖像相似不等於 DOM、互動與可維護性正確，先以評估題目納入。

## 交付形式與首版邊界

主要形式：web-ai。順序：後續交付／較高成本探索。

Web 操作優先，以固定樣本取得元件草稿並比較渲染結果；先不決定 provider 或承諾完整應用程式產生。

## 延伸方向與相鄰題目

若評估成立再拆成輸入、草稿產生及人工修正循環，可能需要 AI 服務和隔離渲染環境。

## 關鍵字來源與合併

代表原始詞：`screenshot to react component`; `screenshot to html css`; `figma to react components`。

本題合併 20 個相關唯一詞，來自 7 份報告、23 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: screenshot-eval）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 建立含不同版型、狀態與解析度的合法參考樣本及評分方式。
- [ ] #2 分開量測視覺相似、語意結構、互動完整性及人工修正時間。
- [ ] #3 記錄模型／工具版本、成本與重現限制，錯誤不能用人工補圖掩蓋。
- [ ] #4 生成內容只能在隔離環境預覽，交付繼續／縮小／停止的研究結論。
<!-- AC:END -->
