---
id: STW-35
title: 圖片色盤到可讀的介面配色與 token 匯出
status: Done
assignee:
  - '@designer'
created_date: '2026-10-04 15:33'
updated_date: '2026-10-15 16:36'
labels:
  - keyword-research
  - proposal
  - monorepo-expansion
  - delivery-web
  - web-first
  - demand-reviewed-2026-10-14
  - deferred-evidence
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/22_032903.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_04/09_041123.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/27_035349.md
  - 'https://github.com/5t3ph/a11y-color-tokens'
  - 'https://colortable.org/palette/'
  - 'https://palette.ikit.app/?lang=zh_TW'
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-existing-core.md
priority: low
type: feature
ordinal: 135
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

從品牌圖取色後仍需決定文字／背景搭配並檢查對比；可整合成從素材到介面 token 的流程。

## 交付形式與首版邊界

主要形式：web。順序：Web 優先候選。

Web 取色與手動調整，明示對比計算規則，匯出 CSS variables 及可選的框架 token。

## 延伸方向與相鄰題目

可延伸亮／暗主題與設計系統整合；不是把單一對比值宣稱為整站無障礙合格。

## 關鍵字來源與合併

代表原始詞：`color palette extractor from image`; `color contrast checker wcag`; `tailwind color palette generator`。

本題合併 36 個相關唯一詞，來自 18 份報告、72 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: palette-a11y）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 色盤與選取的前景／背景能即時預覽，透明度及混色條件明確。
- [x] #2 對比結果列出所用標準與文字條件，提供已知參考值核對。
- [x] #3 匯出具可讀名稱的 token 並保持與預覽一致，未通過的組合不隱藏。
- [x] #4 來源圖片留在瀏覽器，說明色彩對比檢查無法代替完整無障礙驗證。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 實作不依賴 DOM／Canvas／影像解析的純 RGBA pixel core：驗證元件與輸入／sample／color 上限，依使用者明確選取的 opaque backing 做 alpha compositing，採固定 bucket deterministic quantization 並回傳取樣頻率。
2. 實作 sRGB WCAG 2.x relative luminance／contrast、AA／AAA normal／large 四種門檻，保留精確比值及透明度條件，不宣稱字級或完整無障礙驗證；安全 CSS token helper 僅匯出明確選取的名稱與 RGB，拒絕不合法識別字及 injection。
3. 用標明 synthetic 的固定 pixel arrays 與 reference math 驗證黑白／灰階／alpha／quantization／limits／CSS injection；只執行 focused test、兩檔格式化與 scoped vp check。
4. 交由 designer 整合公開 subpath／建置、Canvas 解碼／本機圖片流程、手動調整與預覽、透明 backing／對比規則與未通過結果、具名 token 匯出及 privacy／clear 行為。Parent 負責完整 AC1–AC4、Oracle、最終驗證與 commit；本次不勾 AC、不轉 Done、不建立 commit。

5. Add built public @sid-tools/core/palette subpath/types and tenth independent lazy SSG/SPA route. Preserve52-test core APIs/semantics. Design image-to-swatches-to-role workbench in existing forest/off-white shell, responsive live preview and all four WCAG threshold outcomes, not an accessibility certificate.
6. Bound local-only single-file JPEG/PNG/WebP adapter by8MB/4096edge/4Mdecoded pixels; inspect container/animation/dimensions using public images helper before browser decode, reject GIF/APNG/animatedWebP/SVG/unsupported or malformed input. Bound cancellable loading, timeout, decoded-size checks, canvas cleanup, no remote source/CSP change; define sRGB/browser management/transparency limits explicitly. Synthetic Canvas PNG fixtures use the same decoder path.
7. Require visibly selected opaque backing, extract deterministic sampled4bit buckets and show counts/omissions not exact unique colors/proportions. Select swatch into explicit text/surface/accent roles with manual hex/alpha edits, foreground-over-background-over-backing preview using exact composited core values and WCAG ratios. Known21:1/gray118 references, normal/large text conditions, all failing combinations retained.
8. Explicit token selection/name validation only through core serializer, preview-consistent opaque resolved values and warning alpha context is flattened; no automatic selection/raw CSS/image/filename inclusion. Cancel/clear/edit/dispose revision guards and Blob cleanup, no upload/storage/share URL. Focused core/public/build/scoped strict and production real small-image/alpha/contrast/token/limit/privacy/lifecycle/mobile tests plus durable synthetic screenshots/AC1-4 mapping and exact staging handoff. Parent owns fullverify/Oracle1/structure/finalization/commit; no staging/commit/AC checking.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

原通用流程已有直接覆蓋；目前需求主要來自工具作者自身敘述。可保留工具站輔助功能，但不當獨立優先流量項目。 競品覆蓋程度高：對比矩陣、CSS/JSON/DTCG 匯出與本機保存已有產品。

提升／重新納入條件：真實品牌圖片到語意 token 交付需證明比現成配色工具少返工；矩陣與匯出本身不是差異。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-existing-core.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

## 2026-10-15 core 實作交接

最新實作授權已取代先前市場暫緩決定。已新增 `packages/core/src/palette.ts` 與 `palette.test.ts`，無新增相依套件。pure core 僅接受已解碼 RGBA bytes：明確 opaque backing、encoded sRGB source-over、固定 4-bit buckets 與 deterministic sampling／排序，頻率以全部 sample 為分母並揭露 omitted samples，不宣稱感知主色或照片量測。

