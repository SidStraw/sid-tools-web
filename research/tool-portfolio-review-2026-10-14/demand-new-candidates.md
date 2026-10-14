# 六個新候選：搜尋需求與競爭反證

研究：2026-10-14，查詢時間 11:58:17–12:04:18 UTC（台灣 19:58:17–20:04:18）。只做研究，不修改 Backlog。

**結論：本輪零新增。** 需求事件存在，但原先提出的差異多已被免費競品列為功能；未取得可重現的競品失敗，亦沒有搜尋量或可獲取流量證據。本報告取代 `new-opportunities.md` 中較早的研究排序及差異假說；不再因開發者或一般辦公族群而給優先權。

這次用 web.run 查英文及繁中 query，未固定地區、裝置或個人化條件。下面是當次工具回傳的代表樣本，**不是 Google 穩定排名或完整 SERP**。競品是產品方主張，未上傳檔案實測。討論串只能支持有這種操作問題，不能推出月搜尋量、持續痛點、付費意願或本站流量。

| 候選 | 判定 | 主要理由 |
|---|---|---|
| CSV 品質與主鍵差異 | 保持文件候選 | 未過新增門檻：需求成立，但增量假說缺乏競品失敗證據，真實搜尋量未知。 |
| 網站搬遷驗收 | 排除現案的通用版本 | 未過；先排除通用搬遷檢查器提案，不排除未來具體細分痛點。 |
| HAR 差異與去敏 | 保持文件候選 | 未過；原始 HAR 含秘密資料，若只有功能清單差異卻無實測優勢，不值得新卡。 |
| ICS 的 DST／RRULE 檢查 | 保持文件候選 | 未過；已證明錯誤類型存在，未證明獨立新工具缺口與搜尋機會。 |
| 附件限制整包準備 | 保持文件候選；本輪不開 spike | 未過；研究中一度考慮有限 spike，補查直接競品後撤回。本輪零新增的結論包含此項。 |
| 文件隱藏資訊與遮蔽驗證 | 排除現案的泛用安全驗證版本 | 未過；排除宣稱泛用文件安全 PASS 的版本，保留來源作為未來特定檢查案例。 |

新增研究 spike 的最低門檻仍是：不同作者／來源的同類真實事件、與既有卡非重複、可與現行免費方案比較的具體增量假說。即使達到，也只代表可研究，不能宣稱市場驗證完成。這輪不用泛稱「進一步研究」掩飾差異尚未成立。

## CSV 品質與主鍵差異

**保持文件候選。** 至少兩個不同作者的同類主鍵對帳事件；都是既有方案可處理的歷史事件，未取得當前失敗樣本。

### 實際 query

| UTC 查詢時間 | Query |
|---|---|
| 2026-10-14T11:58:17Z | `"compare CSV" "duplicate" "key" site.reddit.com` |
| 2026-10-14T11:58:17Z | `"CSV" "比對" "欄位" 工具` |
| 2026-10-14T11:59:10Z | `CSV compare browser numeric tolerance duplicate keys free` |

### 需求事件與代表競爭樣本

