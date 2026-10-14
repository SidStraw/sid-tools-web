---
id: STW-4
title: Markdown 表格整理與 JSON／試算表文字互轉
status: Needs Refinement
assignee: []
created_date: '2026-10-04 14:23'
updated_date: '2026-10-14 12:06'
labels:
  - keyword-research
  - proposal
  - content
  - delivery-web
  - web-first
  - extension-cli
  - demand-reviewed-2026-10-14
  - excluded-standalone
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/15_034940.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_07/08_042300.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_02/19_040534.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_07/22_042333.md
  - 'https://tableconvert.com/markdown-to-json'
  - 'https://mdtoword.org/zh-TW/markdown-to-json'
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-pruning.md
priority: low
type: feature
ordinal: 904
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

文件與 issue 常要在試算表、API 範例與 Markdown 表格間搬資料，手工排版容易破壞欄位及特殊字元。

## 首版邊界

首版支援貼上 TSV、JSON 物件陣列與 GitHub Flavored Markdown 表格，提供表格預覽與複製；不讀取雲端試算表帳號。

## 差異與待驗證假設

同時處理貼上資料、欄位預覽與有損轉換提示，減少複製到 issue 後才發現表格壞掉的情況。

## 關鍵字證據與合併

- `markdown table formatter online`：1 份報告出現。
- `markdown table to json`：1 份報告出現。
- `markdown table generator from excel`：1 份報告出現。

本卡合併 8 個唯一關鍵字，來自 4 份報告、8 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: markdown-table）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/15_034940.md 至 logs/2026_07/22_042333.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI 文件批次轉換。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 TSV 與 JSON 物件陣列可轉為 Markdown 表格，欄位順序可檢查，輸出符合指定的 GFM 子集。
- [ ] #2 Markdown 表格可轉 JSON；重複或空白欄名、不同列長度會要求使用者處理。
- [ ] #3 管線符號、反引號、空值、換行及前導零有明確保留或警告規則，不能默默改寫內容。
- [ ] #4 提供預覽與複製／下載，正常與特殊字元範例可重現轉換結果。
- [ ] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / archive。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

排除獨立排程，將來作 CSV 資料驗收的輸入／匯出附屬能力；競品已有預覽、編輯及多格式。 英文與繁中均有直接工具結果，說明產品供給與意圖匹配，不能推出流量大小。

提升／重新納入條件：以 3 組含前導零／重複欄名／特殊符號資料驗證基準不足，且能證明該缺口帶來增量流量或留存。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-pruning.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。
<!-- SECTION:NOTES:END -->
