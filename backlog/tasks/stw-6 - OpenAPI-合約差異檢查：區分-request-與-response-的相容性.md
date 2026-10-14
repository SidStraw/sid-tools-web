---
id: STW-6
title: OpenAPI 合約差異檢查：區分 request 與 response 的相容性
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
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_04/07_041229.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/29_035902.md
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
priority: high
type: feature
ordinal: 6
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

API 規格改動需要知道消費端可能在哪裡壞掉，而不是只看 YAML 行差異；request 與 response 的 required 或 enum 變動方向也不同。

## 首版邊界

首版比較兩份 OpenAPI 3.0.x 文件的 path、operation、parameter、schema 與 response；3.1 和遠端 $ref 在確認支援前明確列為限制。

## 差異與待驗證假設

可定位原規格的相容性分類與原因，輸出方便放進變更審查；沒有完整判斷依據時顯示需人工判讀。

## 關鍵字證據與合併

- `openapi diff online`：2 份報告出現。
- `openapi diff checker`：1 份報告出現。

本卡合併 2 個唯一關鍵字，來自 2 份報告、3 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: openapi-diff）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/29_035902.md 至 logs/2026_04/07_041229.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI／CI 合約變更 gate。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 辨識 endpoint 移除、參數必填改變、型別／enum／response 改動並保留 JSON Pointer 定位。
- [ ] #2 request 與 response 分別採明示規則分類 breaking、non-breaking 或需人工判讀，不能只靠文字 diff。
- [ ] #3 內部 $ref、循環引用與不支援版本有明確行為；缺少外部引用時不宣告完整相容。
- [ ] #4 提供代表性相容／不相容 fixture 與可下載摘要，輸入文件的格式順序變動不產生假變更。
- [ ] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->
