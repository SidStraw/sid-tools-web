# 核心工具候選：需求與競爭第二輪查證

查證日期：2026-10-14（Asia/Taipei）。本檔涵蓋 STW-3、5、6、16、17、34、35、37；資料結構版見同目錄 `demand-existing-core.json`。未修改卡片、未實作工具。

## 結論

這 8 項目前沒有足夠證據可直接定為 High。STW-16、34 的具體流程痛點較清楚；STW-3、5 也有真實問題，但原差異主張已有產品直接覆蓋。建議這 4 項先列 Medium 驗證。STW-6、17、35、37 列 Low，先退出近期主力開發序列；若能證實新差異再重評。

不能從「很多工具存在」推論流量大，也不能從「有競品」推論沒價值。這輪的降級理由是：原主張已被產品覆蓋、還沒有獨立增量或低成本取得流量的證據。

## 方法與限制

- 每候選做英文精確意圖與繁中各至少 1 次搜尋，以下列出實際 query 與代表結果。查詢批次時間窗為 2026-10-14 19:58:10–20:00:51（Asia/Taipei），來源開頁核對接續進行；沒有記錄每個請求的精確秒數。
- 未設定國家／城市。繁中 query 不代表台灣 Google 搜尋結果；以下為 web 工具當次回傳樣本，不當作穩定排名。
- 只有官方產品頁、官方 repo／論壇使用者 issue、自述者原文用來支持判斷。搜尋結果型態列出的其他頁只供競爭線索。
- 無月搜尋量、CPC、CTR、網站自然流量、付費資料來源登入、真人訪談或 AI 工作流程對照實測。
- `first_party_user_issue` 表示當事人發在專案自己的 tracker；其使用者身分與敘述未獨立核實。單筆 issue 只能證明有人碰過問題。
- 官方產品文案不等於 runtime 驗收；本輪未操作所有 UI 或上傳測試檔。沒有用競品故障舊 issue 宣稱其現在仍失效。

## 比較摘要

| 卡片 | 需求線索 | 競爭覆蓋 | 建議 |
|---|---|---|---|
| STW-3 API JSON diff | Medium | High：ID 配對、忽略路徑、本機處理、匯出皆已有產品頁明示。 | Medium |
| STW-5 Cron 時區與 DST 預覽 | Medium | High：時區、下次執行與 DST 邊界已有專門產品；跨 runtime 正確性尚不能視為已解決。 | Medium |
| STW-6 OpenAPI breaking changes | Medium for correctness; Weak for new web demand | High：oasdiff 已有 Web、報告匯出與 CI；另有本機處理產品聲明，但本輪未驗證。 | Low |
| STW-16 Lighthouse 報告比較 | Medium-Strong for reporting workflow | High for two-report diff；多頁彙整有明確近期請求，競品完整覆蓋待測。 | Medium |
| STW-17 Sitemap 驗證 | Weak-Medium | High for XML、重複 URL 與報告；本機規則驗證不是搜尋收錄診斷。 | Low |
| STW-34 批次圖片目標大小壓縮 | Strong for concrete pain; market size unknown | High：繁中產品已標示批次、指定 KB、無需安裝與本機處理。 | Medium |
| STW-35 色票、對比與 design tokens | Weak-Medium | High：對比矩陣、CSS/JSON/DTCG 匯出與本機保存已有產品。 | Low |
| STW-37 SemVer 視覺化 | Medium for explanation; Weak for standalone site | High for range testing；交集工具亦出現在搜尋，完整語意待驗證。 | Low |

## 個別證據

### STW-3 API JSON diff

**建議：Medium。** 保留需求研究，原版功能沒有證實差異；先測複合鍵、各層不同配對規則與大整數保真是否形成具體缺口。

需求線索：Medium。競爭覆蓋：High：ID 配對、忽略路徑、本機處理、匯出皆已有產品頁明示。

AI 替代判斷：小份 JSON 摘要高；精確重跑與大型差異探索中。尚未實測 AI。 此為分析判斷，非實測。

