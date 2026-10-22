# STW-22：Props 文件與範例同步檢查

實作是 React TSX 靜態 CLI 與同一 lazy SPA 的唯讀報告頁。Babel parser 只回傳 AST；不載入 Babel config、匯入來源或執行元件。功能完成不代表流量或搜尋需求成立。

## 真實來源與固定版本

解析器 `@babel/parser 8.0.7`、型別套件 `@babel/types 8.0.6` 透過專案 catalog／lockfile 安裝；沒有全域安裝。CLI 啟動檢查實際 parser 版本，報告保留引擎版本。

Storybook 官方來源固定 commit `40d47bf739fc8d97fdddaa2d22d8dc79fb2f0bd6`：

- [Button](https://github.com/storybookjs/storybook/blob/40d47bf739fc8d97fdddaa2d22d8dc79fb2f0bd6/code/renderers/react/template/cli/ts/Button.tsx)：5 個 Props，primary 的參數預設 false、size 的參數預設 medium、label 必填。
- [Header](https://github.com/storybookjs/storybook/blob/40d47bf739fc8d97fdddaa2d22d8dc79fb2f0bd6/code/renderers/react/template/cli/ts/Header.tsx)：4 個 Props，User 引用型別保留宣告文字，範例值驗證顯示未知。
- [實際 wrapped Button](https://github.com/storybookjs/storybook/blob/40d47bf739fc8d97fdddaa2d22d8dc79fb2f0bd6/code/core/src/components/components/Button/Button.tsx)：forwardRef／繼承超出首版範圍，輸出不完整，不產生可能誤刪欄位的建議文件。

原始位元組、MIT LICENSE、來源路徑與 SHA256 存在 `tests/fixtures/component-docs/storybook`；TSX 加上 `.txt` 副檔名避免被主專案編譯器當成產品程式。整合測試重新核對每個 fixture 的 SHA256。原生 parser 支援與來源位置依據：[Babel parser 官方 API](https://babeljs.io/docs/babel-parser)。

## 保存的實際輸出

`button-report.json` 與 `header-report.json` 是 CLI 直接分析固定樣本的 stdout。每個 Prop 都有來源定義的檔名、SHA256、字元範圍、行／欄與原文片段；有參數預設時另保留預設來源。型別文字標示宣告語法，不冒稱完整 TypeScript 型別求值。

`document-drift.json` 是明示的人為文件漂移測試：刪去 primary、加入舊 retired、把 size 的文件預設設為 large，保留 label 的人工說明，提供 valid／invalid／callback 三個範例。它不是上游真的發生文件漂移的證據。

`comparison.json` 實際輸出新增 primary、刪除 retired、size.default 改變；invalid 範例有 3 個問題，callback 型別檢查保留未知。`document-proposed.json` 是使用者可審查的建議文件，保留人工描述與所有範例；不修改輸入，也不把有問題的範例偷偷改正。

## AC 與驗證對應

| AC  | 客觀證據                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 真實 Button／Header 解析與來源 SHA；測試以原始字串 slice 及行列重新核對每個 definition／defaultSource。瀏覽器按鈕實際導覽至 size 宣告與 medium 的原文位置。                               |
| 2   | 頂層 side effect／動態 default 的測試來源不被執行，marker 檔不存在；未知保留為 unknown。另驗證非有限數、負零、computed／重複解構、可重新指派匯出與 wrapper 的不完整邊界。                 |
| 3   | 真實報告搭配明示受控的舊文件，驗證 added／removed／changed、範例問題、人工說明與範例保留；CLI 檔案不被覆寫，瀏覽器下載內容經重新解析核對。不完整報告只標示 unverified，禁用建議文件下載。 |
| 4   | 固定來源與 LICENSE／摘要；整合測試真的執行 pinned CLI。原始 import React、CSS 與注入的 fs 寫檔不執行；Web 僅接受 JSON。                                                                   |

瀏覽器另驗證 50 筆分頁、範例問題分頁、320px 無水平溢出、惡意描述文字不成為 HTML、清除與延遲讀取取消、同一 SPA history／重新整理、實際 Worker 載入失敗不轉主執行緒解析。320px 截圖已檢視；未宣稱真人使用者或框架 runtime 驗收。

## 重現與限制

```sh
mise exec -- pnpm build
mise exec -- pnpm exec vp test run tests/component-docs.test.ts
mise exec -- pnpm exec playwright test tests/e2e/component-docs.spec.ts
mise exec -- pnpm verify
mise exec -- node apps/component-docs/dist/cli.mjs scan tests/fixtures/component-docs/storybook/Button.tsx.txt --component Button --scope storybook
```

首版每次指定一個具名元件，文件是版本化 JSON，不解析任意 Markdown 表格或 Storybook 執行程式。逐 Props 的來源是檔名／行列及具摘要的原文片段，不會要求瀏覽器讀本機 repo。未知資料仍需人工確認，無差異不等於程式行為正確；完整型別推導、繼承與 wrapper 不在本版範圍。

已跑過 5 個專用單元／CLI 整合測試與 4 個 headless Chromium 測試，全部通過；嚴格 lint／型別／格式檢查無警告。最終完整 `mise exec -- pnpm verify` exit 0：955 個單元／整合測試、145 個瀏覽器測試通過；格式、lint、型別、原生建置與 production audit 通過，task cache 停用。下載成功後清除與下載動作失敗時的 Blob URL 回收均由瀏覽器測試確認。未 push 或部署。
