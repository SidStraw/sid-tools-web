---
id: STW-28
title: Markdown 到 Notion 的批次結構與連結保留檢查
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
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/27_050301.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_03/15_041152.md
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
priority: medium
type: feature
ordinal: 20
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

Notion 已支援匯入；可發展空間是批次文件間連結、附件與不支援 block 的損失檢查，而非再做普通上傳器。

## 交付形式與首版邊界

主要形式：web-integration。順序：Web 優先候選。

Web 先預覽文件樹與預計 block 映射，對照原生匯入結果；只保留證實額外省時的步驟。

## 延伸方向與相鄰題目

可延伸受控 API 匯入與可重試的移轉作業；與 Confluence 共用哪些解析能力留待驗證，不強行共用目標格式。

## 關鍵字來源與合併

代表原始詞：`markdown to notion blocks`; `markdown to notion api`; `markdown to notion converter`。

本題合併 7 個相關唯一詞，來自 9 份報告、28 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: notion-import）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 以至少 3 個含相對連結、圖片與巢狀文件的樣本比較原生匯入。
- [ ] #2 逐項標示保留、降級與無法處理的 block，保留來源路徑對照。
- [ ] #3 API 匯入若啟用，須有目的地預覽、已匯入項目對照與避免重複建立的策略。
- [ ] #4 若沒有可證明的額外價值，交付停止或縮小範圍的結論，不以原生功能包裝冒充新能力。
<!-- AC:END -->
