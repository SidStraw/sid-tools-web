# Sid Tools

**[開啟工具：tools.sid.tw](https://tools.sid.tw/)**

十五個工具共用同一個 **SSG + SPA**，選單切換不重載整頁。所有資料在瀏覽器處理，免登入。

| 工具                                                        | 功能                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| [圖片壓縮](https://tools.sid.tw/)                           | 批次指定大小、尺寸與格式，逐檔檢查與 ZIP 下載          |
| [Lighthouse 比較](https://tools.sid.tw/tools/lighthouse/)   | 量測條件警告、分類分數、原始指標與稽核差異             |
| [JSON 差異](https://tools.sid.tw/tools/json-diff/)          | 大整數、忽略路徑、陣列 ID 配對、衝突與匯出             |
| [Cron 預覽](https://tools.sid.tw/tools/cron/)               | 五欄 Unix Cron、雙時區、未來 10 次與 DST 規則          |
| [SemVer 範圍](https://tools.sid.tw/tools/semver/)           | 自訂版本集合、雙範圍逐筆理由、prerelease 與 JSON 匯出  |
| [.env 預檢](https://tools.sid.tw/tools/env-check/)          | 雙檔鍵名比對、語法與行號、預設遮蔽及鍵名報告           |
| [Git diff 檢視](https://tools.sid.tw/tools/git-diff/)       | 檔案／hunk 來源導覽、明確選取、預覽後下載審查摘錄      |
| [Sitemap 預檢](https://tools.sid.tw/tools/sitemap/)         | XML／URL／lastmod 靜態檢查、路徑樹與原始條目定位       |
| [EXPLAIN 檢視](https://tools.sid.tw/tools/explain/)         | PostgreSQL 計畫樹、per-loop rows 差距與原始 JSON 定位  |
| [圖片配色](https://tools.sid.tw/tools/palette/)             | 本機取樣色票、透明混色／WCAG 對比與明確選取 CSS tokens |
| [Selector 比較](https://tools.sid.tw/tools/selectors/)      | CSS 特異性貢獻、隔離純文字 HTML 結構與靜態命中         |
| [GraphQL 差異](https://tools.sid.tw/tools/sdl/)             | 兩份 SDL 靜態分類、型別／欄位來源與直接引用導覽        |
| [OpenAPI 差異](https://tools.sid.tw/tools/openapi/)         | JSON／YAML 合約雙方向分類、引用使用點與定義導覽        |
| [回應 Fixture](https://tools.sid.tw/tools/openapi-fixture/) | 明確選取 JSON 回應、固定 seed、獨立驗證與資料來源      |
| [SQL 關聯圖](https://tools.sid.tw/tools/sql-ddl/)           | PostgreSQL 建表宣告、來源連結、原生 SVG 與資料表文件   |

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
- `packages/core`：工具純計算模組，以獨立公開子路徑提供給各工具（含 `@sid-tools/core/semver`、`@sid-tools/core/env-check`、`@sid-tools/core/git-diff`、`@sid-tools/core/sitemap`、`@sid-tools/core/explain`、`@sid-tools/core/palette`、`@sid-tools/core/selectors`、`@sid-tools/core/sdl`、`@sid-tools/core/openapi`、`@sid-tools/core/openapi-fixture`、`@sid-tools/core/sql-ddl`）。
- `tests`：公開真實圖片樣本、套件介面與瀏覽器驗收。
- `docs/validation/stw-34`、`docs/validation/phase-one`：驗收紀錄與畫面。
- `backlog`、`research`：原始題目與需求研究。

支援靜態 JPEG／PNG／WebP，依 EXIF 方向縮圖；拒絕 GIF、APNG、動態 WebP。透明圖轉 JPEG 必須明確選擇填白底。最多 30 張、單檔 20 MB、整批原圖與輸出各 100 MB；每張最多 3200 萬像素、最長邊 8192 px。KB 是 1000 bytes，KiB 是 1024 bytes。

壓縮只在指定尺寸內調整品質，不會為了達標自動進一步縮圖。無法達標時顯示原因並保留可下載結果；ZIP 會包含未達標結果。重新編碼移除 EXIF；如果保留較小原檔，會明示中繼資料也保留。沒有帳號或檔案上傳 API；正式站使用 Cloudflare Web Analytics 的基本頁面與效能統計。

## SSG、SPA 與按需載入

`src/routes.ts` 定義十五個網址，`src/pages/*.html` 是共用的工具畫面來源。Vite 的 `tool-ssg` 插件在建置時由 `scripts/ssg.ts` 產生各網址的完整 HTML、標題、描述、選單與共用 SPA 入口。直接開啟或重整深層網址不需要 Pages 的 SPA fallback；停用 JavaScript 仍能閱讀說明與切換連結。

`src/router.ts` 使用 History API，選單與上一頁／下一頁在同一份 document 切換。畫面與控制程式按工具動態載入並快取；Worker 在按下執行後建立，Lighthouse、JSON 與 Cron 計算模組再按需載入。首頁不載入 Cron parser 等其他工具套件。切換時停止 Worker／ZIP、釋放 Blob URL 並丟棄使用者輸入；已載入的程式碼可重用，輸入不快取。

SemVer 採獨立控制程式，按下比較才載入固定引擎；有界限的純計算在頁面內執行，不啟動既有工具 Worker。編輯、清除或離開時使尚未完成的載入失效，不讓舊結果回填。

.env 預檢同樣採獨立控制程式，按下檢查才載入純計算模組。兩份可編輯輸入預設視覺遮蔽整段文字，須明確操作才顯示明文；這不是加密，原始文字仍暫存在頁面記憶體。清除、載入範例與離開後重進均恢復遮蔽。結果只列鍵名、問題、行號與狀態，不匯出已解析的值。鍵名本身會顯示；未加引號的多行內容可能把形似指定式的秘密片段當成鍵名，分享前請檢查鍵名清單，勿將秘密放在鍵名中。

Git diff 檢視採獨立 lazy 控制程式，按「檢視」才載入 parser／selection helper。預設沒有選取；選檔案不會自動選 hunk，必須明確選取兩者（純 metadata 檔只需選檔案）。預覽與下載只使用 `exportGitDiffSelection` 重建結果，絕不將完整原始 report stringify 為遮蔽後匯出。編輯、重跑、清除或離開會清空 report／選取／預覽；選取改變也會丟棄舊預覽，需重新預覽才能下載。不讀 repo、不執行 patch、不使用 AI 或推測改動原因。

載入中保留原畫面並顯示狀態，過期的非同步回應不會覆蓋新選擇。載入錯誤保留可操作選單，提供使用者觸發的「重新載入工具」以恢復斷線或部署後的舊 chunk URL；這個錯誤恢復動作會重新載入文件並清除輸入，不會自動反覆重載。一般工具切換不重新載入文件。此版本不提供離線快取保證。

### 計算範圍

- Lighthouse：11–13 原始 JSON，單檔 10 MB；缺值保留 unavailable，單次差異不作因果宣告。
- JSON：每份 2 MB、100 層巢狀、100,000 個比較節點、5,000 筆差異。超限拒絕完整比較，避免假稱相同。忽略規則以 `/` 路徑及 `*` 單層匹配；配對後使用 `@欄位=型別:ID` 的邏輯路徑。數字值精確比較，數字 ID 保留原始拼法（1 與 1.0 為不同 ID）。
- Cron：固定 `cron-parser 5.10.2`、五欄數字 Unix 語法；不支援 Quartz、AWS、秒或文字別名。日與星期同時受限採 OR。起算時間為 UTC，兩個顯示時區指向相同時刻，依瀏覽器時區資料計算。
- SemVer：固定 `node-semver 7.7.3`，`loose=false`、`includePrerelease=false`。清單須為完整嚴格版本（不接受 v 前綴／前導零），最多 500 筆、64,000 字元；每範圍最多 512 字元、16 OR 分支、64 條件詞。支援 npm 精確版本、比較子、空白 AND、`||`、caret、tilde、x/* 與連字範圍，不支援標籤、workspace:、URL、逗號 AND 或其他方言。空範圍拒絕，請明寫 `*`。任一無效輸入中止整次比較，保留清單順序與重複；build metadata 不影響匹配。
- .env：明示 dotenv 子集，不是 Shell；鍵名 `[A-Za-z_][A-Za-z0-9_]*`，支援 LF／CRLF、BOM、# 註解、等號、單／雙引號與實體多行。未引號遇 # 開始註解，單引號無跳脫，雙引號僅支援 `\n`、`\r`、`\t`、`\\`、`\"`。不支援 export、插值、命令替換或反引號（含單引號內），從不執行／展開。每份 200,000 UTF-16 字碼單元、5,000 實體行、每行 10,000 字碼單元（不是 bytes）。語法錯誤回傳暫定結果，超限省略跨檔缺漏／多餘比較；UI 每頁 100 筆問題／鍵名，不刪除報告條目。`KEY=` 是空值不是缺漏，`KEY=" "` 不算空；重複鍵不決定優先序，缺漏位置指向範本。JSON 只含鍵名／位置／問題等中繼資料，完整出現行號集中於 `keys`；不保留原始值供重播。四種合成範例可直接重跑。測試與畫面見 `docs/validation/stw-1/`。

SemVer 的 prerelease 須由同一 OR 分支明寫相同 major.minor.patch 的 prerelease 條件才納入（`*` 也排除）；`^0.2.3` 為 `>=0.2.3 <0.3.0-0`，`^0.0.3` 為 `>=0.0.3 <0.0.4-0`。只比較使用者提供集合的新增／移除，不證明整體範圍相等或包含，也不保證實際 API 相容性。不查 registry、不儲存、不上傳；下載 JSON 包含完整輸入、引擎版本、選項、正規化範圍與逐筆理由，可貼回重現。純測試見 `packages/core/src/semver.test.ts`，production 驗收見 `tests/e2e/semver.spec.ts`。

.env 多行 PEM／PGP／OpenSSH 必須用引號包住。未加引號且值以 `-----BEGIN ` 開頭時，整段 armor 內容消耗至 `-----END` 或 EOF，標記不支援，不把區塊內的內容列為鍵；EOF 未結束亦列出未結束診斷。其他未加引號的多行內容不保證辨識為秘密，報告不是通用秘密掃描器，分享前須檢查鍵名。重複鍵診斷只回指首次出現行（不表示採首筆值）；`keys` 保留兩側完整出現行號。

Git diff 首版支援 Git `diff --git a/path b/path` unified 子集、嚴格 Git C 引號路徑、相符標頭、hunk 計數與範圍驗證、metadata-only rename／mode。plain unified、combined/copy、二進位、未知標頭及截斷都明示不完整；計數只是已觀察內容，不冒充完整。每份最多 1,000,000 UTF-16 字碼單元、20,000 實體行、每行 20,000 字碼單元（非 bytes），LF／CRLF framing；一個尾端換行不計入。每個 hunk 的程式碼以 200 行分段呈現，其餘仍可導覽。完整 parser 規則、來源／舊新行號差異與合成示範在頁面說明中公開。

Git 匯出為 selection-only 審查摘錄，**不是完整或可直接套用的 patch**；移除 hash、mode、section label 與未選路徑／hunk，不複製原始全域診斷。所選 hunk 的上下文與路徑仍會分享，這不是自動秘密偵測／逐行遮蔽。只有完整檔案可匯出；原始輸入其他部分不完整不妨礙明確選取其中完整檔案，但 UI 保留原始不完整警告。JSON 預覽是實際下載的 JSON；TXT 僅為 helper 的 review extract。可重現測試與畫面見 `docs/validation/stw-10/`。

Sitemap 預檢使用獨立 lazy XML adapter，按下預檢才載入 `@sid-tools/core/sitemap`。以 `DOMParser` 解析前拒絕 DOCTYPE／entity 宣告（註解／CDATA 中的宣告樣式文字也拒絕）、超限內容及不支援的 XML 宣告；確認 XML 1.0／精確 Sitemap 0.9 namespace、直接子元素、欄位重複、巢狀標記與不支援結構。來源開啟標籤的行／欄位、原始 ordinal／pointer 保留，缺漏欄位回到其條目。XML 語法錯誤只提供文件層級定位，不回顯瀏覽器錯誤原文。

檢查絕對 HTTP(S) loc、完整字串重複、mixed host、有效西曆 lastmod 及可選欄位，依 origin／pathname 提供路徑樹與過濾清單，query 保留在條目中。Index 子檔一律「未檢查」，沒有開站連結、遞迴抓取或 HTTP／Google 收錄推論。延伸 namespace／屬性／mixed text／processing instruction／未知元素不靜默忽略；只顯示已提取欄位並明示不完整。純靜態 JSON 報告含 URL、診斷與來源位置，不含原始 XML；可能含敏感 query，不保證可公開分享。編輯、重跑、清除、重新整理及離開都丟棄報告／篩選／Blob URL；不傳輸、不儲存、不產生分享 URL。

Sitemap 協定上限為 50,000 條目、52,428,800 未壓縮 bytes；本頁本機上限為 **10,000 條目、2,000,000 UTF-8 bytes**（不是 UTF-16 字元數）、100,000 XML 元素、128 層。Bytes 依輸入框文字量測；瀏覽器可能正規化換行，不等同原始檔案大小。normalized 欄位與 pointer 合計上限 2,000,000 UTF-16 字碼單元、每欄位 4,096，loc 最多 2,047；超限不產生部分通過結果。原始字串過長可在編碼前拒絕並標為 byte 數未量測。清單每頁 50 筆；樹每層 60 節點分批顯示，超過 12 層的剩餘路徑合併一節點但保留條目。頁面靜態說明提供完整規則與四個合成範例；客觀測試與畫面見 `docs/validation/stw-17/`。

EXPLAIN 檢視採獨立 lazy controller，按檢視才載入公開 `@sid-tools/core/explain` parser。支援 PostgreSQL **12–18 常用 EXPLAIN FORMAT JSON 欄位子集**，只接受原生單一 statement wrapper `[{"Plan":{…}}]`；不偵測伺服器版本、不連資料庫、不執行 SQL、不建立索引。樹狀導覽選取單一節點，顯示 cost／rows／loops／timing／buffer 與 JSON Pointer；來源按鈕定位原始 JSON 值，不宣稱原始行號，缺欄位回到父層。重複 key 沿用 JSON.parse 最後值語意，來源定位也跟隨最後值／物件，不挑第一個看起來相同的 key。

Planner cost **不是 ms**。Actual Rows／節點 Startup／Total Time 是 per-loop 平均；time × loops 只是單一節點的近似 inclusive 量，不是 query wall-clock。節點包含子工作，父子 timing／buffers 不相加、不相減、不計 self time；block counters／I/O time 也不乘 loops。Statement Planning／Execution Time 獨立顯示，不用節點總和代替。估計差距比較 Plan Rows 與每 loop Actual Rows，≥10 倍只作低估／高估觀察；零分母、loops=0、缺值與衍生 overflow 分別呈現，不補造零、Infinity 或最佳化成效。

所有節點具有效 Actual Rows／Loops 配對時標為具 ANALYZE rows／loops（TIMING OFF 仍可能沒有節點時間），部分證據標為 partial actuals，無證據才標 EXPLAIN-only；這不是執行選項認證。Plan Width、Parallel Aware、Workers／JIT／Triggers／Filter／join／index-specific details 等目前不分析，未知欄位計數省略並明示不完整。缺基礎 cost／Plan Rows 也不冒稱完整，局部錯誤保留結構但標未通過。數值需有限非負，loops／block counters 為 safe integers；字串／null／不一致值明示錯誤。

EXPLAIN 本機上限為 1,000,000 UTF-16 字碼單元（不是 bytes）、96 層 JSON containers、10,000 containers、2,000 節點、32 層 plan；省略內容也受限，不回傳截斷樹假裝完整。原始 SQL／JSON 從不執行／傳送／儲存／放入分享 URL。編輯、重跑、清除及離開會重設報告／節點／來源位置與 Blob URL；Run-only import 有 stale guard。下載僅含支援欄位的靜態報告，不含原始 JSON 或未知欄位，但名稱仍可能敏感。頁面三個固定範例皆人工合成，不宣稱真實資料庫量測；驗證與畫面見 `docs/validation/stw-12/`。

圖片配色按取樣才載入公開 `@sid-tools/core/palette` 與 app-side 圖片 adapter。單張靜態 PNG／JPEG／WebP，最多 8,000,000 bytes、4096 px edge、4,000,000 decoded pixels；以既有公開 images helper 檢查容器／動畫／尺寸再給原生 decoder，拒絕 SVG、GIF、APNG、動畫 WebP、MIME 不符及多 frame JPEG。解碼10秒停止等待；取消／換檔／離開移除 image src 並回收 Blob URL，原生內部工作仍由瀏覽器管理。解碼後再次檢查尺寸（可接受 EXIF 方向交換）再建立 sRGB Canvas，不先解碼超限圖縮小。

明確選定 opaque 襯底後，透明 pixels 也先混色並計入 sample；固定4bit/channel bucket、系統性取樣最多100,000pixels，色票不是精確 unique colors、感知主色或全圖比例，未回傳 bucket 的 sample 數明示。瀏覽器 profile／EXIF／HDR／廣色域處理可能不同，不承諾跨瀏覽器原始色彩重現。兩個示範是本機人工合成240×160PNG，與上傳走同一個解碼流程，非照片／品牌量測。

文字／底色／強調角色可指定色票或手動 HEX＋alpha；先 background-over-backing，再 text/accent-over-background，encoded sRGB source-over，保留 fractional RGB。即時預覽與 WCAG2.x sRGB 對比用相同 opaque 混色數值，不以顯示四捨五入判定。四種 AA／AAA normal／large 門檻全列出，失敗不隱藏；實際大型文字條件及21:1／灰118/119參考值可核對，但不偵測字級或宣稱整站無障礙合格。accent 評估其文字在 surface 上，不假裝已測所有按鈕／非文字 UI。

只把明確勾選、具合法不重複小寫 kebab-case 名稱的角色交給 core serializer；輸出 numeric RGB CSS variables 保留預覽小數，不含原始 alpha、圖片、檔名或任意 CSS。這是特定混色情境的 opaque tokens，不能當作任意底色的 alpha 重用，也不會自動丟棄對比失敗的選取。編輯即更新預覽／CSS 並撤銷舊下載 URL；取消／清除／離開防止非同步舊結果恢復。無遠端 URL 取圖、上傳、儲存或 URL 分享。證據與限制見 `docs/validation/stw-35/`。

Selector 比較按 Run 才載入公開 `@sid-tools/core/selectors`（css-tree3.2.1）與離線 parse5@8.0.1 adapter。只接受一份逗號分隔的 CSS selector list，換行是一般 CSS 空白；整體最多20branches、每段1,000／總20,000UTF16、nesting16、AST2,048。每個 complex selector 有獨立三元組／來源貢獻；:is／:not／:has 最大參數、:where0、nth-child／nth-last-child 的 of-list 支援。未知／不支援不猜 tuple、不排名；動態狀態不執行 query，pseudo-elements／namespaces 不匹配元素；Browser SyntaxError 與有效空命中分開。

已核准 **text-only HTML structure preview**，不是渲染頁面／iframe：原始 HTML 只交給 parse5 body-context、standards、scriptingEnabled:true、source locations／repair diagnostics，從未送進 DOMParser／innerHTML／srcdoc 等原生 HTML parser。先驗證50,000UTF16、2,000elements／64層／每元素64attrs／value2,000／text10,000，包含被省略子樹與 template content，超限整份拒絕。重建只用 defaultView=null 的獨立 createHTMLDocument factories；輸入衍生節點不 import／adopt／clone／附加到 live DOM。資源／事件／style attrs 獨立移除，href只留 inert a/area；script/media/template/noscript等危險及foreign根僅保留同tag childless identity placeholder，未知／自訂元素整個省略。每項省略／修復記錄且 selector metadata 參照被移除attrs/tags 另列 partial提醒。

原生空 HTML style 即使附加在無 window document 仍可能產生 CSP style-src-elem 事件，所以 style 視為無法安全表達的元素，整個元素／子樹省略並記錄 partial，不放寬 CSP，也不換 namespace 假裝原元素。

Native querySelectorAll 僅對可確認的 static branches 作用於這份 inert body；:scope以合成body為scope，初始表單狀態不是live互動，:root不是片段首元素。每element最高tuple只來自真正匹配的top-levelbranches，不猜logicalargument或完整cascade。原生call無法中斷，硬上限為主要防護；>200ms慢提醒，整輪>2秒後其餘未評估（不是零命中）。結構100rows、診斷／貢獻50items分頁，implied節點不杜撰來源。純文字copy含結果／貢獻／保留rows／省略與限制，失敗提供readonly手動欄位；可能含敏感名稱，非可公開分享承諾。編輯／重跑／清除／離開丟棄doc/maps/listeners與結果，stale imports不可恢復。無登入／上傳／持久化／分享URL／CSP放寬。合成案例／Chromium native support／安全與效能證據見 `docs/validation/stw-7/`。

GraphQL 差異按 Run 才載入公開 `@sid-tools/core/sdl`，使用固定 graphql17.0.2 做 SDL parse/build/validate/findSchemaChanges，不執行 operation／resolver、不連線 endpoint。每側100,000UTF16、10,000tokens、lexical nesting24、ASTdepth64/nodes6,000、64types（含extensions）/500members/1,000directreferences/interface depth16；合計1,000changes，超限不截斷為成功。Invalid／limit 不比較，零筆不等於沒有變更。Status unknown 可以 unknown count0（只有歸屬不明），complete只代表靜態分類／來源覆蓋，非operational compatibility。

Output nullable→NonNull 是non-breaking，反向breaking；input方向相反，新增required還需考慮default。既有input收緊即使同時加default仍依核心列breaking；既有default新增non-breaking、改動／移除dangerous，optional input／argument新增保守dangerous。自訂directive applications即使不變仍unknown，不猜scalar／resolver／client usage。函式庫只有code/reason，UI不從reason猜連結：exact才給確定座標，candidates只做獨立候選導覽，unmapped不杜撰source。所有側type/field/arg/enum座標仍可導覽；引用只有一跳，來源是實際UTF16範圍／line/column。變更／座標／引用／issues每50筆分頁，任意文字只用textContent。

匯出需明確勾選名稱敏感性提醒，只用`exportSdlComparison()`投影，不JSON.stringify(raw report)；不含SDL／signature／reason／description／defaults／directive args／錯誤原文，名稱／座標／IDs仍可能敏感，非匿名化。Blob URL在下載後／編輯／重跑／清除／離開回收；輸入僅記憶體、不storage/network/shareURL/logging，late imports不恢復舊結果。六組人工合成固定範例、productionbrowser及手機證據見`docs/validation/stw-11/README.md`。

OpenAPI 差異只在 Run 建立**每次獨立的 module worker**，由 worker 匯入公開 `@sid-tools/core/openapi` 執行 compareOpenApi；20秒timeout、取消、編輯、重跑、清除、route dispose、error/messageerror均終止並丟棄引用／計時器／舊訊息。主執行緒不解析文件，無 shared Cron tools.worker／mainthread fallback，不放寬既有worker-src self。Export只在明確同意後lazy載入exportOpenApiSummary；從不stringify原始report，名稱／pointer仍敏感，IDs不含值hash。BlobURL下載timer/reset/dispose/error回收，stale exporter import不可恢復舊下載。

接受OpenAPI3.0.x，yaml2.9.1採YAML1.2core JSON-compatible grammar（含JSON，不是strictJSON）。Iterative Parser tokens先驗證再Composer；拒絕aliases/anchors/tags/directives/多文件/merge/複雜鍵/重複鍵。每側1M UTF16、depth100、200Ktokenobjects、10Kentries、100Kscalar source，numeric key expansion256；refs16hops/50Kresolutions、50Kcomparisonpairs/depth64、5Kfindings。Invalid/limit/unsupported非nochange；sidevalid只parser/rootchecks不是fullOASvalidation；complete只coveredsubset可以含breaking/review，unknowncounts0也需看sideissues。外部refs不fetch，local/cyclic/missing/unsupportedfacets含未改動仍保守unknown。

Request收窄接受範圍breaking，response削弱回傳保證breaking；responseenum新值/status新增review不保證breaking。Rule/category/reason與逐側issues、原始JSONPointer/UTF16range/line/column、安全純文字來源導覽；refuse-site與resolveddefinition分開，sharedfindings前20operationuses+完整count，不是clientimpact。Findings與issues50筆分頁，direction/category/operation-pointer-rule篩選。JSON/YAML順序等價、深度拒絕、未知/invalid與workerlife/privacy/export的可重現synthetic evidence見`docs/validation/stw-6/README.md`。不儲存／上傳／分享URL／記錄輸入，不執行schema或連線endpoint。

回應 Fixture 先明確檢查 JSON／YAML OpenAPI 3.0.x，再逐一選 method／path／status／JSON media；只列文件實際選擇，不猜 default／2XX。Inspection ready 只代表可列出選擇，不代表 schema 有效。來源、examples、defaults、enums 須由使用者確認僅含測試資料，否則 confirmation-required／無 fixture。這不是匿名化：example／enum 原樣沿用，seed／名稱／pointers 也可能敏感。

優先序是本工具政策，不是 OAS 規範：有效 media.example 或選定 named examples.value → root schema.example → 固定 seed 生成。具名預設為排序第一個，不依 seed 抽選；改 seed 不覆蓋有效 example。無效候選留下 rejected provenance／warnings 後再 fallback，default 忽略並提示。相同文件／選項／seed 的 JSON 位元組相同；arrayLength 可留空或 0–100，僅影響生成 arrays，仍受各 schema bounds 限制。

獨立 validator 驗證有限 object／array／string／integer／number／boolean、nullable／enum、required、response readOnly 保留／writeOnly 排除、boolean additionalProperties、基本 numeric bounds、Unicode codepoint 長度、array bounds／uniqueItems。所有 optional／writeOnly schema 也檢查；format／pattern／composition／未知欄位／外部或循環 refs 等拒絕產出，不 fetch／執行。僅有限 roundtrip numeric、safe integer、絕對值 ≤1e12，不默默捨入。Ready + passed 只涵蓋支援子集，不代替真實 API 契約測試；no-valid-fixture 不是無解證明。

沿用 parser 1M UTF-16／depth100／token objects200K／每 collection entries10K／scalar100K。Fixture 限 schema depth24／nodes2K、ref hops16／resolutions10K、output100K units／instance nodes10K、array100／string2,048 codepoints、enum128／32,768 units、attempts256／validation work50K、selections2K、seed128。選擇與 issues／provenance 以50筆分批；來源使用點／定義與 instance pointer 分開，來源選取使用原始 UTF-16 end-exclusive 範圍。

只有明確 inspect／generate 才建立每次獨立的 `openapi-fixture.worker`，使用公開 `@sid-tools/core/openapi-fixture`。20秒 timeout、cancel、edit、clear、new request、dispose、error/messageerror 終止；拒絕晚到／錯誤種類／不合形狀的訊息，無 shared worker／main-thread parser fallback。公開 `validateOpenApiFixture` 提供獨立 caller JSON 檢查，本頁不另擴大為 JSON 編輯器。Fixture 與摘要分開明確下載，只呼叫 `exportOpenApiFixture`／`exportOpenApiFixtureSummary`，不 stringify 原始 report；前者含實際值，後者只有 metadata。Blob URL 在1秒／reset／dispose／failure 回收，晚到 helper import 不恢復舊下載。不登入／上傳／保存／記錄輸入／query／hash／分享 URL，不放寬 CSP；案例及證據見 `docs/validation/stw-14/README.md`。

SQL 關聯圖只在 Run 建立獨立 `sql-ddl.worker`，使用公開 `@sid-tools/core/sql-ddl`；20秒 timeout、取消、重跑、編輯、清除、離開、error/messageerror 都終止。主執行緒不解析 SQL，沒有共用 Cron worker／fallback；晚到、錯 id／kind／shape 訊息不能復活模型。來源不連 DB／不執行 DDL，不上傳／儲存／記錄輸入／query／hash／分享 URL。

只接受 PostgreSQL18 文件定義的有界 CREATE TABLE 子集、ordered composite PK／明示 FK／self／qualified names／有限 FK options。Complete 只代表覆蓋此宣告子集，不是 DB validation／migration 最終狀態，空或純註解也非 schema 證明。Unqualified 名稱缺 search_path，只標 local-candidate 虛線；qualified unique input identity 與實際欄位才可 resolved-local 實線，仍未驗證 target 唯一性／型別／DB 接受性。Unresolved／invalid 不造節點，不依名稱／型別猜關聯。Implicit target list 只從符合條件的明示 target PK 推導，保留 PK 來源。

DEFAULT／CHECK／UNIQUE／GENERATED／ALTER／DROP／SET 等逐項定位，不執行、不更動前面接受的 CREATE snapshot。Lexer 處理 standard／E／tagged dollar quote、nested comments，未終止／不明 lexical mode 拒絕剩餘輸入而不猜後面的表。原始 UTF-16 end-exclusive／1-based line-column 用於 table／column／type／PK／FK／target-PK 來源選取。每份500K UTF-16、tokens50K／token4096、typeTokens128／typeUnits4096、comment100K／depth32、parentheses32、statements500、tables100、每表columns200／總2000、constraints／edges1000、work200K。Limit 清空模型，不輸出截斷成功圖。

App-owned 原生 SVG 使用 createElementNS／textContent／固定 attrs／數字幾何與安全 XMLSerializer；無 foreignObject／script／user styles／圖片／links／外部 refs／新繪圖依賴，不放寬 CSP。圖內捲動、25–200% zoom、適合寬度、鍵盤來源選取與文字文件替代。完整圖及匯出保留所有接受 tables／columns／PK／FK／ordered register／綁定狀態，固定11–18px字級，長名稱分行不截斷。XML 不可表達的 control code units／lone surrogates 顯示為明確 Unicode escapes，原始來源與 JSON summary 身分不變。Renderer 另有限2M display units／100K lines，超限明示不提供截斷 SVG，文字文件／摘要仍可查看。

SVG 含可讀 metadata、coverage／diagnostic count 與 partial／invalid 不完整 legend，不含 raw SQL/default/literals/comment body／來源 snippets。摘要只按明確同意後 lazy 呼叫 `exportSqlDdlSummary`，不 stringify report/rawfallback。名稱／型別仍敏感，不是匿名化；SVG/summary獨立下載，BlobURL1秒／reset／dispose／failure回收，晚到 helper 不恢復舊下載。Synthetic qualified/self/composite/candidate/unsupported/lexical/invalid/limit/hostile案例及證據見 `docs/validation/stw-13/README.md`。

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

網站在網域根路徑提供十五個 SSG HTML，Cloudflare 使用 trailing-slash 正規化；未知網址與不存在的 JS chunk 回真正的 404，不以首頁 200 回應。十五頁 canonical、sitemap 與 robots 指向 `tools.sid.tw`。正式 `pages.dev` 網址透過 Cloudflare Bulk Redirect 以 301 導向正式網域，保留路徑與查詢參數；預覽網址使用 Pages 預設 `X-Robots-Tag: noindex`，避免多個可收錄的公開入口。

`sid.tw` 帳號既有 Cloudflare Web Analytics 自動安裝涵蓋子網域；沿用「排除歐盟訪客」偏好，不新增重複 beacon。CSP 僅允許官方 beacon script 與指定 RUM 端點；本機無 beacon，測試仍檢查輸入不上傳。正式站頁面瀏覽與效能會送出基本統計，工具輸入、檔案、處理結果留在瀏覽器。

基本報告可查看 page views、visits、熱門路徑、來源、國家、瀏覽器／裝置與 Core Web Vitals。Edge 請求數包含靜態資源及機器流量，不能當成人數；Web Analytics 可能被阻擋或因排除歐盟而少算。沒有自訂事件、工具成功率、UTM 歸因或 Google 關鍵字排名資料。官方說明：[Web Analytics](https://developers.cloudflare.com/web-analytics/)、[SPA 與 CSP FAQ](https://developers.cloudflare.com/web-analytics/faq/)。

## 題目與研究

產品方向為多合一工具站獲取流量，不限制族群，以可驗證的機會優先。依使用者後續授權完成第一階段 STW-34、STW-16、STW-3、STW-5；其他候選維持研究狀態。功能交付不表示已驗證搜尋流量或獨特競爭優勢。

- [產品方向](docs/product-direction.md)
- [STW-34／STW-16 競品實測與搜尋量](research/competitor-validation-2026-10-14/README.md)
- [整體題目決策](research/tool-portfolio-review-2026-10-14/demand-review.md)
- [原始關鍵字與題目池](research/keyword-review-2026-10-04/README.md)

卡片只透過 Backlog CLI 維護，請遵循 [AGENTS.md](AGENTS.md)。
