---
id: STW-7
title: CSS selector 比較：特異性拆解與 HTML 命中預覽
status: Done
assignee:
  - '@designer'
created_date: '2026-10-04 14:23'
updated_date: '2026-10-15 18:16'
labels:
  - keyword-research
  - proposal
  - frontend
  - delivery-web
  - web-first
  - extension-ide
  - demand-reviewed-2026-10-14
  - deferred-evidence
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_07/24_042253.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_07/26_042516.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/24_034550.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_09/01_033208.md
  - 'https://toolhuben.com/css-specificity-calculator/'
  - 'https://www.toolhuben.com/css-selector-tester/'
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-other-cards.md
priority: low
type: feature
ordinal: 107
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

樣式衝突常混淆 selector 沒有命中與特異性不足，單一分數無法區分這兩種原因。

## 首版邊界

輸入小段 HTML 與數個 selector，同時查看命中元素與特異性拆解；首版不宣稱模擬完整 cascade、layer、動畫與瀏覽器樣式。

## 差異與待驗證假設

同頁連動 selector 命中與繁中解釋；既有 specificity calculator 已支援 Selectors Level 4，這裡需驗證教學與排錯流程的額外價值。

## 關鍵字證據與合併

- `css specificity calculator online`：12 份報告出現。
- `css selector specificity calculator`：7 份報告出現。
- `css selector tester online`：1 份報告出現。

本卡合併 13 個唯一關鍵字，來自 18 份報告、42 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: css-specificity）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/24_034550.md 至 logs/2026_09/01_033208.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：IDE selector 診斷。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 各 selector 顯示特異性三元組與貢獻來源，包含 :is、:not、:has、:where 的案例。
- [x] #2 在隔離的 HTML 預覽中標示命中元素，空命中與無效 selector 有不同提示。
- [x] #3 說明 specificity 不代表完整 cascade 結果，遇到未支援語法不能給出假精確排名。
- [x] #4 使用者提供的 HTML 不執行 script、不載入外部資源，可複製對照結果。
- [x] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 依已核准 text-only preview／offline parse5／inert native matching 邊界啟動；最新授權取代舊市場 defer。本 lane 只建純 css-tree AST specificity core。
2. 透過 shared catalog exact pin css-tree3.2.1 及相容 typings，維持 pnpm age policy；限制 selector count／length／nesting／AST nodes，明示 invalid／unsupported／state／matchability 與來源貢獻。
3. 執行 selector-focused vectors／adversarial tests 及 owned files scoped strict，交接精確 API／限制／dependency evidence；不加 public exports／build entries。
4. 後續 designer 接 public integration、offline parse5 安全 adapter、text-only structure preview／matching／clear／privacy 與 browser security gates。Parent 負責整合 fullverify、Oracle、AC／Done／commit。本 lane 不 staging／commit／AC／Done。

5. Integrate exact catalog parse5@8.0.1 app runtime, built @sid-tools/core/selectors subpath/types and eleventh standalone lazy SSG/SPA route. Preserve core60test semantics, one comma selector list and aggregate20/1000/20000/nesting16/AST2048 limits.
6. Offline body-context parse5 withlocations/scriptingEnabled true and repair diagnostics; iterative wholeAST validation50000HTML/2000elements/depth64/64attrs/2000attrvalue/10000text including suppressedsubtrees/templatecontent. Build ONLY separate createHTMLDocument defaultView null safe factories; allowlistedHTML plus same-tag childless dangerous/foreign placeholders, record every attribute/subtree/text/comment/tag omission. No raw browserHTML parser/sinks/import/adopt/live usernodes.
7. Native query only eligible static complex branches on inert body, distinct invalid/parserunsupported/browserSyntaxError/empty/not-evaluated/notmatchable statuses. Specificity rank known tuples only, per-element max of actuallymatched top-levelbranches, never cascadewinner or logicalbranch provenance. Global/specific partialwarnings from all referencedmetadata; static formstates explicitly initial. Bound matching work and measure adversarialhas, slow notices/budget.
8. Forest/offwhite structure+selectorcards/contribution/source inspector withpagedrows/diagnostics and text/shape matchindicators, parse5source/impliedlabels. Explicitplaintextcopy plusreadonlyfallback; all input textContent-only. Edit/run/clear/dispose remove inert docs/maps/listeners/revision, delayedimports cannotrestore. Focusedcore/public/build/strict and production hostilecorpusrawsink/request/CSP/sentinel/inertownership/metadata/limits/runtime/parity/lifecycle/privacy/mobile/copy tests plusdurablesyntheticimages/all5AC/exacthandoff. Parent owns frozenfullverify/Oracle1/structure/finalization/commit; no staging/commit/AC/Done.

