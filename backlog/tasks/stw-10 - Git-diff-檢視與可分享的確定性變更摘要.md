---
id: STW-10
title: Git diff 檢視與可分享的確定性變更摘要
status: Done
assignee:
  - '@designer'
created_date: '2026-10-04 14:23'
updated_date: '2026-10-15 15:03'
labels:
  - keyword-research
  - proposal
  - developer-tools
  - delivery-web
  - web-first
  - extension-cli
  - demand-reviewed-2026-10-14
  - deferred-evidence
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/19_035446.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/15_032722.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/17_034242.md
  - 'https://github.com/rtfpessoa/diff2html/blob/master/README.md'
  - 'https://github.com/rtfpessoa/diff2html-cli/blob/master/README.md'
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-pruning.md
priority: low
type: feature
ordinal: 110
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

分享 patch 做討論時，對方未必有相同 checkout，原始 unified diff 又不容易快速掌握變動位置。

## 首版邊界

貼上 unified diff，提供檔案列表、hunk 導覽及由實際差異計算的摘要；不讀私人 repo、不依 AI 猜測改動意圖。

## 差異與待驗證假設

免帳號且能匯出遮蔽後的審查摘要；一般 diff viewer 已有很多，需先驗證這個交接流程。

## 關鍵字證據與合併

- `git diff viewer online`：1 份報告出現。
- `git diff visualizer online`：1 份報告出現。
- `git diff summary`：4 份報告出現。

本卡合併 9 個唯一關鍵字，來自 11 份報告、36 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: git-diff）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/17_034242.md 至 logs/2026_08/15_032722.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI 產生 patch 審查摘要。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 依 diff 內容列出新增、刪除、修改與重新命名檔案及可對應的 hunk。
- [x] #2 二進位檔、截斷輸入與不支援 diff 格式明確提示，統計不冒充完整。
- [x] #3 摘要只描述可從 diff 證實的檔案與行數變化，能回到來源位置。
- [x] #4 使用者可在匯出前排除敏感路徑與 hunk；不自動公開分享或上傳 patch。
- [x] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 建立無相依套件、有大小及行數上限的 git unified diff 子集 parser；提供 file／hunk 穩定 ID、來源行號、確定性統計及不完整診斷，不執行輸入。
2. 建立明確 file／hunk ID 選取的匯出 helper，僅由選取內容重建摘要與 patch，排除未選路徑／hunk，不帶入原始完整 patch 或全域診斷。
3. 以 focused tests 驗證新增／刪除／修改／rename、quoted paths、hunk 計數、截斷／binary／未知語法、資源上限與敏感內容排除。
4. 交由 designer 補齊公開 subpath／建置及瀏覽器 UI：來源導覽、明確選取／排除、完整性提示、安全文字呈現、下載／clear 與不傳送／不保存／不放入 URL。Parent 驗證完整 AC1–AC5 及 commit；本次不勾 AC、不轉 Done、不建立 commit。

5. Add built public git-diff subpath and standalone lazy seven-route SSG/SPA integration. Review source-positioned files/hunks with explicit file AND hunk selection, no automatic hunk inclusion, incomplete-file export disabled.
6. Default empty selection. Preview only exportGitDiffSelection output before enabling JSON/review-extract downloads; any input/selection change discards preview/Blob URLs. Allow complete selected files from an incomplete overall report with prominent original-input warning.
7. Publish exact parser/UTF-16 limits, source-vs-old/new-line help and extract-not-apply-ready caveat. Add reproducible safe/sensitive and malformed/binary demos; safe text rendering and clear/dispose/stale protections, no storage/network/share.
8. Add public package and production browser tests for explicit selection/redaction/header omission, source diagnostics, literal XSS, reset/lifecycle/privacy and seven-route navigation/no-JS/lazy/mobile. Capture durable design evidence. Run only focused tests/build/scoped strict/relevant E2E; parent owns fullverify/Oracle/AC/commit.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

撤回先前把本卡當 AI 摘要的理由；本卡是確定性檢視，Low 保留窄驗證。 成熟開源工具提供 unified diff、導航相關顯示與 HTML 匯出；本輪沒有取得遮蔽交接的獨立用戶需求證據。

提升／重新納入條件：3 個真實跨團隊 patch 交接，與 diff2html 匯出比較，量測排除敏感 hunk 的操作量與審查成本；若無額外收益就排除。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-pruning.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

## 2026-10-15 core 實作交接

