---
id: STW-17
title: Sitemap XML 預檢與站點結構瀏覽
status: Done
assignee:
  - '@designer'
created_date: '2026-10-04 14:23'
updated_date: '2026-10-15 15:38'
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
- [x] #1 依明示 sitemap 規格檢查結構、必要欄位與 URL，問題可定位原始條目。
- [x] #2 重複 URL、無效 lastmod、混合 host 或超出支援大小有可理解的提示與限制。
- [x] #3 提供路徑樹與過濾列表，sitemap index 的子檔未載入時明確標示未檢查。
- [x] #4 XML 不解析外部實體、不自動請求列出的 URL，匯出報告不宣稱 Google 已收錄。
- [x] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 建立不依賴 XML／DOM／檔案／網路的 normalized SitemapDocument contract，明示 sitemap 0.9 namespace、adapter 安全／結構診斷、原始 ordinal／pointer 與 byte size 來源。
2. 實作必要欄位、絕對 HTTP(S) loc、精確字串重複、host、嚴格 lastmod calendar／RFC3339 子集與 count／size bounds；輸出靜態診斷、source navigation 及線性路徑分組，index 子檔一律 unchecked。
3. 執行 pure synthetic fixtures 的 focused tests 與兩檔 scoped strict check，驗證日期、URL 語意、limits、未知結構、長路徑及穩定 JSON，不新增相依套件。
4. 交由 designer 製作瀏覽器 DOMParser adapter（解析前拒絕 DOCTYPE／entity，確認 root／namespace／重複欄位／未知結構，不請求 URL）及 Web 樹狀／過濾／來源導覽／下載／clear／privacy。Parent 驗證完整 AC1–AC5、Oracle 與 commit；本次不勾 AC、不轉 Done、不建立 commit。

5. Integrate built @sid-tools/core/sitemap subpath and a lazy browser-only XML adapter. Before DOMParser reject declaration-like DOCTYPE/entity and local XML size/node/depth limits; inspect exact root/direct-child namespaces, cardinality, attributes/mixed text/nested fields without silently dropping original entries. Retain lexical opening-tag source offsets/line/column and normalized pointers.
6. Add standalone eight-route SSG/SPA page: paste + synthetic urlset/index/unsupported examples, source-located XML/core diagnostics, bounded expandable origin/path tree and local filtered/paginated entry list. Child sitemaps remain explicitly unchecked and text-only; no URL fetch/navigation, indexing or HTTP claims.
7. Export measured UTF-8/source-mapped static report, not raw XML; clear/edit/dispose invalidate report/filter/Blob and late lazy loads. Preserve existing shell; text-safe rendering, accessible keyboard controls and mobile containment.
8. Validate focused core/public tests, production adapter/security/structure/source/filter/index/privacy/lifecycle E2E and shared eight-route regressions; scoped strict checks/build and durable screenshots/docs. Parent owns source-frozen full verify, Oracle/structure, AC/Done and isolated commit.

9. Oracle 修正後 lastmod 支援六種 W3C Datetime 形式，foreign-namespace entry extensions 保留 warning／不完整，不誤判合法 sitemap 失敗。完成 focused、完整驗證與獨立複審後交付。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

排除只有格式驗證／去重的近期主力版本。較深網站上線健檢須另證需求、抓取成本與邊界，不能直接擴大實作。 競品覆蓋程度高： XML、重複 URL 與報告；本機規則驗證不是搜尋收錄診斷。

提升／重新納入條件：以真實 sitemap 證明靜態 path tree/診斷優於既有工具；live crawl 與收錄不是本卡承諾。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-existing-core.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

## 2026-10-15 normalized core 實作交接

最新實作授權已取代先前市場暫緩決定。已新增 `packages/core/src/sitemap.ts` 與 `sitemap.test.ts`，無 XML／DOM／檔案／網路相依。`validateSitemap(document)` 接受明確 adapter contract，驗證 sitemap 0.9 namespace、來源 ordinal／pointer、HTTP(S) loc、精確字串重複、mixed host、嚴格 lastmod／可選欄位及 protocol／local bounds；未知結構及未量測 bytes 不宣稱完整。

僅輸出已提取欄位、靜態診斷與 origin／pathname 扁平分組，不遞迴拆分長路徑。index 子檔一律 unchecked，不推論 HTTP／收錄／子檔結果。DOCTYPE／entity 必須由未來 browser adapter 在 DOMParser 前拒絕；core 僅檢查 adapter flags，不冒充 XML 安全解析器。

指定 focused tests 共 46 個通過；兩個 owned 檔案 scoped `vp check` 格式／lint／type checks 通過且無 warnings。完整 API、adapter 安全與來源 contract、limits／語意及證據見 `.slim/deepwork/unfinished-cards-2026-10-15/stw-17-core.md`。

待 designer 補齊公開 subpath／建置、DOMParser adapter、安全 XML fixtures、樹狀／過濾／來源導覽及 clear／privacy。Parent 負責完整 AC1–AC5、Oracle、最終驗證與 commit。本次維持 In Progress，不勾 AC、不轉 Done、不建立 commit。

