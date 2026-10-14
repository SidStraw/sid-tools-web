---
id: STW-7
title: CSS selector 比較：特異性拆解與 HTML 命中預覽
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
  - extension-ide
  - demand-reviewed-2026-10-14
  - deferred-evidence
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_07/24_042253.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_07/26_042516.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/24_034550.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_09/01_033208.md
  - 'https://toolhuben.com/css-specificity-calculator/'
  - 'https://www.toolhuben.com/css-selector-tester/'
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-other-cards.md
priority: low
type: feature
ordinal: 107
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

樣式衝突常混淆 selector 沒有命中與特異性不足，單一分數無法區分這兩種原因。

## 首版邊界

輸入小段 HTML 與數個 selector，同時查看命中元素與特異性拆解；首版不宣稱模擬完整 cascade、layer、動畫與瀏覽器樣式。

## 差異與待驗證假設

同頁連動 selector 命中與繁中解釋；既有 specificity calculator 已支援 Selectors Level 4，這裡需驗證教學與排錯流程的額外價值。

## 關鍵字證據與合併

- `css specificity calculator online`：12 份報告出現。
- `css selector specificity calculator`：7 份報告出現。
- `css selector tester online`：1 份報告出現。

本卡合併 13 個唯一關鍵字，來自 18 份報告、42 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: css-specificity）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/24_034550.md 至 logs/2026_09/01_033208.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：IDE selector 診斷。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 各 selector 顯示特異性三元組與貢獻來源，包含 :is、:not、:has、:where 的案例。
- [ ] #2 在隔離的 HTML 預覽中標示命中元素，空命中與無效 selector 有不同提示。
- [ ] #3 說明 specificity 不代表完整 cascade 結果，遇到未支援語法不能給出假精確排名。
- [ ] #4 使用者提供的 HTML 不執行 script、不載入外部資源，可複製對照結果。
- [ ] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

權重計算與 DOM match 工具供給密集；未取得需要整合兩者的獨立需求，亦未實跑競品。

提升／重新納入條件：取得真實錯誤定位任務，證明比瀏覽器 DevTools／既有 tester 更省步驟。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-other-cards.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。
<!-- SECTION:NOTES:END -->
