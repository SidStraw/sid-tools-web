---
id: STW-3
title: API JSON 差異比較：忽略動態欄位並依識別鍵對齊陣列
status: Needs Refinement
assignee: []
created_date: '2026-10-04 14:23'
updated_date: '2026-10-04 15:33'
labels:
  - keyword-research
  - proposal
  - api
  - delivery-web
  - web-first
  - extension-cli
  - extension-ci
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/18_035246.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/24_033520.md
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
priority: high
type: feature
ordinal: 3
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

比較兩次 API 回應時，timestamp、request ID 與陣列順序會淹沒真正的欄位變更。來源的回應差異需求很明確，但樣本不多，需求強度仍待驗證。

## 首版邊界

輸入兩份 JSON，設定忽略路徑與單一陣列識別鍵，產生結構化差異；不代呼叫遠端 API。

## 差異與待驗證假設

以 API 回歸檢查為切角；泛用 JSON diff 已有成熟工具，必須驗證可設定對齊與可匯出規則是否省時。

## 關鍵字證據與合併

- `json formatter and diff checker`：1 份報告出現。
- `api response difference`：2 份報告出現。
- `api same request different response`：2 份報告出現。

本卡合併 5 個唯一關鍵字，來自 3 份報告、8 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: api-diff）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/18_035246.md 至 logs/2026_08/24_033520.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI／CI 回應 fixture 比較。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 比較結果區分新增、移除、值改變與型別改變，物件鍵順序不造成差異。
- [ ] #2 忽略欄位規則可預覽且匯出報告會列出被忽略的路徑，避免把被排除的變更說成完全相同。
- [ ] #3 陣列可依指定鍵對齊；重複或缺少識別鍵必須提示，不得任意配對。
- [ ] #4 錯誤 JSON 能定位問題；大數字不因解析精度遺失被誤判相同，並提供可重現範例。
- [ ] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->