STW-17 adapter/UI/public integration ready for parent gate. Added built @sid-tools/core/sitemap and lazy eight-route SSG/SPA page, no aliases/dependencies/CSP changes. Inherited46-test normalized core unchanged. Browser adapter refuses DOCTYPE/entity before DOMParser; resource/namespace/root/direct-child/cardinality/unknown-structure rules explicit, lexical source mapping preserved. Chromium XHTML and Mozilla parsererror nodes detected without echoing raw parse error text. Unsupported extensions/attributes/mixed text/PI/nested markup and duplicate fields remain source-located incomplete results, every original direct entry retains ordinal/pointer.
Accessible native-disclosure origin/path tree and source navigation; local search/status filters and bounded50-row pages/60-node batches. Index link fields inspected but every child content explicitly unchecked/unfetched/text-only. JSON is static report only (not raw XML), with no HTTP/Google indexing claim and sensitive URL/query warning. UTF8 bytes refer to textarea content with honest browser-newline normalization caveat; overlong string precheck has byte count unmeasured. Edit/run/clear/dispose reset maps/report/filters/source labels/Blob URLs and stale import guards; no storage/network/share URL.
Objective evidence: focused46 core+5 public tests51/51 pass; production pnpm build pass (existing TS7 experimental API notice, not warning-free build claim). Scoped strict check18 relevant paths pass zero warnings/errors and tracked scoped diff whitespace check pass. Docs-only vp check had no lintable files, so combined18-path strict check rerun successfully. Final production Sitemap/shared/Git/env/SemVer E2E35/35 pass in22.3s (8+12+5+5+5). Tests instrument DOMParser zero calls for4 unsafe declaration cases, prove no linked resource/child fetch, true downloaded report indexing disclaimer/source map, unknown structure and every direct entry preservation, duplicate/date/host diagnostics, multibyte-byte/count/node/depth bounds without partial pass, list/tree pagination, literal XSS safety,320px containment, Blob revocation, edit/clear/lazy/SPA/reload reset.
Durable evidence docs/validation/stw-17/README.md + four synthetic-only production screenshots, desktop1440/mobile390 visually reviewed;390 document width equals viewport, no browser errors. Agent-browser Chrome148 screenshots; Playwright Chromium153 tests. Exact staging set, all5AC mapping, limitations and design intent: .slim/deepwork/unfinished-cards-2026-10-15/stw-17-implementation.md. Source writer terminal/frozen; evidence browser/server stopped. Remains In Progress, AC unchecked. Parent owns cache-disabled root verify, Oracle/structure, AC/Done and isolated commit. No staging/commit/push/deploy; unrelated explain/palette/research/cards untouched.

## 2026-10-15 Oracle1 bounded M1/M2 remediation

M1：正確 namespace 的 url／sitemap 內 foreign-namespace extension child 改為 warning，保留 unknownTagCount，因此 image-only／hreflang-only 回傳 valid:true、complete:false，UI 不再誤報失敗。root／entry namespace error 保持不變。

M2：lastmod 接受六種 W3C Datetime 形式（年、年月、年月日、帶時區分鐘、秒、小數秒），維持嚴格西曆／閏年／時間／時區檢查，時間缺時區仍拒絕；同步 support rules 與 help 的機械文字。

驗證：focused core＋public 64 tests passed（fresh build 前後）；四個 TS 檔 scoped check 零 warnings／lint／type errors；pnpm build 成功；production Sitemap E2E 11 passed，包含兩種 extension、新日期形式與原始 namespace／XML safety／lifecycle regressions。詳細差異與命令見 `.slim/deepwork/unfinished-cards-2026-10-15/stw-17-remediation.md`。

保留既有 forest UI，無其他卡／core／shared config 改動，無 AC／Done／staging／commit。Parent 接手 full pnpm verify、Oracle2 與最終 gate；writer 停止。

最終 gate：修正後 mise exec -- pnpm verify 通過，298 項單元／套件測試、45 項 E2E、98 檔格式與49檔嚴格檢查通過，建置及 production audit 通過（既有 TS7 experimental API 提示保留）。總單元數含尚待交付核心。Oracle attempt2 PASS：M1 extension warning／不完整與 M2 六種 W3C 日期修正皆通過，無新增重大風險；結構檢查 PASS 且邊界未變。所有五項 AC 對應 production browser／core／public API 證據見 docs/validation/stw-17/ 及 tests/e2e/sitemap.spec.ts。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成 Sitemap 0.9 本機 XML 預檢、來源定位、路徑樹與過濾列表及靜態 JSON。解析前拒絕外部實體與超限；子 sitemap 明示未檢查且不抓取，不推論 HTTP／Google 收錄，不保存或上傳輸入。64 項專項測試、11 項 Sitemap E2E、完整 pnpm verify、結構與 Oracle 複審通過。限制及可重現畫面：docs/validation/stw-17/。
<!-- SECTION:FINAL_SUMMARY:END -->
