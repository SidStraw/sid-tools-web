---
id: STW-16
title: Lighthouse 報告比較：區分指標變化與測試條件差異
status: In Progress
assignee:
  - '@codex'
created_date: '2026-10-04 14:23'
updated_date: '2026-10-14 14:07'
labels:
  - keyword-research
  - proposal
  - performance
  - delivery-web
  - web-first
  - extension-cli
  - extension-ci
  - demand-reviewed-2026-10-14
  - validate-next
  - competitor-tested-2026-10-14
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_09/05_032812.md
  - 'https://github.com/GoogleChrome/lighthouse-ci/issues/1101'
  - 'https://github.com/GoogleChrome/lighthouse-ci/issues/1132'
  - 'https://googlechrome.github.io/lighthouse-ci/difftool/'
  - 'https://github.com/googlechrome/lighthouse-ci'
  - 'https://www.seodata.dev/llms.txt'
  - 'https://www.lighthouse-aimetrics.com/compare-lighthouse-runs'
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-existing-core.md
  - research/competitor-validation-2026-10-14/README.md
  - research/competitor-validation-2026-10-14/search-demand.md
priority: medium
type: feature
ordinal: 2
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

兩份 Lighthouse 分數不同可能來自測試環境或版本，而非程式改動；需要先確認可比性再看 audit 變化。

## 首版邊界

上傳兩份既有 Lighthouse JSON，檢查版本、URL、裝置及節流設定後比較指標與 audit；不執行遠端掃描、不建立持續監控服務。

## 差異與待驗證假設

先揭露量測條件差異，避免把單次分數上升當成改善證據，並讓使用者匯出可審查的對照。

## 關鍵字證據與合併

- `lighthouse report diff tool`：1 份報告出現。
- `lighthouse report compare`：1 份報告出現。
- `lighthouse comparison`：1 份報告出現。

本卡合併 3 個唯一關鍵字，來自 1 份報告、3 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: lighthouse-diff）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_09/05_032812.md 至 logs/2026_09/05_032812.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI／CI 既有 Lighthouse 報告比較。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 比較指定支援版本的 category、metric 與 audit，缺少欄位標為 unavailable 而非 0。
- [x] #2 明顯不同的 URL、form factor、throttling 或 major version 顯示可比性警告。
- [x] #3 區分數值變化與因果推論，不宣稱單次報告已證實效能提升。
- [x] #4 可匯出含量測條件、原始值與差值的報告，以固定 JSON 範例驗證。
- [x] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 建立四工具共用選單與 GitHub Pages 可直達的靜態頁面，保留現有圖片工具。2. 實作 Lighthouse 11–13 JSON 本機比較：量測條件、category、metrics、audit、缺欄位 unavailable 與可匯出報告。3. 使用先前真實 Lighthouse 報告與邊界樣本驗證，檢查多頁路徑、手機版、清除與無上傳。4. 經 pnpm verify 後保存階段 commit，三工具完成後一起部署並驗證公開站。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Medium / validate。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

八項中值得優先細化的需求之一。改驗證多頁矩陣／報告相容與比較可信度，不能只重做官方兩檔 diff。 競品覆蓋程度高： two-report diff；多頁彙整有明確近期請求，競品完整覆蓋待測。

提升／重新納入條件：先驗證原有兩報告相容與可比性提示是否省時；多頁矩陣是新線索，另作範圍決策，不自動擴充 AC。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-existing-core.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

## 2026-10-14 真實樣本競品實測與搜尋量補查

本段更新同日上一輪「競品未實測／搜尋量未知」的範圍；舊紀錄保留。獨立無頭瀏覽器實測官方Lighthouse CI Diff Tool，沒有使用個人Chrome profile。用研究目錄本地Lighthouse12.6.1真跑Chrome官方文件頁的mobile A/B與desktop，原始JSON未手改。

同設定mobile A/B可正常匯入並顯示Performance69→67（−2）、Best practices96→79（−17）及audit差異。相同網站改比較mobile A/desktop時顯示Performance85（+16），本輪完整頁面／控制項／title未直接提示formFactor與throttling不同。支持「先檢查可比性」的差異假說，不是聲稱競品明確宣告程式改善。兩份mobile沒有本站程式改動；分數差不是程式回歸證據。

報告限制：mobile終端有Lantern dependency-cycle訊息、三份均有語系轉址warning，但無runtimeError；只能作匯入／條件提示測試，不作可靠效能因果實驗。跨major版本、缺欄位與不同URL尚未實測；官方fixtures另存但不冒充本輪真實執行。頁面未見原生比較摘要匯出控制，但不排除其他保存方式。

替代方案：Lighthouse AI Metrics公開頁宣稱同monitor比較、noise及median處理；登入後功能NOT RUN，未建立帳號。故只確認匿名既有JSON比較器的本輪缺口，不能宣稱全市場獨家。排除重做基本兩檔分數／audit diff，維持既有兩報告邊界，不因多頁線索擴成監控服務。

搜尋量：seodata.dev US lighthouse report 720/月、lighthouse ci 170/月均屬廣意圖；compare lighthouse reports、lighthouse diff、lighthouse comparison、lighthouse report comparison未取得正向量。API回0語義不明，Trends比較詞53週0且資料不足；都不能當零需求。沒有直接Google Ads匯出或第二份精確詞量，不能把report720歸給比較工具。

決策：維持Medium、Needs Refinement、ordinal 2，排STW-34之後。下一門檻為實際報告使用者／可觸及分發途徑，及條件提示是否實際改變判讀／省時；尚不能以SEO機會啟動。AI操作比較未測，不宣稱AI不可替代。沒有實作、AC勾選或新卡。

完整方法、來源、截圖、樣本與限制：research/competitor-validation-2026-10-14/README.md；樣本生成：samples-lighthouse.md；月量來源與原始資料：search-demand.md、search-demand-api.json。

使用者已授權完成第一階段推薦的全部工具（STW-34、16、3、5）並加上切換工具選單。維持各卡原有首版邊界。

使用者追加架構要求：四工具須共用單一 SPA，並以 SSG 產生每個路由的完整 HTML。改採共用 History 路由、依工具動態載入、載入失敗重試、切換時清理工作與資料；驗證直接網址、前後頁、快速切換及懶載入。

本機 pnpm verify PASS：27 個單元/套件測試、18 個 production E2E，無格式/lint/型別錯誤與已知 production 漏洞。四工具共用 SSG + SPA；直接網址、前後頁、切換清理、動態載入、斷線恢復、快速切換、下載與無上傳已實測。細節 docs/validation/phase-one/README.md。維持 In Progress，等待遠端 CI/Pages 公開站驗收。
<!-- SECTION:NOTES:END -->
