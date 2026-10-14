---
id: STW-8
title: Docker Compose 靜態預檢與服務相依圖
status: Needs Refinement
assignee: []
created_date: '2026-10-04 14:23'
updated_date: '2026-10-04 15:33'
labels:
  - keyword-research
  - proposal
  - configuration
  - delivery-web
  - web-first
  - extension-cli
  - extension-ci
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_03/24_040400.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_06/17_045338.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_05/31_044854.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/21_035139.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_07/03_043208.md
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
priority: medium
type: feature
ordinal: 8
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

Compose YAML 能解析不代表 service、network、volume 或 depends_on 引用合理；部署前看清引用關係可以提早找出漏寫名稱。

## 首版邊界

本機檔案的結構與引用檢查及相依圖；不連 Docker daemon、不拉 image、不宣稱服務一定啟動成功。

## 差異與待驗證假設

把 schema 問題與相依位置連到同一份原始檔；若支援規格過廣，先以單一 Compose 規格版本驗證。

## 關鍵字證據與合併

- `docker compose validator online`：3 份報告出現。
- `docker compose yaml validator online`：1 份報告出現。
- `docker compose visualizer online`：4 份報告出現。

本卡合併 12 個唯一關鍵字，來自 9 份報告、23 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: compose）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/21_035139.md 至 logs/2026_07/03_043208.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI／CI Compose 預檢。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 標示使用的 Compose 規格版本，結構問題可定位 YAML 路徑或行號。
- [ ] #2 列出 service、network、volume 與 depends_on 關係，缺少引用對象及循環依賴有提示。
- [ ] #3 未提供的環境變數與多檔合併需求明確顯示為未解析，不以空字串冒充有效設定。
- [ ] #4 比較官方 Compose CLI 的固定範例結果，說明靜態通過不等於執行或健康檢查通過。
- [ ] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->
