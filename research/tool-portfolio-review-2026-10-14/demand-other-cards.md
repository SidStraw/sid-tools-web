# 其餘 16 張卡：供給與需求初篩

查詢日 2026-10-14。英文為主，STW-1/7/26 另查繁中措辭；未設定國家，不能當作台灣排名。官方產品說明不是操作驗收；搜尋摘要亦非功能測試。沒有可比較月搜尋量。STW-1 的 OnlineToolKitHub 與 STW-7 的 Toolinix open 失敗，未把它們作已驗證完整覆蓋依據，改參考列出的供應商頁搜尋內容。

低優先不是判定無市場，而是目前缺少值得此工具站投入的證據。僅 STW-26 有直接重疊的互動產品頁，且無獨立增量證據，先歸檔。其餘流程保留但暫緩。

## STW-1 — Low / defer

- 查詢：`env file compare missing variables dotenv validator online`；`env 範本 比對 缺少 變數 工具`
- 判斷：範本比對、缺漏與值差異已有瀏覽器及 VS Code 產品；本輪未找到獨立使用者願意改用本站的證據。
- 需求證據：本輪未建立獨立需求證據；月搜尋量未知。
- 重新提升條件：以真實部署案例證明既有工具無法處理的語法或重跑流程；本機／遮蔽本身不算差異。
- 來源：[來源 1](https://www.utility-grid.com/tools/developer/env-file-compare)、[來源 2](https://marketplace.visualstudio.com/items?itemName=takeaseat-venture.env-diff)

## STW-7 — Low / defer

- 查詢：`CSS selector specificity test HTML matches online`；`CSS 權重 選擇器 測試 工具`
- 判斷：權重計算與 DOM match 工具供給密集；未取得需要整合兩者的獨立需求，亦未實跑競品。
- 需求證據：本輪未建立獨立需求證據；月搜尋量未知。
- 重新提升條件：取得真實錯誤定位任務，證明比瀏覽器 DevTools／既有 tester 更省步驟。
- 來源：[來源 1](https://toolhuben.com/css-specificity-calculator/)、[來源 2](https://www.toolhuben.com/css-selector-tester/)

## STW-8 — Low / defer

- 查詢：`site.docs.docker.com compose config validate`
- 判斷：官方 config 已含合併、插值與驗證；圖形仍可能有價值，但靜態 Web 與真實 Compose 環境語意差距未解除。
- 需求證據：有限直接回報；月搜尋量未知。
- 重新提升條件：取得不方便執行 Docker 的真實案例，驗證視覺圖是否比 config 輸出可理解。
- 來源：[來源 1](https://docs.docker.com/reference/cli/docker/compose/config)、[來源 2](https://www.reddit.com/r/docker/comments/1cm97c0)

## STW-11 — Low / defer

- 查詢：`GraphQL schema diff breaking changes online`；`site:the-guild.dev graphql inspector diff breaking changes`
- 判斷：Inspector 已含 breaking/dangerous/safe 分類、使用量規則與 CI；現卡影響導航的使用者增量未證實。
- 需求證據：本輪未建立獨立需求證據；月搜尋量未知。
- 重新提升條件：找實際 schema 審查，證明獨立 Web 導航比 Inspector／Hive 多完成一個必要任務。
- 來源：[來源 1](https://the-guild.dev/graphql/inspector/docs/commands/diff)

## STW-14 — Low / defer

- 查詢：`OpenAPI sample generator deterministic seed browser`
- 判斷：Redocly sampler 與 seeded mock 產品已有樣本生成；卡片的受限且經驗證 fixture 尚有品質假說，但無可比較流量證據。
- 需求證據：本輪未建立獨立需求證據；月搜尋量未知。
- 重新提升條件：用原 AC 範圍的 schema 比較有效率與錯誤定位；fixture 與 STW-24 server 保持區分。
- 來源：[來源 1](https://github.com/Redocly/openapi-sampler)、[來源 2](https://mock-server.com/versions/7.6.0/apidocs/org/mockserver/openapi/examples/SampleDataGenerator.html)

## STW-18 — Low / defer

- 查詢：`site:nx.dev project graph dependencies`
- 判斷：Nx 已提供圖、依賴路徑與靜態輸出；跨 package-manager 重複套件追蹤需 repo 整合，流量入口未證實。
- 需求證據：本輪未建立獨立需求證據；月搜尋量未知。
- 重新提升條件：取得 Nx 現有流程不能完成且使用者要獨立工具的跨 workspace 案例。
- 來源：[來源 1](https://nx.dev/docs/features/explore-graph)

## STW-19 — Low / defer

- 查詢：`site:relative-ci.com bundle stats compare`；`site:bundlejs.com compare bundle size`
- 判斷：RelativeCI 已有跨 build 資產與模組、重複套件分析；需要 build metadata 的導入成本不能當成搜尋流量。
- 需求證據：本輪未建立獨立需求證據；月搜尋量未知。
- 重新提升條件：以同一組 build 報告證明歸因品質或比較成本的增量；不要用單套件體積取代真實 build。
- 來源：[來源 1](https://relative-ci.com/documentation/metrics-and-data)

## STW-20 — Low / defer

- 查詢：`site:knip.dev unused dependencies exports`；`site:github.com knip false positives issues`
- 判斷：真實 issue #589（2024-04-08，已關閉）及 #1732（2026-05-08，已關閉）顯示誤報問題；Knip 已有 entry/plugin 診斷，不能把舊 bug 視為現行未解市場缺口。
- 需求證據：有限直接回報；月搜尋量未知。
- 重新提升條件：證明現行版本可重現的複核負擔，先評估整合現成分析器，而非重寫。
- 來源：[來源 1](https://knip.dev/guides/handling-issues)、[來源 2](https://github.com/webpro-nl/knip/issues/589)、[來源 3](https://github.com/webpro-nl/knip/issues/1732)

## STW-22 — Low / defer

- 查詢：`site:storybook.js.org docs automatic documentation props controls`
- 判斷：Storybook Autodocs 已從 metadata 產生 props/controls/stories；同步需求屬專案工作流，尚無獨立站入口證據。
- 需求證據：本輪未建立獨立需求證據；月搜尋量未知。
- 重新提升條件：取得特定框架文件漂移與現成工具無法處理案例，保留原同步 AC。
- 來源：[來源 1](https://storybook.js.org/docs/writing-docs/autodocs)

## STW-23 — Low / defer

- 查詢：`site:docs.webhook.site replay requests`
- 判斷：Webhook.site 已有擷取、篩選與 replay；服務營運與敏感資料責任高。需求可能真實，但本站差異與獲客成本未證實。
- 需求證據：本輪未建立獨立需求證據；月搜尋量未知。
- 重新提升條件：證明特定事件調查或可覆核遮蔽流程優於既有工具，並估算每次使用成本。
- 來源：[來源 1](https://docs.webhook.site/custom-actions)、[來源 2](https://docs.webhook.site/news.html)

## STW-24 — Low / defer

- 查詢：`site:github.com stoplight prism mock OpenAPI`；`site:github.com stoplightio prism deterministic mock issues`
- 判斷：Prism 已有可呼叫 mock server 與驗證；#2723 為 Node 版本相容問題，不是另造服務需求。
- 需求證據：有限直接回報；月搜尋量未知。
- 重新提升條件：取得 Prism／既有 hosted mock 的實際未解流程，與 fixture 卡分開計算營運成本。
- 來源：[來源 1](https://github.com/stoplightio/prism/blob/main/docs/guides/01-mocking.md)、[來源 2](https://github.com/stoplightio/prism/issues/2723)

## STW-25 — Low / defer

- 查詢：`site:github.com louislam uptime kuma features`
- 判斷：Uptime Kuma 已支援 HTTP/JSON query 等監控及通知；需要持續執行服務，無證據支持作工具站首波。
- 需求證據：本輪未建立獨立需求證據；月搜尋量未知。
- 重新提升條件：取得特殊監控工作與分發管道，證明既有 self-hosted／hosted 方案無法滿足。
- 來源：[來源 1](https://github.com/louislam/uptime-kuma)

## STW-26 — Low / archive

- 查詢：`rate limit simulator token bucket sliding window online`；`rate limit 模擬器 限流`
- 判斷：The Infinity 已有三種演算法、burst 流量與允許／拒絕預覽；互動本身不足差異，本輪未找到本站增量需求。
- 需求證據：本輪未建立獨立需求證據；月搜尋量未知。
- 重新提升條件：重新納入須有真實流量案例與現成 simulator 缺口，不能只做動畫／演算法解說。
- 來源：[來源 1](https://theinfinity.dev/simulators/rate-limiter)、[來源 2](https://github.com/request-routing/ratelimit-simulator)

## STW-30 — Low / defer

- 查詢：`site:getsops.io encrypted files dotenv`
- 判斷：SOPS 已支援 dotenv 與 exec-env；交接／部署前檢查仍可能成立，但信任、金鑰與 runtime 整合負擔高。
- 需求證據：本輪未建立獨立需求證據；月搜尋量未知。
- 重新提升條件：取得有界交接失敗案例與採用意願，沿用成熟格式，不新增自製密碼格式。
- 來源：[來源 1](https://getsops.io/docs/)、[來源 2](https://getsops.io/docs/usage/advanced/)

## STW-32 — Low / defer

- 查詢：`site:github.com hadolint hadolint Dockerfile linter`
- 判斷：Hadolint 已有 CLI 與官方線上版本；整合掃描和可追溯修正不是 AI 文案，但無工具站新增價值證據。
- 需求證據：本輪未建立獨立需求證據；月搜尋量未知。
- 重新提升條件：用真實 Dockerfile 對照現成 lint/scan，證明錯誤優先排序或核對省時。
- 來源：[來源 1](https://github.com/hadolint/hadolint)

## STW-36 — Low / defer

- 查詢：`site:lychee.cli.rs markdown fragments anchors`；`site:github.com lychee markdown anchors issues`
- 判斷：Lychee 已支援 Markdown 相對檔案與 fragment 檢查；目前文件亦明示 renderer-specific 限制。以原卡 CLI/CI 整合範圍保留，非流量主力。
- 需求證據：本輪未建立獨立需求證據；月搜尋量未知。
- 重新提升條件：取得指定 renderer 的現行可重現漏判，以及願意改用工具的使用者。
- 來源：[來源 1](https://lychee.cli.rs/recipes/anchors/)、[來源 2](https://lychee.cli.rs/guides/cli/)
