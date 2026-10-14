# 37 張卡片逐項評估

日期：2026-10-14。使用者已確認不限制族群、以可驗證流量機會優先；本表限於原有 37 張偏技術題目的功能評估，不是全市場排序。依 Backlog CLI 取得完整描述與驗收條件；[原始快照](backlog-snapshot.json) 保留評估時狀態。以下均為分析建議，尚未修改卡片。

**A：優先取證候選（5）／B：條件式保留或群組支援（9）／C：後續專業流程（16）／D：排除獨立開發或併入（7）。** 這些分類不是搜尋量分級，也不是已決定開發。

AI 替代估計比較的是可執行程式、讀取檔案及呼叫工具的 AI；不是只會文字回答的模型。「中」表示仍可能被 AI 完成，但直接互動與反覆操作有待驗證的省時空間。成本為相對工程判斷，尚未估工。所有卡片的可取得搜尋流量、回訪率與收入均未知。

| 卡片 | 現有優先 | 建議 | AI 替代估計 | 成本估計 | 角色 | 理由 | 下一個決策門檻 |
|---|---|---|---|---|---|---|---|
| [STW-1 環境設定預檢](../../backlog/tasks/stw-1%20-%20環境設定預檢：比對-.env-範本、缺漏與重複鍵.md) | high | B | 中 | 低至中 | 支援 | 保留 .env 雙檔鍵名預檢；敏感資料留在瀏覽器與鍵名報告是便利性假說。 | 取得部署缺漏的真實樣本，與既有 CLI／AI 實際比較；沒有明顯省步驟就併入設定工具。 |
| [STW-2 YAML 轉 .env](../../backlog/archive/tasks/stw-2%20-%20YAML-轉-.env：預覽扁平化規則與鍵名衝突.md) | high | D | 高 | 中 | 併入 | YAML→.env 單純轉換難支撐獨立入口；衝突預檢可作 STW-1 的輸入功能。 | 只有證明獨立搜尋意圖與反覆批次需求，才恢復獨立頁。 |
| [STW-3 API JSON 差異比較](../../backlog/tasks/stw-3%20-%20API-JSON-差異比較：忽略動態欄位並依識別鍵對齊陣列.md) | high | A | 中 | 中 | 核心 | 保留 API 回歸比較；依 ID 對齊與忽略欄位已有底層工具，價值須來自可理解的規則預覽與重用。 | 比較真實亂序、動態欄位、大整數、重複 ID 案例；與 jsondiffpatch 介面及 AI 執行比較正確率、完成時間、重做成本。 |
| [STW-4 Markdown 表格整理與 JSON／試算表文字互轉](../../backlog/archive/tasks/stw-4%20-%20Markdown-表格整理與-JSON／試算表文字互轉.md) | high | D | 高 | 低至中 | 併入 | Markdown／TSV／JSON 表格轉換保留為輸出能力，降低獨立工具投資。 | 與試算表直接貼上、AI 轉換比較；只有大量資料保真或持續操作優勢才獨立。 |
| [STW-5 Cron 排程預覽](../../backlog/tasks/stw-5%20-%20Cron-排程預覽：時區對照、下次執行與-DST-提示.md) | high | A | 中 | 中 | 入口 | 保留雙時區、DST 邊界與可重現預覽；基本 Cron 翻譯不夠。 | 明示五欄方言與排程器規則，核對 DST 缺時／重複時間；比較現成預覽流程，未能省步驟則降級。 |
| [STW-6 OpenAPI 合約差異檢查](../../backlog/tasks/stw-6%20-%20OpenAPI-合約差異檢查：區分-request-與-response-的相容性.md) | high | B | 中 | 高 | 進階 | OpenAPI breaking changes 已有成熟 Web 工具；保留本機處理與可審查規則的差異假說。 | 以 oasdiff 作比較基準；先驗證相容性判斷與版本範圍，再評估瀏覽器執行成本。 |
| [STW-7 CSS selector 比較](../../backlog/tasks/stw-7%20-%20CSS-selector-比較：特異性拆解與-HTML-命中預覽.md) | medium | B | 中至高 | 中 | 支援 | 保留真實 DOM 命中互動；純 specificity 算分與文字解釋價值較弱。 | 使用者需在此完成比 DevTools／既有 calculator 更快的排錯；完整 cascade 留在範圍外。 |
| [STW-8 Docker Compose 靜態預檢與服務相依圖](../../backlog/tasks/stw-8%20-%20Docker-Compose-靜態預檢與服務相依圖.md) | medium | C | 中 | 中至高 | 後續 | Compose 語意與官方執行環境綁定；圖像展示可用，但目前與流量入口的關係尚弱。 | 先證明 Web 相依圖相較官方 CLI 對目標使用者的增量價值。 |
| [STW-9 CSS 轉 Tailwind v4](../../backlog/archive/tasks/stw-9%20-%20CSS-轉-Tailwind-v4：支援範圍內轉換與未轉換項目清單.md) | medium | D | 高 | 中至高 | 排除現案 | 小段 CSS→Tailwind 屬 AI 可直接產生程式碼的範圍；維護版本映射成本仍存在。 | 沒有真實轉換前後渲染驗證與反覆使用優勢，就不排入站點開發。 |
| [STW-10 Git diff 檢視與可分享的確定性變更摘要](../../backlog/tasks/stw-10%20-%20Git-diff-檢視與可分享的確定性變更摘要.md) | medium | D | 高 | 中 | 排除現案 | 單份 diff 的導航與確定性統計不足以成為獨立主力；摘要又容易被 AI 或既有審查介面替代。 | 只有證明敏感資訊清理後的跨團隊交接需求，才另評具體成果。 |
| [STW-11 GraphQL schema 差異檢查與影響型別導覽](../../backlog/tasks/stw-11%20-%20GraphQL-schema-差異檢查與影響型別導覽.md) | medium | B | 中 | 高 | 進階 | schema diff 有確定規則與反覆比較價值，但獨立受眾與現成工具差異未證實。 | 先用真實 schema migration 驗證 input/output nullability 與受影響操作導覽。 |
| [STW-12 PostgreSQL EXPLAIN 計畫檢視](../../backlog/tasks/stw-12%20-%20PostgreSQL-EXPLAIN-計畫檢視：估計與實際執行差距.md) | medium | C | 中 | 高 | 後續 | Postgres 計畫視覺化具價值，但 PEV2 已可離線使用；現案缺少明確新增成果。 | 須證明相較 PEV2 的可重現差異比較或診斷交接價值，不能只改外觀。 |
| [STW-13 SQL DDL 轉 ER 關聯圖與可匯出的資料表文件](../../backlog/tasks/stw-13%20-%20SQL-DDL-轉-ER-關聯圖與可匯出的資料表文件.md) | medium | B | 中 | 高 | 進階 | DDL→ER 圖有視覺操作與匯出價值；單純畫圖已有成熟方案。 | 以真實 PostgreSQL DDL 子集比較匯入保真、未支援項目揭露與 SVG 可讀性。 |
| [STW-14 OpenAPI 回應範例產生器](../../backlog/tasks/stw-14%20-%20OpenAPI-回應範例產生器：可驗證、可重現的-mock-fixture.md) | medium | B | 中至高 | 中至高 | 支援 | 固定 seed、schema 核對可作 API 工具群的延伸；生成範例本身容易替代。 | 先證明 schema 驗證與重現優於一次 AI 生成；來源 mock server 詞不能當 fixture 需求。 |
| [STW-15 Markdown 轉 HTML Email](../../backlog/tasks/stw-15%20-%20Markdown-轉-HTML-Email：表格、程式碼與複製預覽.md) | medium | C | 中至高 | 高 | 後續 | 價值在實際 Gmail／Outlook 貼上相容性；只轉 HTML 的增量弱，驗證矩陣成本高。 | 先取得真實郵件格式損壞案例與指定客戶端實測，再決定。 |
| [STW-16 Lighthouse 報告比較](../../backlog/tasks/stw-16%20-%20Lighthouse-報告比較：區分指標變化與測試條件差異.md) | medium | A | 中 | 中 | 接續 | 兩份 Lighthouse 報告先驗可比性再比較，有清楚的部署前後工作情境。 | 取得前後報告與故意不同設定樣本；比較人工／AI，驗證能否避免錯誤解讀與縮短查核。 |
| [STW-17 Sitemap XML 預檢與站點結構瀏覽](../../backlog/tasks/stw-17%20-%20Sitemap-XML-預檢與站點結構瀏覽.md) | medium | A | 中 | 中 | 入口 | Sitemap 批次路徑分布、重複與產物檢查適合網站上線流程；XML 語法檢查本身不足。 | 先驗證使用者會匯出 sitemap 並採用報告；搜尋需求若偏 live URL 檢查，不能拿離線 XML 工具冒充承接。 |
| [STW-18 Monorepo 相依圖與重複套件追蹤](../../backlog/tasks/stw-18%20-%20Monorepo-相依圖與重複套件追蹤.md) | low | C | 中 | 高 | 後續 | 真實 repo 相依關係有工程價值，但首版依賴 CLI 收集，與免安裝入口有落差。 | 證明固定 lockfile 的輸入摩擦與可讀圖收益，再評估可否改為瀏覽器匯入。 |
| [STW-19 Bundle 變化分析](../../backlog/tasks/stw-19%20-%20Bundle-變化分析：從體積增加追到套件與入口.md) | low | C | 中 | 高 | 後續 | Bundle 歸因需要完整 build metadata；可接 STW-16，但先聚焦其單獨成功場景。 | 與現有 bundler 報告對比，證明能找到跨版本新增負擔且不受建置條件誤導。 |
| [STW-20 未使用程式碼與相依套件的審查工作流程](../../backlog/tasks/stw-20%20-%20未使用程式碼與相依套件的審查工作流程.md) | low | C | 中 | 高 | 後續 | 未使用程式碼審查是 repo 工作流程產品；不因 AI 可讀程式就否定，但現階段不是低摩擦流量入口。 | 以 Knip 等現成引擎比對審查時間、誤判處理、baseline；不先重造分析器。 |
| [STW-21 驗證 TypeScript 型別展開與錯誤解釋工具的價值](../../backlog/tasks/stw-21%20-%20驗證-TypeScript-型別展開與錯誤解釋工具的價值.md) | low | C | 中至高 | 高 | 後續探索 | 實際 TypeScript compiler 展開仍有價值；單純錯誤解釋替代風險高，IDE 路徑較重。 | 沿用既有 spike：取得複雜型別案例與 compiler 版本比較，再決定是否值得做成 Web 示範入口。 |
| [STW-22 元件 Props 文件與使用範例的同步檢查](../../backlog/tasks/stw-22%20-%20元件-Props-文件與使用範例的同步檢查.md) | low | C | 中 | 高 | 後續 | Props 文件同步需要專案脈絡與框架支援，偏團隊開發流程。 | 先證明既有文件工具未解的 drift 查核場景，再投入首個框架。 |
| [STW-23 Webhook 收件、遮蔽與受控重送工作台](../../backlog/tasks/stw-23%20-%20Webhook-收件、遮蔽與受控重送工作台.md) | low | C | 較低但可整合 | 高 | 後續服務 | 真實接收與重送具有持續服務價值，AI 需接收端才能完成；但託管成本與濫用控制是獨立產品責任。 | 明確選本機／自架／公開託管，證明相較 Webhook.site 的交接需求後再排。 |
| [STW-24 可切換情境的 OpenAPI Mock API 服務](../../backlog/tasks/stw-24%20-%20可切換情境的-OpenAPI-Mock-API-服務.md) | low | C | 較低但可整合 | 高 | 後續服務 | 可呼叫 Mock API 的 runtime 有持續價值；首期工具站不宜同時承擔服務營運。 | 比較 Prism 及既有流程的情境切換成本，確認真實會回訪的使用需求。 |
| [STW-25 API 回應時間與可用性的輕量監測](../../backlog/tasks/stw-25%20-%20API-回應時間與可用性的輕量監測.md) | low | C | 較低但可整合 | 高 | 後續服務 | 持續監控超過單次 AI 回答，但需要排程、保留、告警與營運，不能以抗 AI 直接排高。 | 確認願持續使用的 endpoint 場景及成本；另評服務策略。 |
| [STW-26 API Rate Limit 模擬器](../../backlog/archive/tasks/stw-26%20-%20API-Rate-Limit-模擬器：突發流量與等待時間預覽.md) | medium | B | 中 | 中 | 互動內容 | 限流時序模擬具互動教學價值；尚無搜尋量及重複使用證據。 | 觀察使用者是否會改參數比較方案及匯出，而非只閱讀算法解釋。 |
| [STW-27 Markdown 到 Confluence 的格式損失預檢與匯入輔助](../../backlog/tasks/stw-27%20-%20Markdown-到-Confluence-的格式損失預檢與匯入輔助.md) | medium | C | 中 | 高 | 後續整合 | 平台格式損失預檢可有移轉價值；平台版本、實際驗證與帳號操作拉高成本。 | 取得 Confluence 實際移轉案例，先證明損失清單可行動，避免包裝普通 converter。 |
| [STW-28 Markdown 到 Notion 的批次結構與連結保留檢查](../../backlog/tasks/stw-28%20-%20Markdown-到-Notion-的批次結構與連結保留檢查.md) | medium | C | 中 | 高 | 後續整合 | Notion 已有 Markdown／ZIP 匯入；值得驗證的是原生功能留下的連結與附件損失。 | 依既有 AC 用三組文件比較原生匯入，無額外價值即停止；不先重造匯入器。 |
| [STW-29 API 範例推導 TypeScript／Zod](../../backlog/archive/tasks/stw-29%20-%20API-範例推導-TypeScript／Zod：呈現型別依據與不確定性.md) | medium | D | 高 | 中至高 | 併入或停止 | quicktype 已支援多樣本、optional／null 與型別生成；現案主張重疊大。 | 只保留使用者能核對每欄證據的 schema drift 作為 STW-3 延伸假說；須與 quicktype 實測。 |
| [STW-30 加密環境設定的本機交接與部署預檢](../../backlog/tasks/stw-30%20-%20加密環境設定的本機交接與部署預檢.md) | low | C | 中 | 高 | 後續 | 加密設定交接有敏感工作流程價值，但導入與信任成本高。 | 先鎖定一種既有格式與真實交接失敗案例；與 STW-1 分開評估。 |
| [STW-31 Git 變更紀錄整理與可審查的 Release Notes 草稿](../../backlog/archive/tasks/stw-31%20-%20Git-變更紀錄整理與可審查的-Release-Notes-草稿.md) | low | D | 高 | 中 | 排除現案 | Release Notes 草稿與分類已被原生 GitHub 及 AI 覆蓋相當部分，現案無明確流量增量。 | 只有具體跨 package 審查痛點且現成方案無法省時時再評。 |
| [STW-32 Dockerfile 變更預檢與掃描結果整合](../../backlog/tasks/stw-32%20-%20Dockerfile-變更預檢與掃描結果整合.md) | low | C | 中 | 高 | 後續 | 有版本與位置的掃描整合具工程價值，但屬 CI 審查且維護多工具契約。 | 先以既有 linter／scanner 的實際結果驗證一個審查需求。 |
| [STW-33 驗證截圖轉元件草稿與視覺差異檢查的可行性](../../backlog/tasks/stw-33%20-%20驗證截圖轉元件草稿與視覺差異檢查的可行性.md) | low | D | 高 | 高 | 排除現案 | 截圖生成元件直接競爭 AI 核心能力，且還要支付推論與渲染成本；不適合作為這輪主題。 | 若另有真實設計驗收需求，應先提出不同成果，不能以換模型包裝現案。 |
| [STW-34 批次圖片最佳化](../../backlog/tasks/stw-34%20-%20批次圖片最佳化：依目標大小與尺寸預算匯出.md) | medium | A | 中 | 中至高 | 入口 | 真實圖片、批次預算、逐檔是否達標與 ZIP 匯出有直接操作價值；通用壓縮本身競爭成熟。 | 與 Squoosh 等基準及 AI 檔案處理比較整批達標率、品質與時間；驗證容量限制。 |
| [STW-35 圖片色盤到可讀的介面配色與 token 匯出](../../backlog/tasks/stw-35%20-%20圖片色盤到可讀的介面配色與-token-匯出.md) | medium | B | 中至高 | 中 | 支援 | 互動取色、對比條件與 token 一致性可接素材流程；只生成配色容易替代。 | 使用真實品牌素材，證明預覽→修正→匯出的時間優勢；不宣稱整站無障礙通過。 |
| [STW-36 Markdown 文件的相對連結與 anchor 批次檢查](../../backlog/tasks/stw-36%20-%20Markdown-文件的相對連結與-anchor-批次檢查.md) | low | C | 中 | 中至高 | 後續 | 批次相對連結需要 repo 與 renderer 規則，有價值但原交付是 CLI／CI。 | 驗證 ZIP／資料夾的瀏覽器匯入是否更低摩擦，否則留後續工程工具線。 |
| [STW-37 SemVer 範圍與升級條件的互動式檢查](../../backlog/tasks/stw-37%20-%20SemVer-範圍與升級條件的互動式檢查.md) | medium | B | 中至高 | 低至中 | 支援 | SemVer 互動比較可作輕量支援頁；npm 官方已有 calculator，普通匹配查詢難獨立競爭。 | 聚焦兩範圍差異、0.x／prerelease 的可見集合，與官方工具比較完成時間。 |

競品能力的第一手依據見 [競品查證](competitor-evidence.md) 與 [研究總結](README.md)。未被當輪抽查的比較基準只列為後續需實測對象，不宣稱已完成全市場分析。
