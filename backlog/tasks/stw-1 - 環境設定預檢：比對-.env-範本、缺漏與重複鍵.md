---
id: STW-1
title: 環境設定預檢：比對 .env 範本、缺漏與重複鍵
status: Done
assignee:
  - '@designer'
created_date: '2026-10-04 14:23'
updated_date: '2026-10-15 14:43'
labels:
  - keyword-research
  - proposal
  - configuration
  - delivery-web
  - web-first
  - extension-cli
  - extension-ci
  - demand-reviewed-2026-10-14
  - deferred-evidence
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/18_033023.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/31_033132.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/25_033207.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/24_034550.md
  - 'https://www.utility-grid.com/tools/developer/env-file-compare'
  - >-
    https://marketplace.visualstudio.com/items?itemName=takeaseat-venture.env-diff
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-other-cards.md
priority: low
type: feature
ordinal: 101
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

部署時常因少一個變數、重複鍵或空值失敗；單看 .env 語法無法知道是否符合專案範本。原始關鍵字支持驗證需求，雙檔比對是本次提出的產品切角。

## 首版邊界

貼上範本與待檢查的 .env，產生鍵名為主的預檢結果。首版以明確宣告的 dotenv 語法為準；不做加密、金鑰保管或遠端環境同步。

## 差異與待驗證假設

將範本比對、語法錯誤與敏感值遮蔽放在同一個免安裝流程；這是待驗證的使用價值，並非已證實市場缺口。

## 關鍵字證據與合併

- `env file validator online`：8 份報告出現。
- `env validator online`：8 份報告出現。
- `validate env vars`：5 份報告出現。

本卡合併 16 個唯一關鍵字，來自 37 份報告、76 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: env-check）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/24_034550.md 至 logs/2026_08/31_033132.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI／CI 部署前檢查。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 兩份 .env 能辨識缺漏鍵、多餘鍵、重複鍵及空字串，結果可定位原始行號。
- [x] #2 引號、註解、等號與多行值依公開的支援規則處理；不支援的插值或語法明確標示，不執行輸入。
- [x] #3 畫面預設遮蔽值，匯出的檢查報告只含鍵名與問題，不含秘密值。
- [x] #4 提供可重現的正常、缺漏、重複與格式錯誤範例，說明 empty 與 missing 的差別。
- [x] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 實作有大小及行數上限的純 TypeScript dotenv 子集 scanner；保留行號、重複鍵與語法診斷，compareEnv 僅回傳鍵名及問題，不回傳值。
2. 以 focused tests 驗證 CRLF、引號、註解、等號、多行、插值限制、錯誤復原、秘密不外洩及資源上限。
3. 交由 designer 補齊公開 subpath／建置整合及瀏覽器 UI：預設遮蔽、key-only 匯出、正常／缺漏／重複／錯誤範例、支援規則與 empty／missing 說明、清除及不傳送／不保存／不放入 URL。
4. Parent 整合驗證完整 AC1–AC5、最終驗證及逐卡 commit；本次 core 工作不勾選 AC、不轉 Done、不建立 commit。

5. Integrate built public env-check subpath and standalone lazy controller. Both editable textareas visually masked by default; explicit keyboard-accessible reveal action, demo/clear/disposal restore masking. Explain masking is visual, not encryption.
6. Render/export only key metadata and static diagnostic messages. Missing findings label TEMPLATE lines despite candidate source. Show provisional syntax/limit caveats; provide normal/missing/duplicate/malformed synthetic examples and published subset/empty-vs-missing rules.
7. Extend six-route navigation/no-JS/mobile/privacy coverage, add dedicated production masking/paste/edit/diagnostic/export/stale/dispose tests and durable screenshots/docs. Run focused pure/public tests, scoped strict check, production build and relevant E2E only. Parent owns final full verify/Oracle/AC/commit.

8. Oracle remediation UI/docs lane only: qualify key-only report safety for unquoted multiline material, explain recognized PEM/PGP/OpenSSH armor must be quoted and inspect keys before sharing; label duplicate origin as first occurrence. Author synthetic PEM non-leakage browser regression. Do not modify core or run integrated tests/build/browser until parent coordinates core terminal; scoped authoring checks only.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

範本比對、缺漏與值差異已有瀏覽器及 VS Code 產品；本輪未找到獨立使用者願意改用本站的證據。

提升／重新納入條件：以真實部署案例證明既有工具無法處理的語法或重跑流程；本機／遮蔽本身不算差異。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-other-cards.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

## 2026-10-15 core 實作交接