提供 sRGB relative luminance、contrast ratio 與 AA／AAA normal／large 四項門檻；不依四捨五入比值判定，不宣稱字級或完整無障礙合格。RGBA 不可直接交給 opaque APIs 而默默丟棄 alpha。CSS token helper 僅接受明確選取的合法名稱與 numeric RGB，拒絕注入／重複名稱，保留小數以對應預覽。固定 pixel arrays 標示 synthetic provenance。

指定 focused test 共 52 個通過；兩個 owned 檔案的 scoped `vp check` 通過格式、lint、type checks。完整 API／規則／執行證據見 `.slim/deepwork/unfinished-cards-2026-10-15/stw-35-core.md`。

待 designer 補齊公開 subpath／建置、Canvas／圖片本機流程、預覽／調整／明確 backing、門檻條件／未通過組合及 token 匯出；Parent 負責完整 AC1–AC4、Oracle、最終驗證及 commit。本次維持 In Progress，不勾 AC、不轉 Done、不建立 commit。

STW-35 UI/image adapter/public integration ready for parent gate; source writer terminal/frozen. Inherited palette.ts/palette.test.ts unchanged52coretests; added built typed @sid-tools/core/palette subpath/pack entry and tenth independent lazy SSG/SPA route with shared10route tests. No aliases/dependency/lockfile/toolchain/CSP changes.
Single static localPNG/JPEG/WebP adapter8MB/4096edge/4Mdecodedpixels, public image container helper before native Blob decode, MIME consistency, animation refusal, stricter multipleJPEGframe/VP8X/codedWebPdimension guards. Abortable FileReader,10s native-load wait, src/URL/timer cleanup every outcome, decoded dimensions checked before sRGBCanvas including orientation swap. Browser-native release/colorprofile/HDR/EXIF limits honest; no remote URL/upload/storage/share action.
Explicit opaque backing initially unchosen; alpha0pixels included as backing samples. Fixed4bit/sample/bucket/frequency omissions visible, not exactunique/perceptual/fullimageproportion claims. Select swatch into text/surface/accent or manualHEX+alpha; defaults explicitly illustrative not image-inferred. Actual composited fractionalRGB drives preview/contrast/token. All4AA/AAA normal/large outcomes retained for2pairs, known21:1/1:1/gray118vs119 references and actual18pt/14ptbold conditions, no fullaccessibility/fontdetection claim.
Selectedcheckbox tokens only, bounded lowercasekebabcase names/duplicate/injection refusal, exact numericopaqueRGB fullpreview=CSSdownload, failures not filtered; no image/name/pixels/rawCSS leak. Alpha flattened/contextdependent clearly disclosed. Edit/source/run/cancel/clear/dispose revoke URLs/resetpixels/maps/tokens, stale imports cannot resurrect; SPA/reload fresh. Forest/offwhite shell, asymmetric preview+rolecontrol desktop and stackedmobile, nativecontrols/focus/textflags preserved.
Focused evidence:59/59unit/public (52core+7public), production11entry/10SSGbuild PASS (existingTS7 experimentalAPI notice retained); final18fileformat/strict PASS zero warnings/lint/typeerrors, scopedtrackedwhitespace PASS.57/57relevantproductionE2E PASS37.5s (10palette+12shared+9explain+11sitemap+5git+5env+5semver), realbrowserPNG/JPEG/WebP, alpha/counts/roles, nestedfractionalRGB127.5/191.25tokens, precisegraythresholds, limits/animations/codedframe/malformed/recovery, noBlob beforelimitfail, native-dimensions/cancel/timeout/lateimports, inertfilename, noexternalrequests/storage/query/hash, Blob lifecycle320pxoverflow/SPAclear.
Five durable synthetic current production screenshots and all4AC mapping/rules/reproduction in docs/validation/stw-35/README.md; desktop1440/mobile390 plusdetail1440x1100 visuallyreviewed. HeadlessChrome148screenshots/Chromium153automation, forest390doc=390;alpha390doc=390/320doc=320,noerrors. Exact24path staging set/design/limits/checks in .slim/deepwork/unfinished-cards-2026-10-15/stw-35-implementation.md. Browser/serverstopped,4173released. No staging/commit/AC/Done/fullverify/audit/Oracle/structure bythislane. Parent owns finalcache-disabledverify/Oracle1+structure/finalization/isolatedcommit; reservedresearch/CLI21/22/27/28/33 untouched.

2026-10-16 最終 gate：mise exec -- pnpm verify 通過，308 項單元／套件測試、64 項 production E2E、113 檔格式與58檔嚴格檢查通過，build／production audit 通過，cache0/6；既有 TS7 experimental API 提示保留。Oracle 初審 PASS：圖片解碼前限制／alpha與WCAG計算／明確選取CSS精度／隱私及清理均通過，無重大問題；公開入口與路由結構 PASS。五張合成圖片 production 截圖已審視，手機320／390px無頁面溢出、無 runtime errors。所有四項 AC 證據：docs/validation/stw-35/README.md。限制保留：瀏覽器原生解碼／色彩管理非沙盒、固定抽樣可能遺漏圖樣、4M像素上限拒絕大型照片、小數RGB與實際8位元顯示可能在門檻附近有差異；不宣稱整體無障礙合格。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成本機圖片色盤、明確透明混色背景、手動前景／背景／強調色預覽、WCAG 2.x 四種文字對比門檻與具名 CSS token 匯出。未通過組合保留，圖片不傳送或保存，對比不取代完整無障礙驗證。59 項專項單元／公開 API、57 項相關 E2E 及完整驗證308單元／64 E2E通過，Oracle與結構PASS。規則、限制與五張畫面：docs/validation/stw-35/。
<!-- SECTION:FINAL_SUMMARY:END -->
