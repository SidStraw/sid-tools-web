---
id: STW-24
title: 可切換情境的 OpenAPI Mock API 服務
status: Done
assignee:
  - '@codex'
created_date: '2026-10-04 15:33'
updated_date: '2026-10-22 21:17'
labels:
  - keyword-research
  - proposal
  - monorepo-expansion
  - delivery-web-service
  - later-delivery
  - demand-reviewed-2026-10-14
  - deferred-evidence
  - agent-can-proceed
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/09_035100.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_07/06_044458.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_04/11_040629.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_02/03_040231.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_09/01_033208.md
  - 'https://github.com/stoplightio/prism/blob/main/docs/guides/01-mocking.md'
  - 'https://github.com/stoplightio/prism/issues/2723'
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-other-cards.md
priority: low
type: feature
ordinal: 124
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

前端整合需要真的可呼叫 endpoint，以及延遲、錯誤與不同 response 情境，這超過下載 fixture 的需求。

## 交付形式與首版邊界

主要形式：web-service。順序：後續交付／較高成本探索。

先跑本機單一 OpenAPI 合約的 mock service，Web 選擇情境；Prism 等既有引擎列為優先比較基準。

## 延伸方向與相鄰題目

與 STW-14 的 fixture 能力可協作；後續可加入 CI 啟動與團隊分享，先不承諾多租戶平台。

## 關鍵字來源與合併

代表原始詞：`openapi mock server generator`; `openapi to mock server`; `api mock server online`。

本題合併 13 個相關唯一詞，來自 15 份報告、28 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: mock-runtime）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 依 operation／status 選擇固定 fixture 或可重現產生規則。
- [x] #2 延遲與錯誤情境可切換並記錄當次設定，重啟後可重現。
- [x] #3 不支援規格、未解析引用與無匹配路由明確回報。
- [x] #4 本機服務有明確啟停與監聽範圍，不默默轉發真實 API 或公開敏感 schema。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 已實測 Prism 5.16.0 原生固定範例、200／500、路徑參數與未匹配路由；保留比較證據。因其 Postman 間接依賴使 production audit 出現兩項 high，最終改採 find-my-way 成熟路由器與 STW-14 已驗證 fixture 引擎，不重造完整 OpenAPI 引擎。
2. 建立有限 OAS 3.0.x JSON response 合約與有界情境清單，固定 seed、範例與來源；未支援規格／引用／路由明確回報。
3. 提供實際 HTTP endpoint，僅監聽 127.0.0.1；不執行 servers／callbacks、轉發正式 API 或記錄請求內容。
4. operation／status／範例／延遲設定保存到明示 state 路徑，綁定合約摘要與 seed；原子更新、衝突偵測與跨程序重啟還原。
5. 共用 SSG SPA 加入本機控制頁，由本機服務提供同源資產與 API；正式靜態站說明啟動方式。驗證 Host／Origin，不開放 CORS。
6. 真實 HTTP 與無頭瀏覽器驗證選擇、延遲、錯誤、未知路由、啟停、重啟和不外連；通過完整 pnpm verify 才逐項結案、本機 commit，不 push／部署。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

Prism 已有可呼叫 mock server 與驗證；#2723 為 Node 版本相容問題，不是另造服務需求。

提升／重新納入條件：取得 Prism／既有 hosted mock 的實際未解流程，與 fixture 卡分開計算營運成本。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-other-cards.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

## 2026-10-23 介入需求盤點

可直接推進：既有範圍已指定本機單合約服務，代理可自行準備合約與 fixture，驗證實際 HTTP、情境切換、重啟重現及監聽界線；不需先決定公開託管方案。

本次只分類責任與下一步，不代表驗收完成、流量需求已證實或已授權遠端發佈；保留既有 AC 與狀態。

2026-10-23 選型查核：官方 Prism HTTP mocking 文件說明例子／status／路由決策（https://github.com/stoplightio/prism/blob/main/docs/guides/01-mocking.md）。npm registry 的 @stoplight/prism-http-server 與 prism-cli 最新版為 5.16.0，2026-07-17 發布，Node >=24.18.0。已核對 HTTP server tarball SHA512 並唯讀檢視公開 createServer(operations, options)、listen(port,address)、close() API；原生 server 預設可記錄 request input，整合必須使用停用的 logger 並關閉 CORS／upstream proxy。尚未安裝或啟動，原生固定 fixture／優先選擇語意仍待實測。

2026-10-23 實測進展：Prism 原生固定回應及路由通過。prototype 的真實 HTTP 與跨程序 state 測試 4 項通過；瀏覽器發現手機寬度溢出，修正中。pnpm audit --prod 發現 Prism → http-spec → postman-collection 的 lodash／Faker high，最新 Postman 仍保留 Faker 5.5.3，故移除 Prism runtime 相依，改整合 find-my-way 路由並沿用既有確定性 fixture，範圍不變。尚未完成驗收。

2026-10-23 最終驗收 PASS：mise exec -- pnpm verify exit 0，959 unit/integration、147 browser、格式／lint／型別／建置與 production audit 全通過，0/13 cache hit。AC1：固定範例與 seed、operation/status/fixture 實際 HTTP 回應。AC2：真實延遲／503、Web 選擇保存及跨程序重啟一致。AC3：外部／未解析／遞迴引用、無效 example/schema、不支援 status/bodyless 與未知路由拒絕。AC4：127.0.0.1 啟停、Host/Origin/control header、無 CORS、upstream canary 0 次收件、請求秘密不記錄。另驗 rename 保存失敗維持舊設定、revision 衝突、0600、單一 writer、手機320px與SPA生命週期。詳見 docs/validation/stw-24/README.md。使用者最新授權：結案後推送、部署；取代本卡計畫原先不 push／部署的限制，正式結果將另驗。

2026-10-23 本批遠端發佈完成：使用者授權結案後推送部署，main 84ec9af 已推送；GitHub Verify 39855305476 的 Linux／macOS 均 PASS。Cloudflare 原生 Git deployment 592ee99d 成功，tools.sid.tw 的 22 路由、canonical／sitemap、SPA、320px、真實 Dockerfile 報告與未知路徑 404 通過；GitHub Pages 仍關閉。STW-21 僅研究成果，未新增頁面。集中證據：docs/validation/release-2026-10-23。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
新增本機單合約 Mock CLI 與同一 SSG SPA 控制頁。整合 find-my-way 9.10.0 與已驗證的 OpenAPI fixture 引擎，支援固定例子、seeded 回應、status／延遲切換與原子 state 保存；重啟綁定來源 hash／seed，拒絕不支援規格與不安全來源。完整 verify：959 單元／整合、147 瀏覽器、production audit 通過；真實 HTTP 與跨程序驗收。Prism 比較與取捨留存驗證文件。
<!-- SECTION:FINAL_SUMMARY:END -->
