---
id: STW-10
title: Git diff 檢視與可分享的確定性變更摘要
status: Needs Refinement
assignee: []
created_date: '2026-10-04 14:23'
updated_date: '2026-10-04 15:33'
labels:
  - keyword-research
  - proposal
  - developer-tools
  - delivery-web
  - web-first
  - extension-cli
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/19_035446.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/15_032722.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/17_034242.md
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
priority: medium
type: feature
ordinal: 10
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

分享 patch 做討論時，對方未必有相同 checkout，原始 unified diff 又不容易快速掌握變動位置。

## 首版邊界

貼上 unified diff，提供檔案列表、hunk 導覽及由實際差異計算的摘要；不讀私人 repo、不依 AI 猜測改動意圖。

## 差異與待驗證假設

免帳號且能匯出遮蔽後的審查摘要；一般 diff viewer 已有很多，需先驗證這個交接流程。

## 關鍵字證據與合併

- `git diff viewer online`：1 份報告出現。
- `git diff visualizer online`：1 份報告出現。
- `git diff summary`：4 份報告出現。

本卡合併 9 個唯一關鍵字，來自 11 份報告、36 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: git-diff）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/17_034242.md 至 logs/2026_08/15_032722.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI 產生 patch 審查摘要。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 依 diff 內容列出新增、刪除、修改與重新命名檔案及可對應的 hunk。
- [ ] #2 二進位檔、截斷輸入與不支援 diff 格式明確提示，統計不冒充完整。
- [ ] #3 摘要只描述可從 diff 證實的檔案與行數變化，能回到來源位置。
- [ ] #4 使用者可在匯出前排除敏感路徑與 hunk；不自動公開分享或上傳 patch。
- [ ] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->
