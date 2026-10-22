---
id: STW-19
title: Bundle 變化分析：從體積增加追到套件與入口
status: Done
assignee:
  - '@codex'
created_date: '2026-10-04 15:33'
updated_date: '2026-10-22 21:17'
labels:
  - keyword-research
  - monorepo-expansion
  - delivery-local-cli-web
  - later-delivery
  - demand-reviewed-2026-10-14
  - implemented
  - local-verified
  - market-validation-pending
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_07/03_043208.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/17_034242.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/08_034536.md
  - 'https://relative-ci.com/documentation/metrics-and-data'
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-other-cards.md
priority: low
type: feature
ordinal: 119
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

只有 build 大小警告無法知道是哪個 import 或共用 chunk 造成成長；這是需真實 build 資料的工具機會。

## 交付形式與首版邊界

主要形式：local-cli-web。順序：後續交付／較高成本探索。

先支援一個 bundler 的固定報告格式，比較 base／candidate 兩次產物並用 Web 呈現。

## 延伸方向與相鄰題目

可延伸 CI 體積預算與 PR 報告；與 Lighthouse 的 runtime audit 比較分開。

## 關鍵字來源與合併

代表原始詞：`bundle size analyzer vite`; `bundle size analyzer online`; `npm package size comparison`。

本題合併 12 個相關唯一詞，來自 7 份報告、19 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: bundle-diff）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 區分 raw、gzip 與可取得的其他壓縮大小，明列量測環境與入口。
- [x] #2 變化能追到 module／package／chunk，無法歸因的部分明確保留。
- [x] #3 不同 build 設定或缺少 metadata 時提示不可直接比較。
- [x] #4 先提供唯讀差異與預算判定，不自動移除套件或重寫 imports。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 使用現有 Vite+/Rolldown 的原生 build hooks 收集固定版本報告格式：chunk/asset 的實際 raw、gzip、Brotli 位元組，以及入口、module/package 來源與量測環境；不把壓縮大小拆配成虛構 module bytes。
2. 以 repo-local 整合產出本機報告，提供唯讀 CLI 比較與既有 SPA 的延遲載入檢視。保留未歸因資訊、config/engine/compression 條件；缺少或不同條件時明示不可直接比較。
3. 支援 base/candidate 的 chunk/module/package 變化、來源追查與明確單位的預算判定；不重寫 imports 或刪除套件，不上傳原始 source。
4. 用本專案的實際 build 與受控變更樣本驗證大小計算、hash 檔名變動、module 變化、metadata 缺漏及不同設定；完成 CLI、瀏覽器與 pnpm verify 後逐項回寫 AC。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

RelativeCI 已有跨 build 資產與模組、重複套件分析；需要 build metadata 的導入成本不能當成搜尋流量。

提升／重新納入條件：以同一組 build 報告證明歸因品質或比較成本的增量；不要用單套件體積取代真實 build。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-other-cards.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

## 2026-10-23 介入需求盤點

可直接推進：沿用已記錄的 Vite/Rolldown 計畫及本專案實際 build 驗證。現有程式尚未完成驗收，維持 In Progress；不需要使用者提供私人專案或決定一般實作細節。

本次只分類責任與下一步，不代表驗收完成、流量需求已證實或已授權遠端發佈；保留既有 AC 與狀態。

2026-10-23：完成 repo-local Vite+/Rolldown 收集器、唯讀 CLI 與 lazy SPA Bundle 比較。實際專案報告含 70 個產物、18 個 HTML 入口、430 筆 module 記錄；HTML 入口取自原生 build input，避免只靠 JS isEntry 漏列。最終 pnpm verify 無快取通過：947 unit/integration、140 browser；格式、lint、型別通過，production audit 無已知漏洞。3 個專屬真實 build/CLI 測試與 Chromium 實測涵蓋量測、來源、不同設定、預算、下載、清除和 SPA 往返。證據：docs/validation/stw-19/README.md、repository-build.json；測試來源 tests/bundle-report.test.ts、tests/helpers/bundle-build.ts、tests/e2e/bundle-diff.spec.ts。未推送、未部署、未驗證市場流量。

2026-10-23 本批遠端發佈完成：使用者授權結案後推送部署，main 84ec9af 已推送；GitHub Verify 39855305476 的 Linux／macOS 均 PASS。Cloudflare 原生 Git deployment 592ee99d 成功，tools.sid.tw 的 22 路由、canonical／sitemap、SPA、320px、真實 Dockerfile 報告與未知路徑 404 通過；GitHub Pages 仍關閉。STW-21 僅研究成果，未新增頁面。集中證據：docs/validation/release-2026-10-23。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成實際建置產物的 raw/gzip/Brotli 比較、module/package/chunk 追查、環境相容性與唯讀預算判定，整合第 18 個 SPA/SSG 工具。pnpm verify：947 單元／整合、140 瀏覽器測試通過；詳見 docs/validation/stw-19/README.md。僅本機驗收，尚未部署。
<!-- SECTION:FINAL_SUMMARY:END -->
