---
id: STW-34
title: 批次圖片最佳化：依目標大小與尺寸預算匯出
status: Done
assignee:
  - '@codex'
created_date: '2026-10-04 15:33'
updated_date: '2026-10-15 13:30'
labels:
  - keyword-research
  - monorepo-expansion
  - delivery-web
  - web-first
  - demand-reviewed-2026-10-14
  - competitor-tested-2026-10-14
  - released
  - phase-one
  - market-validation-pending
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_04/17_042019.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_05/15_043727.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_05/23_042955.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_04/12_041935.md
  - 'https://github.com/GoogleChromeLabs/squoosh/issues/1422'
  - 'https://github.com/GoogleChromeLabs/squoosh/issues/1153'
  - 'https://imagekit.lzw.me/zh-TW/compress-image-to-kb'
  - 'https://compress-picture.com/compress-image-to-100kb'
  - 'https://www.seodata.dev/llms.txt'
  - 'https://compress-picture.com/compress-png'
  - 'https://github.com/SidStraw/sid-tools-web/actions/runs/38572215704'
  - 'https://tools.sid.tw/'
  - 'https://github.com/SidStraw/sid-tools-web/actions/runs/38725310119'
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-existing-core.md
  - research/competitor-validation-2026-10-14/README.md
  - research/competitor-validation-2026-10-14/search-demand.md
  - docs/validation/stw-34/README.md
  - docs/validation/cloudflare/README.md
  - docs/validation/cloudflare/public-smoke.json
priority: medium
type: feature
ordinal: 1
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 最新交付狀態（2026-10-15）

