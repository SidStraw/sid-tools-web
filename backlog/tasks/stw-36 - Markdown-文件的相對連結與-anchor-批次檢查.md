---
id: STW-36
title: Markdown 文件的相對連結與 anchor 批次檢查
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
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_06/12_045343.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/08_034536.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_04/25_041218.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_02/13_040708.md
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
priority: low
type: feature
ordinal: 37
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

monorepo 文件改名或搬移後，相對路徑與 heading anchor 容易失效，需要 repo 上下文及 renderer 規則。

## 交付形式與首版邊界

主要形式：cli-ci。順序：後續交付／較高成本探索。

先本機檢查 Markdown 檔案、相對路徑、圖片與 anchor，外部連結檢查作為可選步驟。

## 延伸方向與相鄰題目

可延伸 CI baseline、IDE 提示與 Web 報告；STW-17 檢查 sitemap XML，不負責 repo 文件連結。

## 關鍵字來源與合併

代表原始詞：`markdown link validator`; `markdown link check pre commit`; `markdown linter online`。

本題合併 12 個相關唯一詞，來自 4 份報告、15 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: markdown-links）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 每個錯誤可定位來源檔案及目標，區分不存在檔案、缺少 anchor 與無法判斷。
- [ ] #2 明示 heading anchor 產生規則，code block 內的範例不當成真實連結。
- [ ] #3 支援忽略規則與增量結果，外部請求需可停用並限制頻率。
- [ ] #4 不自動重寫文件；修正若提供，先顯示差異與回復方式。
<!-- AC:END -->
