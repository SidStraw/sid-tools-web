---
id: STW-21
title: 驗證 TypeScript 型別展開與錯誤解釋工具的價值
status: Done
assignee:
  - '@codex'
created_date: '2026-10-04 15:33'
updated_date: '2026-10-22 21:17'
labels:
  - keyword-research
  - monorepo-expansion
  - delivery-ide
  - later-delivery
  - demand-reviewed-2026-10-14
  - research-complete
  - local-verified
  - market-validation-pending
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_07/13_042615.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_06/10_044805.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/18_035246.md
  - >-
    https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html
  - 'https://github.com/microsoft/vscode/issues/94679'
  - 'https://github.com/zed-industries/zed/issues/47360'
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-pruning.md
priority: low
type: spike
ordinal: 121
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

conditional／mapped／generic 型別難以從 hover 看懂；IDE 可利用真實專案設定取得比孤立片段更有用的上下文。

## 交付形式與首版邊界

主要形式：ide。順序：後續交付／較高成本探索。

先用一種固定 TypeScript 版本比較既有 hover 與候選的展開／定位成果；不承諾自動改正型別。

## 延伸方向與相鄰題目

可發展 Web Playground 示範與 IDE 深入檢視；是否共用能力要由原型證據決定。

## 關鍵字來源與合併

代表原始詞：`typescript type expansion`; `typescript type debug`; `typescript debug type inference`。

本題合併 6 個相關唯一詞，來自 6 份報告、11 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: ts-type-explorer）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 整理至少 5 個真實複雜型別案例與既有工具基準。
- [x] #2 展開結果以 TypeScript compiler 的實際結果為準，無法解析不得補造。
- [x] #3 比較可理解性、回應時間與 tsconfig／版本差異並保存重現資料。
- [x] #4 產出繼續／縮小／停止建議及第一個可驗收場景，研究完成不等於 IDE 外掛已完成。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 以目前專案及已安裝依賴中的至少 5 個真實 conditional／mapped／generic 型別使用位置建立案例清單，保存來源版本、SHA256 與問題。
2. 固定現有 TypeScript 7.0.2，以原生 language server hover 和 compiler API 取得實際結果；比較候選的屬性／union／來源導覽，未解析輸出保留錯誤、不生成答案。
3. 保存可重現 runner、原始結果、tsconfig 條件與計時；比較同一案例的嚴格設定變體及可取得的另一固定編譯器版本。可理解性以明示任務與可見資訊比較，不冒稱真人理解時間。
4. 根據實驗產出繼續／縮小／停止建議和第一個可驗收場景。此為研究卡，不增加產品路由或製作 IDE 外掛；逐項查核證據後更新卡片與本機 commit。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

Low 延後研究 spike，不把研究驗收當功能完成，也不因生成式 AI 而刪除。原生能力削弱泛用展開器差異，IDE 開發成本對流量站較高。 VS Code 舊使用者 issue 有明確需求；TypeScript 5.9 已預覽 expandable hovers；2026 Zed issue 指向特定 IDE 差異。

提升／重新納入條件：原卡至少 5 個真實複雜型別案例；比較指定版本 VS Code/TS 原生展開與候選流程，能證明理解時間改善且有可取得的流量入口。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-pruning.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

## 2026-10-15 實作阻礙與本輪略過

最新要求已取代先前因市場需求而暫緩的決定；本輪略過僅因下列輸入／證據尚未建立或確認，不代表完成。

- 待補項目：尚未建立至少 5 個真實複雜型別案例及既有工具基準，也尚未保存固定 TypeScript／IDE／tsconfig 條件下的比較證據。
- 驗收影響：AC1 與 AC3 要求真實案例及可理解性、回應時間與版本差異比較；不能以合成範例或未實測敘述代替研究成果。
- 解除方式：先從本儲存庫或其他可合法使用的專案整理至少 5 個具來源的案例，再固定版本、擷取既有 hover 與 compiler 結果並執行比較，產出 AC4 的建議。本儲存庫可能提供案例，並非判定研究不可行。

維持原狀態、描述與既有紀錄，所有 AC 維持未勾選；本輪不宣告完成。

## 2026-10-23 介入需求盤點

可直接推進研究：至少 5 個真實案例、固定 compiler/tsconfig 基準與比較證據由代理蒐集。缺少案例是待辦工作，不是使用者阻塞；完成範圍是繼續／縮小／停止的研究結論，不代表 IDE 外掛完成。

本次只分類責任與下一步，不代表驗收完成、流量需求已證實或已授權遠端發佈；保留既有 AC 與狀態。

2026-10-23 研究已產出：7 個來自本專案與 Knip 6.42.1 的真實型別案例，固定 TypeScript 7.0.2／5.9.3、strict 與 null-relaxed 設定；4 組真實分析皆無診斷，額外 negative control 兩版本均回報 TS2304 並保留 unresolved。原生 TS7 LSP hover verbosity 0／2、TS5.9 quick info 與 compiler 逐欄位／來源結果、各 6 次查詢時間與來源／設定 SHA256 保存於 research/ts-type-explorer-2026-10-23。verify.mjs PASS。觀察：長回傳型別可以補齊 hover 省略欄位；Report／Counters／遞迴 union 的原生呈現已足夠；195 個 mapped plugin 欄位沒有直接 declaration，不能編造來源。可理解性採明示查找任務與資訊可見性比較，未宣稱真人理解時間。建議縮小到具設定與來源的長型別檢視，第一場景為 SemverComparison 的 8 欄位與 rows 宣告定位；不新增 IDE 外掛或產品頁。完整 pnpm verify 正在執行，完成後逐項結案。

2026-10-23 最終驗收：研究 verify.mjs、所有腳本 syntax check 與固定舊版 tarball integrity 下載流程均 PASS。完整 pnpm verify exit 0，950 單元／整合、141 E2E、格式／lint／型別／build／production audit 通過，task cache 停用。研究目錄不在主程式 lint/type 範圍，另以真實 compiler／LSP runner 和來源／設定 hash、語意不變量驗證。AC1–4 證據與限制詳見 research/ts-type-explorer-2026-10-23/README.md。研究完成，沒有宣稱真人理解速度、搜尋量、IDE UI 或新產品功能已驗證；未 push／部署。

2026-10-23 本批遠端發佈完成：使用者授權結案後推送部署，main 84ec9af 已推送；GitHub Verify 39855305476 的 Linux／macOS 均 PASS。Cloudflare 原生 Git deployment 592ee99d 成功，tools.sid.tw 的 22 路由、canonical／sitemap、SPA、320px、真實 Dockerfile 報告與未知路徑 404 通過；GitHub Pages 仍關閉。STW-21 僅研究成果，未新增頁面。集中證據：docs/validation/release-2026-10-23。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成 7 個真實型別案例、TypeScript 7.0.2／5.9.3 原生 compiler／hover 與兩組 tsconfig 對照，保存來源／設定 hashes、查詢時間及無法解析控制。建議縮小為帶設定與來源的長型別檢視，首個可驗收場景為 SemverComparison 全部 8 欄位與 rows 宣告定位；不製作泛用 IDE 外掛。研究專用核對與完整 pnpm verify 通過（950 單元／整合、141 E2E），僅本機交付。
<!-- SECTION:FINAL_SUMMARY:END -->