最新實作授權已取代先前市場暫緩決定。已新增 packages/core/src/env-check.ts 與 env-check.test.ts：compareEnv(template, candidate) 僅回傳鍵名、行號、有效／空值狀態及靜態診斷，不回傳原始值；支援明示 dotenv 子集、LF／CRLF、多行引號、重複鍵與資源上限，語法錯誤仍回傳不完整報告。

已執行 mise exec -- pnpm exec vp test run packages/core/src/env-check.test.ts，21 個測試通過；僅對兩個新增檔案執行格式化。完整 contract 與證據見 .slim/deepwork/unfinished-cards-2026-10-15/stw-1-core.md。

尚待 designer 整合公開 subpath、建置與 UI，完成預設遮蔽、key-only 匯出、範例／支援規則與 clear／privacy 行為；Parent 負責完整 AC 驗證及 commit。本次維持 In Progress，不勾選 AC、不轉 Done、不建立 commit。

Web integration complete: public @sid-tools/core/env-check build entry, standalone lazy SSG/SPA route, default-masked editable inputs with explicit accessible reveal, key-only static-diagnostic report/JSON, correctly labeled template locations for missing keys, normal/missing/duplicate/malformed examples and complete published syntax/empty-vs-missing help. Existing env core and parent control-character fix preserved unchanged. No CSP/dependency change, storage/upload/share or secret-value output.
Durable evidence: packages/core/src/env-check.test.ts + tests/package.test.ts passed 24/24; production pnpm build passed; tests/e2e/env-check.spec.ts + tools.spec.ts + semver.spec.ts passed 21/21 (4 dedicated env, 12 shared, 5 SemVer regression). Scoped strict checks passed with zero warnings/errors. docs/validation/stw-1/README.md maps all five AC to repository tests and records mask/paste/edit/reveal, correct source lines, secret-free real download, clear/stale/disposal/privacy/limits coverage; three production screenshots there were visually reviewed.
Chromium 153.0.8010.12: 390px viewport/document width, computed masking disc, no page errors; E2E also passes at 320px. Evidence server stopped. Parent owns final cache-disabled mise exec -- pnpm verify, Oracle, AC/status finalization and commit. Keep In Progress/AC unchecked. No staging/commit; unrelated gitdiff/explain/palette work untouched. UI writer lane complete and ready to freeze. Supplementary handoff: .slim/deepwork/unfinished-cards-2026-10-15/stw-1-implementation.md.

Oracle UI/docs remediation authored; integrated tests pending. F1 page/static messages/docs now require quotes for multiline PEM/PGP/OpenSSH and explain recognized unquoted armor rejection/consumption. Qualified safety claims: parsed values not exported, but arbitrary unquoted assignment-shaped fragments may become visible/exported keys; inspect key list before sharing. Added synthetic PEM production regression asserting incomplete report and absence of body fragments from output, key inventory and downloaded JSON, while default masking remains unchanged. F2 duplicate location label/assertion now 首次出現行; full occurrence lists remain in keys and compact export unchanged.
Only authoring checks executed: scoped vp check for page HTML/controller, env E2E source, README and docs/validation/stw-1/README.md passed with no warnings/errors; scoped diff whitespace check passed. No core files edited, no focused unit/build/browser/fullverify run by this lane. Historical pass counts/screenshots are explicitly pre-remediation. Parent coordinates core terminal then integrated unit/public/build/env E2E, Oracle attempt2 and final verify. UI/docs lane terminal and frozen; no staging/commit/Done/AC changes. Supplementary report first verdict: remediation authored, integrated tests pending.

最終驗收 2026-10-15：mise exec -- pnpm verify 通過（237 項單元／套件、29 項 production E2E、零 lint／型別警告、建置與 production audit 通過；總數含其他卡片未交付核心測試）。本卡 36 項核心測試、公開子路徑測試與 5 項專屬 E2E。獨立審查及兩次有界修正完成：PEM／PGP／OpenSSH 多行值不再洩漏為鍵名；單行閉合區塊不吞後續鍵；5000 次重複鍵的診斷參照保持線性。來源行號、遮蔽／顯示、無值匯出、清除與 SPA 隱私驗收通過。證據：packages/core/src/env-check.test.ts、tests/e2e/env-check.spec.ts、docs/validation/stw-1/。任意未加引號多行內容不屬通用秘密偵測，分享前須核對鍵名清單。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成本機 .env 雙檔預檢、來源行號、預設遮蔽、四組範例及不含解析值的報告匯出。修復 armor 內容誤判與重複鍵平方級配置。36 項核心測試、5 項專屬 E2E、完整 pnpm verify、結構檢查及最終獨立審查通過；限制與證據見 docs/validation/stw-1/。
<!-- SECTION:FINAL_SUMMARY:END -->