最新實作授權已取代先前市場暫緩決定。已新增 `packages/core/src/git-diff.ts` 與 `git-diff.test.ts`，無新增相依套件。`parseGitDiff(text)` 提供來源行號、穩定 file／hunk ID、原始 hunk 文字及確定性計數；Git quoted paths、安全 UTF-8／octal 解碼、hunk 計數與 metadata 一致性均有檢查，binary／截斷／未知格式及資源超限明確標為不完整。

`exportGitDiffSelection(report, { fileIds, hunkIds })` 僅由明確選取的完整檔案／hunk 重建摘要與審查用 patch，不複製原始完整 patch、全域診斷、hash、mode 或 hunk section label；未選路徑／hunk 不進入匯出。選取檔案不會自動納入其所有 hunk；匯出明示為選取內容的 review extract，不宣稱可直接套用。

已執行指定 focused test：`mise exec -- pnpm exec vp test run packages/core/src/git-diff.test.ts`，28 個測試通過；僅格式化兩個新增檔案。完整 contract 與證據見 `.slim/deepwork/unfinished-cards-2026-10-15/stw-10-core.md`。

待 designer 整合公開 subpath／建置／UI、來源導覽及選取排除、安全文字呈現、下載／clear 與不傳送／不保存／不放入 URL；Parent 負責完整 AC1–AC5 與最終驗證及 commit。本次不勾選 AC、不轉 Done、不建立 commit，維持 In Progress。

UI/public integration complete: built @sid-tools/core/git-diff subpath and standalone lazy seven-route SSG/SPA page. Source-grounded file/kind/hunk/count review, original source-line navigation and old/new code columns. Explicit file AND hunk checkboxes default empty; selecting a file never selects hunks. Incomplete files cannot be selected, valid complete files from incomplete original remain exportable with honest original-input warning.
Preview and JSON/TXT downloads use only exportGitDiffSelection result, never original-report serialization. Tests prove unselected sensitive hunk/path/body plus original hashes/section labels/source names absent, preview JSON equals real downloaded JSON and TXT equals selected patch. Any edit/rerun/clear/dispose resets report/IDs/selections/previews/Blob URLs; selection change requires fresh preview. Text-safe paths/body, static diagnostics, no dependency/CSP/storage/upload/share changes; original input/hunk context sensitivity and review-extract-not-apply-ready limits disclosed. Existing 31-test core left unchanged.
Durable evidence: packages/core/src/git-diff.test.ts + tests/package.test.ts passed 35/35; production pnpm build passed; scoped strict check on 17 relevant paths passed zero warnings/errors; scoped diff whitespace check passed. Production git-diff/tools/env-check/semver suites passed 27/27 (5 Git, 12 shared, 5 env, 5 SemVer), final 18.0s. docs/validation/stw-10/README.md maps all five AC to committed-test paths and contains three production screenshots with synthetic samples; desktop/mobile reviewed, Chromium 153.0.8010.12, document width390=viewport390, no page errors; E2E also passes320px.
UI writer lane terminal/frozen; evidence server stopped/released4173. Keep In Progress and AC unchecked. Parent owns full cache-disabled mise exec -- pnpm verify, independent Oracle, finalization and isolated commit. No staging/commit/push/deploy. Exact owned paths/evidence/design report: .slim/deepwork/unfinished-cards-2026-10-15/stw-10-implementation.md. Unrelated explain/palette/research work untouched.

最終驗證：mise exec -- pnpm verify 通過，284 項單元／套件測試、34 項 E2E、零 lint／型別警告、建置及 production audit 通過。總數含其他待交付核心，不代表其他卡片已完成。獨立 Oracle 初審 PASS，真實 Git 13 檔／9 hunks／+7−8、fail-closed、選取匯出與生命週期檢查通過；公開入口／路由結構檢查 PASS。所有五項 AC 證據見 docs/validation/stw-10/README.md 及對應測試。非阻塞限制：含空白的未加引號 Git 路徑拒絕處理、損壞 header 可能顯示不精確 kind／null 標題、尾端空行或 format-patch trailer 使檔案不完整；不影響拒絕不安全匯出。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成本機 Git diff 子集檢視、來源定位與明確 file／hunk 選取匯出。預覽後才能下載，排除未選內容，輸入不傳送、不保存、不放入 URL。35 項專項單元／公開 API、27 項相關 E2E 與最終 pnpm verify 通過，Oracle 及結構審查 PASS。限制及可重現證據：docs/validation/stw-10/README.md。
<!-- SECTION:FINAL_SUMMARY:END -->
