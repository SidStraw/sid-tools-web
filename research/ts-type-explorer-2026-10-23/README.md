# STW-21：TypeScript 型別展開研究

日期：2026-10-23。結論：**縮小**到「固定專案設定下，長型別的逐欄位／union 與來源檢視」。本研究交付可重現的唯讀報告原型，暫不投入泛用 IDE 展開器。沒有新增產品頁面、外掛或部署；也沒有把研究通過當成流量需求成立。

## 真實來源與基準

7 個案例皆讀取原專案或實際安裝的依賴宣告，不從手寫假設生成型別。`cases.json` 記錄查找問題；`compiler-results.json` 記錄來源行／欄、檔案 SHA256、原專案 commit `73ca2b8`、Node、平台與 config hashes。

- 本專案：`packages/core/src/semver.ts` 的 `ReturnType<typeof compareSemver>`、`packages/core/src/unused-review.ts` 的 nullable finding。
- Knip 6.42.1：實際 npm 套件 `dist/types/issues.d.ts` 的 mapped Report、Record Counters，以及 `dist/types/package-json.d.ts` 的 conditional/infer/key-remapping Plugins、遞迴 Exports、intersection PackageJson。固定依賴與完整性由專案 pnpm-lock.yaml 保存；這些是發行套件的真實宣告，不是刻意為測試設計的例子。案例集中於兩個專案，不能外推所有框架。
- TypeScript 7.0.2：使用專案既有 `typescript/unstable/sync` API 與原生 `tsc --lsp --stdio`，沒有替換工具鏈。
- TypeScript 5.9.3：官方 npm tarball 經 SHA512 integrity 核對，僅解壓於暫存目錄。`compiler-source.json` 保存 URL、integrity 與 upstream metadata；沒有全域安裝或更動 pnpm dependencies。

基準包括原生 TS7 LSP hover 的 verbosity 0／2，以及 TS5.9 language service quick info 的 verbosity 0／2。後者固定呼叫已安裝 5.9.3 實作的第四個 verbosity 參數（公開 d.ts 未宣告），所以只作版本固定的研究；不以此建立產品相容性承諾。