9. Essential bounded isolation adjustment from production hostile test: appending even empty HTMLStyleElement into defaultView-null document emits style-src-elem CSP event in Chromium. Treat HTML style as unrepresentable/whole omitted subtree under approved omit-unrepresentable partial rule, record explicit omitted tag/attrs/text notices and metadatawarnings. Do not substitute namespace, attach native style, weaken CSP or ignore securitypolicyviolation. Other safe same-tag dangerous placeholders retained; validate zeroCSP/request corpus after adjustment.

10. 以額外離線 document parse 偵測被 fragment 忽略的 html／head／body／doctype 與屬性，來源通知及各 branch 部分結果警告，不改 fragment matching；明示 tokenizer 診斷不涵蓋所有樹狀修正。完整驗證、Oracle 複審及目前截圖更新後交付。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

權重計算與 DOM match 工具供給密集；未取得需要整合兩者的獨立需求，亦未實跑競品。

提升／重新納入條件：取得真實錯誤定位任務，證明比瀏覽器 DevTools／既有 tester 更省步驟。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-other-cards.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

## 2026-10-16 bounded specificity core 交接

已依核准方案建立 `packages/core/src/selectors.ts`／`selectors.test.ts`，純 css-tree AST specificity，無 DOM／HTML／network。`analyzeSelectors(text)` 回傳每個 top-level complex branch 各自 tuple、UTF16 source spans／contribution tree、invalid／unsupported 明確狀態、dynamic／pseudo-element／namespace matching metadata、attribute／tag references。:is／:not／:has 取參數最大值、:where0、nth-child／nth-last-child 加 pseudo1 與 of-list max；任何 unknown／Raw／無法確認的 forgiving branch 不偷偷略過也不排名。

限制 input20000／各selector1000 UTF16、top-level最多20、preparse nesting16、AST nodes2048。nested :has／nesting &／未知pseudo/function／functional pseudo-elements 等明示unsupported；dynamic只計specificity不模擬狀態；named namespace不嘗試native matching。

依 shared catalog pin css-tree3.2.1（runtime無附帶types）及 @types/css-tree3.2.0（registry2026-08-03發布，符合4320分鐘 age policy）；mise pnpm install更新lock。未加public exports／pack entries。Focused60 tests passed，兩個TS scoped strict無warnings／lint／type errors，scoped whitespace passed。Install曾報既有25項deprecated subdependencies，未調policy或額外升版。

完整API／limits／allowlist與未支援範圍／commands見 `.slim/deepwork/unfinished-cards-2026-10-15/stw-7-core.md`。後續designer負責public integration／offline parse5／inert native matching／text-only preview及安全browser gates；Parent負責fullverify／Oracle／finalization／commit。本writer停止，無build／fullverify／staging／commit／AC／Done。

