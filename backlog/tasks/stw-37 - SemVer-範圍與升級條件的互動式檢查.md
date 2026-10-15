---
id: STW-37
title: SemVer 範圍與升級條件的互動式檢查
status: Done
assignee:
  - '@designer'
created_date: '2026-10-04 15:33'
updated_date: '2026-10-15 14:21'
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
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_07/08_042300.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_02/03_040231.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/21_035139.md
  - 'https://github.com/npm/node-semver/issues/721'
  - 'https://semver.npmjs.com/'
  - 'https://www.devtools.tools/semver-range-intersection'
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-existing-core.md
priority: low
type: feature
ordinal: 137
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

caret、tilde、0.x 與 prerelease 的匹配規則容易被誤解，適合以版本集合和具體差異做 Web 說明。

## 交付形式與首版邊界

主要形式：web。順序：Web 優先候選。

輸入版本清單與範圍，顯示匹配／不匹配及條件變更；不把版本號等同實際相容性。

## 延伸方向與相鄰題目

可延伸套件管理器規則比較與 CLI；先選定一種規則實作及版本。

## 關鍵字來源與合併

代表原始詞：`semantic version checker online`; `semantic version validator`; `npm semantic version checker`。

本題合併 9 個相關唯一詞，來自 3 份報告、10 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: semver）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 以已知版本集合驗證精確版本、範圍、caret、tilde 及 prerelease 行為。
- [x] #2 0.x、無效版本與不支援語法給出明確解釋，不猜測匹配結果。
- [x] #3 比較兩個範圍時列出新增／移除的匹配版本及理由。
- [x] #4 清楚區分 SemVer 宣告與實際 API 相容性，所有計算可在瀏覽器重現。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add a bounded strict SemVer core public subpath backed by pinned node-semver; document supported npm syntax, default prerelease gating and 0.x caret behavior. Reject invalid input atomically.
2. Integrate an on-demand SSG + SPA route with existing responsive shell, supplied-version comparison, per-range reasons, clear/demo and reproducible JSON export; no registry/network/storage or CSP changes.
3. Add pure/public-export and production browser coverage for all four AC, privacy, lifecycle and responsive design; capture desktop/mobile evidence.
4. Record evidence and hand off In Progress for parent final verify, Oracle review and commit. User authorization supersedes historical market wait notes.

5. Oracle remediation: reject empty OR branches after bounds checks, test leading/trailing/whitespace/repeated empty branches and explicit wildcards, verify engine label against installed package version, add production stale-result/error regression; rerun focused tests/build/check and preserve accepted UI unchanged.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

不要因有真實困惑就升級主力。原版列為輔助／教學頁；只有相依衝突案例證明可減少誤判才重評。 競品覆蓋程度高： range testing；交集工具亦出現在搜尋，完整語意待驗證。

提升／重新納入條件：使用真實 prerelease／相依衝突案例，對照 node-semver、npm calculator 與現成互動工具，證明可減少誤判。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-existing-core.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

Implemented the SemVer public core subpath, pinned node-semver 7.7.3, on-demand SSG/SPA route, strict bounded inputs and two-range per-version reasons, clear/demo and reproducible JSON export. No CSP change, registry lookup or storage.
Evidence: 36 pure SemVer tests + 2 public package tests passed; production build passed; 16 production browser tests (4 SemVer + 12 existing route/privacy tests) passed. Changed-file vp check passed with zero warnings/errors. Root vp check initially stops on pre-existing/untracked status-cache.json formatting; file left untouched for parent.
Desktop/mobile screenshots reviewed at .slim/deepwork/unfinished-cards-2026-10-15/stw-37-evidence/. Chromium 153.0.8010.12, 390px document width = viewport width, no runtime errors. Browser desktop-tool connection unavailable; Playwright production browser used for all functional and visual evidence.
Keep In Progress with AC unchecked: parent owns final cache-disabled verify, Oracle review, finalization and commit. Full handoff report: .slim/deepwork/unfinished-cards-2026-10-15/stw-37-implementation.md.

Oracle remediation complete: reject trimmed-empty || branches after bounds rather than allowing native wildcard normalization. Added nine leading/trailing/repeated/whitespace cases in both A and B, four explicit */x acceptance cases, and test-only installed-version/engine-label drift assertion. No UI, layout, dependency or production Node-import changes.
Durable repository evidence: packages/core/src/semver.test.ts + tests/package.test.ts passed 52/52; production pnpm build passed; tests/e2e/semver.spec.ts passed 5/5 including new stale-result/empty-OR/error/recovery regression; scoped strict check passed without warnings. docs/validation/stw-37/README.md records commands/AC mapping and three production screenshots now live in that repository directory. These test sources and final pnpm verify are the acceptance evidence; ignored .slim report is supplementary.
Parent reported pre-remediation full pnpm verify PASS (85 unit, 23 browser, build/audit); final post-remediation mise exec -- pnpm verify remains parent-owned before acceptance/commit. Kept In Progress and AC unchecked; no staging/commit, unrelated gitdiff/env/explain source untouched.

最終驗收：2026-10-15 mise exec -- pnpm verify 通過（166 項單元／套件測試、24 項 production E2E、格式／型別／建置與 production audit）；總數包含其他卡片尚未交付的純核心測試。STW-37 有 50 項核心測試、公開子路徑測試與 5 項專屬 E2E。Oracle 複審確認空白 OR 分支已拒絕，結構檢查確認公開套件邊界與按需載入。Git diff 核心另有一則非錯誤 lint 警告，不屬本卡提交。可重現證據：packages/core/src/semver.test.ts、tests/e2e/semver.spec.ts、docs/validation/stw-37/。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成固定 node-semver 7.7.3 的雙範圍比較、逐筆原因、0.x／prerelease 規則與可重現匯出；拒絕無效版本及空白 OR 分支。50 項核心測試、5 項專屬 production E2E、完整 pnpm verify 與獨立複審通過；證據見 docs/validation/stw-37/。
<!-- SECTION:FINAL_SUMMARY:END -->
