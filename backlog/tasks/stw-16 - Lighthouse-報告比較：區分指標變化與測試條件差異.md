---
id: STW-16
title: Lighthouse 報告比較：區分指標變化與測試條件差異
status: Needs Refinement
assignee: []
created_date: '2026-10-04 14:23'
updated_date: '2026-10-04 15:33'
labels:
  - keyword-research
  - proposal
  - performance
  - delivery-web
  - web-first
  - extension-cli
  - extension-ci
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_09/05_032812.md
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
priority: medium
type: feature
ordinal: 16
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

兩份 Lighthouse 分數不同可能來自測試環境或版本，而非程式改動；需要先確認可比性再看 audit 變化。

## 首版邊界

上傳兩份既有 Lighthouse JSON，檢查版本、URL、裝置及節流設定後比較指標與 audit；不執行遠端掃描、不建立持續監控服務。

## 差異與待驗證假設

先揭露量測條件差異，避免把單次分數上升當成改善證據，並讓使用者匯出可審查的對照。

## 關鍵字證據與合併

- `lighthouse report diff tool`：1 份報告出現。
- `lighthouse report compare`：1 份報告出現。
- `lighthouse comparison`：1 份報告出現。

本卡合併 3 個唯一關鍵字，來自 1 份報告、3 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: lighthouse-diff）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_09/05_032812.md 至 logs/2026_09/05_032812.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI／CI 既有 Lighthouse 報告比較。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 比較指定支援版本的 category、metric 與 audit，缺少欄位標為 unavailable 而非 0。
- [ ] #2 明顯不同的 URL、form factor、throttling 或 major version 顯示可比性警告。
- [ ] #3 區分數值變化與因果推論，不宣稱單次報告已證實效能提升。
- [ ] #4 可匯出含量測條件、原始值與差值的報告，以固定 JSON 範例驗證。
- [ ] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->
