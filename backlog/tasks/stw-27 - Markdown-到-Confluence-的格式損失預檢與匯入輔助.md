---
id: STW-27
title: Markdown 到 Confluence 的格式損失預檢與匯入輔助
status: Needs Refinement
assignee: []
created_date: '2026-10-04 15:33'
updated_date: '2026-10-22 19:26'
labels:
  - keyword-research
  - proposal
  - monorepo-expansion
  - delivery-web-integration
  - web-first
  - demand-reviewed-2026-10-14
  - validate-next
  - user-input-needed
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_05/22_044158.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_04/09_041123.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/13_055344.md
  - >-
    https://community.atlassian.com/forums/discussion/1886974/how-to-import-pages-with-markdown-format-into-confluence
  - >-
    https://community.atlassian.com/forums/discussion/2799601/how-do-i-enable-the-options-to-import-word-and-markdown-to-a-page
  - >-
    https://marketplace.atlassian.com/apps/1221333/markdown-importer-for-confluence
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-pruning.md
priority: medium
type: feature
ordinal: 6
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Medium / validate。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

Medium 條件式保留預檢驗證，先選定 Cloud 或 Data Center；不是重新做通用轉換器。 官方社群有批次千頁移轉／Markdown 匯入的第一手問題；現在有付費 importer 宣告相對連結、附件及命名衝突處理。

提升／重新納入條件：至少 3 組真實文件在指定平台與現成 importer 比較，量測預檢發現的遺漏和人工修復時間；若無增量價值停止。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-pruning.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

## 2026-10-15 實作阻礙與本輪略過

最新要求已取代先前因市場需求而暫緩的決定；本輪略過僅因下列輸入／證據尚未建立或確認，不代表完成。

- 待補項目：尚未確認採用 Confluence Cloud 或 Data Center、目標版本／內容表示法，以及實際平台對照的可用環境與紀錄。
- 驗收影響：缺少目標規格與實測，無法如實滿足 AC1 的轉換定位及 AC2 的平台結果對照。
- 解除方式：確認目標與授權測試方式，對照表格、code block、相對連結及圖片並保存來源與損失；直接匯入為選配，不把 API 憑證當成離線預檢的必要條件。

維持原狀態、描述與既有紀錄，所有 AC 維持未勾選；本輪不宣告完成。

## 2026-10-23 介入需求盤點

需要使用者介入的最小項目：確認要支援的 Confluence Cloud／Data Center 目標，以及可用的測試空間與操作授權。代理先準備格式樣本、轉換及逐項損失檢查；AC2 要實際平台結果，不能只用自行產生的 fixture 替代。直接匯入不是必要首版範圍。

本次只分類責任與下一步，不代表驗收完成、流量需求已證實或已授權遠端發佈；保留既有 AC 與狀態。
<!-- SECTION:NOTES:END -->
