---
id: STW-17
title: Sitemap XML 預檢與站點結構瀏覽
status: Needs Refinement
assignee: []
created_date: '2026-10-04 14:23'
updated_date: '2026-10-14 12:08'
labels:
  - keyword-research
  - proposal
  - seo
  - delivery-web
  - web-first
  - extension-cli
  - extension-ci
  - demand-reviewed-2026-10-14
  - deferred-evidence
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/06_042236.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_04/14_041904.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/31_035735.md
  - 'https://www.drupal.org/project/simple_sitemap/issues/3178229'
  - 'https://ai-chain.tw/tools/sitemap-validator/'
  - 'https://freetooldev.com/tools/sitemap-validator.html'
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-existing-core.md
priority: low
type: feature
ordinal: 117
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

網站部署前需要檢查 sitemap 格式、重複網址與路徑分布；只有 XML 語法驗證不容易發現產生器輸出異常。

## 首版邊界

本機輸入 sitemap 或 sitemap index，顯示靜態問題與 URL 路徑樹；不爬站、不保證收錄、不以檔案內容判斷 HTTP 狀態。

## 差異與待驗證假設

將格式問題與路徑分布一起呈現，適合部署前的人工檢查；需再驗證相較既有免費工具的便利性。

## 關鍵字證據與合併

- `sitemap validator online`：1 份報告出現。
- `sitemap validator file`：2 份報告出現。
- `visual sitemap from xml`：1 份報告出現。

本卡合併 7 個唯一關鍵字，來自 3 份報告、9 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: sitemap）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/31_035735.md 至 logs/2026_08/06_042236.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI／CI sitemap 產物預檢。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 依明示 sitemap 規格檢查結構、必要欄位與 URL，問題可定位原始條目。
- [ ] #2 重複 URL、無效 lastmod、混合 host 或超出支援大小有可理解的提示與限制。
- [ ] #3 提供路徑樹與過濾列表，sitemap index 的子檔未載入時明確標示未檢查。
- [ ] #4 XML 不解析外部實體、不自動請求列出的 URL，匯出報告不宣稱 Google 已收錄。
- [ ] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

排除只有格式驗證／去重的近期主力版本。較深網站上線健檢須另證需求、抓取成本與邊界，不能直接擴大實作。 競品覆蓋程度高： XML、重複 URL 與報告；本機規則驗證不是搜尋收錄診斷。

提升／重新納入條件：以真實 sitemap 證明靜態 path tree/診斷優於既有工具；live crawl 與收錄不是本卡承諾。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-existing-core.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。
<!-- SECTION:NOTES:END -->
