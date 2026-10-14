---
id: STW-27
title: Markdown 到 Confluence 的格式損失預檢與匯入輔助
status: Needs Refinement
assignee: []
created_date: '2026-10-04 15:33'
labels:
  - keyword-research
  - proposal
  - monorepo-expansion
  - delivery-web-integration
  - web-first
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_05/22_044158.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_04/09_041123.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/13_055344.md
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
priority: medium
type: feature
ordinal: 19
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

轉換價值在表格、程式碼區塊、連結及版本差異的可預測性；有既有轉換器不代表所有交接需求已滿足。

## 交付形式與首版邊界

主要形式：web-integration。順序：Web 優先候選。

Web 預覽與損失清單優先，先選 Cloud 或 Data Center 的一種目標；帳號寫入作為後續明確操作。

## 延伸方向與相鄰題目

可發展批次文件移轉與內容同步；與 STW-4 的一般表格整理分開，這張承擔目標平台語意。

## 關鍵字來源與合併

代表原始詞：`markdown to confluence converter online`; `markdown to confluence table converter`。

本題合併 11 個相關唯一詞，來自 8 份報告、22 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: confluence-import）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 明示目標 Confluence 版本／內容表示法，產出對應轉換與逐項損失清單。
- [ ] #2 以表格、code block、相對連結與圖片案例對照實際目標平台結果。
- [ ] #3 unsupported macro 或格式不宣告保真，保留原始資料及定位。
- [ ] #4 若提供直接匯入，必須預覽目的頁、變更及授權範圍，再由使用者明確送出。
<!-- AC:END -->
