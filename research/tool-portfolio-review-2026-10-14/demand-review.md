# 需求與競爭複查：Backlog 決策

2026-10-14，Asia/Taipei。使用者授權依證據重排、排除低價值、足夠證據才新增，暫不實作。

## 結論與排序

本輪 37 張既有卡全數納入決策；6 張 Medium 繼續驗證、25 張 Low 暫緩、6 張歸檔排除獨立投資；High 0、新增 0。卡片更新結果另見 `backlog-update-verification.json`。

這是**下一輪驗證資源的順序**，不是搜尋量排名或開發承諾。沒有可信月搜尋量、SEO 難度或固定地區 SERP，無法聲稱哪項流量最高。六項均未證明優於現成產品。所有保留卡仍為 Needs Refinement，未勾選功能 AC。

| 順序 | 卡片 | 為何先驗證 | 會推翻投入的結果 |
|---:|---|---|---|
| 1 | STW-34 圖片指定大小 | 明確的目標大小反覆試誤回報，輸入／達標可直接核對；可用少量真實檔案快速淘汰差異假說 | 既有批次工具已足夠，品質／時間沒有增益 |
| 2 | STW-16 Lighthouse 報告 | 2025 比較故障與 2026 多頁需求兩個具體事件；先查原範圍比較可信度 | 官方 diff／CI 已完成工作；多頁需求不等同原卡需求 |
| 3 | STW-3 JSON diff | 近期陣列配對 issue 支持差異噪音問題，但 OOXML 情境須再核對 API | 現成 ID／忽略工具已足夠 |
| 4 | STW-5 Cron | 近期 runtime DST 錯誤支持正確性問題；相容界線與驗證成本較高 | 只是另一個與實際 scheduler 不一致的預覽器 |
| 5 | STW-28 Notion 預檢 | 官方列出原生匯入限制，可明確比較來源與損失 | 原生匯入足夠，使用者不需額外盤點 |
| 6 | STW-27 Confluence 預檢 | 有真實批次移轉提問，但舊平台與商用競品削弱缺口可信度 | 指定平台 importer 已解決，預檢未減少返工 |

這六名是依問題具體性、證據時效／適用性與下一步驗證成本的編輯判斷。1、2 接近，不能解讀為 STW-34 流量大於 STW-16。Low 組依原 ID 穩定排列，沒有細分市場強弱；ordinal 100+ 僅看板排序。

## 排除與保留的界線

歸檔 STW-2、4、9、26、29、31：核心產物已有直接替代，尚無可辨認增量需求；先退出獨立投資，保存原始卡與重新納入門檻。歸檔不等於 Done，也不是證明市場無需求。

STW-10 的確定性 diff 與遮蔽交接、STW-21 型別研究、STW-33 截圖評估保留 Low，撤回第一輪過度簡化的 AI 替代理由。STW-6/17/35/37 等也保留窄差異驗證，但不列近期主力。服務／CLI 卡不因介面本身被淘汰。

六個新方向本輪**零新增**。CSV、轉址驗收、HAR、ICS、附件準備與文件隱藏資訊均需查證現成產品實際不足。問題存在不足以支持再造一個產品，詳細事件與反證見 [新候選複查](demand-new-candidates.md)。

## 方法、資料與限制

- 既有核心 8 項：[英／繁中搜尋、使用者事件與競品](demand-existing-core.md)。
- 13 項排除／保留檢討：[需求與差異證據](demand-pruning.md)。
- 其餘 16 項：[供給初篩與保留門檻](demand-other-cards.md)。深度較淺，多項未找到獨立需求，不能解讀為零需求。
- 原始卡完整描述／AC：[更新前快照](backlog-before-demand-review.json)；逐卡最終決策：[JSON](demand-decisions.json)。

