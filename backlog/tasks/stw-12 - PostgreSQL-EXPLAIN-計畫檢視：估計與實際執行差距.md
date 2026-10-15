---
id: STW-12
title: PostgreSQL EXPLAIN 計畫檢視：估計與實際執行差距
status: Done
assignee:
  - '@designer'
created_date: '2026-10-04 14:23'
updated_date: '2026-10-15 16:12'
labels:
  - keyword-research
  - proposal
  - database
  - delivery-web
  - web-first
  - extension-cli
  - demand-reviewed-2026-10-14
  - deferred-evidence
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_05/28_044441.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_05/12_042852.md
  - 'https://github.com/dalibo/pev2'
  - 'https://pev2.pages.dev/'
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-pruning.md
priority: low
type: feature
ordinal: 112
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

只貼 SQL 無法可靠判斷瓶頸；實際 EXPLAIN ANALYZE 輸出能提供 rows、loops 與時間，適合做有根據的診斷輔助。

## 首版邊界

首版解析 PostgreSQL EXPLAIN FORMAT JSON 的既有輸出；不連資料庫、不執行查詢、不自動建立索引。

## 差異與待驗證假設

強調估計 rows 與 actual rows 的差距、loops 與節點關係；來源中的泛用 SQL optimizer 詞不等於能承諾自動最佳化。

## 關鍵字證據與合併

- `sql explain analyze visualizer`：1 份報告出現。
- `sql explain analyze postgres`：1 份報告出現。
- `sql query plan visualizer`：1 份報告出現。

本卡合併 5 個唯一關鍵字，來自 2 份報告、5 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: sql-plan）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_05/12_042852.md 至 logs/2026_05/28_044441.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：本機 CLI 匯入既有 EXPLAIN 輸出。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 有效 plan 顯示節點樹、cost、rows、loops 與可用的 timing／buffer 欄位並回連原始 JSON。
- [x] #2 區分只有 EXPLAIN 與含 ANALYZE 的輸出；缺少實測資訊時不補造實際時間。
- [x] #3 明確說明 timing 與 loops 的呈現方式，不能直接相加重複計算父子節點時間。
- [x] #4 以固定 PostgreSQL 計畫範例驗證估計誤差提示，輸出不把建議冒充已實測改善。
- [x] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 實作 PostgreSQL EXPLAIN FORMAT JSON 單一 statement 的明示子集 parser，設定文字／節點／深度上限，驗證樹狀結構及有限非負數值；只提取支援欄位與 JSON Pointer，不回傳任意輸入物件。
2. 保留 EXPLAIN-only／actual metrics 缺漏，明示 rows／timing per-loop、loops=0 未執行及父子 inclusive time／buffers 不可加總；估計差距只作觀察，不聲稱因果或最佳化成果。
3. 以標示 synthetic provenance 的固定 PostgreSQL-shaped fixtures 驗證計算／缺值／錯誤及資源上限，執行 focused test 與兩個檔案的 scoped vp check。
4. 交由 designer 整合公開 subpath／建置及 Web 樹狀來源導覽、支援規則／固定範例、欄位與不完整提示，以及 clear／不傳送／不保存／不放入 URL。Parent 驗證完整 AC1–AC5 及 commit；本次不勾 AC、不轉 Done、不建立 commit。

5. Integrate public built @sid-tools/core/explain types/subpath and ninth standalone lazy SSG/SPA route. Preserve39-test core semantics and forest/off-white shell; no package source aliases.
6. Build keyboard-accessible native disclosure plan tree with bounded sibling batches and single selected-node detail; show costs versus per-loop rows/timing, loops, exact metric JSON Pointers and available buffer/I/O units. Add bounded original-value source locator respecting escaped keys and JSON last-duplicate-wins semantics; missing fields navigate to nearest original parent, no invented source lines.
7. Distinguish EXPLAIN-only, actual row/loop coverage and partial actuals; absence/zero/never-executed/omission/errors honest. Statement timing independent of nodes, no parent-child sums/exclusive time or measured-improvement claims. Publish PostgreSQL12–18 common subset/limits and reproducible synthetic provenance demos.
8. Export only supported static core report with sensitivity warning; no raw input/unknown field passthrough, SQL/database/network/storage/share behavior. Edit/run/demo/clear/dispose reset report/selection/maps/Blob and invalidate late imports. Focused unit/public/build/strict plus production source/metrics/privacy/lifecycle/mobile tests, durable screenshots and all5AC mapping. Parent owns frozen fullverify/Oracle/structure/AC/Done/isolated commit.

