# Sid Tools

**[開啟工具：sidstraw.github.io/sid-tools-web](https://sidstraw.github.io/sid-tools-web/)**

四個工具共用同一個 **SSG + SPA**，選單切換不重載整頁。所有資料在瀏覽器處理，免登入。

| 工具                                                                          | 功能                                          |
| ----------------------------------------------------------------------------- | --------------------------------------------- |
| [圖片壓縮](https://sidstraw.github.io/sid-tools-web/)                         | 批次指定大小、尺寸與格式，逐檔檢查與 ZIP 下載 |
| [Lighthouse 比較](https://sidstraw.github.io/sid-tools-web/tools/lighthouse/) | 量測條件警告、分類分數、原始指標與稽核差異    |
| [JSON 差異](https://sidstraw.github.io/sid-tools-web/tools/json-diff/)        | 大整數、忽略路徑、陣列 ID 配對、衝突與匯出    |
| [Cron 預覽](https://sidstraw.github.io/sid-tools-web/tools/cron/)             | 五欄 Unix Cron、雙時區、未來 10 次與 DST 規則 |

採用 [SidStraw/mono-starter](https://github.com/SidStraw/mono-starter) commit `c6d6f32854f6a8fd9f5d6cd4076475e4e9170af0` 初始化，沿用 TypeScript、Vite+、pnpm workspace、嚴格檢查、跨平台 CI、Renovate 與選用 Pi 診斷。保留本專案既有 Backlog 與研究，沒有複製範本任務。

## 開發

所有工具鏈安裝於專案，沒有全局安裝。已有 Node/npm 即可啟動本地 pnpm，之後由 pnpm 安裝鎖定 Node 24.21.0。

```sh
mkdir -p .toolchain/bin
npm install --prefix .toolchain --no-save --package-lock=false --ignore-scripts --no-audit --no-fund pnpm@12.8.2
ln -sf "../node_modules/@pnpm/exe.$(node -p 'process.platform + "-" + process.arch')/pnpm" .toolchain/bin/pnpm
ln -sf ../../node_modules/.bin/node .toolchain/bin/node
export PATH="$PWD/.toolchain/bin:$PATH"
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm dev
```

Linux 缺少瀏覽器函式庫時，使用 `pnpm exec playwright install --with-deps chromium`。重開終端機後需重新設定以上 PATH。

| 指令                           | 用途                                                    |
| ------------------------------ | ------------------------------------------------------- |
| `pnpm dev`                     | 開發伺服器與 core 套件監看                              |
| `pnpm check`                   | 格式、lint、TypeScript 嚴格檢查                         |
| `pnpm build`                   | 依套件相依順序建置                                      |
| `pnpm test`                    | 單元／套件測試及 production 瀏覽器驗收                  |
| `pnpm verify`                  | 不使用任務快取的完整檢查、建置、測試與 production audit |
| `pnpm tasks task list --plain` | 查看 Backlog                                            |
| `pnpm tasks:web`               | 本機 Backlog 看板                                       |
| `pnpm tasks:doctor`            | 檢查卡片結構                                            |

## 結構與工具範圍

- `apps/web`：共用 SPA shell、SSG 路由 HTML、工具 UI 與背景 Workers。
- `packages/core`：四工具純計算模組，以獨立公開子路徑提供給各工具。
- `tests`：公開真實圖片樣本、套件介面與瀏覽器驗收。
- `docs/validation/stw-34`、`docs/validation/phase-one`：驗收紀錄與畫面。
- `backlog`、`research`：原始題目與需求研究。

支援靜態 JPEG／PNG／WebP，依 EXIF 方向縮圖；拒絕 GIF、APNG、動態 WebP。透明圖轉 JPEG 必須明確選擇填白底。最多 30 張、單檔 20 MB、整批原圖與輸出各 100 MB；每張最多 3200 萬像素、最長邊 8192 px。KB 是 1000 bytes，KiB 是 1024 bytes。

壓縮只在指定尺寸內調整品質，不會為了達標自動進一步縮圖。無法達標時顯示原因並保留可下載結果；ZIP 會包含未達標結果。重新編碼移除 EXIF；如果保留較小原檔，會明示中繼資料也保留。沒有伺服器、帳號、分析追蹤或檔案上傳 API。

## SSG、SPA 與按需載入

`src/routes.ts` 定義四個網址，`src/pages/*.html` 是共用的工具畫面來源。Vite 的 `tool-ssg` 插件在建置時由 `scripts/ssg.ts` 產生各網址的完整 HTML、標題、描述、選單與共用 SPA 入口。直接開啟或重整深層網址不需要 Pages 的 SPA fallback；停用 JavaScript 仍能閱讀說明與切換連結。

`src/router.ts` 使用 History API，選單與上一頁／下一頁在同一份 document 切換。畫面與控制程式按工具動態載入並快取；Worker 在按下執行後建立，Lighthouse、JSON 與 Cron 計算模組再按需載入。首頁不載入 Cron parser 等其他工具套件。切換時停止 Worker／ZIP、釋放 Blob URL 並丟棄使用者輸入；已載入的程式碼可重用，輸入不快取。

載入中保留原畫面並顯示狀態，過期的非同步回應不會覆蓋新選擇。載入錯誤保留可操作選單，提供使用者觸發的「重新載入工具」以恢復斷線或部署後的舊 chunk URL；這個錯誤恢復動作會重新載入文件並清除輸入，不會自動反覆重載。一般工具切換不重新載入文件。此版本不提供離線快取保證。

### 計算範圍

- Lighthouse：11–13 原始 JSON，單檔 10 MB；缺值保留 unavailable，單次差異不作因果宣告。
- JSON：每份 2 MB、100 層巢狀、100,000 個比較節點、5,000 筆差異。超限拒絕完整比較，避免假稱相同。忽略規則以 `/` 路徑及 `*` 單層匹配；配對後使用 `@欄位=型別:ID` 的邏輯路徑。數字值精確比較，數字 ID 保留原始拼法（1 與 1.0 為不同 ID）。
- Cron：固定 `cron-parser 5.10.2`、五欄數字 Unix 語法；不支援 Quartz、AWS、秒或文字別名。日與星期同時受限採 OR。起算時間為 UTC，兩個顯示時區指向相同時刻，依瀏覽器時區資料計算。

可直接重現的 Cron 範例（另有單元測試）：

| 情境     | 排程／時區                      | UTC 起算             | 預覽行為                                  |
| -------- | ------------------------------- | -------------------- | ----------------------------------------- |
| DST 缺時 | `30 2 * * *` / America/New_York | 2026-03-08T00:00:00Z | 當日 03:30，UTC 07:30；次日回到 02:30     |
| DST 重複 | `30 1 * * *` / America/New_York | 2026-11-01T00:00:00Z | 當日第一次 01:30，UTC 05:30；下一次是次日 |
| 月底     | `0 0 31 * *` / UTC              | 2026-04-01T00:00:00Z | 下一次 2026-05-31，跳過無 31 日月份       |
| 閏年     | `0 0 29 2 *` / UTC              | 2026-01-01T00:00:00Z | 下一次 2028-02-29                         |

## GitHub Pages

[Verify and deploy Pages](.github/workflows/ci.yml) 在 PR 與 main push 驗證 Linux／macOS；main 的兩個驗收 job 全部通過後，只發佈 `apps/web/dist`。Backlog、研究、原始測試圖片與開發相依不在網站 artifact 中。資產及 Worker 使用相對路徑，production E2E 實際掛在 `/sid-tools-web/` 子路徑測試。

目標 repository 需於 **Settings → Pages → Source** 設為 **GitHub Actions**。頁面部署需 `pages:write`、`id-token:write`，PR 驗證只有讀取權限。Pi 診斷保持預設未啟用，不需要模型金鑰即可建置與發佈；Renovate automerge 仍關閉。

公開 repository 與 Pages 上線狀態見 [STW-34 驗收紀錄](docs/validation/stw-34/README.md)。

## 題目與研究

產品方向為多合一工具站獲取流量，不限制族群，以可驗證的機會優先。依使用者後續授權完成第一階段 STW-34、STW-16、STW-3、STW-5；其他候選維持研究狀態。功能交付不表示已驗證搜尋流量或獨特競爭優勢。

- [產品方向](docs/product-direction.md)
- [STW-34／STW-16 競品實測與搜尋量](research/competitor-validation-2026-10-14/README.md)
- [整體題目決策](research/tool-portfolio-review-2026-10-14/demand-review.md)
- [原始關鍵字與題目池](research/keyword-review-2026-10-04/README.md)

卡片只透過 Backlog CLI 維護，請遵循 [AGENTS.md](AGENTS.md)。