查詢日期均為 2026-10-14；未固定國家／裝置，繁中措辭不等於 Google 台灣排名。issue／社群回報是問題存在的樣本，非搜尋量；作者推廣貼、舊已解 bug、官方文件限制分開記錄。產品頁與搜尋摘要只代表供給聲明，未做功能／效能／隱私實測。沒有以結果筆數、星數或 pipeline 詞頻推算需求，亦未取得可比較的 CPC／KD。

AI 比較仍未實跑，必須允許 AI 執行程式與處理檔案。互動、批次、離線都不自動構成護城河。下一輪須先以真實樣本完成現成工具與 AI 對照；符合具體增量後，再取得同地區同期間的 query 指標／實際曝光點擊，以成本約束選開發題。

修正：oasdiff 首頁說 server-side、/diff FAQ 說 entirely in browser，官方內容矛盾，不能拿本機處理當確認差異。新多頁 Lighthouse 與附件可讀性線索未擅自加入既有功能 AC。

## 逐卡決策

### STW-34 — 批次圖片最佳化：依目標大小與尺寸預算匯出

Medium；validate；ordinal 1。需求最具體之一，但差異已被覆蓋。保留限時比較測試，須證明同大小畫質、透明／方向保留、批次失敗回報或操作效率勝過現有工具。 競品覆蓋程度高：繁中產品已標示批次、指定 KB、無需安裝與本機處理。

提升／重新納入條件：以同組圖片比較 Image Kit 等現成工具，核對大小、尺寸、透明／方向、畫質及失敗回報；未勝出便停止。