9. Oracle M2 only: disclose pre-PG18 integral per-loop Actual Rows rounding and3-decimal node timing, conditional0.5×loops rows /0.0005×loops ms product error bounds; show meaningful bound adjacent to derived rows for integral Actual Rows with loops>1, without server-version inference or core metric/state changes. Update displayed-zero wording/help/static export notice and add100000loops regression. M1 source locator/new source tests exclusively fixer-owned. Scoped strict/copy/core-source checks only; no build/production browser/fullverify until both lanes frozen; parent owns integrated validation/Oracle2.

10. M1 來源定位改用最後出現位置與單次 ancestor pruning，保留 JSON last-wins 精確性，避免重複鍵平方級掃描；補八項獨立回歸。整合 M1/M2 後完整驗證、複審及目前畫面證據更新再交付。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

Low 保留比較門檻；不能將此卡稱為 AI SQL optimizer，它實際解析計畫。若只複製 viewer 則停止。 PEV2 官方持續提供計畫視覺化與單 HTML 完全離線模式；免費／本機本身不是差異。

提升／重新納入條件：以至少 3 個真實計畫比較 PEV2，證明某種診斷理解任務的時間／正確率改善；補對應特定 query 的需求。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-pruning.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

## 2026-10-15 core 實作交接

最新實作授權已取代先前市場暫緩決定。已新增 `packages/core/src/explain.ts` 與 `explain.test.ts`，無新增相依套件。`parseExplain(text)` 驗證單一 PostgreSQL EXPLAIN FORMAT JSON statement 與 plan tree，僅提取支援欄位、JSON Pointer 及型別化診斷；限制輸入、JSON container、plan 節點及深度，未知欄位不直接回傳。

保留 EXPLAIN-only／部分 actuals／ANALYZE 的差別；Actual Rows 與 timing 明示 per-loop，loops=0 標記未執行，缺值不補零。估計差距以 per-loop rows 比較，零分母及衍生 overflow 不回傳 Infinity。僅保留各節點 inclusive timing／buffers，不加總父子、不冒充 self-time、不把 cost 當成 ms 或宣稱最佳化效果。內附兩個標明 synthetic provenance 的固定範例；未將其宣稱為真實資料庫量測。

已執行 `mise exec -- pnpm exec vp test run packages/core/src/explain.test.ts`，39 個測試通過；`mise exec -- pnpm exec vp check packages/core/src/explain.ts packages/core/src/explain.test.ts` 通過格式、lint 與 type checks，僅格式化兩個新增檔案。完整 API／規則／證據見 `.slim/deepwork/unfinished-cards-2026-10-15/stw-12-core.md`。

待 designer 整合公開 subpath／建置與 Web 樹狀導覽、原始 JSON 定位、欄位／支援規則與固定範例、完整性提示及 clear／privacy 行為。Parent 負責完整 AC1–AC5、最終驗證及 commit。本次維持 In Progress，不勾 AC、不轉 Done、不建立 commit。

