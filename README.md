# Sid Tools

**[開啟工具：sidstraw.github.io/sid-tools-web](https://sidstraw.github.io/sid-tools-web/)**

多合一工具站的第一個工具：**批次圖片壓縮**。指定大小、尺寸與格式，逐檔顯示是否達標，支援比較預覽與 ZIP 下載。圖片只在瀏覽器處理。

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

- `apps/web`：靜態網站，UI、Worker 圖片編碼及 ZIP。
- `packages/core`：圖片容器檢查、大小／尺寸規則與公開型別。
- `tests`：公開真實圖片樣本、套件介面與瀏覽器驗收。
- `docs/validation/stw-34`：驗收紀錄與畫面。
- `backlog`、`research`：原始題目與需求研究。

支援靜態 JPEG／PNG／WebP，依 EXIF 方向縮圖；拒絕 GIF、APNG、動態 WebP。透明圖轉 JPEG 必須明確選擇填白底。最多 30 張、單檔 20 MB、整批原圖與輸出各 100 MB；每張最多 3200 萬像素、最長邊 8192 px。KB 是 1000 bytes，KiB 是 1024 bytes。

壓縮只在指定尺寸內調整品質，不會為了達標自動進一步縮圖。無法達標時顯示原因並保留可下載結果；ZIP 會包含未達標結果。重新編碼移除 EXIF；如果保留較小原檔，會明示中繼資料也保留。沒有伺服器、帳號、分析追蹤或檔案上傳 API。

## GitHub Pages

[Verify and deploy Pages](.github/workflows/ci.yml) 在 PR 與 main push 驗證 Linux／macOS；main 的兩個驗收 job 全部通過後，只發佈 `apps/web/dist`。Backlog、研究、原始測試圖片與開發相依不在網站 artifact 中。資產及 Worker 使用相對路徑，production E2E 實際掛在 `/sid-tools-web/` 子路徑測試。

目標 repository 需於 **Settings → Pages → Source** 設為 **GitHub Actions**。頁面部署需 `pages:write`、`id-token:write`，PR 驗證只有讀取權限。Pi 診斷保持預設未啟用，不需要模型金鑰即可建置與發佈；Renovate automerge 仍關閉。

公開 repository 與 Pages 上線狀態見 [STW-34 驗收紀錄](docs/validation/stw-34/README.md)。

## 題目與研究

產品方向為多合一工具站獲取流量，不限制族群，以可驗證的機會優先。本輪依使用者指示停止逐卡研究並先交付 STW-34；其他候選尚未進入實作。

- [產品方向](docs/product-direction.md)
- [STW-34／STW-16 競品實測與搜尋量](research/competitor-validation-2026-10-14/README.md)
- [整體題目決策](research/tool-portfolio-review-2026-10-14/demand-review.md)
- [原始關鍵字與題目池](research/keyword-review-2026-10-04/README.md)

卡片只透過 Backlog CLI 維護，請遵循 [AGENTS.md](AGENTS.md)。