來源：[來源 1](https://github.com/GoogleChromeLabs/squoosh/issues/1422)、[來源 2](https://github.com/GoogleChromeLabs/squoosh/issues/1153)、[來源 3](https://imagekit.lzw.me/zh-TW/compress-image-to-kb)、[來源 4](https://compress-picture.com/compress-image-to-100kb)。詳細取證見 [demand-existing-core.md](demand-existing-core.md)。

### STW-16 — Lighthouse 報告比較：區分指標變化與測試條件差異

Medium；validate；ordinal 2。八項中值得優先細化的需求之一。改驗證多頁矩陣／報告相容與比較可信度，不能只重做官方兩檔 diff。 競品覆蓋程度高： two-report diff；多頁彙整有明確近期請求，競品完整覆蓋待測。

提升／重新納入條件：先驗證原有兩報告相容與可比性提示是否省時；多頁矩陣是新線索，另作範圍決策，不自動擴充 AC。

來源：[來源 1](https://github.com/GoogleChrome/lighthouse-ci/issues/1101)、[來源 2](https://github.com/GoogleChrome/lighthouse-ci/issues/1132)、[來源 3](https://googlechrome.github.io/lighthouse-ci/difftool/)、[來源 4](https://github.com/googlechrome/lighthouse-ci)。詳細取證見 [demand-existing-core.md](demand-existing-core.md)。

### STW-3 — API JSON 差異比較：忽略動態欄位並依識別鍵對齊陣列

Medium；validate；ordinal 3。保留需求研究，原版功能沒有證實差異；先測複合鍵、各層不同配對規則與大整數保真是否形成具體缺口。 競品覆蓋程度高：ID 配對、忽略路徑、本機處理、匯出皆已有產品頁明示。

提升／重新納入條件：以真實 API 樣本比較現成工具的配對／忽略／匯出，先證明核對與重跑省時；OOXML issue 不直接外推 API。

來源：[來源 1](https://github.com/benjamine/jsondiffpatch/issues/436)、[來源 2](https://www.reddit.com/r/json/comments/1olq5tz/json_comparer_that_correctly_matches_arrays/)、[來源 3](https://ravensmove.com/tools/json-diff)、[來源 4](https://www.m2toolkit.com/tools/json-diff)。詳細取證見 [demand-existing-core.md](demand-existing-core.md)。

### STW-5 — Cron 排程預覽：時區對照、下次執行與 DST 提示

Medium；validate；ordinal 4。保留特定 scheduler／版本驗證方向，通用時區加日曆版降級。近期 runtime 錯誤是真痛點，但預覽工具必須能說明適用範圍。 競品覆蓋程度高：時區、下次執行與 DST 邊界已有專門產品；跨 runtime 正確性尚不能視為已解決。

提升／重新納入條件：指定 Unix 五欄 parser/runtime，核對 DST 邊界與真實 scheduler；不得偷偷擴充到 Quartz 或宣稱通用正確。

來源：[來源 1](https://github.com/NousResearch/hermes-agent/issues/66436)、[來源 2](https://cronwizard.com/dst)、[來源 3](https://cron.dag.io/)。詳細取證見 [demand-existing-core.md](demand-existing-core.md)。

### STW-28 — Markdown 到 Notion 的批次結構與連結保留檢查

Medium；validate；ordinal 5。Medium 條件式保留來源對照與損失檢查；排除普通 Markdown uploader 定位。 官方確認多檔與 ZIP 原生匯入，同頁明示 anchors／非標準 Markdown 限制及部分匯入可能。限制是直接需求機制，但不是搜尋量。

提升／重新納入條件：原卡至少 3 個樣本比較原生匯入，找到可重現損失與省時；若原生足夠，就交付停止結論。

來源：[來源 1](https://www.notion.com/help/import-data-into-notion)。詳細取證見 [demand-pruning.md](demand-pruning.md)。

### STW-27 — Markdown 到 Confluence 的格式損失預檢與匯入輔助

Medium；validate；ordinal 6。Medium 條件式保留預檢驗證，先選定 Cloud 或 Data Center；不是重新做通用轉換器。 官方社群有批次千頁移轉／Markdown 匯入的第一手問題；現在有付費 importer 宣告相對連結、附件及命名衝突處理。

提升／重新納入條件：至少 3 組真實文件在指定平台與現成 importer 比較，量測預檢發現的遺漏和人工修復時間；若無增量價值停止。

來源：[來源 1](https://community.atlassian.com/forums/discussion/1886974/how-to-import-pages-with-markdown-format-into-confluence)、[來源 2](https://community.atlassian.com/forums/discussion/2799601/how-do-i-enable-the-options-to-import-word-and-markdown-to-a-page)、[來源 3](https://marketplace.atlassian.com/apps/1221333/markdown-importer-for-confluence)。詳細取證見 [demand-pruning.md](demand-pruning.md)。

### STW-1 — 環境設定預檢：比對 .env 範本、缺漏與重複鍵

Low；defer；ordinal 101。範本比對、缺漏與值差異已有瀏覽器及 VS Code 產品；本輪未找到獨立使用者願意改用本站的證據。

提升／重新納入條件：以真實部署案例證明既有工具無法處理的語法或重跑流程；本機／遮蔽本身不算差異。

來源：[來源 1](https://www.utility-grid.com/tools/developer/env-file-compare)、[來源 2](https://marketplace.visualstudio.com/items?itemName=takeaseat-venture.env-diff)。詳細取證見 [demand-other-cards.md](demand-other-cards.md)。

### STW-6 — OpenAPI 合約差異檢查：區分 request 與 response 的相容性

Low；defer；ordinal 106。先排除泛用 Web wrapper 作近期主力。若要升級，需用真實 consumer／規格證明既有引擎漏判或流程成本。 競品覆蓋程度高：oasdiff 已有 Web、報告匯出與 CI；另有本機處理產品聲明，但本輪未驗證。

提升／重新納入條件：用語意等價規格與真實 consumer 比對既有引擎，且實測 oasdiff 資料處理位置；單純本機 wrapper 不足。

來源：[來源 1](https://github.com/OpenAPITools/openapi-diff/issues/192)、[來源 2](https://www.oasdiff.com/diff)、[來源 3](https://www.oasdiff.com/)、[來源 4](https://a2z.tools/openapi-specification-diff-checker)。詳細取證見 [demand-existing-core.md](demand-existing-core.md)。

### STW-7 — CSS selector 比較：特異性拆解與 HTML 命中預覽

Low；defer；ordinal 107。權重計算與 DOM match 工具供給密集；未取得需要整合兩者的獨立需求，亦未實跑競品。

提升／重新納入條件：取得真實錯誤定位任務，證明比瀏覽器 DevTools／既有 tester 更省步驟。

來源：[來源 1](https://toolhuben.com/css-specificity-calculator/)、[來源 2](https://www.toolhuben.com/css-selector-tester/)。詳細取證見 [demand-other-cards.md](demand-other-cards.md)。

### STW-8 — Docker Compose 靜態預檢與服務相依圖

Low；defer；ordinal 108。官方 config 已含合併、插值與驗證；圖形仍可能有價值，但靜態 Web 與真實 Compose 環境語意差距未解除。

提升／重新納入條件：取得不方便執行 Docker 的真實案例，驗證視覺圖是否比 config 輸出可理解。

來源：[來源 1](https://docs.docker.com/reference/cli/docker/compose/config)、[來源 2](https://www.reddit.com/r/docker/comments/1cm97c0)。詳細取證見 [demand-other-cards.md](demand-other-cards.md)。

### STW-10 — Git diff 檢視與可分享的確定性變更摘要

Low；defer；ordinal 110。撤回先前把本卡當 AI 摘要的理由；本卡是確定性檢視，Low 保留窄驗證。 成熟開源工具提供 unified diff、導航相關顯示與 HTML 匯出；本輪沒有取得遮蔽交接的獨立用戶需求證據。

提升／重新納入條件：3 個真實跨團隊 patch 交接，與 diff2html 匯出比較，量測排除敏感 hunk 的操作量與審查成本；若無額外收益就排除。

來源：[來源 1](https://github.com/rtfpessoa/diff2html/blob/master/README.md)、[來源 2](https://github.com/rtfpessoa/diff2html-cli/blob/master/README.md)。詳細取證見 [demand-pruning.md](demand-pruning.md)。

### STW-11 — GraphQL schema 差異檢查與影響型別導覽

Low；defer；ordinal 111。Inspector 已含 breaking/dangerous/safe 分類、使用量規則與 CI；現卡影響導航的使用者增量未證實。

提升／重新納入條件：找實際 schema 審查，證明獨立 Web 導航比 Inspector／Hive 多完成一個必要任務。

來源：[來源 1](https://the-guild.dev/graphql/inspector/docs/commands/diff)。詳細取證見 [demand-other-cards.md](demand-other-cards.md)。

### STW-12 — PostgreSQL EXPLAIN 計畫檢視：估計與實際執行差距

Low；defer；ordinal 112。Low 保留比較門檻；不能將此卡稱為 AI SQL optimizer，它實際解析計畫。若只複製 viewer 則停止。 PEV2 官方持續提供計畫視覺化與單 HTML 完全離線模式；免費／本機本身不是差異。

提升／重新納入條件：以至少 3 個真實計畫比較 PEV2，證明某種診斷理解任務的時間／正確率改善；補對應特定 query 的需求。

來源：[來源 1](https://github.com/dalibo/pev2)、[來源 2](https://pev2.pages.dev/)。詳細取證見 [demand-pruning.md](demand-pruning.md)。

### STW-13 — SQL DDL 轉 ER 關聯圖與可匯出的資料表文件

Low；defer；ordinal 113。Low 保留窄比較；免 DB、免費與 SVG 不是足夠差異，不能宣稱競品都不能呈現來源。 dbdiagram 官方提供 DDL 流程，DBC 有免費瀏覽器端 PostgreSQL DDL 圖與匯出；大量供給只是競爭訊號。

提升／重新納入條件：3 組真實 DDL（複合鍵／自我引用／schema）比較現成基準，找到可重現且有使用者需要的匯入／文件缺口。

來源：[來源 1](https://docs.dbdiagram.io/dbdocs/features/generate-dbml-from-db/)、[來源 2](https://dbms.co.jp/sql-to-erd)。詳細取證見 [demand-pruning.md](demand-pruning.md)。

### STW-14 — OpenAPI 回應範例產生器：可驗證、可重現的 mock fixture

Low；defer；ordinal 114。Redocly sampler 與 seeded mock 產品已有樣本生成；卡片的受限且經驗證 fixture 尚有品質假說，但無可比較流量證據。

提升／重新納入條件：用原 AC 範圍的 schema 比較有效率與錯誤定位；fixture 與 STW-24 server 保持區分。

來源：[來源 1](https://github.com/Redocly/openapi-sampler)、[來源 2](https://mock-server.com/versions/7.6.0/apidocs/org/mockserver/openapi/examples/SampleDataGenerator.html)。詳細取證見 [demand-other-cards.md](demand-other-cards.md)。

### STW-15 — Markdown 轉 HTML Email：表格、程式碼與複製預覽

Low；defer；ordinal 115。Low 保留「相容性可覆核」窄場景；普通 Markdown→HTML 不值得單獨建。 現成 Web converter 已有 inline style、表格與 Outlook 限制；Markdown Here 也提供直接信箱渲染流程。

提升／重新納入條件：原卡要求的兩平台實測，加上至少 3 個真實技術公告與基準對照，證明表格／程式碼修復省時。

來源：[來源 1](https://www.markdowntools.com/tools/markdown-to-email-html)、[來源 2](https://github.com/adam-p/markdown-here)。詳細取證見 [demand-pruning.md](demand-pruning.md)。

### STW-17 — Sitemap XML 預檢與站點結構瀏覽

Low；defer；ordinal 117。排除只有格式驗證／去重的近期主力版本。較深網站上線健檢須另證需求、抓取成本與邊界，不能直接擴大實作。 競品覆蓋程度高： XML、重複 URL 與報告；本機規則驗證不是搜尋收錄診斷。

提升／重新納入條件：以真實 sitemap 證明靜態 path tree/診斷優於既有工具；live crawl 與收錄不是本卡承諾。

來源：[來源 1](https://www.drupal.org/project/simple_sitemap/issues/3178229)、[來源 2](https://ai-chain.tw/tools/sitemap-validator/)、[來源 3](https://freetooldev.com/tools/sitemap-validator.html)。詳細取證見 [demand-existing-core.md](demand-existing-core.md)。

### STW-18 — Monorepo 相依圖與重複套件追蹤

Low；defer；ordinal 118。Nx 已提供圖、依賴路徑與靜態輸出；跨 package-manager 重複套件追蹤需 repo 整合，流量入口未證實。

提升／重新納入條件：取得 Nx 現有流程不能完成且使用者要獨立工具的跨 workspace 案例。

來源：[來源 1](https://nx.dev/docs/features/explore-graph)。詳細取證見 [demand-other-cards.md](demand-other-cards.md)。

### STW-19 — Bundle 變化分析：從體積增加追到套件與入口

Low；defer；ordinal 119。RelativeCI 已有跨 build 資產與模組、重複套件分析；需要 build metadata 的導入成本不能當成搜尋流量。

提升／重新納入條件：以同一組 build 報告證明歸因品質或比較成本的增量；不要用單套件體積取代真實 build。

來源：[來源 1](https://relative-ci.com/documentation/metrics-and-data)。詳細取證見 [demand-other-cards.md](demand-other-cards.md)。

### STW-20 — 未使用程式碼與相依套件的審查工作流程

Low；defer；ordinal 120。真實 issue #589（2024-04-08，已關閉）及 #1732（2026-05-08，已關閉）顯示誤報問題；Knip 已有 entry/plugin 診斷，不能把舊 bug 視為現行未解市場缺口。

提升／重新納入條件：證明現行版本可重現的複核負擔，先評估整合現成分析器，而非重寫。

來源：[來源 1](https://knip.dev/guides/handling-issues)、[來源 2](https://github.com/webpro-nl/knip/issues/589)、[來源 3](https://github.com/webpro-nl/knip/issues/1732)。詳細取證見 [demand-other-cards.md](demand-other-cards.md)。

### STW-21 — 驗證 TypeScript 型別展開與錯誤解釋工具的價值

Low；defer；ordinal 121。Low 延後研究 spike，不把研究驗收當功能完成，也不因生成式 AI 而刪除。原生能力削弱泛用展開器差異，IDE 開發成本對流量站較高。 VS Code 舊使用者 issue 有明確需求；TypeScript 5.9 已預覽 expandable hovers；2026 Zed issue 指向特定 IDE 差異。

提升／重新納入條件：原卡至少 5 個真實複雜型別案例；比較指定版本 VS Code/TS 原生展開與候選流程，能證明理解時間改善且有可取得的流量入口。

來源：[來源 1](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)、[來源 2](https://github.com/microsoft/vscode/issues/94679)、[來源 3](https://github.com/zed-industries/zed/issues/47360)。詳細取證見 [demand-pruning.md](demand-pruning.md)。

### STW-22 — 元件 Props 文件與使用範例的同步檢查

Low；defer；ordinal 122。Storybook Autodocs 已從 metadata 產生 props/controls/stories；同步需求屬專案工作流，尚無獨立站入口證據。

提升／重新納入條件：取得特定框架文件漂移與現成工具無法處理案例，保留原同步 AC。

來源：[來源 1](https://storybook.js.org/docs/writing-docs/autodocs)。詳細取證見 [demand-other-cards.md](demand-other-cards.md)。

### STW-23 — Webhook 收件、遮蔽與受控重送工作台

Low；defer；ordinal 123。Webhook.site 已有擷取、篩選與 replay；服務營運與敏感資料責任高。需求可能真實，但本站差異與獲客成本未證實。

提升／重新納入條件：證明特定事件調查或可覆核遮蔽流程優於既有工具，並估算每次使用成本。

來源：[來源 1](https://docs.webhook.site/custom-actions)、[來源 2](https://docs.webhook.site/news.html)。詳細取證見 [demand-other-cards.md](demand-other-cards.md)。

### STW-24 — 可切換情境的 OpenAPI Mock API 服務

Low；defer；ordinal 124。Prism 已有可呼叫 mock server 與驗證；#2723 為 Node 版本相容問題，不是另造服務需求。

提升／重新納入條件：取得 Prism／既有 hosted mock 的實際未解流程，與 fixture 卡分開計算營運成本。

來源：[來源 1](https://github.com/stoplightio/prism/blob/main/docs/guides/01-mocking.md)、[來源 2](https://github.com/stoplightio/prism/issues/2723)。詳細取證見 [demand-other-cards.md](demand-other-cards.md)。

### STW-25 — API 回應時間與可用性的輕量監測

Low；defer；ordinal 125。Uptime Kuma 已支援 HTTP/JSON query 等監控及通知；需要持續執行服務，無證據支持作工具站首波。

提升／重新納入條件：取得特殊監控工作與分發管道，證明既有 self-hosted／hosted 方案無法滿足。

來源：[來源 1](https://github.com/louislam/uptime-kuma)。詳細取證見 [demand-other-cards.md](demand-other-cards.md)。

### STW-30 — 加密環境設定的本機交接與部署預檢

Low；defer；ordinal 130。SOPS 已支援 dotenv 與 exec-env；交接／部署前檢查仍可能成立，但信任、金鑰與 runtime 整合負擔高。

提升／重新納入條件：取得有界交接失敗案例與採用意願，沿用成熟格式，不新增自製密碼格式。

來源：[來源 1](https://getsops.io/docs/)、[來源 2](https://getsops.io/docs/usage/advanced/)。詳細取證見 [demand-other-cards.md](demand-other-cards.md)。

### STW-32 — Dockerfile 變更預檢與掃描結果整合

Low；defer；ordinal 132。Hadolint 已有 CLI 與官方線上版本；整合掃描和可追溯修正不是 AI 文案，但無工具站新增價值證據。

提升／重新納入條件：用真實 Dockerfile 對照現成 lint/scan，證明錯誤優先排序或核對省時。

來源：[來源 1](https://github.com/hadolint/hadolint)。詳細取證見 [demand-other-cards.md](demand-other-cards.md)。

### STW-33 — 驗證截圖轉元件草稿與視覺差異檢查的可行性

Low；defer；ordinal 133。Low 延後研究 spike；不投入泛截圖生成器，不刪除既有評估義務，也不宣稱視覺差異等於功能正確。 v0 官方文件已有截圖生成，專業服務供給存在；這不是本卡評估矩陣已被實現的證據。

提升／重新納入條件：合法固定樣本實測 v0 等基準，分別量測四種結果及成本；只有在特定缺口有可重現改善及需求證據時再開發。

來源：[來源 1](https://v0.app/docs/screenshots)、[來源 2](https://screenshottocode.com/)。詳細取證見 [demand-pruning.md](demand-pruning.md)。

### STW-35 — 圖片色盤到可讀的介面配色與 token 匯出

Low；defer；ordinal 135。原通用流程已有直接覆蓋；目前需求主要來自工具作者自身敘述。可保留工具站輔助功能，但不當獨立優先流量項目。 競品覆蓋程度高：對比矩陣、CSS/JSON/DTCG 匯出與本機保存已有產品。

提升／重新納入條件：真實品牌圖片到語意 token 交付需證明比現成配色工具少返工；矩陣與匯出本身不是差異。

來源：[來源 1](https://github.com/5t3ph/a11y-color-tokens)、[來源 2](https://colortable.org/palette/)、[來源 3](https://palette.ikit.app/?lang=zh_TW)。詳細取證見 [demand-existing-core.md](demand-existing-core.md)。

### STW-36 — Markdown 文件的相對連結與 anchor 批次檢查

Low；defer；ordinal 136。Lychee 已支援 Markdown 相對檔案與 fragment 檢查；目前文件亦明示 renderer-specific 限制。以原卡 CLI/CI 整合範圍保留，非流量主力。

提升／重新納入條件：取得指定 renderer 的現行可重現漏判，以及願意改用工具的使用者。

來源：[來源 1](https://lychee.cli.rs/recipes/anchors/)、[來源 2](https://lychee.cli.rs/guides/cli/)。詳細取證見 [demand-other-cards.md](demand-other-cards.md)。

### STW-37 — SemVer 範圍與升級條件的互動式檢查

Low；defer；ordinal 137。不要因有真實困惑就升級主力。原版列為輔助／教學頁；只有相依衝突案例證明可減少誤判才重評。 競品覆蓋程度高： range testing；交集工具亦出現在搜尋，完整語意待驗證。

提升／重新納入條件：使用真實 prerelease／相依衝突案例，對照 node-semver、npm calculator 與現成互動工具，證明可減少誤判。

來源：[來源 1](https://github.com/npm/node-semver/issues/721)、[來源 2](https://semver.npmjs.com/)、[來源 3](https://www.devtools.tools/semver-range-intersection)。詳細取證見 [demand-existing-core.md](demand-existing-core.md)。

### STW-2 — YAML 轉 .env：預覽扁平化規則與鍵名衝突

Low；archive；ordinal 902。排除獨立開發排程；可能併入 STW-1 的設定前處理，但不擴充其 AC。不是判定無需求，也不是泛稱 AI 全面替代。 核心搜尋找到多個直接轉換產品及開源 repo；沒有取得獨立使用者頻率或搜尋量。

提升／重新納入條件：至少 3 個真實部署轉換案例，證明免費基準發生可重現資料遺失／碰撞且願重複使用；再補對應 query 需求證據。

來源：[來源 1](https://github.com/shirocola/yaml-to-env-converter)、[來源 2](https://jsonkit.com/yaml-to-env)。詳細取證見 [demand-pruning.md](demand-pruning.md)。

### STW-4 — Markdown 表格整理與 JSON／試算表文字互轉

Low；archive；ordinal 904。排除獨立排程，將來作 CSV 資料驗收的輸入／匯出附屬能力；競品已有預覽、編輯及多格式。 英文與繁中均有直接工具結果，說明產品供給與意圖匹配，不能推出流量大小。

提升／重新納入條件：以 3 組含前導零／重複欄名／特殊符號資料驗證基準不足，且能證明該缺口帶來增量流量或留存。

來源：[來源 1](https://tableconvert.com/markdown-to-json)、[來源 2](https://mdtoword.org/zh-TW/markdown-to-json)。詳細取證見 [demand-pruning.md](demand-pruning.md)。

### STW-9 — CSS 轉 Tailwind v4：支援範圍內轉換與未轉換項目清單

Low；archive；ordinal 909。排除獨立排程，因 v4、arbitrary 與未轉換清單已是現成工具宣告能力，已缺乏可辨認差異。 多個現成工具明確針對 v4 與逐項映射；未取得可靠使用頻率。

提升／重新納入條件：找到現有免費工具對本卡支援子集持續失敗的實例，並有可驗證的遷移需求／省時幅度。

來源：[來源 1](https://dozenkit.com/tools/css-to-tailwind)、[來源 2](https://www.tailwindready.com/tools/css-to-tailwind-converter)。詳細取證見 [demand-pruning.md](demand-pruning.md)。

### STW-26 — API Rate Limit 模擬器：突發流量與等待時間預覽

Low；archive；ordinal 926。The Infinity 已有三種演算法、burst 流量與允許／拒絕預覽；互動本身不足差異，本輪未找到本站增量需求。

提升／重新納入條件：重新納入須有真實流量案例與現成 simulator 缺口，不能只做動畫／演算法解說。

來源：[來源 1](https://theinfinity.dev/simulators/rate-limiter)、[來源 2](https://github.com/request-routing/ratelimit-simulator)。詳細取證見 [demand-other-cards.md](demand-other-cards.md)。

### STW-29 — API 範例推導 TypeScript／Zod：呈現型別依據與不確定性

Low；archive；ordinal 929。排除獨立生成器排程；保留樣本追溯研究線索，可未來與 STW-3 schema drift 評估整合。 quicktype 官方直接涵蓋多樣本、missing/null、union、Zod；Schemato 亦宣告多樣本瀏覽器輸出。

提升／重新納入條件：至少 3 組真實 API 樣本能展示基準誤推造成實際返工，且來源追溯比現成工具可量測改善；不能只重述多樣本。

來源：[來源 1](https://quicktype.io/)、[來源 2](https://github.com/weitaishan/schemato)。詳細取證見 [demand-pruning.md](demand-pruning.md)。

### STW-31 — Git 變更紀錄整理與可審查的 Release Notes 草稿

Low；archive；ordinal 931。排除獨立流量工具投資；本卡為確定性 CLI/CI 工作，不能用純 AI 摘要理由排除。 GitHub 原生與 git-cliff 已提供來源連結、分組／設定／草稿等流程；沒有本專案額外取得使用者證據。

提升／重新納入條件：至少 3 個真實 release 範圍能證明 git-cliff／原生流程造成可重現錯漏，且專用審查能省下顯著維護成本。

來源：[來源 1](https://github.com/orhun/git-cliff)、[來源 2](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes)。詳細取證見 [demand-pruning.md](demand-pruning.md)。