- [來源 1：first_party_user_issue](https://github.com/benjamine/jsondiffpatch/issues/436)；來源日期：2026-01-28。使用者以 JSON 表示 OOXML；插入段落造成後續巨量差異，資料缺乏穩定 ID，objectHash 套所有陣列仍不合需求。
  證據限制：具體且近期，但屬 OOXML 深巢狀資料，不等同一般 API 的 ID 配對需求，也未證明願意使用新網站。
- [來源 2：first_person_maker_post](https://www.reddit.com/r/json/comments/1olq5tz/json_comparer_that_correctly_matches_arrays/)；來源日期：頁面只顯示 1y ago；未精確化。作者自述工作常比 JSON，現有工具對重排陣列產生錯誤差異，因此自己製作工具；貼文含可重述範例。
  證據限制：有自身痛點亦有產品宣傳偏誤，不是獨立市場規模證據。
- [來源 3：official_product_page](https://ravensmove.com/tools/json-diff)；來源日期：未確認。產品已提供 record ID、wildcard 忽略路徑、重複 ID 錯誤、規則與差異匯出、本機處理；報告上限 1,000 列。
  證據限制：官方功能聲明與頁面欄位，未執行正確性及網路測試。
- [來源 4：official_product_page](https://www.m2toolkit.com/tools/json-diff)；來源日期：2026-10-10。提供依鍵配對、忽略路徑、三種檢視、文字／PDF 匯出、本機處理及大整數警告。
  證據限制：更新日是頁面自述；未驗證效能。

實際搜尋紀錄：

- Query：`JSON diff ignore fields match array by id online tool user issue`。時間與地區限制同上。
  - [JSON Diff Tool - Compare JSON Online | RavensMove](https://ravensmove.com/tools/json-diff)（產品或內容頁）；僅代表本次結果樣本。
  - [Compare JSON Online – JSON Diff Checker | NeatJSON](https://neatjson.com/json-diff-checker)（產品或內容頁）；僅代表本次結果樣本。
  - [JSON Diff — Compare Two JSON Files Online | M2Toolkit](https://www.m2toolkit.com/tools/json-diff)（產品或內容頁）；僅代表本次結果樣本。
- Query：`JSON 比較 忽略 欄位 陣列 ID 工具`。時間與地區限制同上。
  - [JSON 比對線上 - 兩份 JSON 差異比較（JSON Diff，忽略欄位順序）| 奧特線上工具](https://autoagent.com.tw/tools/json-compare)（產品或內容頁）；僅代表本次結果樣本。
  - [JSON Compare - Diff Two JSON Files Online | JSON Lab](https://www.thejsonlab.com/)（產品或內容頁）；僅代表本次結果樣本。
  - [JSON Compare / Diff + Patch | 僅瀏覽器語意比較與補丁匯出](https://finitefield.org/zhtw/tools/data/json-diff-viewer/)（產品或內容頁）；僅代表本次結果樣本。

### STW-5 Cron 時區與 DST 預覽

**建議：Medium。** 保留特定 scheduler／版本驗證方向，通用時區加日曆版降級。近期 runtime 錯誤是真痛點，但預覽工具必須能說明適用範圍。

需求線索：Medium。競爭覆蓋：High：時區、下次執行與 DST 邊界已有專門產品；跨 runtime 正確性尚不能視為已解決。

AI 替代判斷：基本解釋高；跨時區互動與可重現邊界檢查中。 此為分析判斷，非實測。

- [來源 1：first_party_user_issue](https://github.com/NousResearch/hermes-agent/issues/66436)；來源日期：2026-07-17。回報 IANA 時區下跨 DST 計算使預定 09:00 變成 10:00，附 croniter 重現程式與實際 jobs.json。
  證據限制：單一 runtime 的錯誤，不能推定所有 scheduler 仍有問題，也不直接證明獨立網站需求。
- [來源 2：official_product_page](https://cronwizard.com/dst)；來源日期：2026-08-05。有 Cron expression、時區、Unix／Quartz 選項及春秋 DST 邊界預覽；明示只反映自身 parser 政策。
  證據限制：官方功能說明；未實跑每種 runtime。
- [來源 3：official_product_search_result](https://cron.dag.io/)；來源日期：未確認。搜尋回傳可選時區、起始日期及 local／UTC next runs 的產品頁。
  證據限制：只作結果型態紀錄，未另開頁實測。

實際搜尋紀錄：

- Query：`cron timezone daylight saving preview next execution user issue`。時間與地區限制同上。
  - [Cron · dag.io — Preview cron schedules across time zones](https://cron.dag.io/)（產品或內容頁）；僅代表本次結果樣本。
  - [Desktop automations ignore timezone for RRULE scheduling / next execution · Issue #26633 · openai/codex · GitHub](https://github.com/openai/codex/issues/26633)（GitHub issue）；僅代表本次結果樣本。
  - [bug: cron wall-clock hour shifts across DST boundary · Issue #66436 · NousResearch/hermes-agent · GitHub](https://github.com/NousResearch/hermes-agent/issues/66436)（GitHub issue）；僅代表本次結果樣本。
- Query：`cron 時區 夏令時間 下次執行 工具`。時間與地區限制同上。
  - [Cron Calculator & Editor - visualize, debug & build cron expressions | CronTool](https://tool.crontap.com/)（產品或內容頁）；僅代表本次結果樣本。
  - [免費 Cron 表達式產生器 - 視覺化建構 Crontab 排程任務 · ClockZone](https://clockzone.net/zh-TW/tools/cron-generator)（產品或內容頁）；僅代表本次結果樣本。
  - [免費 Cron 表達式編輯器與下次執行時間 - Design Drifter Tools](https://design-drifter.com/zh-tw/tools/cron-editor/)（產品或內容頁）；僅代表本次結果樣本。

### STW-6 OpenAPI breaking changes

**建議：Low。** 先排除泛用 Web wrapper 作近期主力。若要升級，需用真實 consumer／規格證明既有引擎漏判或流程成本。

需求線索：Medium for correctness; Weak for new web demand。競爭覆蓋：High：oasdiff 已有 Web、報告匯出與 CI；另有本機處理產品聲明，但本輪未驗證。

AI 替代判斷：小規格摘要高；有版本化規則與可定位結果中低，維護成本高。 此為分析判斷，非實測。

- [來源 1：first_party_user_issue](https://github.com/OpenAPITools/openapi-diff/issues/192)；來源日期：2020-10-23。使用者回報只將 schema 重構為 $ref／allOf，語意不變卻被判 breaking，附新舊規格與期望結果。
  證據限制：舊問題，只能證明正確性需求，不能宣稱現今未修復或另引擎有相同錯誤。
- [來源 2：official_product_page](https://www.oasdiff.com/diff)；來源日期：未確認。提供貼上／上傳兩份規格、breaking change 比對及 text/YAML/JSON/Markdown/HTML 匯出，FAQ 宣稱 entirely in browser。
  證據限制：與首頁 server-side 說明矛盾；處理位置待網路實測，不能以本機處理作已確認差異。
- [來源 3：official_product_page](https://www.oasdiff.com/)；來源日期：未確認。首頁宣稱 Web 結果在伺服器處理且不儲存，同引擎亦提供 CLI 與 GitHub Action。
  證據限制：與 /diff FAQ 不一致。
- [來源 4：official_product_search_result](https://a2z.tools/openapi-specification-diff-checker)；來源日期：未確認。搜尋摘錄聲稱瀏覽器端比對、Markdown changelog、限制 2 MB 與本機 $ref。
  證據限制：直接開頁逾時，僅線索，不用於確認 runtime 能力。

實際搜尋紀錄：

- Query：`OpenAPI breaking changes compare online tool issue false positive`。時間與地區限制同上。
  - [OpenAPI Diff Tool: Compare Specs Online & Find Breaking Changes](https://www.oasdiff.com/diff)（產品或內容頁）；僅代表本次結果樣本。
  - [OpenAPI Diff — Compare Specs & Breaking Changes, Free Online | space4.dev](https://space4.dev/openapi-diff)（產品或內容頁）；僅代表本次結果樣本。
  - [OpenAPI & JSON Schema Diff — Free Online Tool — Chaitanya Prabuddha](https://tools.chaitanyaprabuddha.com/tools/openapi-breaking-changes)（產品或內容頁）；僅代表本次結果樣本。
- Query：`OpenAPI 差異 比較 breaking changes 工具`。時間與地區限制同上。
  - [Compare two OpenAPI specifications · utils/tools](https://utils.tools/openapi-diff)（產品或內容頁）；僅代表本次結果樣本。
  - [OpenAPI Diff Tool: Compare Specs Online & Find Breaking Changes](https://www.oasdiff.com/diff)（產品或內容頁）；僅代表本次結果樣本。
  - [OpenAPI Diff Checker — Free Online Tool | DevLab](https://devlab.tools/tool/openapi-diff-checker)（產品或內容頁）；僅代表本次結果樣本。

### STW-16 Lighthouse 報告比較

**建議：Medium。** 八項中值得優先細化的需求之一。改驗證多頁矩陣／報告相容與比較可信度，不能只重做官方兩檔 diff。

需求線索：Medium-Strong for reporting workflow。競爭覆蓋：High for two-report diff；多頁彙整有明確近期請求，競品完整覆蓋待測。

AI 替代判斷：單份報告說明高；多份檔案標準化、異常定位與視覺比較中。 此為分析判斷，非實測。

- [來源 1：first_party_user_issue](https://github.com/GoogleChrome/lighthouse-ci/issues/1101)；來源日期：2025-04-24。使用者選取兩份 JSON 後白畫面，期望得到可比較的 PDF 報告。
  證據限制：未附完整 fixture，本輪未重現，不能宣稱現今官方工具普遍失效。
- [來源 2：first_party_user_feature_request](https://github.com/GoogleChrome/lighthouse-ci/issues/1132)；來源日期：2026-02-27。要求多頁 scores 矩陣、跨專案聚合與摘要；明言現有介面較適合單 URL 與 before/after。
  證據限制：單一使用者提案，沒有市場規模或付費訊號。
- [來源 3：official_product_page](https://googlechrome.github.io/lighthouse-ci/difftool/)；來源日期：未確認。Google 官方已有兩份 Lighthouse 報告比較工具；直接文字讀取要求 JavaScript。
  證據限制：未操作 UI；功能存在由官方 repo／搜尋頁支撐，不能確認目前每個版本相容性。
- [來源 4：official_product_docs](https://github.com/googlechrome/lighthouse-ci)；來源日期：未確認。官方描述 CI 比較、歷史追蹤、budget 與多次執行降低變異。
  證據限制：代表產品基準，未做 runtime 驗證。

實際搜尋紀錄：

- Query：`Lighthouse compare two reports online tool performance regression issue`。時間與地區限制同上。
  - [GitHub - texastribune/lighthouse-compare: Compare the Lighthouse performance of two URLs · GitHub](https://github.com/texastribune/lighthouse-compare)（產品或內容頁）；僅代表本次結果樣本。
  - [Lighthouse Report Viewer](https://googlechrome.github.io/lighthouse/viewer/)（產品或內容頁）；僅代表本次結果樣本。
  - [Lighthouse Diff: Comparing Two Website Speed Tests | PageSpeed.ONE](https://pagespeed.one/en/know-how/lighthouse-diff)（產品或內容頁）；僅代表本次結果樣本。
- Query：`Lighthouse 報告 比較 前後 效能 工具`。時間與地區限制同上。
  - [Lighthouse：优化网站  |  Chrome DevTools  |  Chrome for Developers](https://developer.chrome.google.cn/docs/devtools/lighthouse?hl=zh-cn)（官方文件）；僅代表本次結果樣本。
  - [Lighthouse：最佳化網站  |  Chrome DevTools  |  Chrome for Developers](https://developer.chrome.google.cn/docs/devtools/lighthouse?hl=zh-tw)（官方文件）；僅代表本次結果樣本。
  - [Compare two Lighthouse runs and see exactly what changed | Lighthouse AI Metrics](https://www.lighthouse-aimetrics.com/compare-lighthouse-runs)（產品或內容頁）；僅代表本次結果樣本。

### STW-17 Sitemap 驗證

**建議：Low。** 排除只有格式驗證／去重的近期主力版本。較深網站上線健檢須另證需求、抓取成本與邊界，不能直接擴大實作。

需求線索：Weak-Medium。競爭覆蓋：High for XML、重複 URL 與報告；本機規則驗證不是搜尋收錄診斷。

AI 替代判斷：小段 XML 找錯高；大檔、批次 URL 與可定位報告中。 此為分析判斷，非實測。

- [來源 1：first_party_user_issue](https://www.drupal.org/project/simple_sitemap/issues/3178229)；來源日期：2020-10-21。使用者要保留同 path 不同 query 的合法 URL，現有去重錯刪；另一使用者提供測試與自身嵌入頁用途。
  證據限制：歷史問題已有修正紀錄，說明誤去重風險，不證明現今缺少獨立驗證器。
- [來源 2：official_product_page](https://ai-chain.tw/tools/sitemap-validator/)；來源日期：未確認。繁中產品已有 urlset／index、錯誤警告列表、URL 預覽與複製報告；明示不保證收錄。
  證據限制：未操作所有檢查。
- [來源 3：official_product_search_result](https://freetooldev.com/tools/sitemap-validator.html)；來源日期：未確認。搜尋回傳批次多 sitemap 的規則驗證產品頁。
  證據限制：僅搜尋摘錄，未確認實際批次解析正確性。

實際搜尋紀錄：

- Query：`sitemap validator bulk duplicate urls user problem`。時間與地區限制同上。
  - [Sitemap Validator: Check Your XML Sitemap Free | Veritas](https://www.getveritas.io/tools/sitemap-validator)（產品或內容頁）；僅代表本次結果樣本。
  - [Bulk Sitemap Validator — Check Multiple sitemap.xml at Once | FreeToolDev](https://freetooldev.com/tools/sitemap-validator.html)（產品或內容頁）；僅代表本次結果樣本。
  - [XML Sitemap Validator — Find Sitemap Errors Free | SEOJuicer](https://seojuicer.com/sitemap-checker)（產品或內容頁）；僅代表本次結果樣本。
- Query：`sitemap 驗證 重複網址 工具`。時間與地區限制同上。
  - [Sitemap 驗證器 - 檢查 XML 結構、重複 URL 與索引建議 | AI-Chain Tools](https://ai-chain.tw/tools/sitemap-validator/)（產品或內容頁）；僅代表本次結果樣本。
  - [Sitemap 驗證器 | Searvora](https://searvora.com/tw/tools/sitemap-validator)（產品或內容頁）；僅代表本次結果樣本。
  - [Sitemap Validator — Check XML URLs, lastmod, and Duplicates | ToolsKit](https://toolskit.cc/tools/sitemap-validator)（產品或內容頁）；僅代表本次結果樣本。

### STW-34 批次圖片目標大小壓縮

**建議：Medium。** 需求最具體之一，但差異已被覆蓋。保留限時比較測試，須證明同大小畫質、透明／方向保留、批次失敗回報或操作效率勝過現有工具。

需求線索：Strong for concrete pain; market size unknown。競爭覆蓋：High：繁中產品已標示批次、指定 KB、無需安裝與本機處理。

AI 替代判斷：純問如何壓縮高；多檔產物、達標檢查、可預覽流程中低，但 AI 執行環境也能處理。 此為分析判斷，非實測。

- [來源 1：first_party_user_feature_request](https://github.com/GoogleChromeLabs/squoosh/issues/1422)；來源日期：2024-07-09。使用者明確要求 100 KB 或原圖百分比目標，自動找 quality，避免跨 codec 手動反覆試誤；達不到需回報。
  證據限制：單一產品中的需求，未證明現今其他工具無解；2024 年來源需重新訪談。
- [來源 2：first_party_user_feature_request](https://github.com/GoogleChromeLabs/squoosh/issues/1153)；來源日期：2021-09-13。使用者批次處理多資料夾，每個尺寸×格式×資料夾需分別執行 script。
  證據限制：CLI 歷史流程需求，不直接等於 Web 批次 KB 需求；已 closed as not planned。
- [來源 3：official_product_page](https://imagekit.lzw.me/zh-TW/compress-image-to-kb)；來源日期：未確認。繁中產品頁明示批次指定 KB／MB、JPG/PNG/BMP、免費與本機處理。
  證據限制：應用區顯示 Loading，未驗證實際達標、品質與網路行為。
- [來源 4：official_product_search_result](https://compress-picture.com/compress-image-to-100kb)；來源日期：未確認。搜尋回傳 100 KB 目標、最多 30 張批次、本機 Canvas 的產品頁。
  證據限制：僅結果線索，未做檔案實測。

實際搜尋紀錄：

- Query：`batch image compress target file size 100kb user need`。時間與地區限制同上。
  - [Compress Image to Exact KB — Free, Private, No Upload | Zorqio](https://zorqio.com/compress-image-to-kb/)（產品或內容頁）；僅代表本次結果樣本。
  - [How to Compress an Image to 100KB (Free, In Browser)](https://mumenlabs.com/blog/how-to-compress-an-image-to-100kb)（產品或內容頁）；僅代表本次結果樣本。
  - [Compress Image to 100KB Online for Free — Compress Picture](https://compress-picture.com/compress-image-to-100kb)（產品或內容頁）；僅代表本次結果樣本。
- Query：`批次 圖片 壓縮 指定大小 KB 工具`。時間與地區限制同上。
  - [图片压缩到指定大小 - 按指定 KB 压缩图片到目标大小 | PXBO工具箱](https://pxbo.com/tools/image-kb/)（產品或內容頁）；僅代表本次結果樣本。
  - [壓縮照片到指定大小 - Image Kit | 圖片批次處理工具箱](https://imagekit.lzw.me/zh-TW/compress-image-to-kb)（產品或內容頁）；僅代表本次結果樣本。
  - [图片指定大小压缩 - 压到指定KB/MB | 智能便民工具箱](https://www.itptg.com/tools/target-size-compressor.html)（產品或內容頁）；僅代表本次結果樣本。

### STW-35 色票、對比與 design tokens

**建議：Low。** 原通用流程已有直接覆蓋；目前需求主要來自工具作者自身敘述。可保留工具站輔助功能，但不當獨立優先流量項目。

需求線索：Weak-Medium。競爭覆蓋：High：對比矩陣、CSS/JSON/DTCG 匯出與本機保存已有產品。

AI 替代判斷：隨機配色與建議高；互動角色對比和確定性 export 中。 此為分析判斷，非實測。

- [來源 1：first_person_maker_readme](https://github.com/5t3ph/a11y-color-tokens)；來源日期：未確認。作者自述每次挑可及配色拖慢 side project，因此建立 token 及對比文件產生流程。
  證據限制：有自身痛點但屬產品作者、無可確認發表日期，不是獨立使用者訪談。
- [來源 2：official_product_page](https://colortable.org/palette/)；來源日期：未確認。提供所有色對矩陣、CSS/SCSS/JSON/DTCG 匯出、URL 分享、本機保存與對比修復入口。
  證據限制：文件功能已覆蓋主張；未驗證公式或輸出符合規範。
- [來源 3：official_product_search_result](https://palette.ikit.app/?lang=zh_TW)；來源日期：未確認。繁中搜尋回傳 OKLCH、品牌色階、WCAG 與 Tailwind 色票產品。
  證據限制：僅搜尋結果，未驗證介面與匯出。

實際搜尋紀錄：

- Query：`color palette contrast matrix design tokens export user need`。時間與地區限制同上。
  - [Palette Builder — Contrast and Export — ColorTable](https://colortable.org/palette/)（產品或內容頁）；僅代表本次結果樣本。
  - [Color Palette Generator and Design Token Export | HexCheck](https://hexcheck.app/palette/)（產品或內容頁）；僅代表本次結果樣本。
  - [Color Chart Tool | Ted Tschopp](https://tedt.org/tools/color-chart/)（產品或內容頁）；僅代表本次結果樣本。
- Query：`色票 對比 檢查 design tokens 匯出 工具`。時間與地區限制同上。
  - [Color Palette Generator — 線上 OKLCH 品牌與 Tailwind 色票產生器](https://palette.ikit.app/?lang=zh_TW)（產品或內容頁）；僅代表本次結果樣本。
  - [UI配色与Design Token工具 - 设计辅助/主题色生成在线](https://www.xingdian.net/app/color/design/)（產品或內容頁）；僅代表本次結果樣本。
  - [螢幕取色器 — 吸取螢幕任何位置的顏色 — ByteScope](https://bytescope.dev/zh-Hant/eyedropper/)（產品或內容頁）；僅代表本次結果樣本。

### STW-37 SemVer 視覺化

**建議：Low。** 不要因有真實困惑就升級主力。原版列為輔助／教學頁；只有相依衝突案例證明可減少誤判才重評。

需求線索：Medium for explanation; Weak for standalone site。競爭覆蓋：High for range testing；交集工具亦出現在搜尋，完整語意待驗證。

AI 替代判斷：^/~ 解說高；npm 精確規則運算與互動邊界中，但 CLI 已可執行。 此為分析判斷，非實測。

- [來源 1：first_party_user_issue](https://github.com/npm/node-semver/issues/721)；來源日期：2024-06-17。使用者多次讀文件仍不理解 prerelease range，附實際命令；2025 年維護者指出外部視覺化工具與 node-semver 行為不一致。
  證據限制：證實理解與可信度痛點，不證明新網站需求或搜尋量；不代表 AI 必定答錯。
- [來源 2：official_product_page](https://semver.npmjs.com/)；來源日期：未確認。npm 官方已有套件名稱與 version range 的版本列表工具。
  證據限制：本次未送出查詢；不推定涵蓋所有互動教學需求。
- [來源 3：official_product_search_result](https://www.devtools.tools/semver-range-intersection)；來源日期：未確認。搜尋回傳 SemVer range intersection 產品頁。
  證據限制：只證實候選競品存在，不能確認功能品質。

實際搜尋紀錄：

- Query：`semver range visualizer intersection prerelease user issue`。時間與地區限制同上。
  - [[BUG]semver.Range returns pre-release version even when includePrerelease is set to false · Issue #396 · npm/node-semver · GitHub](https://github.com/npm/node-semver/issues/396)（GitHub issue）；僅代表本次結果樣本。
  - [[QUESTION] Very confusing behavior for pre-release range matching · Issue #721 · npm/node-semver · GitHub](https://github.com/npm/node-semver/issues/721)（GitHub issue）；僅代表本次結果樣本。
  - [Check Version Against Semver Range · public.tools](https://public.tools/semver-checker)（產品或內容頁）；僅代表本次結果樣本。
- Query：`SemVer 版本 範圍 視覺化 工具`。時間與地區限制同上。
  - [SemVer 版本范围测试器 — 校验 ^ 与 ~ 范围 | Souus Tools](https://toolbox.souus.com/zh/semver-range-tester/)（產品或內容頁）；僅代表本次結果樣本。
  - [Semver 工具（解析、比较、版本号递增） · AZ Tools](https://aztools.app/zh/t/semver-tools/)（產品或內容頁）；僅代表本次結果樣本。
  - [SemVer 语义化版本工具 - npm 版本范围检查、比较排序、版本递增 | 祈灵工具箱](https://qilingtools.com/zh/semver)（產品或內容頁）；僅代表本次結果樣本。

## 修正第一輪假設

1. JSON diff 的 ID 配對、忽略路徑、重複 ID 錯誤與本機匯出，已能在現有產品頁找到，不再當成已知缺口。
2. Cron DST 邊界預覽已有專門工具。真正要驗的是具體 scheduler／版本的語意，不是再做一般時區選單。
3. 指定 KB＋批次＋繁中＋本機處理已被 Image Kit 等產品聲明覆蓋；需比較實際產物與操作成本。
4. Lighthouse 兩份報告比較已有 Google 官方工具，近期多頁 matrix 請求比重做雙檔比較更值得研究。
5. oasdiff 首頁聲稱 server-side，`/diff` FAQ 卻稱 entirely in browser。處理位置尚未核實，不可宣稱「本機處理」是其缺口。

## 後續升級門檻

Medium 是驗證順序，不是立即實作授權。用 3–5 份真實情境輸入比較現有產品與 AI：能否完成、操作次數、時間、錯誤與輸出可採用性。只有證明可重複的增量，再討論 High。Low 項目保留證據，不以推測永久否定；若只有格式轉換／說明，適合作共用附屬功能。

