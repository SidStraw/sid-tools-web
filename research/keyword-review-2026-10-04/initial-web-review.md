> 歷史快照：第一輪只選 Web 的篩選結果，已由同日的 monorepo／Web 優先方向取代。請以 [目前總覽](README.md) 為準；以下數量與判斷保留供追溯。

# 關鍵字分析與 Backlog 題目篩選

分析日期：2026-10-04。來源：[SidStraw/keyword-pipeline-auto](https://github.com/SidStraw/keyword-pipeline-auto)，固定 commit：[`2fe7b09f59f7`](https://github.com/SidStraw/keyword-pipeline-auto/tree/2fe7b09f59f721a02c558cbd6f73cc8f218ce007)。

## 結論

從 **239 份報告、4,021 筆可讀取紀錄、1,766 個唯一關鍵字**，保留 **17 個工具題目**，合併 **202 個相關唯一關鍵字**，其餘 **1,564 個唯一詞暫不建立卡片**。重複出現的同一詞共減少 2,255 筆；保留群組內的不同說法再合併為題目，沒有依每個 `online`／`free`／`tool` 變體各開卡。

卡片 **STW-1～STW-17** 已透過 Backlog.md CLI 建立；6 張 High、11 張 Medium，皆為 **Needs Refinement**。優先順序代表先驗證哪個產品情境，不代表已證實搜尋量、排名機會或付費意願。

目前專案原為空目錄，因此本次以「可在瀏覽器完成一次明確工作的開發工具網站」作為可調整的篩選假設；未預設 Vue／React、後端或部署平台。

## 資料覆蓋與可信度

| 項目 | 結果 |
|---|---:|
| 原始報告區間（UTC） | 2026-01-13～2026-09-08 |
| main 快照內 Markdown 報告 | 239 |
| logs/index.json 與實際報告清單 | 完全一致 |
| 含 All Keywords 表格 | 237 |
| 僅保存 Top 5 的早期報告 | 2 |
| 各報告宣告 Keywords found 合計 | 4,046 |
| 可逐筆讀取的關鍵字紀錄 | 4,021 |
| 未保存完整明細、無法還原 | 25 |
| 正規化後唯一詞（小寫、合併空白） | 1,766 |
| competition = 0 的可讀取紀錄 | 3,090（約 76.8%） |

最早兩份 [logs/2026_01/13_055344.md](https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/13_055344.md) 與 [logs/2026_01/14_035354.md](https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/14_035354.md) 各只保存 5 筆，宣告總數分別為 16 與 19。缺少的 11 + 14 筆沒有補造，也沒有從 AI 摘要反推成原始量測。其餘 237 份皆核對表格列數與報告總數一致。

只分析此 commit 中已提交的報告，不宣稱涵蓋未提交的 Google Sheets、失敗的 Actions 執行或後續日期。AI 摘要與 seeds 用於理解資料產生流程，沒有當成新增的搜尋證據。

### 已證實的來源限制

1. **competition 不是完整競爭度，也不是搜尋量。** [keywordService.ts 第 66–84 行](https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/src/services/keywordService.ts#L66-L84) 使用回傳 organic 的筆數，10 筆被換成 100。來源只保存通過篩選的資料，並非市場全樣本。
2. **API 錯誤會被寫成 0。** [第 85–96 行](https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/src/services/keywordService.ts#L85-L96) 的 catch 回傳 0，之後仍可能通過 [低競爭篩選](https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/src/index.ts#L217-L224)。不能區分哪些歷史 0 是無結果、哪些是 API 錯誤。
3. **2026-06～09 的 2,166 筆可讀取紀錄全部為 0。** 這是資料品質警訊，但沒有歷史原始 API 回應，不能斷言這些紀錄全都失敗。
4. **取樣本身有偏差。** 每個 AI／人工 seed 最多取前 5 個建議；[AI 摘要僅取得前 10 個詞與彙總統計](https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/src/services/aiService.ts#L131-L146)。同一 pipeline 的反覆出現不能當成多個獨立使用者的需求。
5. **AI 的排名及營收敘述未獲驗證。** 不採用摘要中的「藍海」、「保證首頁」或推測搜尋量排序；本次也沒有取得 Search Console、Keyword Planner 或轉換率資料。

## 如何篩選

以人工判斷挑出具體情境，再用規則協助逐詞歸類並檢查合併清單。每個唯一詞都有去向、理由、出現次數、來源首末日期及可對應的 task ID，保存在 [keyword-decisions.json](keyword-decisions.json)。規則分類不是另一個需求驗證模型。

保留條件：

- 能說清楚誰在什麼工作步驟，提供什麼輸入，想得到什麼可用成果。
- 可先做範圍受控的瀏覽器工具，不以長期伺服器、帳號串接或秘密保管作為起點。
- 有具體的操作價值假設，例如檢查衝突、減少差異雜訊、揭露有損轉換；不能只有「又一個 converter」。
- 可寫出客觀驗收條件，且能誠實呈現不支援／無法判斷的情況。
- 原始紀錄至少能支持相關意圖；資料稀少仍可保留，但需明示證據薄弱。

High 的 6 張優先驗證操作情境與首版範圍；Medium 題目通常有更高格式／語意維護成本，或需要先證明相較現有工具的額外價值。原始 competition 與詞頻沒有用來宣稱 SEO 報酬。

## 保留題目與卡片

「詞數／報告數」僅統計本輪真正合併至該題目的原始資料，不包含已排除的語言外掛、平台導向及偏題詞。不同卡片可出現在同一份報告，報告數不能直接相加。

| 卡片 | 優先 | 題目 | 詞數／報告數 |
|---|---|---|---:|
| [STW-1](../../backlog/tasks/stw-1%20-%20環境設定預檢：比對-.env-範本、缺漏與重複鍵.md) | High | 環境設定預檢：比對 .env 範本、缺漏與重複鍵 | 16／37 |
| [STW-2](../../backlog/archive/tasks/stw-2%20-%20YAML-轉-.env：預覽扁平化規則與鍵名衝突.md) | High | YAML 轉 .env：預覽扁平化規則與鍵名衝突 | 8／17 |
| [STW-3](../../backlog/tasks/stw-3%20-%20API-JSON-差異比較：忽略動態欄位並依識別鍵對齊陣列.md) | High | API JSON 差異比較：忽略動態欄位並依識別鍵對齊陣列 | 5／3 |
| [STW-4](../../backlog/archive/tasks/stw-4%20-%20Markdown-表格整理與-JSON／試算表文字互轉.md) | High | Markdown 表格整理與 JSON／試算表文字互轉 | 8／4 |
| [STW-5](../../backlog/tasks/stw-5%20-%20Cron-排程預覽：時區對照、下次執行與-DST-提示.md) | High | Cron 排程預覽：時區對照、下次執行與 DST 提示 | 48／33 |
| [STW-6](../../backlog/tasks/stw-6%20-%20OpenAPI-合約差異檢查：區分-request-與-response-的相容性.md) | High | OpenAPI 合約差異檢查：區分 request 與 response 的相容性 | 2／2 |
| [STW-7](../../backlog/tasks/stw-7%20-%20CSS-selector-比較：特異性拆解與-HTML-命中預覽.md) | Medium | CSS selector 比較：特異性拆解與 HTML 命中預覽 | 13／18 |
| [STW-8](../../backlog/tasks/stw-8%20-%20Docker-Compose-靜態預檢與服務相依圖.md) | Medium | Docker Compose 靜態預檢與服務相依圖 | 12／9 |
| [STW-9](../../backlog/archive/tasks/stw-9%20-%20CSS-轉-Tailwind-v4：支援範圍內轉換與未轉換項目清單.md) | Medium | CSS 轉 Tailwind v4：支援範圍內轉換與未轉換項目清單 | 13／61 |
| [STW-10](../../backlog/tasks/stw-10%20-%20Git-diff-檢視與可分享的確定性變更摘要.md) | Medium | Git diff 檢視與可分享的確定性變更摘要 | 9／11 |
| [STW-11](../../backlog/tasks/stw-11%20-%20GraphQL-schema-差異檢查與影響型別導覽.md) | Medium | GraphQL schema 差異檢查與影響型別導覽 | 11／9 |
| [STW-12](../../backlog/tasks/stw-12%20-%20PostgreSQL-EXPLAIN-計畫檢視：估計與實際執行差距.md) | Medium | PostgreSQL EXPLAIN 計畫檢視：估計與實際執行差距 | 5／2 |
| [STW-13](../../backlog/tasks/stw-13%20-%20SQL-DDL-轉-ER-關聯圖與可匯出的資料表文件.md) | Medium | SQL DDL 轉 ER 關聯圖與可匯出的資料表文件 | 20／11 |
| [STW-14](../../backlog/tasks/stw-14%20-%20OpenAPI-回應範例產生器：可驗證、可重現的-mock-fixture.md) | Medium | OpenAPI 回應範例產生器：可驗證、可重現的 mock fixture | 10／24 |
| [STW-15](../../backlog/tasks/stw-15%20-%20Markdown-轉-HTML-Email：表格、程式碼與複製預覽.md) | Medium | Markdown 轉 HTML Email：表格、程式碼與複製預覽 | 12／13 |
| [STW-16](../../backlog/tasks/stw-16%20-%20Lighthouse-報告比較：區分指標變化與測試條件差異.md) | Medium | Lighthouse 報告比較：區分指標變化與測試條件差異 | 3／1 |
| [STW-17](../../backlog/tasks/stw-17%20-%20Sitemap-XML-預檢與站點結構瀏覽.md) | Medium | Sitemap XML 預檢與站點結構瀏覽 | 7／3 |

每張卡片包含使用情境、保留理由、首版邊界、差異假設、代表關鍵字、固定 commit 的來源連結與 5 項未勾選驗收條件。API diff 只有 3 份相關報告，OpenAPI diff／SQL plan 各 2 份，Lighthouse 比較只有 1 份，尤其需要先驗證需求，不能以技術可行就認定有市場。

例如 Cron builder／validator／translator／visualizer 合併為同一張排程預覽卡；CSS to Tailwind 的 13 個變體合併為 STW-9。資料庫 schema 圖、SQL 執行計畫、GraphQL schema diff 分別解決結構理解、執行診斷與契約變更，因此沒有只因含 schema／SQL 就硬合成一張。

## 暫不建立卡片的主要類型

下表的筆數是唯一關鍵字，每個詞只列入一個最先符合的理由；「排除」表示本輪不開卡，並非斷言該題目永遠沒有價值。

| 分類 | 唯一詞數 | 理由 |
|---|---:|---|
| `secret-management` | 19 | 暫不納入：加密、vault 與 rotation 涉及金鑰管理及持續信任成本；已有專門工具，保留 .env 靜態預檢即可。 |
| `information` | 177 | 排除獨立題目：概念、範例、教學或排錯文章意圖，尚不足以成立新的互動工具。 |
| `generic-utility` | 443 | 暫不納入：是可做的泛用工具，但本批資料尚未形成清楚差異或優先於已保留情境的價值。 |
| `ai-or-unproven` | 90 | 暫緩：需 AI 推論、真實 runtime 或產品整合驗證，原始關鍵字不足以支持可靠自動化承諾。 |
| `navigation` | 171 | 排除獨立題目：主要尋找既有產品、套件、平台外掛或指令；可保留為背景參考。 |
| `insufficient-intent` | 32 | 暫不納入：未形成輸入、輸出與價值均明確的工具情境；這是本輪篩選，不表示沒有市場。 |
| `off-topic` | 37 | 排除：搜尋建議偏離開發工具意圖，或與本專案無關。 |
| `infrastructure` | 166 | 暫緩：需真實 repo／build／服務環境、長期執行或外部資源；目前空專案不先承諾這類平台功能。 |
| `platform-specific` | 136 | 排除本輪：語言／平台特定實作不在本次保留題目的首版範圍，不為語言變體另開卡。 |
| `commodity-typegen` | 64 | 暫不納入：一般型別／schema 產生已有 quicktype 等工具，缺少足夠具體的新增價值。 |
| `semantic-conversion` | 106 | 暫緩：跨 SQL／GraphQL／ORM、TypeScript／OpenAPI 或平台格式的語意轉換有保真限制，不能把名稱相似當成可互轉。 |
| `native-conversion` | 19 | 暫不納入：OpenAPI 匯入 Postman 已有原生路徑；反向或其他跨協定轉換需先證明語意保真與額外需求。 |
| `commodity-regex` | 100 | 暫不納入：regex101 已有多引擎、解釋、除錯與測試流程；此批資料尚未證實另一個通用 regex 工具的差異。 |
| `unsafe-premise` | 4 | 排除：以 regex 防止 SQL injection 的前提不可靠，不將錯誤安全承諾產品化。 |

具體例子：

- **搜尋偏題**：`are airport security scanners safe`、`metal detector bundles for sale`、`lighthouse trackers vr`；不能因數字低就當成開發工具需求。
- **導航／教學詞**：`regex visualizer github`、`missing environment variable encryption_key langfuse`、`what is environment variable`；適合參考資料或文章，不直接建立工具卡。
- **成熟泛用工具**：Regex、JSON→TypeScript、JWT decoder、UUID／Base64、一般格式化；此批資料未提供足夠的差異化理由。
- **原生功能重複**：OpenAPI→Postman。反向轉換也不直接視為等價，需另證明保真需求。
- **維護與信任成本高**：env encryptor／vault、Webhook 收件平台、持續 API 監控、全 repo 相依／安全分析、Screenshot→Code、跨框架與資料庫遷移。
- **錯誤的安全承諾**：用 Regex 防止 SQL injection 的題目不保留；未因此擴大去修改來源 repo。

## 既有工具與官方文件抽查（2026-10-04）

這是針對重要重複項目的抽查，不是完整競品盤點或 Google SERP 排名調查。產品差異仍是本次推論。

| 一手來源 | 已確認事實 | 本次決策 |
|---|---|---|
| [regex101](https://regex101.com/) | 已提供多種引擎、規則解釋、除錯與測試相關功能。 | 不另開通用 Regex 工具卡。 |
| [quicktype](https://quicktype.io/) | 已能從 JSON 等輸入產生型別與驗證相關程式碼。 | 不將一般型別產生器列為優先題目。 |
| [Postman 匯入文件](https://learning.postman.com/docs/getting-started/importing-and-exporting/importing-data/) | 可直接將 OpenAPI specification 匯入為 collection。 | 排除只包裝相同流程的轉換器。 |
| [dotenvx 加密格式](https://dotenvx.com/docs/encrypted-env-file/) | 已有 .env 加密、私鑰與解密工作流程。 | 先保留靜態預檢，避免新建秘密管理服務。 |
| [crontab.guru](https://crontab.guru/) | 已提供 Cron 編輯與排程解釋。 | STW-5 必須驗證時區、DST 與繁中說明的額外價值。 |
| [Specificity Calculator](https://specificity.keegan.st/) | 已有視覺化特異性計算及 Selectors Level 4 支援。 | STW-7 聚焦命中預覽與解釋，仍需比較現有流程。 |
| [Diffchecker](https://www.diffchecker.com/) | 已提供一般文字與程式碼差異比較。 | STW-3／STW-10 需驗證 API 規則／交接摘要切角。 |
| [Confluence Cloud content body API](https://developer.atlassian.com/cloud/confluence/rest/v1/api-group-content-body/) | 格式轉換有明確支援矩陣與權限要求。 | 不把 Markdown→Confluence 當成低成本、全格式保真的工具。 |

## 使用 Backlog

```sh
pnpm install --frozen-lockfile
pnpm tasks
pnpm tasks:board
pnpm tasks:web
pnpm tasks:doctor
pnpm exec backlog task view STW-1 --plain
```

Backlog.md 以專案 devDependency 固定在 **1.53.0**，不是全域安裝。此目錄原無 Git，採官方 `--no-git` 模式；未建立 remote、commit 或 push。`auto_commit`、`remote_operations`、`check_active_branches` 皆為 false。

先比較真實使用情境與既有工具，確認單一候選的價值及範圍後，才轉為 To Do。已建立卡片不代表產品實作或市場驗證完成。

## 追溯檔案

- [source-evidence.json](source-evidence.json)：固定來源 commit、239 份報告的宣告／抽取數量，以及每個關鍵字的原始出處、competition 與覆蓋程度。
- [keyword-decisions.json](keyword-decisions.json)：1,766 個唯一詞的保留／排除理由、topic 與 task ID；不刪除低價值詞的稽核線索。
- [Backlog 卡片](../../backlog/tasks/)：17 張候選題目的目標與驗收條件。

## 核對結果

- 來源 index 與實際 239 份報告一致；237 份完整表格逐份列數相符，2 份部分保存的缺口列明。
- 1,766 個唯一詞都有且僅有一個篩選決策；202 個保留詞只對應一張候選卡。
- 17 張卡片有來源與驗收條件，均未標完成；卡片數、ID、優先順序與本文對照一致。
- `backlog doctor` 無重複 ID、自我相依或循環相依。
