---
id: STW-14
title: OpenAPI 回應範例產生器：可驗證、可重現的 mock fixture
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
  - extension-service
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/03_042558.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_09/01_033208.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/26_035558.md
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
priority: medium
type: feature
ordinal: 14
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

前端開發與測試需要符合 schema 的固定回應範例；架一個 mock server 常比取得一份可用 fixture 更費工。

## 首版邊界

首版限定 OpenAPI 3.0.x 選定 operation、status 與 JSON schema 子集，輸出本機 JSON fixture；不提供託管 API 或真正的網路模擬。

## 差異與待驗證假設

輸出對照 schema 的驗證結果與固定 seed；mock server 關鍵字僅提供鄰近意圖，不能當成離線 fixture 已有需求的證據。

## 關鍵字證據與合併

- `openapi mock data generator`：3 份報告出現。
- `openapi mock generator`：2 份報告出現。
- `api mock data generator`：4 份報告出現。

本卡合併 10 個唯一關鍵字，來自 24 份報告、31 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: mock-fixtures）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/26_035558.md 至 logs/2026_09/01_033208.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI／CI fixture 產生；Mock API runtime 另有候選。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 選擇 operation 與 response status 後可產生 JSON fixture，優先使用有效 example 並說明資料來源。
- [ ] #2 相同文件、選項與 seed 得到相同結果；必填、enum、array 與基本限制在支援範圍內被驗證。
- [ ] #3 遇到循環 $ref、未支援 oneOf／格式或外部引用時明確提示，不聲稱產物一定符合完整規格。
- [ ] #4 可下載 fixture 與驗證摘要，所有資料為 synthetic 且不代替真實 API 契約測試。
- [ ] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->
