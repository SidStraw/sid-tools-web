---
id: STW-23
title: Webhook 收件、遮蔽與受控重送工作台
status: Needs Refinement
assignee: []
created_date: '2026-10-04 15:33'
updated_date: '2026-10-22 19:26'
labels:
  - keyword-research
  - proposal
  - monorepo-expansion
  - delivery-web-service
  - later-delivery
  - demand-reviewed-2026-10-14
  - deferred-evidence
  - user-input-needed
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_05/21_044613.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_02/23_040806.md
  - 'https://docs.webhook.site/custom-actions'
  - 'https://docs.webhook.site/news.html'
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-other-cards.md
priority: low
type: feature
ordinal: 123
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

Webhook.site 已有擷取、篩選與 replay；服務營運與敏感資料責任高。需求可能真實，但本站差異與獲客成本未證實。

提升／重新納入條件：證明特定事件調查或可覆核遮蔽流程優於既有工具，並估算每次使用成本。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-other-cards.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

## 2026-10-15 實作阻礙與本輪略過

最新要求已取代先前因市場需求而暫緩的決定；本輪略過僅因下列輸入／證據尚未建立或確認，不代表完成。

- 待補項目：尚未確認接收端的本機／自架曝露與驗證方式、重送目標允許清單、DNS／redirect／內部網路限制，以及請求量與事件保留規則。
- 驗收影響：AC1、AC3、AC4 要求保留期限、受控重送與曝露邊界；未確認這些安全選擇，不能把任意目標代理或公開接收端當成已驗收方案。
- 解除方式：提出接收與重送的安全邊界、遮蔽及清除規則，依執行指南取得涉及安全／架構決策的計畫核准，再實作及驗證；不預設開放公網或代用隧道服務。

維持原狀態、描述與既有紀錄，所有 AC 維持未勾選；本輪不宣告完成。

## 2026-10-23 介入需求盤點

需要使用者決策的最小項目：是否只做本機／自架，以及是否需要讓外部服務連入、可重送的目標範圍。代理可先提出具體接收／重送方案與保留期限預設、準備本機測試。依 task-execution guide，涉及曝露與服務架構的實質選擇需確認後再實作；不要求使用者自行設計所有安全細節。

本次只分類責任與下一步，不代表驗收完成、流量需求已證實或已授權遠端發佈；保留既有 AC 與狀態。
<!-- SECTION:NOTES:END -->