官方依據：[TS5.9 expandable hovers](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)、[TS7.0.2 hover protocol](https://github.com/microsoft/TypeScript/blob/v7.0.2/tsc/internal/lsp/lsproto/lsp_generated.go)。實測已送出 `experimental.hoverVerbosityLevel: true` 與 `verbosityLevel`，不是只更改顯示文字。

## 方法與可理解性比較

候選原型只詢問 compiler 的 type、properties、union/intersection branches、index signatures、optional flags 與可取得的 declaration 位置。不自行求值 conditional type，不以模型補上答案。逐屬性結果採 NoTruncation，但不無限遞迴展開，仍保留 alias／遞迴邊界。

「可理解性」在本研究指能否從輸出直接回答下列查找任務、是否省略資訊、能否定位來源。這是可稽核的資訊比較，**不是**真人理解速度、滿意度或認知負擔實驗。

| 真實案例／查找任務                                            | 既有工具基準（實測）                                        | 候選報告及判斷                                                                                                               |
| ------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| SemverComparison：列出所有回傳欄位，定位 rows                 | TS7 hover 0／2 都省略中段 4 個欄位                          | 列出 8 個欄位，rows 為 SemverRow[]，8 個都有 declaration。對長結果有可驗證的資訊增益。                                       |
| Knip Report：找所有 issue 開關與值型別                        | 原生 hover 已完整列出 17 個 boolean 欄位                    | 同樣 17 個；可附來源，但單純展開沒有足夠差異。                                                                               |
| Knip Counters：找 processed／total 與值型別                   | 原生 hover 已列出 19 個 number 欄位                         | 同樣 19 個；合成欄位沒有 declaration，不能編造來源。                                                                         |
| Knip Plugins：conditional + key remapping 後有哪些 plugin key | 原生 hover 展開但有省略                                     | 候選列出全部 195 個 optional key，值為 unknown。能查完整鍵集合，但直接屬性 declaration 為 0，尚不能解釋每個 key 的推導來源。 |
| Knip Exports：遞迴 union 的合法形狀                           | 原生 hover 已呈現 5 個分支及遞迴 Exports                    | 候選列出相同 5 個分支，整體 union 沒有共通屬性。沒有證明比原生 hover 更清楚。                                                |
| Knip PackageJson：intersection 合併後有哪些欄位               | 原生 hover 保留 alias／省略，verbosity 2 可展開部分巢狀結構 | 候選列出 222 個欄位，僅 28 個有直接 declaration。更完整也更冗長，仍需篩選與分組；未證明可理解性提升。                        |
| UnusedFinding：line／col／sourceHash 的 null 語意             | 原生 hover 已清楚呈現 null；verbosity 2 另展開 UnusedType   | 額外價值是保存設定與跨設定差異，不是重做相同展開。                                                                           |

以上比較可直接核對 `native-hover-results.json`、`compiler-results.json`，沒有截斷保存的原始 hover；原生工具本身的省略保持原樣。

## 版本、設定、失敗與時間

兩個 compiler 都使用相同 research tsconfig，繼承專案 `tsconfig.base.json`，顯式選擇上述真實檔案、Node types、ES2022／DOM 與 `.ts` declaration imports。Knip 檔案採 pnpm 真實路徑，避免把 symlink 的邏輯位置當根檔造成依賴解析失敗；沒有用 skipLibCheck 隱藏診斷。嚴格設定與放寬 null 的設定，兩版本共 4 組分析均為 **0 個診斷**。

放寬設定僅將 strictNullChecks、exactOptionalPropertyTypes 設為 false，其他繼承值相同：

- 兩版本的 UnusedFinding.line 都從 `number | null` 變成 `number`。
- Exports 從 5 個 union 分支變成 4 個；共同可見屬性從 0 變成 10。不能拿不同 tsconfig 的結果當作同一語意。
- 相同嚴格設定下，兩版本 7 個案例的屬性名稱集合一致。這只證明這些案例的比較結果，不代表兩版本全面相容。
- `negative.ts` 是另外標示的合成失敗控制，**不算真實案例**。兩版本都回報 TS2304，候選輸出 `status: unresolved`，沒有把 missing type 變成自行猜測的型別。

每個查詢跑 6 次，保存第一次與後續 5 次；[measurements.md](measurements.md) 列出原始數字的摘要。compiler 查詢在 semantic diagnostics 後執行，因此已暖機。TS7 API 涉及原生程序通訊，TS5.9 API 在 Node 程序內；這些時間不能用來宣稱某個編譯器比較快。小樣本也沒有統計顯著性。

TS7 原生 hover 在原始檔案路徑由 LSP 自行選擇 configured／inferred project，沒有強制使用 research tsconfig；它是實際工具觀察基準，不能將 hover 與候選的所有差異都歸因於呈現方式。兩版本與設定差異的受控比較以 `compiler-results.json` 為準。未操作使用者的編輯器或瀏覽器狀態，也沒有把 language service 測試稱為 VS Code UI 驗收。

## 建議與第一個可驗收場景

**縮小**：保留具來源、設定與診斷的長型別檢視原型；暫緩獨立泛用 IDE 產品與 SEO 工具頁。多個案例原生 hover 已足夠，主要剩餘差異在完整列表與來源導覽，而合成屬性的來源覆蓋尚不足。研究沒有搜尋量、真人理解時間或付費證據，無法支持擴大投入。

若後續決定繼續，第一個場景為本專案 SemverComparison：在固定 tsconfig 下顯示全部 8 個回傳欄位，搜尋 rows 可見 SemverRow[]，並跳到 compiler 提供的實際宣告；變更設定或來源後使舊結果失效；若有編譯錯誤則顯示診斷而不猜測。現有報告已證明欄位與位置可取得，搜尋／跳轉 UI 與真人操作效果仍屬未實作。研究結案不代表外掛或此產品場景已交付。

## 重現與驗證

在專案根目錄完成既有 mise／pnpm 安裝後：

```sh
# 只下載固定舊版至新的暫存目錄，輸出其 package 路徑。
mise exec -- node research/ts-type-explorer-2026-10-23/prepare-legacy.mjs
# 將下方路徑換成上一行輸出；不修改主專案 TypeScript 版本。
mise exec -- node research/ts-type-explorer-2026-10-23/run.mjs /tmp/REPLACE_WITH_OUTPUT/package
mise exec -- node research/ts-type-explorer-2026-10-23/run-hover.mjs
mise exec -- node research/ts-type-explorer-2026-10-23/verify.mjs
```

runner 會覆寫本研究兩份結果 JSON，執行前應保留要比較的舊快照；測試來源不會被改寫。時間與暫存路徑會因環境不同而變動。`verify.mjs` 核對來源／設定摘要、兩版本與設定的語意差異、真實 rows 位置、原生 hover、7 個真實案例與 unresolved 控制。原始產生過程已實際執行，verify PASS。其餘站點程式本階段未修改。

## 最終驗收

2026-10-23：`verify.mjs` PASS；所有研究腳本通過 Node syntax check，固定舊版下載／integrity 流程也實際執行成功。`mise exec -- pnpm verify` exit 0，950 個單元／整合測試與 141 個瀏覽器測試通過，格式／lint／型別／建置及 production audit 通過，task cache 停用。研究目錄依既有設定不納入主程式 lint／型別檢查，因此上述專用重現與核對另行執行，不能用主測試數量替代研究證據。

AC1 由 7 個真實案例、原生 hover／quick info 與來源摘要證明；AC2 由兩版原生 compiler 與 unresolved 控制證明；AC3 由查找任務比較、完整時間樣本及固定設定／版本對照證明（無真人實驗宣稱）；AC4 的縮小建議與首個可驗收場景已明列。沒有 push 或部署。
