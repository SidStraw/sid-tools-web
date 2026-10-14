# STW-34 驗收紀錄

日期：2026-10-14。依使用者授權，以 mono-starter `c6d6f32854f6a8fd9f5d6cd4076475e4e9170af0` 初始化並完成第一個圖片工具。工具鏈全部 project-local；沿用範本 pnpm verify。

## 功能驗收

| AC                           | 客觀驗證                                                                                                                                        | 狀態                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 1 大小、尺寸、格式與逐檔達標 | production E2E 用三張真實圖片轉 WebP、100,000 bytes、1000×1000 上限，下載 ZIP 解壓並檢查實際 bytes、容器與解碼尺寸；另驗證 KB/KiB               | PASS                    |
| 2 透明、方向與動畫邊界       | 透明 WebP／PNG 解碼 alpha；未同意的透明 JPEG 拒絕、明確選白底後驗證白像素；EXIF 6 真實照片輸出方向；GIF/APNG 拒絕、WebP animation flag 單元測試 | PASS（Chrome headless） |
| 3 未達標原因與比較預覽       | 1 KiB PNG 顯示超出預算且可下載，無隱藏額外縮圖；預覽原圖與實際輸出載入；保留較小原檔並比對完整 bytes                                            | PASS                    |
| 4 限制、取消、清除及本機處理 | 31張拒絕、20MB單檔與100MB批次拒絕、像素限制；處理中取消／清除；處理與下載期間沒有非靜態資產 HTTP 請求                                           | PASS                    |

13 項單元／套件測試與 7 項真實瀏覽器測試。單元測試檢查容器安全與規則，E2E 檢查 production build；未用 mocked encoder 或快取結果替代實際 Canvas 編碼。瀏覽器測試掛在 `/sid-tools-web/` 子路徑，涵蓋 Worker 與資產路徑。

第一次完整驗收發現縮圖浮點邊界（1000成999）、測試載入102MB超過Playwright buffer限制、標題空白定位問題。分別修正產品尺寸捨入、以實體暫存檔載入、以正常化空白定位後通過。手機檢視另將設定移至結果清單前，避免加入大量圖片後無法快速找到開始按鈕。

首次 audit 發現 fflate 0.8.2 的 unzipSync malformed ZIP64 moderate 弱點（GHSA-px8p-9vwx-vf98）；產品只輸出 ZIP 但仍已更新到修補版 0.8.3，未降低檢查標準。最終完整驗收輸出保存在 [verify.txt](verify.txt)。

## 頁面與範圍

- [桌面結果](desktop-results.png)、[手機結果](mobile-results.png)：獨立 headless Chrome，公開測試素材。
- 圖片容器檢查支援 JPEG/PNG/WebP。動畫拒絕、JPEG白底需明確同意。方向遵循瀏覽器 createImageBitmap from-image；已測 EXIF 6，沒有假稱全部色彩／EXIF變體已覆蓋。
- 不保證PNG一定縮小或有損畫質完全一樣；無法達標仍保留檔案及原因。保留原檔時中繼資料也保留，UI會明示。
- 編碼結果依瀏覽器不同；Firefox、Safari與實體手機尚未實跑，不標為已驗收。
- 網站沒有上傳、登入或持久保存流程。無頭測試觀察處理期間僅載入靜態Worker程式，檔案沒有HTTP傳輸；不擴大宣稱瀏覽器／作業系統層級的全面隱私稽核。

## GitHub Pages

已建立 GitHub Actions workflow：Linux／macOS 完整驗收通過後上傳 `apps/web/dist` 並部署 Pages；PR不部署。官方Actions以SHA鎖定。

**遠端：待確認目標 repository。** 目前目錄原本沒有 remote，已詢問是否建立公開 `SidStraw/sid-tools-web`。在目標確認與實際部署成功之前，不將公開網址、遠端CI或Pages標為通過，STW-34保持In Progress。