Done，Web 首版已上線：[開啟工具](https://tools.sid.tw/)。四工具共用單一 SSG + SPA、選單與按需載入；計算在瀏覽器處理。已遷移 Cloudflare Pages，GitHub Pages 關閉。

功能交付不代表搜尋量、排名或流量收益已驗證；CLI/CI/IDE 等延伸不列入本次完成範圍。歷史研究與競品證據保留於下方及原紀錄。

## 使用情境與發展空間

上架素材常受檔案大小、尺寸與透明背景限制；以輸出預算為目標比單純換副檔名更有操作價值。

## 交付形式與首版邊界

主要形式：Web，首版已交付；CLI 延伸仍為候選。

先在瀏覽器批次處理常見靜態圖片，提供前後預覽、每檔結果及 ZIP 下載。

## 延伸方向與相鄰題目

未來可提供 CLI 處理大量素材；保持同一產品候選，不依 Web／CLI 重複開卡。

## 關鍵字來源與合併

代表原始詞：`batch webp converter`; `bulk webp converter free`; `webp compression settings`。

本題合併 11 個相關唯一詞，來自 4 份報告、12 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: batch-images）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 原研究階段的細化條件

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

原研究階段只建立候選卡，不因 monorepo 預設框架或基礎設施。其後使用者已授權 Web 首版實作；現行架構與交付狀態見本卡開頭，研究來源限制仍保留。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 使用者設定尺寸、格式及檔案大小預算，結果逐檔顯示是否符合。
- [x] #2 透明度、方向與動畫的支援範圍明示，不能默默丟掉畫格或背景。
- [x] #3 無法達到預算時保留結果和原因，不假報成功；可比較壓縮前後畫面。
- [x] #4 批次有容量限制、取消與清除功能，原始圖片不自動上傳。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 依使用者授權採 mono-starter c6d6f32 初始化既有專案，保留研究與 Backlog，工具鏈維持 project-local。2. 完成靜態瀏覽器圖片工具：JPEG/PNG/WebP、明確 KB/KiB 與尺寸限制、逐檔結果與未達標原因、前後預覽及 ZIP；保留透明度或明確選擇白底，拒絕動畫，支援方向。3. 加入容量與像素限制、取消/清除、無上傳流程，以真實圖片及邊界測試驗證 AC。4. 執行範本 pnpm verify 與無頭瀏覽器驗收，使用 repo-local Wrangler、Pages 原生 Git OAuth 部署 tools.sid.tw，停用 GitHub Pages，驗證正式頁面。 最終架構：四工具共用單一 History SPA，建置產生完整 SSG HTML、工具與計算依需求載入，切換時清理工作及輸入；部署與分析驗收記於 STW-38。本機維護使用 mise exec -- pnpm <command>（STW-39）。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Medium / validate。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

需求最具體之一，但差異已被覆蓋。保留限時比較測試，須證明同大小畫質、透明／方向保留、批次失敗回報或操作效率勝過現有工具。 競品覆蓋程度高：繁中產品已標示批次、指定 KB、無需安裝與本機處理。

提升／重新納入條件：以同組圖片比較 Image Kit 等現成工具，核對大小、尺寸、透明／方向、畫質及失敗回報；未勝出便停止。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-existing-core.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

## 2026-10-14 真實樣本競品實測與搜尋量補查

本段更新同日上一輪「競品未實測／搜尋量未知」的範圍；舊紀錄保留。已依使用者要求用獨立無頭瀏覽器，不使用個人 Chrome profile。研究完成不等於產品 AC 完成。

實測：同三張未修改的 Squoosh 公開真實圖片，Image Kit 設100KB、原格式、批次並下載ZIP。JPEG輸出101,096 bytes；透明screen PNG 466,039 bytes（UI455.12KB），該列仍「處理完成」且未直接說明超標原因；小icon26,322 bytes與原檔相同。這是逐檔目標／原因回報缺口，並非說整個工具失敗；FAQ有一般限制說明。

Compress Picture的100KB流程輸出102,170／102,268／76,356 bytes，全部小於100KiB；照片縮至1499×1003、PNG轉JPEG白底、小圖增肥2.90倍。FAQ已披露縮尺寸及轉JPEG，不把這些誤稱未揭露。另實測其PNG流程，screen轉WebP130,530 bytes，尺寸不變、alpha逐像素一致，但當次流程未見目標KB控制。

保留差異假說：同時檢查byte上限、尺寸、格式與透明度，逐檔報告未達標原因／取捨，並避免不必要增肥。排除單純批次、指定KB、透明WebP、ZIP或預覽作獨立賣點，競品已有。100KB與100KiB須明確；未測動畫、EXIF方向、容量極限、傳輸隱私、AI替代或客觀同畫質優劣。

搜尋量：seodata.dev第三方回傳US compress image to 100kb 170/月、bulk image compressor 480/月；IN同100KB詞49,500/月。不是直接Google Ads匯出，統計期間、語言／聯播網及close variants不明，cache部分已數月；未取得第二份精確詞量。不能加總近似詞、不能拿廣詞或印度量代表台灣；批次＋KB＋保留透明／尺寸交集未獲證實。

決策：維持Medium、Needs Refinement、ordinal 1，先於STW-16驗證。下一門檻是真實提交規範、目標地區與同時限制的實際頻率；若現有工具已滿足便停止。沒有新卡、產品實作、AC勾選或To Do承諾。

完整方法、來源、輸入／輸出、雜湊、截圖、限制及後續門檻：research/competitor-validation-2026-10-14/README.md；搜尋量原始資料與解讀：同目錄search-demand.md、search-demand-api.json。

2026-10-14：使用者明確要求停止逐卡研究，採 mono-starter 初始化並完成第一順位 STW-34，以 GitHub Pages 可用為目標。此授權取代先前僅研究、不實作的階段限制。

2026-10-14 實作驗收：依 mono-starter c6d6f32 建立 @sid-tools/web 與 @sid-tools/core，project-local Node 24.21.0／pnpm 12.8.2／Vite+。完成 Worker 本機批次圖片處理、KB/KiB、尺寸／格式、透明背景同意、EXIF 方向、動畫拒絕、未達標下載與原因、前後比較、ZIP、容量／像素限制、取消與清除。pnpm verify 完整通過：13項單元／公開套件測試、7項 production Playwright E2E（含 /sid-tools-web/ 子路徑）、格式／lint／型別／建置與production audit（無已知弱點）。四項AC依客觀測試勾選。詳見 docs/validation/stw-34/README.md 與 verify.txt。GitHub Pages workflow 已建立，僅發佈 apps/web/dist；目標 repository 尚待使用者確認，未推送或部署，故維持 In Progress，不把本機通過當公開上線。

2026-10-14 21:33 Asia/Taipei：使用者明確授權建立公開 SidStraw/sid-tools-web 並部署 Pages。已推送 4e07da8；Actions run 38572215704 的 Linux、macOS完整驗收與Pages部署皆success。公開 https://sidstraw.github.io/sid-tools-web/ HTTP200，獨立無頭Chromium實跑三張真實圖，WebP輸出99,066／99,968／55,656 bytes，皆符合100,000 bytes及1000×1000上限；透明背景、前後預覽、ZIP下載解壓、手機寬度及無圖片HTTP上傳皆驗證通過。先前部署中404已由部署完成後實測取代。證據見 docs/validation/stw-34/pages-smoke.json、github-first-deployment.json 與公開站截圖。

圖片工具已整合到四工具共用 SSG + SPA，保留原網址與既有功能；切換會停止編碼/ZIP 並釋放資料。原 7 個圖片 E2E 全數回歸通過，公開站 PNG 下載已實測。部署 ceb5f50 / workflow 38577696921，證據 docs/validation/phase-one/README.md。

2026-10-15 看板同步：現行正式入口為 https://tools.sid.tw/，四工具共用單一 SSG + SPA、選單與按需載入；計算在瀏覽器處理。已遷移 Cloudflare Pages，GitHub Pages 關閉。STW-38 已完成部署/SEO/分析驗收，先前等待遠端驗收的進度已解除；Web Analytics 已驗證頁面與 SPA 統計，工具輸入不上傳。保留歷史測試記錄；本次重新確認 HTTP200、canonical、舊 GitHub Pages HTTP404 與 CI 38725310119 的 Linux/macOS success。移除 proposal/validate-next，標示 released/phase-one/market-validation-pending。功能完成與市場驗證分開。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
本機批次圖片預算工具已交付：JPEG/PNG/WebP、KB/KiB、尺寸限制、逐檔達標說明、預覽與 ZIP，含透明背景、EXIF 方向、動畫拒絕及取消/清除。四工具共用單一 SSG + SPA、選單與按需載入；計算在瀏覽器處理。已遷移 Cloudflare Pages，GitHub Pages 關閉。 正式網址：https://tools.sid.tw/。既有完整驗收：27 unit/package +19 E2E、Linux/macOS CI 與正式站真實樣本/下載/SPA 驗證通過；證據 docs/validation/cloudflare/README.md、public-smoke.json。2026-10-15 看板同步重新唯讀確認正式網址 HTTP200/canonical、舊站 HTTP404 及已部署 commit 931860f 的 CI success；本次沒有重跑整套功能測試。自然流量成效與其他介面延伸仍未驗證。
<!-- SECTION:FINAL_SUMMARY:END -->