STW7 integration ready for Parent gate; writer frozen after scoped evidence. Added lazy eleventh standalone route/public typed selectors subpath and parse5@8.0.1 catalog runtime; inherited core unchanged. Offline body fragment -> fully validated AST -> defaultView-null safe-factory document; text-only live UI, no raw browser HTML sinks/import/adopt/clone. Dangerous/foreign childless identity placeholders, explicit omissions/source metadata/repair/partial; native empty/invalid/unsupported/dynamic/nonmatchable/browserSyntaxError/budget distinct; known-only ranks and per-element highest actuallymatched top-level tuple, never cascade. Style bounded exception: even empty native style emitted CSP, therefore wholly omitted/partial under unrepresentable fallback; no CSP weakening.
Assigned focused tests68/68, production build12 core entries/types +11SSG routes pass, scoped19file format/strict zero warnings/lint/type errors, relevant production E2E67/67 in39.1s. Hostile corpus zero raw sinks/import/adopt/clone, inputrequests/sameorigincanaries, CSP, script/sentinel/dialog/runtimeerrors; inert ownership/namespaces and droppedattrs verified. Bounded1831element/20has round131ms incl input/render, deterministic slowbudget test separate. Five current synthetic screenshots visually read/reviewed;390/320px containment and readonlycopyfallback pass. Evidence/reproduction/5ACmapping/limitations docs/validation/stw-7/README.md; ignored stw-7-implementation.md exact staging/API/scope/handoff. Parent owns cache-disabled fullverify/Oracle1/structure/AC/Done/isolatedcommit. No rootverify/staging/commit/AC/Done/push/deploy; reserved othercards/research untouched.

## 2026-10-16 Oracle1 M1 bounded remediation

追加離線 parse5.parse（同50000UTF16 prelimit之後、僅診斷）偵測 explicit html／head／body start tag locations或wrapper attrs與doctype；建立document-wrapper-ignored來源通知，wrapper tag／attr names進既有omission metadata。不carryover attrs、不改fragment重建／matching source of truth，沒有browser raw parser／DOM isolation／CSP／layout變更。既有global與每branch partial warnings因此對full-document及body-only wrapper生效，不再乾淨空命中。

parse5:*與help／summary／docs改明示tokenizer errors不是完整tree-construction repair diagnostics，部分foster／adoption／implied repairs可靜默。保留implied labels／source ranges。

focused core＋public68/68 fresh build前後通過；production build成功（既有TS7 experimental API notice保留）；Selectors production E2E12/12，8.1s，新增full-document／body-only兩個回歸且保留hostile corpus零raw sinks／requests／CSP、limits及lifecycle。synthetic1831elements／20has round117ms含input／render與兩次offline parse，不代表worst-case guarantee。最終五檔format、三TS strict零warnings／lint／type errors及scoped whitespace通過；4173無listener。

文件區分五張historical pre-remediation screenshots與目前production regression／文字，未宣稱重拍。精確差異、commands與limitations見 `.slim/deepwork/unfinished-cards-2026-10-15/stw-7-remediation.md`。未改core／deps／config／othercards，無staging／commit／AC／Done／fullverify。Parent接手source-frozen fullverify／Oracle2／finalization／commit，writer及server已停止。

2026-10-16 最終 gate：mise exec -- pnpm verify 通過，369 項單元／套件、76 項 production E2E，122 檔格式／64檔嚴格檢查、建置與production audit通過，cache0/6；既有TS7 experimental API提示保留。Oracle attempt2 PASS：wrapper 忽略警告及tokenizer wording修正，無新增重大風險；獨立hostile corpus零請求／CSP／script／live input nodes；結構PASS。七張目前production截圖已檢視，wrapper empty-but-partial與來源通知可見，320／390px無頁面溢出或runtime errors。使用者已明確核准文字結構樹預覽。完整AC證據及限制：docs/validation/stw-7/README.md。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成CSS selector三元組／貢獻來源、Level4邏輯函式、離線HTML隔離結構樹命中與純文字複製。未支援語法不假排名，空命中與無效分開；外框／危險內容省略明示部分結果，不模擬完整cascade。輸入不執行、不載入資源、不傳送或保存。369項單元／套件、76項E2E及完整驗證通過，Oracle複審與結構PASS，七張更新畫面見docs/validation/stw-7/。
<!-- SECTION:FINAL_SUMMARY:END -->