STW-12 UI/public integration ready for parent gate. Added built typed @sid-tools/core/explain subpath, ninth standalone lazy SSG/SPA route and shared nine-route coverage. Existing39-test core unchanged, no dependencies/CSP/aliases/toolchain changes. Native disclosure plan tree with60-sibling batches and selected-node detail, exact metric JSON Pointer buttons, costs/rows/loops/timing/buffers/I/O units, source-safe node/relation/schema/alias. Source locator only on parsed bounded JSON, escaped keys and last-duplicate-value/object semantics covered; missing fields visibly fall back to nearest source parent, no invented line numbers.
PostgreSQL12–18 common field subset, not version detection/full extension support. Honest EXPLAIN-only, actual rows/loops coverage (including TIMING OFF), partial actuals, omission/error and never-executed states. Per-loop comparisons10x not100x after loops; independent statement9ms versus parent8 and child5 approximate inclusive ms; buffer12/10 separate, no22/sum/subtraction/self-time or loops multiplication. Missing metrics unknown, zero cases/overflow explicit. Three fixed synthetic demos clearly not live-db measurements or optimization improvement.
Supported static report only exported with sensitivity/no-execution/no-measured-optimization notice; unknown SQL/Filter/raw JSON not serialized, names may still be sensitive. No database/SQL/network/storage/share URL behavior. Edit/run/clear/dispose resets report/selection/source maps/Blob and late async guards; native mobile containment/keyboard controls preserved.
Objective evidence:45/45 focused unit/public tests (39core+6public), production build pass (existing TS7 experimental API notice retained). Final18-file scoped format/lint/type check pass zero warnings/errors; scoped tracked diff whitespace pass.46/46 production E2E pass32.0s (8EXPLAIN+12shared+11Sitemap+5Git+5env+5SemVer): exact source selection/duplicate-object fallback, per-loop and independent timing/buffer values, null/zero/TIMING OFF/partial/invalid/overflow/limit states,65children60+5 tree access, literal XSS,320px nooverflow, no external requests/storage/query/hash, Blob revocation/edit/clear/reload/SPA/stale lazy reset. Large fixture native automation fill timed out; >50K fixture values use textarea+input event then unchanged Run/report/download limit assertions; no paste throughput claim, no skipped/weakened assertion/raised timeout.
Durable evidence docs/validation/stw-12/README.md +4 synthetic production screenshots, desktop1440/mobile390 visually reviewed. Agent-browser Chrome148 screenshot pass/noerrors/390document=viewport; Playwright Chromium153. Exact staging paths/all5AC mapping/design/limitations in .slim/deepwork/unfinished-cards-2026-10-15/stw-12-implementation.md. Source writer terminal/frozen, browser/server stopped,4173 released. Keep In Progress/AC unchecked; parent owns final cache-disabled verify, Oracle1+structure, AC/Done/isolated commit. No staging/commit/push/deploy; palette/reserved research/other cards untouched.

Oracle M2 rounding remediation authored; UI lane terminal/frozen. Changed only core explain.ts support-rule strings (no metric/state/API semantics), explain.ts labels/adjacent derived rounding notes/static export notice, explain.html help, existing explain E2E assertions/new regression and validation README. M1 explain-source.ts/new source tests exclusively fix-1-owned and untouched.
Pre-PG18 whole-number per-loop Actual Rows rounding and3-decimal node timing disclosed without version detection. Integral rows with loops>1 show conditional PG<=17 error bound0.5xloops next to derived rows (100000=>50000rows); available rounded time shows0.0005xloops ms (100000=>50ms). actual-zero says displayed0 and explains per-loop true average may be<0.5, not true zero totals. Existing products/direction/never-executed/missing/overflow semantics unchanged. Static export notice contains formulas/example/conditional/no-version and sensitivity/non-wall-clock caveats; no raw JSON added.
Five-file scoped fmt/strict passed zero warnings/errors; source core39/39 tests passed97ms; scoped tracked diff whitespace pass. Added browser case PlanRows1/ActualRows0/Loops100000/Time0.002 checks UI bounds/zero caveat, unchanged0rows/200ms and downloaded notice, fractional/never-executed controls. New browser regression only authored/type-checked, NOT executed. No build/public-stale-dist/production E2E/fullverify/browser/server launched during concurrent M1 work.
Precise remediation paths/checks/remaining parent commands: .slim/deepwork/unfinished-cards-2026-10-15/stw-12-rounding-remediation.md. Existing screenshots/evidence explicitly pre-remediation. After both lanes frozen parent owns rebuild, integrated core/source/public/browser/fullverify, Oracle2/finalization/commit. No staging/commit/AC/Done, unrelated cards/research/palette/config untouched.

2026-10-16 最終驗證：mise exec -- pnpm verify 通過，307 項單元／套件測試、54 項 production E2E，106 檔格式／54 嚴格檢查通過，build／production audit 通過，cache0/6；既有 TS7 experimental API 提示保留。總數含尚待交付色盤核心。Oracle attempt2 PASS：M1 相同近百萬字元重複鍵案例由33975ms降為40ms且 last-wins 精確；M2 條件式 PG<=17 rows／3位小數 timing 誤差提示與匯出通過，無新增重大風險。結構 PASS；六張目前 production 截圖已更新並審視，手機320／390px無頁面溢出、無 runtime errors。所有五項 AC 證據及可重現命令：docs/validation/stw-12/README.md。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成 PostgreSQL EXPLAIN JSON 子集樹狀檢視、原始值定位、估計差距與可用 timing／buffer 欄位。缺值不補造、父子 inclusive timing 不加總，揭露舊版 rows／時間四捨五入誤差；不執行查詢、不傳送或保存輸入。307 項單元／套件、54 項 E2E 與完整驗證通過，Oracle 複審及結構 PASS；六張更新畫面與限制見 docs/validation/stw-12/。
<!-- SECTION:FINAL_SUMMARY:END -->