- [csv-demand-1](https://www.reddit.com/r/excel/comments/1iyz24v/compare_2_csv_files/)：2025-02-26；first_person_forum；已讀頁面。系統搬遷雙份 CSV 需依 B 欄主鍵比 E–M 欄；新增列使逐格比較錯位。作者後來表示整理結構後採用 spreadsheet compare，不能當成尚未解決。
- [csv-demand-2](https://www.reddit.com/r/PowerShell/comments/10g0q02/comparing_2_csv_file_based_on_primary_key/)：2023-01-19；first_person_forum；已讀頁面。持續產生 CSV，要比最近兩份的新增 ID／欄位及資料變動，據此呼叫 API；討論標示 solved，作者貼出腳本解法。
- [csv-product-1](https://jadapps.app/tool/csv-diff)：頁面未明示發布日；vendor_product；已讀頁面。宣稱本機複合鍵、忽略欄位、數值容差、值重編碼、衝突重複鍵隔離與多格式報告；免費免登入 500 列。頁面大小上限有 1.9 MB／2 MB 兩種顯示，實際限制未驗證。
- [csv-product-2](https://github.com/simonw/csv-diff)：頁面未明示發布日；official_repository；已讀頁面。既有開源命令列工具支援 key 對照及差異輸出，免費替代路徑；非免安裝一般使用者介面。
- [csv-zh-sample](https://kilahub.com/tools/spreadsheet-diff/)：頁面未明示發布日；vendor_product；僅搜尋索引／摘要，未完整驗證。繁中查詢回傳瀏覽器 CSV／TSV 表格差異工具；只能證明有供給。

**直接重疊：** 先前差異假說中的複合鍵、容差、重複鍵警告及可匯出報告已被直接列為競品功能。

**尚未證實的增量：** 大量資料或特定匯入規則是否仍使現有免費工具誤判，必須先有可公開重現的檔案；不能只把提高免費列數當產品價值。

**重新納入條件與停止條件：** 取得兩個不同工作流程的去敏檔案，先與 JAD、csv-diff、使用者既有方法對照漏判及完成時間；全部通過即停止此差異方向。

**與既有卡及 AI 的關係：** 與原有 JSON diff 等卡片有引擎重用，但資料對帳是不同工作；尚不新增。 純聊天無法保證實際多列核對；能讀檔執行程式的 AI 加 pandas／Power Query 仍是強替代。

## 網站搬遷驗收

**排除現案的通用版本。** 找到兩個獨立搬遷焦慮事件，但未找到兩個明確抱怨現有 mapping 驗證器無法處理的同型事件。

### 實際 query

| UTC 查詢時間 | Query |
|---|---|
| 2026-10-14T11:58:17Z | `"site migration" "redirect" "mapping" site.reddit.com/r/SEO` |
| 2026-10-14T11:58:17Z | `"網站搬家" "轉址" "檢查" 工具` |
| 2026-10-14T11:59:18Z | `free redirect mapping checker expected destination CSV migration tool` |

### 需求事件與代表競爭樣本

- [migration-demand-1](https://www.reddit.com/r/TechSEO/comments/t3c9fs/site_migration_checklistbest_practice/)：2022-02-28；first_person_forum；已讀頁面。公司 WordPress 改版，需要搬遷檢查表與 URL mapping 範本；需求偏流程指引，不直接等於另做批次檢查器。
- [migration-demand-2](https://www.reddit.com/r/TechSEO/comments/1i89ynd/big_site_migration_and_dont_want_to_ruin_rankings/)：2025-01-23；first_person_forum；已讀頁面。數千頁 URL 結構搬遷、移除 /us、規劃 /uk／/au；顧問報價超預算，擔心排名。這是大型網站策略問題，不能冒充小型檢查工具需求。
- [migration-product-1](https://www.urlscheck.com/redirect-map-checker/)：頁面未明示發布日；vendor_product；已讀頁面。免費無帳號，來源與預期目的地逐對查驗、實際追蹤轉址鏈、比較正規化後最終 URL；宣稱每批 50 對。
- [migration-product-2](https://www.screamingfrog.co.uk/seo-spider/tutorials/audit-redirects/)：頁面未明示發布日；official_tutorial；已讀頁面。成熟爬蟲的官方轉址稽核流程；本次不推定各項功能都在免費方案。
- [migration-zh-sample](https://urledge.com/zh-tw/blog/website-migration-redirect-checklist)：頁面未明示發布日；vendor_tutorial；僅搜尋索引／摘要，未完整驗證。繁中搜尋回傳網站搬遷／轉址檢查表教學，屬資訊型競爭樣本。

**直接重疊：** 舊 URL＋預期新 URL＋即時正確性檢查，已有免費直接替代；canonical／hreflang 也已有成熟 SEO 工具。

**尚未證實的增量：** 若未來找到同一跨頁規則反覆漏判，才縮成可重現的特定驗收案例；『一鍵報告』本身不足。

**重新納入條件與停止條件：** 先蒐集真實錯誤 mapping／跨語系案例，對照免費服務及現有爬蟲；無漏判或時間差即停止。

**與既有卡及 AI 的關係：** 與原 sitemap／網站分析卡片接近，先合併研究線索，避免另造大範圍 SEO 平台。 實際 HTTP 驗證有工具需求，但可瀏覽／寫爬蟲的 AI 也可完成；要計入 SSRF、反爬、認證與地區回應差異成本。

## HAR 差異與去敏

**保持文件候選。** 安全分享有兩個不同事件，但第一個混合創辦人探索；清理＋比較整合的同類需求不足兩個。

### 實際 query

| UTC 查詢時間 | Query |
|---|---|
| 2026-10-14T11:58:25Z | `"compare two HAR files" tool` |
| 2026-10-14T11:58:25Z | `HAR 比較 去敏 工具` |
| 2026-10-14T11:58:49Z | `"Do you scrub HAR files before sending them to support"` |

### 需求事件與代表競爭樣本

- [har-demand-1](https://www.reddit.com/r/webdev/comments/1qg37h3/do_you_scrub_har_files_before_sending_them_to/)：2026-01-18；mixed_user_and_founder_discovery；已讀頁面。作者為客服匯出含敏感資料 HAR，花時間刪 auth／cookie，詢問本機白名單、diff、報告；同文提出自己的 HarGuard 構想，故降低獨立需求證據權重。
- [har-demand-2](https://www.reddit.com/r/techsupport/comments/nwhojr/a_trading_broker_said_me_to_download_and_send_har/)：2021-06-10；first_person_forum；已讀頁面。券商客服索取 HAR 與 console 截圖，使用者擔心分享登入帳戶資料；證明安全分享疑慮，沒有提出故障前後 diff 需求。
- [har-demand-3](https://superuser.com/questions/1502981/compare-single-website-browsing-sessions-at-different-points-in-time)：2019-11-18；first_person_question；已讀頁面。希望比較不同時間／帳戶網頁請求與內容，偏內容差異，不是清理後可安全提交整包的需求。
- [har-product-1](https://github.com/sitespeedio/compare)：頁面未明示發布日；official_repository；已讀頁面。既有開源 HAR 比較工具提供大小／狀態／時間及 waterfall 等比較。
- [har-product-2](https://openbrowsertools.com/tools/har-comparison-tool)：頁面未明示發布日；vendor_product；僅搜尋索引／摘要，未完整驗證。宣稱免費本機比較 HAR 的 headers／status／timing 並下載 Markdown 報告，另連結 sanitizer。
- [har-product-3](https://github.com/google/har-sanitizer)：2026-04-18；archived_repository；已讀頁面。瀏覽器可選 headers／cookies／參數／MIME 去敏及預覽的既有實作；已封存，且自述非 Google 官方產品，不列為現行維護中的可靠服務。

**直接重疊：** 比較、瀏覽器本機處理、去敏與報告都有既有實作；不能由拆在不同頁面便推定值得再做。

**尚未證實的增量：** 語意穩定配對、可覆核去敏規則是否比現有免費組合減少漏刪／誤配，需真實去敏樣本與比較基準。

**重新納入條件與停止條件：** 取得不含真實秘密的可重現 bug HAR；有至少兩個同類錯配／漏刪事件才重新提案。競品正確解決則停止。

**與既有卡及 AI 的關係：** 可支援 webhook／API 排錯工作，但新工具價值尚未證實。 可執行程式 AI 能比較與刪欄位；判斷沒有剩餘秘密很難完整保證，不能用安全保證當賣點。

## ICS 的 DST／RRULE 檢查

**保持文件候選。** 有跨專案、不同作者的具體時差問題；但本次兩事件都已關閉或修正，不代表使用者會搜尋另一個驗證網站。

### 實際 query

| UTC 查詢時間 | Query |
|---|---|
| 2026-10-14T11:58:25Z | `"ICS" "DST" "wrong" site.github.com/issues` |
| 2026-10-14T11:58:25Z | `ICS 夏令時間 重複 行事曆 錯誤` |
| 2026-10-14T11:59:10Z | `ICS validator timezone recurrence preview free` |

### 需求事件與代表競爭樣本

- [ics-demand-1](https://github.com/MagicMirrorOrg/MagicMirror/issues/3797)：2025-06-01；first_person_bug_report；已讀頁面。每週重複事件在夏令時間變換後顯示晚一小時；目前 issue 關閉、標示下一版本修正。這也可能是 consumer 行為，不能直接斷言檔案非法。
- [ics-demand-2](https://meta.discourse.org/t/calendar-event-ics-export-wrong-time-1-h-when-importing-into-outlook-with-tzid-europe-berlin/409797)：2026-08-11；first_person_official_forum；已讀頁面。Discourse 匯出 Europe/Berlin 活動至 Windows Outlook 晚一小時，Google Calendar 正常；另一使用者 09-02 確認同現象。09-15 已合併修正並發布 latest，不能視為仍開放缺陷。
- [ics-product-1](https://powmcp.com/apps/ics-calendar-check/)：頁面未明示發布日；vendor_product；已讀頁面。提供真實 ical.js RFC 5545、VTIMEZONE／DST、有限 RRULE 展開與兩 feed 比較。訪客終身 50 次、免費帳戶每月 100 次；公開 URL／5 MB，明示不配對對應事件、不驗證跨 app 顯示。
- [ics-product-2](https://icsviewer.com/)：頁面未明示發布日；vendor_product；僅搜尋索引／摘要，未完整驗證。宣稱免費本機 ICS 預覽，支援內嵌 VTIMEZONE、TZID 與 floating time。

**直接重疊：** 時區警告、RRULE 展開與預覽不是空白市場。PowMCP 對事件時間漂移比較有明確邊界，但還沒有兩個相同需求事件。

**尚未證實的增量：** 以 UID 配對修訂前後事件並比較實際 occurrence 是否意外漂移，是未證實細分方向；不能把 app 相容性全部包進成功標章。

**重新納入條件與停止條件：** 找兩個仍無法由原系統修正或現有 viewer 發現的同類檔案；先用既有 validator／viewer 比對，能完整解決即停止。

**與既有卡及 AI 的關係：** 與原 Cron 都涉及日期展開，但 ICS 另有 UID、例外、VTIMEZONE 與 app 行為，不應僅當 Cron 功能擴寫。 純聊天容易算錯 DST；能執行時區函式庫的 AI 可處理。需要真正檔案與規則版本，不能假稱預覽等於各 app 相容驗收。

## 附件限制整包準備

**保持文件候選；本輪不開 spike。** 至少兩個獨立具體事件證明門檻與可讀性的衝突，另有較弱的指定區段保留品質線索；尚無兩個整包多檔規則準備事件。

### 實際 query

| UTC 查詢時間 | Query |
|---|---|
| 2026-10-14T11:58:34Z | `PDF compress under 2MB application upload blurry file reddit` |
| 2026-10-14T11:58:34Z | `報名 附件 PDF 2MB 壓縮 看不清楚` |
| 2026-10-14T12:02:35Z | `site.tools.pdf24.org compress PDF free target file size` |

### 需求事件與代表競爭樣本

- [attachment-demand-1](https://www.reddit.com/r/pdf/comments/1annxdq/compress_pdf_without_losing_quality/)：2024-02-10；first_person_forum；已讀頁面。申請簽證只允許單一 2 MB PDF，48 頁掃描銀行資料原為 5 MB，詢問如何縮小而不難以閱讀。
- [attachment-demand-2](https://www.reddit.com/r/pdf/comments/1s9u7no/very_minimal_compression/)：2026-04-01；first_person_forum；已讀頁面。細字掃描只須從 11 MB 降至 10 MB，上傳前壓縮工具卻降至約 5 MB 而糊掉；留言已建議可調設定的 PDF24。
- [attachment-demand-3](https://www.reddit.com/r/pdf/comments/1qbp2p7/i_want_to_compress_most_of_pdf_but_want_to_keep/)：2026-01-13；first_person_forum；僅搜尋索引／摘要，未完整驗證。100 KB 門檻造成掃描幾乎不可讀，提出保留部分區段高品質的問題；本輪只取得索引文字，尚未完整讀到討論及結局。
- [attachment-product-1](https://tools.pdf24.org/en/compress-pdf)：頁面未明示發布日；vendor_product；已讀頁面。免費、免帳號、多檔，調 DPI／影像品質等設定；線上版在伺服器處理，另有 Windows Creator，不能把線上版說成本機。
- [attachment-product-2](https://makefilefit.com/make-file-upload-ready)：頁面未明示發布日；vendor_product；僅搜尋索引／摘要，未完整驗證。官方索引內容宣稱免費免帳號、本機、每批最多 20 檔，解析上傳錯誤中的大小／尺寸／格式；PDF 為 metadata cleanup／best effort，非重掃描壓縮保證。
- [attachment-product-3](https://minopdf.com/tools/utilities/compress-pdf-to-target-size)：頁面未明示發布日；vendor_product；僅搜尋索引／摘要，未完整驗證。官方索引內容宣稱免費本機由細到粗搜尋可達標設定，標示無法達標，掃描頁逐頁重編碼；功能及品質宣稱尚未實測。
- [attachment-product-4](https://stayput.dev/tools/compress-pdf)：頁面未明示發布日；vendor_product；僅搜尋索引／摘要，未完整驗證。宣稱免費、免帳號、本機、批次與指定目標大小；不是實際品質驗收。
- [attachment-product-5](https://fitmypdf.com/)：頁面未明示發布日；vendor_product；僅搜尋索引／摘要，未完整驗證。已有目標大小、可讀性檢查／預覽及 upload-ready 報告的產品宣稱，直接覆蓋先前差異假說。

**直接重疊：** 免費本機、目標大小、批次、貼上 portal 錯誤與預覽都有現有供給；『比一般壓縮器方便』不足以新立項。

**尚未證實的增量：** 重要頁／區段保留品質可能是細分問題，但目前只有一個搜尋索引事件，且尚未逐一比較競品能力。整包驗收需求也未達門檻。

**重新納入條件與停止條件：** 優先找兩個同類實際檔案與競品可重現失敗，再比較每頁可讀性、達標狀態及反覆嘗試次數。沒有差距就停止，不新增一般 PDF 壓縮器。

**與既有卡及 AI 的關係：** 可與原圖片批次卡共用輸出限制思路，但不應把未驗證的 PDF 套件併入既有卡擴大 scope。 需處理真實二進位檔和預覽，純聊天替代較低；檔案 AI 可處理。損失壓縮有物理限制，任何工具都不能保證任意檔案達標且不失真。

## 文件隱藏資訊與遮蔽驗證

**排除現案的泛用安全驗證版本。** 僅一個完整讀到且清楚的遮蔽失敗事件；第二事件抓取受限。Office metadata 與 PDF 遮蔽是不同問題，不能拼成同一需求的兩證據。

### 實際 query

| UTC 查詢時間 | Query |
|---|---|
| 2026-10-14T11:58:34Z | `"Word Mac" "remove" "metadata" "reddit"` |
| 2026-10-14T11:58:34Z | `PDF 黑框 文字 還能 複製 檢查` |
| 2026-10-14T12:02:58Z | `文件 隱藏資訊 檢查 Word PDF 去識別` |

### 需求事件與代表競爭樣本

- [hidden-demand-1](https://www.reddit.com/r/ipad/comments/1r1jvbb/help_is_there_a_way_to_redact_text_from_pdfs/)：2026-02-11；first_person_forum；已讀頁面。無電腦的 iPad 使用者用 Markup 黑框遮識別資訊，仍可被 AI 讀到下方文字；要求不裝 app 且不用網站，與本工具站分發路徑有衝突。
- [hidden-demand-2](https://www.reddit.com/r/pdf/comments/1jbaxbw/)：2025-03-14；first_person_forum；僅搜尋索引／摘要，未完整驗證。索引出現使用 LibreOffice 刪除銀行文件資訊後詢問是否可復原；原頁開啟失敗，僅弱證據，不能據此補足兩個驗證器需求。
- [hidden-product-1](https://help.libreoffice.org/latest/en-GB/text/shared/guide/redaction.html?DbPAR=WRITER)：頁面未明示發布日；official_documentation；已讀頁面。現行 LibreOffice 有 Tools Redact 及 Redacted Export，將遮蔽內容移除後以像素取代；一般畫黑框／普通匯出不是同一操作。免費現有安全刪除路徑，尚未用 fixture 實測。
- [hidden-product-2](https://hiddenwordscanner.com/)：頁面未明示發布日；vendor_product；已讀頁面。宣稱免費無帳號、PDF／DOCX／XLSX 隱藏文字、metadata、註解及修訂掃描，16 MB／檔；需要上傳並暫存報告，不可宣稱本機。
- [hidden-product-3](https://utilforge.org/tools/release-check)：頁面未明示發布日；vendor_product；已讀頁面。免費單檔檢查問題種類與數量；付費版標示位置、資料夾批次、帶日期報告與 redaction。不可把整套宣稱免費。
- [hidden-zh-sample](https://support.microsoft.com/zh-hk/office/collab-files/remove-hidden-data-and-personal-information-by-inspecting-documents-presentations-or-workbooks)：頁面未明示發布日；official_documentation；僅搜尋索引／摘要，未完整驗證。繁中查詢返回 Microsoft 文件檢查教學；證明內建方法與資訊型結果，不能當搜尋量。

**直接重疊：** 免費 redaction、隱藏資訊掃描及批次交付報告都有現有路徑，且使用者可能拒絕網站處理。

**尚未證實的增量：** 僅針對已知遮蔽關鍵字／已知容器種類提出可覆核檢查，而非保證安全；仍需同類事件和競品漏判證據。

**重新納入條件與停止條件：** 至少兩個允許分享的人工 fixture、明確檢查範圍，以及現有免費工具的可重現漏判才考慮研究卡；全面安全保證永不列入。

**與既有卡及 AI 的關係：** 原37卡未直接重複，但高解析與錯誤保證成本，不能因非重複便納入。 可讀檔 AI 可輔助找文字，但沒找到不能推出沒有隱藏資訊；需要確定性解析與狀態區分。

## 證據限制與下一步

- 未查得真實搜尋量、搜尋曝光、點擊、留存、收益或排名難度；每一項 traffic_confidence 均為 unknown。
- 多數事件來自不同作者的 Reddit／GitHub／官方論壇，作者身分和敘事未獨立驗真；同一問題的回覆不當兩個不同來源。
- 混合創辦人探索、推廣留言、重複貼文及產品官網不列為獨立需求事件。
- 產品頁來源可能有宣傳誇大、過時或品質問題，未執行測試；此處證明有直接競爭主張，不能證明服務完整可靠。
- 繁中結果涵蓋不足，且工具沒有固定台灣／香港／全球地區；不能用英文事件替代台灣市場量測。
- 若新卡門檻允許只收集市場證據的共用研究工作，應歸入既有研究流程；本報告不以六個新工具名義新增六張卡。
- 本報告只寫研究檔案，未修改 Backlog、未安裝依賴、未處理真實敏感文件、未實作。

若後續再投入研究時間，先收集「競品真的做錯或做不到」的去敏範例。附件達標與 CSV 對帳較容易取得可比較的輸入／輸出，可先作招募題材；這是取證便利度，不是流量排序。沒有找到反例就停止，不能只因既有站做得多而推定市場大，也不能因缺少搜尋結果便斷言沒有需求。

完整機器可讀資料、額外查詢紀錄及來源日期見同目錄 `demand-new-candidates.json`。來源查核日皆為 2026-10-14；`published_date: null` 表示未確認發布日期，不以爬取日期冒充。

