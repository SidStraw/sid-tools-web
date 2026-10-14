# STW-34／STW-16 可取得搜尋量查證

查證日期：2026-10-14（Asia/Taipei）。只研究，不實作；不登入、不購買、不建立帳號。這份資料補充競品實測，不能單獨證明產品值得開發。

## 決策結論

- **STW-34：有正向但尚不完整的量化需求訊號。** 第三方 API 回傳美國 `compress image to 100kb` 約 170/月、印度同詞約 49,500/月；`bulk image compressor` 美國約 480/月。這支持繼續驗證「目標檔案上限」及批次意圖，**沒有證明「批次＋指定KB＋保留尺寸／透明度」交集有同等量**。市場差異很大，不能以全球廣詞量替代特定地區需求。
- **STW-16：未取得報告比較精確意圖的正向月量證據。** 美國 `lighthouse report` 720/月、`lighthouse ci` 170/月，屬報告／CI較廣意圖；四個比較／diff精確詞回0，不能把廣詞720直接分配給報告差異工具。即使實測找到功能缺口，也應先驗證可觸及的使用者與分發途徑，不宜只憑SEO預期提升開發優先序。
- 在「可驗證流量」目標下，**STW-34 可維持先於 STW-16 的後續驗證順序；兩者皆不因這次數字升為開發Ready或High**。此結論仍須與真正實測差異一併評估。

## 1. 直接查詢公開搜尋量 API

