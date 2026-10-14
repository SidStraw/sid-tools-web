# STW-16 Lighthouse 競品測試樣本

日期：2026-10-14。這份紀錄只準備測試資料；不含工具站實作，也未更動卡片。

## 本輪真正實跑的主要樣本

以專案研究資料夾內的 Lighthouse 12.6.1 CLI，透過獨立的 headless Chrome 對公開 Chrome 官方文件頁依序執行。未使用登入狀態、未修改報告數值、未對受測網站做程式變更。Chrome hostUserAgent 為 HeadlessChrome/155.0.0.0。

| 檔案 | fetchTime UTC | 條件 | Performance / Accessibility / Best practices / SEO |
|---|---|---|---|
| [live-chrome-docs-desktop.json](samples/lighthouse/live-chrome-docs-desktop.json) | 2026-10-14T12:21:22.519Z | desktop | 85 / 93 / 96 / 92 |
| [live-chrome-docs-mobile-a.json](samples/lighthouse/live-chrome-docs-mobile-a.json) | 2026-10-14T12:20:19.851Z | mobile | 69 / 93 / 96 / 92 |
| [live-chrome-docs-mobile-b.json](samples/lighthouse/live-chrome-docs-mobile-b.json) | 2026-10-14T12:20:50.953Z | mobile | 67 / 93 / 79 / 92 |

- `mobile-a` / `mobile-b` 的整份 `configSettings` 完全相同；requestedUrl、finalUrl、Lighthouse 版本也相同。適合檢查競品是否能比較同條件測量。兩次 benchmarkIndex 和時間不同，這不是受控效能實驗，也不能將自然波動稱為程式回歸。
- `desktop` 是同一真實頁面另一個執行，使用 `--preset=desktop`。節流參數和螢幕設定均不同，適合測試工具是否提示不可直接比較。
- 三份均無 `runtimeError`，沒有 `scoreDisplayMode=error` 的 audit。三份都有「原始 URL 被轉址到 `?hl=zh-tw`」的 `runWarnings`。
- mobile A 和 B 終端都曾列出 `LanternError: Invalid dependency graph created, cycle detected`，但程式回傳 0 並產生完整報告；因此此組只能支援報告匯入與差異呈現測試，不能拿來做可靠效能因果判讀。B 的原始 stderr 已保存；A 的訊息保留在本次工具執行紀錄，未另外偽造原始 stderr 檔。
- 同條件 A/B 的 best practices 96→79 對應 `third-party-cookies` audit 1→0；這顯示輸出應揭露 audit 和採樣環境，不能只憑分數變動斷言程式退步。

執行命令（以 repo 根目錄為工作目錄；各次只變更輸出檔名，desktop 額外加 `--preset=desktop`）：

```sh
research/competitor-validation-2026-10-14/tooling/node_modules/.bin/lighthouse \
  'https://developer.chrome.com/docs/lighthouse/overview' \
  --chrome-path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' \
  --chrome-flags='--headless=new --disable-gpu' \
  --output=json --output-path=<report-path> --quiet
```

## 官方完整 fixtures：只作補充相容性樣本

來源固定於 [GoogleChrome/lighthouse-ci commit `ebee453dad3f8acacd657a62ccc65e3296afb7d0`](https://github.com/GoogleChrome/lighthouse-ci/tree/ebee453dad3f8acacd657a62ccc65e3296afb7d0)。保留下載原始位元，沒有修改；新增 12.6.1 fixture 的 [commit](https://github.com/GoogleChrome/lighthouse-ci/commit/6b3b50eea9a64ff0c483d1024c32255c52fda98f) 只說明版本升級，未提供足以證明整份 fixture 從未人工修改的生成紀錄。**因此不能稱這三份為本輪真實執行結果，也不能以完整欄位反推它一定不是合成資料。**

| fixture | Lighthouse / fetchTime | 用途 |
|---|---|---|
| [lh-11-4-0-coursehero-a.json](samples/lighthouse/lh-11-4-0-coursehero-a.json) | 11.4.0 / 2023-12-14T19:28:03.022Z | 同 URL mobile，12.6.1 A/B 為同版；11.4.0 用於跨版條件警示 |
| [lh-12-6-1-coursehero-a.json](samples/lighthouse/lh-12-6-1-coursehero-a.json) | 12.6.1 / 2025-06-02T21:06:21.001Z | 同 URL mobile，12.6.1 A/B 為同版；11.4.0 用於跨版條件警示 |
| [lh-12-6-1-coursehero-b.json](samples/lighthouse/lh-12-6-1-coursehero-b.json) | 12.6.1 / 2025-06-02T21:07:49.449Z | 同 URL mobile，12.6.1 A/B 為同版；11.4.0 用於跨版條件警示 |

## 完整中繼資料與授權

- 每一份的完整 `configSettings`、environment、版本、URL、時間、SHA-256、來源 URL、檔案大小與分數，均在 [manifest.json](samples/lighthouse/manifest.json)。
- 官方 repo 授權檔保留為 [SOURCE-LICENSE.txt](samples/lighthouse/SOURCE-LICENSE.txt)，Apache-2.0。報告中的原始網站截圖／文字仍受來源網站權利與條款約束，repo license 不代表取得網站內容所有權。
- Lighthouse 只安裝在本研究的 `tooling/`，版本及 transitive lock 保留於 package.json / package-lock.json。沒有全局安裝。
- 這些樣本只用於研究競品，不支援本專案任何產品 AC 的完成判定。
