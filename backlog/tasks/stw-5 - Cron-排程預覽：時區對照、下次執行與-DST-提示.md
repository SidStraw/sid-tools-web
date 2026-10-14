---
id: STW-5
title: Cron 排程預覽：時區對照、下次執行與 DST 提示
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
  - extension-ide
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_07/26_042516.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/29_032627.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/03_042558.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/19_035446.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/30_032855.md
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
priority: high
type: feature
ordinal: 5
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

看懂 Cron 的文字說明仍可能選錯伺服器時區或遇到 DST 缺時／重複時間。來源涵蓋 builder、validator、translator 與 visualizer，可合為一個排程檢查情境。

## 首版邊界

首版僅支援明確標示的五欄 Unix Cron，顯示指定 IANA 時區與使用者時區的下次執行時間；其他方言不混用。

## 差異與待驗證假設

繁中說明加上雙時區及 DST 邊界案例；一般 Cron 翻譯已有 crontab.guru，不能只複製基本轉譯。

## 關鍵字證據與合併

- `cron expression validator online`：2 份報告出現。
- `cron expression visualizer`：3 份報告出現。
- `cron to english online`：2 份報告出現。

本卡合併 48 個唯一關鍵字，來自 33 份報告、90 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: cron）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/19_035446.md 至 logs/2026_08/30_032855.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI／IDE 的排程檢查。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 有效五欄 Cron 顯示逐欄說明及未來 10 次執行時間，兩個時區的時間代表相同時刻。
- [ ] #2 非法欄位、Quartz／AWS 等不支援方言明確提示，不能當成 Unix Cron 默默解析。
- [ ] #3 DST 缺時與重複時間、月底及閏年有公開且可重現的計算規則與範例。
- [ ] #4 可複製排程及時區資訊，說明預覽規則與真實排程器實作可能不同。
- [ ] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->
