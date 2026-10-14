---
id: STW-32
title: Dockerfile 變更預檢與掃描結果整合
status: Needs Refinement
assignee: []
created_date: '2026-10-04 15:33'
labels:
  - keyword-research
  - proposal
  - monorepo-expansion
  - delivery-cli-ci
  - later-delivery
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_02/19_040534.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_07/18_041554.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/11_035210.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/18_035246.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/16_033245.md
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
priority: low
type: feature
ordinal: 35
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

Dockerfile 靜態問題、image 掃描與實際體積結果常散落在不同工具；可發展可追溯的變更審查流程。

## 交付形式與首版邊界

主要形式：cli-ci。順序：後續交付／較高成本探索。

先整合一種 linter 與可選的 image scan 結果，分開靜態建議、已掃描發現與尚未執行項目。

## 延伸方向與相鄰題目

可延伸 CI gate 和修正前後的真實 image 比較；不重造漏洞資料庫或宣稱改寫必定最佳化。

## 關鍵字來源與合併

代表原始詞：`dockerfile linter online`; `dockerfile optimization tool`; `dockerfile vulnerability scanner`。

本題合併 20 個相關唯一詞，來自 16 份報告、52 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: dockerfile-review）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 每項結果列出規則／掃描器版本、位置與判定依據。
- [ ] #2 沒有 image 或 scan 證據時，不宣告無漏洞或體積已改善。
- [ ] #3 靜態輸入不自動執行 Docker build；需要建置時先明示執行範圍。
- [ ] #4 輸出可審查報告與建議，保留誤判註記及可重現樣本。
<!-- AC:END -->
