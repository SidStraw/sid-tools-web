---
id: STW-1
title: 環境設定預檢：比對 .env 範本、缺漏與重複鍵
status: Needs Refinement
assignee: []
created_date: '2026-10-04 14:23'
updated_date: '2026-10-14 12:06'
labels:
  - keyword-research
  - proposal
  - configuration
  - delivery-web
  - web-first
  - extension-cli
  - extension-ci
  - demand-reviewed-2026-10-14
  - deferred-evidence
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/18_033023.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/31_033132.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/25_033207.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/24_034550.md
  - 'https://www.utility-grid.com/tools/developer/env-file-compare'
  - >-
    https://marketplace.visualstudio.com/items?itemName=takeaseat-venture.env-diff
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-other-cards.md
priority: low
type: feature
ordinal: 101
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

部署時常因少一個變數、重複鍵或空值失敗；單看 .env 語法無法知道是否符合專案範本。原始關鍵字支持驗證需求，雙檔比對是本次提出的產品切角。

## 首版邊界

貼上範本與待檢查的 .env，產生鍵名為主的預檢結果。首版以明確宣告的 dotenv 語法為準；不做加密、金鑰保管或遠端環境同步。

## 差異與待驗證假設

將範本比對、語法錯誤與敏感值遮蔽放在同一個免安裝流程；這是待驗證的使用價值，並非已證實市場缺口。

## 關鍵字證據與合併

- `env file validator online`：8 份報告出現。
- `env validator online`：8 份報告出現。
- `validate env vars`：5 份報告出現。

本卡合併 16 個唯一關鍵字，來自 37 份報告、76 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: env-check）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/24_034550.md 至 logs/2026_08/31_033132.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI／CI 部署前檢查。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 兩份 .env 能辨識缺漏鍵、多餘鍵、重複鍵及空字串，結果可定位原始行號。
- [ ] #2 引號、註解、等號與多行值依公開的支援規則處理；不支援的插值或語法明確標示，不執行輸入。
- [ ] #3 畫面預設遮蔽值，匯出的檢查報告只含鍵名與問題，不含秘密值。
- [ ] #4 提供可重現的正常、缺漏、重複與格式錯誤範例，說明 empty 與 missing 的差別。
- [ ] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

範本比對、缺漏與值差異已有瀏覽器及 VS Code 產品；本輪未找到獨立使用者願意改用本站的證據。

提升／重新納入條件：以真實部署案例證明既有工具無法處理的語法或重跑流程；本機／遮蔽本身不算差異。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-other-cards.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。
<!-- SECTION:NOTES:END -->
