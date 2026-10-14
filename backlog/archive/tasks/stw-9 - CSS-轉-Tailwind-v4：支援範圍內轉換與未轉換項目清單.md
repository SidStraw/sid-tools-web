---
id: STW-9
title: CSS 轉 Tailwind v4：支援範圍內轉換與未轉換項目清單
status: Needs Refinement
assignee: []
created_date: '2026-10-04 14:23'
updated_date: '2026-10-14 12:06'
labels:
  - keyword-research
  - proposal
  - frontend
  - delivery-web
  - web-first
  - extension-cli
  - extension-ide
  - demand-reviewed-2026-10-14
  - excluded-standalone
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_09/08_032927.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/16_034816.md
  - 'https://dozenkit.com/tools/css-to-tailwind'
  - 'https://www.tailwindready.com/tools/css-to-tailwind-converter'
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-pruning.md
priority: low
type: feature
ordinal: 909
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

來源多次出現 CSS 到 Tailwind 轉換，但完整 CSS 語意不能靠逐字替換保證一致。值得探索的範圍是明確、可預覽的小段樣式搬移。

## 首版邊界

首版限定單一規則內的靜態 spacing、size、color 與基本 layout 宣告，明確標示 Tailwind v4；不自動搬整站。

## 差異與待驗證假設

完整列出已轉換、需 arbitrary value 與不支援項目，避免給出看似完成卻改變畫面的結果。

## 關鍵字證據與合併

- `css to tailwind converter online`：35 份報告出現。
- `css to tailwind v4`：1 份報告出現。
- `css to tailwind class converter`：56 份報告出現。

本卡合併 13 個唯一關鍵字，來自 61 份報告、161 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: tailwind）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/16_034816.md 至 logs/2026_09/08_032927.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI 批次樣式轉換與 IDE 輔助。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 對支援的 CSS 宣告產生可用於指定 Tailwind v4 版本的 class，顯示逐項映射。
- [ ] #2 selector、媒體查詢、變數、!important 或其他未支援特性不被靜默丟棄。
- [ ] #3 衝突宣告與 arbitrary value 有明確處理，提供轉換前後可比較的固定範例。
- [ ] #4 結果附 Tailwind 版本、限制與未轉換清單；不得宣稱任意 CSS 都能等價轉換。
- [ ] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / archive。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

排除獨立排程，因 v4、arbitrary 與未轉換清單已是現成工具宣告能力，已缺乏可辨認差異。 多個現成工具明確針對 v4 與逐項映射；未取得可靠使用頻率。

提升／重新納入條件：找到現有免費工具對本卡支援子集持續失敗的實例，並有可驗證的遷移需求／省時幅度。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-pruning.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。
<!-- SECTION:NOTES:END -->
