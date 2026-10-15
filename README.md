# Sid Tools

**[開啟工具：tools.sid.tw](https://tools.sid.tw/)**

五個工具共用同一個 **SSG + SPA**，選單切換不重載整頁。所有資料在瀏覽器處理，免登入。

| 工具                                                      | 功能                                                  |
| --------------------------------------------------------- | ----------------------------------------------------- |
| [圖片壓縮](https://tools.sid.tw/)                         | 批次指定大小、尺寸與格式，逐檔檢查與 ZIP 下載         |
| [Lighthouse 比較](https://tools.sid.tw/tools/lighthouse/) | 量測條件警告、分類分數、原始指標與稽核差異            |
| [JSON 差異](https://tools.sid.tw/tools/json-diff/)        | 大整數、忽略路徑、陣列 ID 配對、衝突與匯出            |
| [Cron 預覽](https://tools.sid.tw/tools/cron/)             | 五欄 Unix Cron、雙時區、未來 10 次與 DST 規則         |
| [SemVer 範圍](https://tools.sid.tw/tools/semver/)         | 自訂版本集合、雙範圍逐筆理由、prerelease 與 JSON 匯出 |

採用 [SidStraw/mono-starter](https://github.com/SidStraw/mono-starter) commit `c6d6f32854f6a8fd9f5d6cd4076475e4e9170af0` 初始化，沿用 TypeScript、Vite+、pnpm workspace、嚴格檢查、跨平台 CI、Renovate 與選用 Pi 診斷。保留本專案既有 Backlog 與研究，沒有複製範本任務。

## 開發

使用既有 [mise](https://mise.jdx.dev/) 安裝工具，專案的 `mise.toml` 選用 Node 24.21.0 與 pnpm 12.8.2，不修改全域預設版本。版本須與 `package.json` 的 `engines.node`、`packageManager` 及 CI 的 `runtime` 同步；pnpm 遇到版本不符會報錯，不自動下載或切換工具。

```sh
mise trust mise.toml
mise install
mise exec -- pnpm install --frozen-lockfile
mise exec -- pnpm exec playwright install chromium
mise exec -- pnpm dev
```

已啟用 mise shell integration 的終端機可以直接使用下列 `pnpm` 指令；腳本或未啟用的終端機使用 `mise exec -- pnpm …`。Linux 缺少瀏覽器函式庫時，使用 `mise exec -- pnpm exec playwright install --with-deps chromium`。

既有 checkout 請移除 shell 或腳本中手動加入 `.toolchain/bin` 的 PATH 設定，再依上述步驟安裝。`.npmrc` 的相容設定會阻止舊 pnpm 10 自動切換；pnpm 12 使用 `pnpm-workspace.yaml` 的 `pmOnFail: error` 與 `runtimeOnFail: error`。不需要清除全域 pnpm 快取或重建專案。

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
- `packages/core`：工具純計算模組，以獨立公開子路徑提供給各工具（含 `@sid-tools/core/semver`）。
- `tests`：公開真實圖片樣本、套件介面與瀏覽器驗收。
- `docs/validation/stw-34`、`docs/validation/phase-one`：驗收紀錄與畫面。
- `backlog`、`research`：原始題目與需求研究。

支援靜態 JPEG／PNG／WebP，依 EXIF 方向縮圖；拒絕 GIF、APNG、動態 WebP。透明圖轉 JPEG 必須明確選擇填白底。最多 30 張、單檔 20 MB、整批原圖與輸出各 100 MB；每張最多 3200 萬像素、最長邊 8192 px。KB 是 1000 bytes，KiB 是 1024 bytes。

壓縮只在指定尺寸內調整品質，不會為了達標自動進一步縮圖。無法達標時顯示原因並保留可下載結果；ZIP 會包含未達標結果。重新編碼移除 EXIF；如果保留較小原檔，會明示中繼資料也保留。沒有帳號或檔案上傳 API；正式站使用 Cloudflare Web Analytics 的基本頁面與效能統計。

## SSG、SPA 與按需載入

`src/routes.ts` 定義五個網址，`src/pages/*.html` 是共用的工具畫面來源。Vite 的 `tool-ssg` 插件在建置時由 `scripts/ssg.ts` 產生各網址的完整 HTML、標題、描述、選單與共用 SPA 入口。直接開啟或重整深層網址不需要 Pages 的 SPA fallback；停用 JavaScript 仍能閱讀說明與切換連結。

`src/router.ts` 使用 History API，選單與上一頁／下一頁在同一份 document 切換。畫面與控制程式按工具動態載入並快取；Worker 在按下執行後建立，Lighthouse、JSON 與 Cron 計算模組再按需載入。首頁不載入 Cron parser 等其他工具套件。切換時停止 Worker／ZIP、釋放 Blob URL 並丟棄使用者輸入；已載入的程式碼可重用，輸入不快取。

SemVer 採獨立控制程式，按下比較才載入固定引擎；有界限的純計算在頁面內執行，不啟動既有工具 Worker。編輯、清除或離開時使尚未完成的載入失效，不讓舊結果回填。

載入中保留原畫面並顯示狀態，過期的非同步回應不會覆蓋新選擇。載入錯誤保留可操作選單，提供使用者觸發的「重新載入工具」以恢復斷線或部署後的舊 chunk URL；這個錯誤恢復動作會重新載入文件並清除輸入，不會自動反覆重載。一般工具切換不重新載入文件。此版本不提供離線快取保證。

### 計算範圍

- Lighthouse：11–13 原始 JSON，單檔 10 MB；缺值保留 unavailable，單次差異不作因果宣告。
- JSON：每份 2 MB、100 層巢狀、100,000 個比較節點、5,000 筆差異。超限拒絕完整比較，避免假稱相同。忽略規則以 `/` 路徑及 `*` 單層匹配；配對後使用 `@欄位=型別:ID` 的邏輯路徑。數字值精確比較，數字 ID 保留原始拼法（1 與 1.0 為不同 ID）。
- Cron：固定 `cron-parser 5.10.2`、五欄數字 Unix 語法；不支援 Quartz、AWS、秒或文字別名。日與星期同時受限採 OR。起算時間為 UTC，兩個顯示時區指向相同時刻，依瀏覽器時區資料計算。
- SemVer：固定 `node-semver 7.7.3`，`loose=false`、`includePrerelease=false`。清單須為完整嚴格版本（不接受 v 前綴／前導零），最多 500 筆、64,000 字元；每範圍最多 512 字元、16 OR 分支、64 條件詞。支援 npm 精確版本、比較子、空白 AND、`||`、caret、tilde、x/* 與連字範圍，不支援標籤、workspace:、URL、逗號 AND 或其他方言。空範圍拒絕，請明寫 `*`。任一無效輸入中止整次比較，保留清單順序與重複；build metadata 不影響匹配。

SemVer 的 prerelease 須由同一 OR 分支明寫相同 major.minor.patch 的 prerelease 條件才納入（`*` 也排除）；`^0.2.3` 為 `>=0.2.3 <0.3.0-0`，`^0.0.3` 為 `>=0.0.3 <0.0.4-0`。只比較使用者提供集合的新增／移除，不證明整體範圍相等或包含，也不保證實際 API 相容性。不查 registry、不儲存、不上傳；下載 JSON 包含完整輸入、引擎版本、選項、正規化範圍與逐筆理由，可貼回重現。純測試見 `packages/core/src/semver.test.ts`，production 驗收見 `tests/e2e/semver.spec.ts`。

可直接重現的 Cron 範例（另有單元測試）：

| 情境     | 排程／時區                      | UTC 起算             | 預覽行為                                  |
| -------- | ------------------------------- | -------------------- | ----------------------------------------- |
| DST 缺時 | `30 2 * * *` / America/New_York | 2026-03-08T00:00:00Z | 當日 03:30，UTC 07:30；次日回到 02:30     |
| DST 重複 | `30 1 * * *` / America/New_York | 2026-11-01T00:00:00Z | 當日第一次 01:30，UTC 05:30；下一次是次日 |
| 月底     | `0 0 31 * *` / UTC              | 2026-04-01T00:00:00Z | 下一次 2026-05-31，跳過無 31 日月份       |
| 閏年     | `0 0 29 2 *` / UTC              | 2026-01-01T00:00:00Z | 下一次 2028-02-29                         |

## Cloudflare 部署與分析

正式入口為 **https://tools.sid.tw/**。repo 內鎖定官方 `wrangler@4.149.0`；版本符合本專案三天發布等待期。沒有全局安裝。`wrangler.jsonc` 以 `pages_build_output_dir` 管理 Cloudflare Pages 的 `apps/web/dist`，沒有自行撰寫資產伺服器或部署 GitHub Actions。

```sh
mise exec -- pnpm exec wrangler whoami
mise exec -- pnpm verify
mise exec -- pnpm deploy
```

`pnpm deploy` 由 `vp run` 先建置相依套件與網站，再執行 repo 內的 Wrangler。登入憑證由 Wrangler 管理，不放入 repo。網域與公開分析站點識別碼不是部署憑證。

Cloudflare Pages 原生 Git 整合沿用既有 GitHub OAuth 授權，連接 `SidStraw/sid-tools-web` 的 `main`；建置命令 `pnpm build`、輸出目錄 `apps/web/dist`，root directory 為 repo 根目錄。自動部署不需要另建使用者 API Token。手動部署使用既有 Wrangler OAuth 與 `wrangler pages deploy`。GitHub Actions 的 [Verify](.github/workflows/ci.yml) 保留 Linux／macOS 完整驗收；GitHub Pages 的 artifact、部署 job 與遠端 Pages 設定停用。原生 Git 整合遠端狀態及本次驗收證據見 [Cloudflare 遷移紀錄](docs/validation/cloudflare/README.md)。

網站在網域根路徑提供五個 SSG HTML，Cloudflare 使用 trailing-slash 正規化；未知網址與不存在的 JS chunk 回真正的 404，不以首頁 200 回應。五頁 canonical、sitemap 與 robots 指向 `tools.sid.tw`。正式 `pages.dev` 網址透過 Cloudflare Bulk Redirect 以 301 導向正式網域，保留路徑與查詢參數；預覽網址使用 Pages 預設 `X-Robots-Tag: noindex`，避免多個可收錄的公開入口。

`sid.tw` 帳號既有 Cloudflare Web Analytics 自動安裝涵蓋子網域；沿用「排除歐盟訪客」偏好，不新增重複 beacon。CSP 僅允許官方 beacon script 與指定 RUM 端點；本機無 beacon，測試仍檢查輸入不上傳。正式站頁面瀏覽與效能會送出基本統計，工具輸入、檔案、處理結果留在瀏覽器。

基本報告可查看 page views、visits、熱門路徑、來源、國家、瀏覽器／裝置與 Core Web Vitals。Edge 請求數包含靜態資源及機器流量，不能當成人數；Web Analytics 可能被阻擋或因排除歐盟而少算。沒有自訂事件、工具成功率、UTM 歸因或 Google 關鍵字排名資料。官方說明：[Web Analytics](https://developers.cloudflare.com/web-analytics/)、[SPA 與 CSP FAQ](https://developers.cloudflare.com/web-analytics/faq/)。

## 題目與研究

產品方向為多合一工具站獲取流量，不限制族群，以可驗證的機會優先。依使用者後續授權完成第一階段 STW-34、STW-16、STW-3、STW-5；其他候選維持研究狀態。功能交付不表示已驗證搜尋流量或獨特競爭優勢。

- [產品方向](docs/product-direction.md)
- [STW-34／STW-16 競品實測與搜尋量](research/competitor-validation-2026-10-14/README.md)
- [整體題目決策](research/tool-portfolio-review-2026-10-14/demand-review.md)
- [原始關鍵字與題目池](research/keyword-review-2026-10-04/README.md)

卡片只透過 Backlog CLI 維護，請遵循 [AGENTS.md](AGENTS.md)。