提供者：[seodata.dev API規格](https://www.seodata.dev/llms.txt)、[提供者公開範例頁](https://www.seodata.dev/keyword/image-compressor)。提供者聲稱來源為 Google Ads API，提供國家別 monthly average。本次為無認證公開 GET，18組詞／地區，原始JSON完整保存在 [search-demand-api.json](search-demand-api.json)。初次100KB查詢另外重複驗證一次，總19次成功請求，未超過其宣告匿名20/day額度。

**可信度：第三方原始提供者的實際回傳，非直接從使用者 Google Ads 帳號匯出，也尚未由第二份精確詞資料交叉驗證。** 有些cache距今數月，數字不能標成2026年10月的當月量。

| 查詢字串 | 國家 | provider volume（月均估算） | cached_at日期 | 查詢字串語言 |
|---|---|---:|---|---|
| image compressor | US | 60,500 | 2026-06-01 | 英文 |
| batch image compressor | US | 70 | 2026-05-31 | 英文 |
| compress image to 100kb | IN | 49,500 | 2026-08-09 | 英文 |
| compress image to 200kb | US | 170 | 2026-07-19 | 英文 |
| compare lighthouse reports | US | 0 | 未回傳 | 英文 |
| lighthouse diff | US | 0 | 未回傳 | 英文 |
| lighthouse report | US | 720 | 2026-06-06 | 英文 |
| lighthouse comparison | US | 0 | 未回傳 | 英文 |
| 圖片壓縮 | TW | 9,900 | 2026-10-14 | 繁中／中英混合字串 |
| 圖片壓縮 100kb | TW | 0 | 未回傳 | 繁中／中英混合字串 |
| 圖片壓縮 指定大小 | TW | 0 | 未回傳 | 繁中／中英混合字串 |
| Lighthouse 報告比較 | TW | 0 | 未回傳 | 繁中／中英混合字串 |
| batch compress images to 100kb | US | 0 | 未回傳 | 英文 |
| bulk image compressor | US | 480 | 2026-05-23 | 英文 |
| 圖片壓縮kb | TW | 0 | 未回傳 | 繁中／中英混合字串 |
| lighthouse report comparison | US | 0 | 未回傳 | 英文 |
| lighthouse ci | US | 170 | 2026-10-14 | 英文 |
| compress image to 100kb | US | 170 | 2026-07-16 | 英文 |

每列的完整請求 URL、cached boolean、cached_at、CPC、competition及similar清單都保留在JSON；沒有加總近似詞。

### 欄位缺口與解讀

- 時間範圍：API只稱 monthly average，**沒有回傳基礎起迄月份或月別序列**；cached_at是供應商快取時間，不能當統計期間。
- 語言：API只有country，未暴露language filter；表格是輸入字串語言，不是已設定的受眾語言。
- Search Network、close variants實際合併清單均未回傳。similar是供應商稱SERP重疊的相關詞，**不等於 Google close variants 清單**。
- API回0的項目通常只回 `volume:0,cpc:0,competition:0,cached:false`，沒有cached_at；公開規格未說明「低於揭露門檻、無資料、查詢失敗」怎麼區分。故資料保留原值0，**決策只記「未取得正向量證據」**，不記「零需求」，也不記「零競爭」。
- CPC及competition不是自然搜尋難度。Google定義monthly searches涵蓋近似變體，依地區／期間／聯播網而變，且數字四捨五入；competition反映廣告主競爭。[Google Ads 指標定義](https://support.google.com/google-ads/answer/3022575?hl=en)
- 國家數字只能在相同字串下作方向比較。印度49,500無法證明台灣或美國同樣大，也沒有證明印度市場能帶來預期廣告收入。
- `image compressor` 美國60,500、台灣`圖片壓縮`9,900是大類，不可標為STW-34可獲得的流量。英文batch／bulk也可能不要求目標KB。
- 不把Google結果筆數、供應商similar詞筆數、競品數、GitHub stars或下載數換算成搜尋量。

## 2. Google Trends 已實際取得序列

瀏覽器直接開啟 [Google Trends比較](https://trends.google.com/trends/explore?date=today%2012-m&geo=US&q=compress%20image%20to%20100kb,compare%20lighthouse%20reports&hl=en)，可見設定為 United States、Past 12 months、All categories、Web Search、兩者均為 Search term（非Topic）。查證時日期為2026-10-14。成功點選CSV下載，保存 [google-trends-us-12months.csv](google-trends-us-12months.csv)。

- 53個週起日：2025-10-12 至2026-10-11；最後週尚未結束，CSV未另附isPartial旗標。
- `compare lighthouse reports`：53週皆0。
- `compress image to 100kb`：2026-10-04這週100，其餘52週0；畫面平均顯示2對0。
- 畫面相關查詢顯示資料不足；Lighthouse地區分布亦顯示資料不足。
- **這是0–100相對搜尋熱度，不是次數**。稀疏序列不能證明100KB需求最近爆發，也不能說Lighthouse沒有人搜尋。Google官方指出低量詞可能顯示0，低量／無搜尋詞可能受隱私噪音影響而出現單次尖峰。[Google Trends資料說明](https://support.google.com/trends/answer/4365533?hl=en)
- 這次US Trends精確詞序列對排優先序的增量證據弱；保留原始資料作為「沒有穩定相對量支撐」的證據，不拿它外推出月搜尋量。

## 3. 其他來源與取得限制

| 來源／嘗試 | 結果 | 是否採用 |
|---|---|---|
| Google Ads Keyword Planner官方說明 | 基本功能需完成帳號設定與帳單資訊；本次沒有可用授權帳號匯出 | 沒有直接Google Ads量；未登入或建立帳號 |
| seodata.dev公開網頁與API | 網頁可看廣詞；web工具對API顯示不可取得；shell首次受sandbox DNS限制，經允許的公開curl讀取成功 | 採18組原始回傳，但保留期間／語言／零值語義缺口 |
| Google Trends web文字工具 | 顯示不可取得 | 改用正常瀏覽器成功取得CSV，不再記為整體阻塞 |
| [Treendly image compressor US](https://treendly.com/trend/image-compressor?geo=US) | 公開頁顯示60.5K/月，但沒有可核對基礎統計期間，且是廣詞 | 只作廣詞旁證，沒有當第二份精確詞驗證 |
| [Treendly lighthouse US](https://treendly.com/trend/lighthouse?geo=US) | 可見大量旅遊／電影／宗教／地名等混合意圖 | 排除，不能拿其246K支撐Chrome Lighthouse |
| ASOApp／ASOTools app-store搜尋結果 | 商店難度分數／推算量，非Web Search | 排除，不與Google月量混用 |

搜尋引擎查詢記錄：
1. `"compress image to 100kb" "volume"`
2. `"lighthouse report" "search volume"`
3. `"image compressor" "search volume"`
4. `"lighthouse compare" "search volume"`
5. `site:seodata.dev volume zero no data Google Ads`
6. `site:treendly.com/trend "lighthouse" "searches"`

以上搜尋只用來找資料提供者；沒有將搜尋排序視為Google固定地區排名。

## 4. 建議寫回卡片的搜尋需求段落

**STW-34**：已取得第三方原始月量估算：US target100KB170、bulk480；IN target100KB49,500；TW廣詞9,900。期間與語言設定未公開，精確批次＋KB交集未取得正量。保留Medium驗證優先序，需以實測確認既有競品是否可靠完成同樣約束；若既有工具已滿足，搜尋量大也不足以支撐新做。

**STW-16**：已取得US廣詞report720、CI170，但比較／diff精確詞未取得正量；Google Trends精確詞53週皆0且資料不足。保留Needs Refinement；不能以報告大類的量宣稱比較工具有SEO機會。下一個門檻是實測可重現差異＋可觸及使用者實際採用／分發驗證，未完成前不升High。

