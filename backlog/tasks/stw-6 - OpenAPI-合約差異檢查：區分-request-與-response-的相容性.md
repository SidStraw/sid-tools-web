---
id: STW-6
title: OpenAPI 合約差異檢查：區分 request 與 response 的相容性
status: Done
assignee:
  - '@opencode'
created_date: '2026-10-04 14:23'
updated_date: '2026-10-15 19:46'
labels:
  - keyword-research
  - proposal
  - api
  - delivery-web
  - web-first
  - extension-cli
  - extension-ci
  - demand-reviewed-2026-10-14
  - deferred-evidence
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_04/07_041229.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/29_035902.md
  - 'https://github.com/OpenAPITools/openapi-diff/issues/192'
  - 'https://www.oasdiff.com/diff'
  - 'https://www.oasdiff.com/'
  - 'https://a2z.tools/openapi-specification-diff-checker'
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-existing-core.md
priority: low
type: feature
ordinal: 106
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

API 規格改動需要知道消費端可能在哪裡壞掉，而不是只看 YAML 行差異；request 與 response 的 required 或 enum 變動方向也不同。

## 首版邊界

首版比較兩份 OpenAPI 3.0.x 文件的 path、operation、parameter、schema 與 response；3.1 和遠端 $ref 在確認支援前明確列為限制。

## 差異與待驗證假設

可定位原規格的相容性分類與原因，輸出方便放進變更審查；沒有完整判斷依據時顯示需人工判讀。

## 關鍵字證據與合併

- `openapi diff online`：2 份報告出現。
- `openapi diff checker`：1 份報告出現。

本卡合併 2 個唯一關鍵字，來自 2 份報告、3 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: openapi-diff）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/29_035902.md 至 logs/2026_04/07_041229.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI／CI 合約變更 gate。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 辨識 endpoint 移除、參數必填改變、型別／enum／response 改動並保留 JSON Pointer 定位。
- [x] #2 request 與 response 分別採明示規則分類 breaking、non-breaking 或需人工判讀，不能只靠文字 diff。
- [x] #3 內部 $ref、循環引用與不支援版本有明確行為；缺少外部引用時不宣告完整相容。
- [x] #4 提供代表性相容／不相容 fixture 與可下載摘要，輸入文件的格式順序變動不產生假變更。
- [x] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 採 yaml2.9.1 的 iterative Parser token 預檢後才建立文件；保留數值精度、JSON Pointer／來源定位，拒絕別名、標籤、多文件、重複鍵與超量資源，不使用 toJS 或自動解析外部引用。
2. 純核心比較 OpenAPI3.0.x endpoint、parameter、request/schema/response；request 與 response 明示反向規則，型別／enum／required/nullability 及不支援內容保守分類。內部 ref 有界解析，缺失／外部／無法證明的循環與未知內容不得宣告完整相容。
3. 依既有風格整合雙文件、固定案例、來源導覽、明確同意的精簡下載與清除；專用 module worker20秒上限，編輯／清除／離開／逾時即終止，不使用共用 Cron fallback，不上傳／保存／分享 URL。
4. 固定雙方向規則、JSON/YAML／順序等價、refs／循環／版本與惡意深度案例核心測試；production E2E 覆蓋 worker生命週期、隱私、下載及手機版；程式碼凍結後完整 pnpm verify、獨立 Oracle 與結構審查。
5. 通過客觀驗收才勾五項 AC、Done 並精確暫存本卡檔案獨立 commit；實際卡關才註記後跳過。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

先排除泛用 Web wrapper 作近期主力。若要升級，需用真實 consumer／規格證明既有引擎漏判或流程成本。 競品覆蓋程度高：oasdiff 已有 Web、報告匯出與 CI；另有本機處理產品聲明，但本輪未驗證。

提升／重新納入條件：用語意等價規格與真實 consumer 比對既有引擎，且實測 oasdiff 資料處理位置；單純本機 wrapper 不足。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-existing-core.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

2026-10-16：依使用者實作全部未完成卡片的授權啟動，舊市場 defer 不再作為跳過理由。Oracle 預先安全研究發現 YAML Composer 遞迴在病態深度可能崩潰，故採 token 階段檢查再 build、專用可終止 worker。response enum 新值與新 status 採需人工判讀，x-* 改變為未知；本機純靜態子集不代表真實 consumer／resolver 相容性。

2026-10-16：已交付純本機 JSON/YAML OpenAPI3.0.x 靜態差異、request/response 規則分類與實際 JSON Pointer／使用點／定義來源導覽，專用可終止20秒 module worker、精簡下載與清除。Oracle1 發現 paths/responses extension 遺漏與誤用總量 entry 上限，已修正並補回歸；Oracle2 與結構審查 PASS。修正後完整 mise exec -- pnpm verify 無快取通過：543 單元／套件、102 production E2E、格式／strict／build／audit。既有 TypeScript7 experimental API 提示保留。證據 docs/validation/stw-6/README.md；七張截圖為修正前但內容不受影響，extension 修正由實際 worker E2E 證明。循環／外部引用及未涵蓋規則保守未知，不宣告完整 runtime 相容；下載含名稱／pointer 不匿名。僅本機提交，未 push 或部署。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成 OpenAPI3.0.x 本機差異工具，分開 request/response 規則、保留來源 pointers 與引用關係，提供固定案例、可取消 worker、精簡下載與清除。543 單元／套件與102 E2E、完整 verify、獨立安全複審及結構審查通過；五項 AC 有客觀證據，詳見 docs/validation/stw-6/README.md。
<!-- SECTION:FINAL_SUMMARY:END -->
