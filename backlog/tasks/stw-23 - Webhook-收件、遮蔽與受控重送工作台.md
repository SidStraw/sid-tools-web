---
id: STW-23
title: Webhook 收件、遮蔽與受控重送工作台
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
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_05/21_044613.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_02/23_040806.md
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
priority: low
type: feature
ordinal: 30
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

整合外部事件時需要保存原始請求、檢查格式並重現失敗。已有 Webhook.site，應驗證本機／自架與可控重送的工作流程差異。

## 交付形式與首版邊界

主要形式：web-service。順序：後續交付／較高成本探索。

Web 介面加接收服務；先提供單人、自架或本機範圍，另行決定外部服務如何安全到達接收端。

## 延伸方向與相鄰題目

可發展事件情境組、簽章驗證 adapter、團隊協作；不是 STW-3 的兩份靜態回應比較。

## 關鍵字來源與合併

代表原始詞：`webhook test server`; `webhook test site`; `webhook testing free`。

本題合併 5 個相關唯一詞，來自 3 份報告、6 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: webhook-debug）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 顯示收件時間、method、headers 與 body，敏感欄位可遮蔽並有保留期限。
- [ ] #2 重送先預覽目標與內容並由使用者明確觸發，結果保留對應來源事件。
- [ ] #3 限制允許的目標與請求量，不把內部網路或任意公開位址當作無限制代理。
- [ ] #4 能清除事件並記錄接收端曝露範圍；自架模式與公開託管的成本分開評估。
<!-- AC:END -->
