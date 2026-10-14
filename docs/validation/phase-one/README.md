# 第一階段四工具與 SSG + SPA 驗收

日期：2026-10-14。範圍：STW-34 回歸、STW-16、STW-3、STW-5，以及使用者追加的單一 SPA／按需載入／SSG 要求。使用獨立無頭 Chromium，沒有使用個人 Chrome 狀態。

## 本機結果：PASS

`PATH="$PWD/.toolchain/bin:$PATH" pnpm verify`：無任務快取，嚴格型別、格式、lint、建置、27 個單元／套件測試、18 個 production E2E 均通過；production audit 無已知漏洞。E2E 掛在 `/sid-tools-web/` 子路徑。

- Lighthouse：以研究階段真跑的 Chrome 文件 mobile A/B 報告匯入，Performance 69 → 67、delta −2；mobile／desktop 比較明示 formFactor／throttling 不同。下載保留原始值、條件、所有 audit 與缺值；測試版本、URL、不相容單位、失敗報告。單次結果不宣稱因果。
- JSON：實測相鄰不安全整數 9007199254740992／9007199254740993，顯示與下載不失真；新增／刪除／型別／值差異、忽略預覽、陣列 ID 重排、重複／缺少 ID、非法 JSON 定位、深度限制、原型同名鍵與 HTML 字串安全顯示通過。
- Cron：真實 parser 計算十次排程，兩個時區／UTC 同時刻；固定鐘點 DST 缺時延後、重複時段一次、31 日月份、閏年、DOM/DOW OR、非法方言與時區均有固定期望值。實際複製剪貼簿與 TXT 下載通過。
- 圖片：既有 7 項瀏覽器驗收全通過，包含真實編碼、ZIP 解碼、透明／EXIF、上限、取消與清除。
- SPA：所有工具在同一個 document 切換，保留 document 標記且沒有新的 document request；上一頁／下一頁、直接網址、重整、處理中離開及回到空白工具通過。刻意延遲第一個路由後選第二個，晚到結果不覆蓋最後選擇。
- SSG：停用 JavaScript 後四個網址仍回 200、具完整 H1／工具說明與四個真實選單連結。
- 載入：首頁不下載 Lighthouse／JSON／Cron 程式；Cron 計算 Worker 到按執行才載入。模擬 lazy chunk 斷線，錯誤提示及使用者觸發的文件重載恢復通過。瀏覽器快取失敗 import，因此沒有採取無效的同 URL import 重試。
- 隱私／手機：觀測無資料上傳、無 localStorage/sessionStorage 資料；清除／修改後結果失效。390 px 手機沒有頁面水平溢出，表格在自身容器水平捲動。

## 靜態建置大小（未 gzip）

共用路由約 5.8 KB JS、共用 CSS 約 18.7 KB。圖片 route 約 27.8 KB（包含畫面與 ZIP 控制）；另外三個 route 各約 3.1–3.7 KB，重用約 7 KB 控制程式。圖片 Worker 約 5.1 KB；其他工具 dispatcher 約 0.7 KB，按實際工具再載入 Lighthouse 約 3 KB、JSON 約 11.3 KB 或 Cron 約 100.5 KB。數字為本輪 build 輸出，不是使用者網路延遲量測。

## 畫面

- [圖片桌面](images-desktop.png)
- [Lighthouse 桌面](lighthouse-desktop.png)
- [JSON 桌面](json-diff-desktop.png)
- [JSON 手機](json-diff-mobile.png)
- [Cron 桌面](cron-desktop.png)
- [畫面 smoke 原始結果](visual-smoke.json)

桌面與手機截圖已目視檢查。Lighthouse 畫面內示範為人造資料；真實報告匯入另由 E2E 驗證，兩者未混稱。

## 遠端驗收

PASS：功能 commit `ceb5f508decc8c1f1c5d95cc5184674c76db9e18` 已由 [GitHub Actions run 38577696921](https://github.com/SidStraw/sid-tools-web/actions/runs/38577696921) 完成 Linux／macOS 驗收及 GitHub Pages 發佈。

2026-10-14 14:10:33 UTC 在 [公開站](https://sidstraw.github.io/sid-tools-web/) 用獨立無頭 Chromium 實測：

- 四個 route 直接 HTTP 請求皆 200，回傳含完整 H1 與工具內容的 SSG HTML。
- 頁面選單循序使用四工具，document 保持同一份；前後頁與 Cron 深層網址重整正常。
- 真實 PNG 處理與下載成功；真實 mobile／desktop Lighthouse 報告輸出 +16 分且明示三種條件不同，沒有把差異稱為改善。
- JSON 下載保留 `9007199254740993` 原始數值與忽略路徑；Cron 下載與剪貼簿均含排程時區，DST 缺時 UTC `2026-03-08T07:30:00.000Z` 符合期望。
- 手機 390 px 無頁面水平溢出；無 pageerror、無上傳請求、無瀏覽器持久儲存。

原始紀錄：[public-smoke.json](public-smoke.json)；畫面：[公開站 JSON 桌面](public-json-desktop.png)、[公開站 Cron 手機](public-cron-mobile.png)。

功能交付不代表 SEO 搜尋量、排名、流量或使用者價值已驗證；本輪未擴張候選池。
