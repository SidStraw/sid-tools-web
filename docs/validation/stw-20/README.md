# STW-20 原生分析與審查流程

本工具整合固定 Knip 引擎、唯讀 CLI 與同一 SPA 的報告審查。候選不是刪除許可；功能驗收不代表市場需求或流量效益已驗證。

## 固定引擎

repo-local Knip 6.42.1，透過 pnpm catalog 安裝；Node 24.21.0。npm registry 的發布時間為 2026-10-19T18:24:59.186Z，符合本專案 4320 分鐘等待期。沒有全域安裝。

官方來源：[JSON reporters](https://knip.dev/features/reporters)、[workspace configuration](https://knip.dev/features/monorepos-and-workspaces)、[source mapping](https://knip.dev/features/source-mapping)、[CLI](https://knip.dev/reference/cli)。實際 shape 另核對 pinned 套件的公開 `JSONReport`／`ReporterOptions` 型別與原生 CLI 行為。

## 本專案實測（2026-10-23）

分析時基底為 STW-19 的 `e7ec469`，外加 Knip 的 package/catalog/lockfile 安裝；第二次加上根目錄 `knip.json`。既有來源沒有為了降低數量而移除。兩次皆無 `--fix`／`--allow-remove-files`，exit 1 表示有候選，stderr 為空且 JSON 有效。

- `native-default.json`：20 個檔案群組，2 個 file、21 個 export、62 個 type、1 個 devDependency 候選。當時尚無 knip.json。
- `native-configured.json`：加入明示的 public source／Worker／測試入口後，4 個檔案群組，3 個 export、1 個 devDependency 候選。
- 預設結果把 `apps/markdown-links/src/scan-worker.ts` 與 `packages/core/src/bundle-diff.ts` 列為 unused file；兩者分別是既有 CLI Worker 與公開套件入口。`knip.json` 依實際入口與 `packages/core/package.json` exports 逐項列出，不修改 TypeScript paths、不改 public package boundary。
- 候選減少本身不證明正確；原生 source mapping 依 tsconfig 設定，不能把通用預設的所有輸出當成刪除授權。
- 剩餘候選包含 optional Pi CLI dependency、`escapeOasPointer`、`exactNumber`、`PALETTE_IMAGE_LIMITS`。尚未決定接受原因或進行刪除。

重現第二次結果：

```sh
mise exec -- pnpm exec knip --config knip.json --reporter json --no-progress
```

Knip 的 plugin loader 可能執行 JS/TS 設定；只能在受信任的本機 repo 使用，這不是程式碼沙箱。原生 reporter 沒有完整的引擎／entry context，因此接下來的整合必須補上明確設定、引擎資訊與分析限制，再進行 baseline 審查，不能把這兩份不同設定的報告當成相容 baseline。

## 驗收對應

| AC  | 實作與證據                                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 原生 Knip JSON 與 context reporter；每個候選保留來源檔案、可取得的行／欄、分析後 SHA256、判定種類／說明，共用 engine version 與明示設定。真實 fixture 與 repository report 可重現。             |
| 2   | 全部輸出與 UI 保留 dynamic import、framework 隱式入口、外部 exports 和 CSS 無 runtime coverage 限制；真實 fixture 驗證 literal dynamic import 與 public entry，原生 repo 前後對照展示入口誤判。 |
| 3   | baseline 保存原始報告與逐項接受理由；未知來源不能接受。真實來源新增／移除／修改測試 new/resolved/changed，設定不相容不沿用接受紀錄；CLI exit 0/1/2/3 與瀏覽器下載／重新載入均有測試。           |
| 4   | 不提供 fix/remove/apply，掃描測試比較執行前後檔案摘要不變；未知危險參數、路徑逃逸與引擎失敗不輸出成功報告。Web 僅讀 JSON，不讀 repo 或執行輸入程式。                                            |

## 重現

```sh
mise exec -- pnpm build
mise exec -- pnpm exec vp test run tests/unused-review.test.ts
mise exec -- pnpm exec playwright test tests/e2e/unused-review.spec.ts
mise exec -- pnpm verify
mise exec -- node apps/unused-review/dist/cli.mjs scan . --config knip.json --scope sid-tools-web > /tmp/unused-report.json
```

`tests/helpers/unused-fixture.ts` 每次建立真正的 JS/TS repo，用 pinned Knip 分析；不是手填引擎 finding。資料清除、pagination、接受理由與失效、baseline 下載重載、320px、SPA history、輸入無 network/storage 均以 headless Chromium 操作。前述 native-default/configured 是早期整合快照；最新 adapter 報告另存 repository-report.json，contextFiles 包含當時設定摘要。

掃描是受信任 repo 的本機工具，不是 sandbox。Knip plugin 可能執行專案 JS/TS 設定；這些設定仍可能有副作用。wrapper 本身只寫 stdout，不自動修改 source 或執行 build。sourceHash 在分析後取得，不是原子快照。新增或刪除 dependency 會改變 package/lockfile 指紋，因此舊基準可能需要整體重新審查。

## 最終驗證（2026-10-23）

`mise exec -- pnpm verify` exit 0：950 個單元／整合測試、141 個瀏覽器測試通過；格式、lint、型別、原生建置與 production dependency audit 通過。完整執行停用 task cache。320px 實際頁面截圖已檢視，無水平溢出；這不是真人使用者驗收。

完成 adapter 後在同一工作樹連續分析兩次：8 個 workspace、27 個 context file，設定指紋皆為 `2cee66f9726562c6f5206204583b3027e18f24ba3e9744ee5a02900209c422f9`。兩份報告可比較，5 個候選全部為 existing；最新快照是 `repository-report.json`。相較早期 native-configured 快照，新增測試 helper 的 `unusedCli` export 也被實際引擎列出。未替任何候選填入接受理由或刪除來源。

新增根目錄 Knip devDependency 也改變既有相依圖中 YAML 的第一條最短路徑。相依圖 E2E 斷言因此接受來源的 dependencies 或 devDependencies 欄位，仍驗證實際 package.json 指標。

本階段只完成本機交付；未 push、部署或宣稱搜尋流量已驗證。
