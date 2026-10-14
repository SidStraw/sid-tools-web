# 工具候選競爭基準與差異假設

查證日期：2026-10-14（Asia/Taipei）。範圍：7 類既有候選，12 個成功讀取的第一手頁面。這是功能與產品切入點研究，沒有量測搜尋量、流量、轉換率或真人使用成效，也沒有修改 Backlog。

## 判讀方式

「已證實」指官方文件描述的能力，未代表本次操作過產品或驗證其所有宣稱。「待驗證」是產品假設，不能寫成競品缺少的能力。AI 替代風險是依工作流程提出的判斷，沒有做各模型對照實驗。AI 能產生程式碼或操作工具，與使用者願意每次上傳、說明、等待並檢查結果，是不同成本；因此不能僅以「AI 做得到」排除工具。

**建議驗證順序：API JSON 比對、Cron 時區預覽、圖片目標大小批次處理優先做小規模需求驗證；OpenAPI、Sitemap 保留但收窄；DDL ER 圖、EXPLAIN 與單純 SemVer 解說暫緩做主力流量產品。這是產品價值假設排序，不是已驗證的 SEO 排序。**

## 1. API JSON diff：忽略動態欄位、按 ID 對齊

**已證實：** jsondiffpatch 可在瀏覽器與伺服器執行；`objectHash` 可讓陣列內物件以 ID 等識別值配對；`propertyFilter` 可忽略易變欄位；另有移動偵測、HTML 視覺輸出與 JSON Patch。因此這兩項演算法能力已有現成基準。[jsondiffpatch 官方 README](https://github.com/benjamine/jsondiffpatch)

**待驗證差異：** 不寫程式即可逐層指定配對鍵、忽略 JSON path、保存 API 情境設定，清楚區分「已忽略」「值改變」「移動」「刪除」，並對重複／缺少 ID 給可定位錯誤。需實際測競品介面及訪談使用者，不能從函式庫文件推論所有網站都沒有這些操作。

**AI 風險與建議：** 小份 JSON 的口頭摘要替代風險高；大量巢狀資料的確定性比對、可重跑規則與檔案匯出較有工具價值。保留作優先驗證候選，但主打「減少 API 回歸比對雜訊」；若只有雙欄貼上與摘要，降級。

## 2. Cron 時區、DST 與執行時間預覽

**已證實：** crontab.guru 定位為 Cron expression 編輯器。Croner 已能列出接下來的執行時間，支援瀏覽器及具名時區；其設定文件明確指出固定 `utcOffset` 不處理日光節約時間，建議使用 `timezone`。[crontab.guru](https://crontab.guru/)、[Croner 概覽](https://croner.56k.guru/)、[Croner 設定](https://croner.56k.guru/usage/configuration/)

**待驗證差異：** 同畫面列出排程時區、使用者時區與 UTC，展示跨 DST 切換的時間軸與間隔異常。必須限定 scheduler 語意／版本，驗證不存在與重複的當地時間如何處理；不能只套單一函式庫就宣稱適用所有 Cron 平台。本次讀取的頁面未足以證實 Croner 對每種 DST 邊界的精確政策。

**AI 風險與建議：** 單純「這段 Cron 什麼意思」風險高；互動更換時區、指定跨 DST 區間、反覆核對實際日期較適合確定性工具。優先驗證「部署前排程檢查」，不主打自然語言產生 Cron。

## 3. 批次圖片目標大小壓縮

**已證實：** Squoosh 支援多種格式的圖片壓縮，官方明言圖片壓縮在本機完成、不送到伺服器。僅「瀏覽器壓縮」或「不必上傳圖片」不足以形成差異。[Squoosh 官方 README](https://github.com/GoogleChromeLabs/squoosh)

**待驗證差異：** 使用者設定每張圖的上限 KB／MB、最大尺寸、格式與透明需求，工具批次尋找可接受輸出並產生 ZIP，逐檔回報是否達標，不能達標時顯示原因。這份 README 未證實 Squoosh 是否具備目標大小批次流程，因此只能視為待測差異。應用真實素材測試畫質、EXIF 方向、透明、記憶體峰值與手機中斷恢復。

**AI 風險與建議：** AI 配合執行環境也能處理圖片；競爭點是直接拖入一批檔案、預覽、確認限制並取得結果的速度。保留作優先驗證候選，先找特定上傳限制情境；不要把一般壓縮當獨有功能。

## 4. OpenAPI breaking changes

**已證實：** oasdiff 官方提供 CLI、GitHub Action、免安裝 Web diff。Web 工具接受 YAML／JSON，可產生 breaking changes、changelog、raw diff 與並排檢視；網站宣稱結果在伺服器處理且不儲存。[oasdiff 官方網站](https://www.oasdiff.com/)

**待驗證差異：** 完整在瀏覽器比對敏感規格、限制在一個清楚的 OpenAPI 版本、提供具體受影響 request／response 範例，可能有價值；需要驗證引擎可移植性、跨檔 `$ref` 支援、規則覆蓋與效能。不能聲稱沒有免安裝競品，也不能只把 diff 翻譯成中文當唯一優勢。

**AI 風險與建議：** 簡短規格的變更解說容易被替代；有規則識別碼、穩定重跑、可定位且可匯出的正式比對較有保留價值。先做受限規格範圍與真人任務驗證，再承諾完整引擎；維護成本高於 JSON diff。

## 5. Sitemap 驗證

**已證實：** Sitemap 協定要求 UTF-8、XML escaping、必要的 `loc`，並規定 URL 與檔案容量限制；單檔上限為 50,000 URLs、解壓後 50 MB，超過時需拆分。官方提供 XML schema 驗證方式。[Sitemap 官方協定](https://www.sitemaps.org/protocol.html)

**待驗證差異：** 批次檢查 sitemap index、跨檔重複、格式錯誤定位與可下載修復清單；若加入 HTTP 狀態、redirect、canonical／noindex，已超出本機 XML 驗證，須另做遠端抓取與搜尋引擎規則研究。本次未盤點 Sitemap 商用競品，不能宣稱市場缺少此功能。

**AI 風險與建議：** 貼一小段 XML 找錯容易替代；大量網址、精確行號、重新驗證與可操作清單較有價值。保留「網站搬遷／上線前批次檢查」假設，先限制本機檔案範圍並量測規模；若只驗 XML 是否能解析，降級。

## 6. SQL DDL ER 圖與 PostgreSQL EXPLAIN

**已證實：** dbdiagram 可使用 DBML 即時產生 ER 圖，匯出 PDF／PNG 或產生 SQL；本次可讀來源未確認其 SQL DDL 匯入涵蓋範圍。PEV2 是 PostgreSQL execution plan 視覺化元件，提供可離線開啟的單一 HTML，也可嵌入其他 Web 應用程式；Dalibo 線上服務支援分享 plan。[dbdiagram 介紹](https://docs.dbdiagram.io/)、[dbdiagram 編輯體驗](https://docs.dbdiagram.io/basic-editing-experience/)、[PEV2 官方 README](https://github.com/dalibo/pev2)

**待驗證差異：** DDL 候選必須清楚定義 SQL 方言、無法解析時的提示與關聯保真度；可研究 schema 前後版本的關聯影響比較。EXPLAIN 可研究改善前後 plan 的可量化比較，但本次未驗證競品是否已提供。離線使用已有官方基準，不能當成獨有賣點。

**AI 風險與建議：** 少量 DDL 轉 Mermaid、單份 plan 自然語言解說風險高；大型互動圖與精確比較仍有工具空間，但 parser、版面與資料庫語意成本高。暫緩作第一波主力；除非取得特定資料庫使用者反覆遇到的明確缺口。不要把 DDL 與 EXPLAIN 視為同一任務，前者是結構，後者是查詢執行。

## 7. SemVer 視覺化

**已證實：** npm 已提供輸入套件與版本範圍的 SemVer Calculator。`node-semver` 官方文件定義版本範圍、交集、`^`、`~` 與 prerelease 排除規則，並有 `satisfies`、`intersects` 等 API。[npm SemVer Calculator](https://semver.npmjs.com/)、[node-semver 官方 README](https://github.com/npm/node-semver)

**待驗證差異：** 多個相依版本範圍交集、為何特定版本不被接受、`0.x` 與 prerelease 的可點選案例，比單純輸入一個 range 更值得驗證。若查 npm 即時版本，應區分 registry 資料時間與純 SemVer 規則；範圍有交集也不等於套件實際相容。

**AI 風險與建議：** 單純說明 `^`／`~` 替代風險高，建議降為既有開發者工具群的輔助頁。只有出現「多套件相依衝突解析」的具體需求時，才升級研究；不能用視覺化本身推定有足夠流量。

## 共同驗證門檻

1. 為每個候選定義一個使用者、一次觸發事件、一份真實輸入及一個可下載／可採用的結果，避免泛稱「開發者會用」。
2. 以相同輸入比較現有工具、AI 工作流程與原型的完成時間、錯誤率、操作次數、重跑成本；AI 必須允許使用者實際會用的檔案與執行功能。
3. 將搜尋需求留為獨立證據：關鍵字量、搜尋結果型態與點進網站的必要性，不能以官方工具存在、GitHub 星數或搜尋排名代替。
4. 「本機處理」須以實作與網路行為驗證；「準確」須有邊界測試與版本資訊；「批次」須有真實規模和手機記憶體驗證。
5. 若差異只剩中文介面、AI 文案或基本格式轉換，先放入輔助功能，不當成獨立優先項目。若能證實特定受眾明顯省時，仍可重新提高優先序。

## 查證限制

本次以官方文件為主，沒有操作全部競品、跑 parser fixture、確認定價，也未取得搜尋需求資料。dbdiagram 舊 SQL 匯入 release-note URL 無法讀取，已改查目前官方介紹與編輯文件；因此保留 SQL 匯入細節為未知。所有「AI 風險」與排序均為待驗證判斷，不是實測成績。
