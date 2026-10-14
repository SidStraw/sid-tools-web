# 候選需求與競爭查證：轉換器、開發工具與文件移轉

查證日期：2026-10-14（Asia/Taipei）。涵蓋 13 張既有卡；本檔僅研究，沒有改卡或實作。

## 判讀界線

- 未取得 Keyword Planner、GSC 或可信月搜尋量／KD；不能據此預測 SEO 收益。
- web search 未固定國家／語言／裝置，不能稱 Google 台灣排名。
- 本輪沒有實際操作競品、上傳檔案、登入或建立產品原型。
- 產品頁僅證明對外宣告，不等於效能、正確性或完整 AC 驗收。
- 排除為本專案投資組合選擇，不等於市場無需求或 AI 已全面取代。
- 多數卡未取得獨立、近期、可計量的使用者需求；未找到不表示零需求。

## 投資組合建議

| 決策 | 卡片 | 優先序 |
| --- | --- | --- |
| 排除獨立排程／保留附屬能力線索 | STW-2、4、9、29、31 | Low |
| 保留特定差異驗證 | STW-10、12、13、15 | Low |
| 延後研究 spike | STW-21、33 | Low |
| 條件式保留移轉預檢驗證 | STW-27、28 | Medium |

STW-10 的確定性 diff 檢視、STW-31 的來源式 release 流程與 STW-12 的 EXPLAIN 解析均不是純 AI 文字生成。STW-21／33 的原卡要求研究結論，不可因有競品就把研究驗收當已完成。上述 Medium 是相較本組其他題目的研究投資順序；尚不足以凌駕全站其他有更強證據的候選。

## STW-2 YAML 轉 .env：預覽扁平化規則與鍵名衝突

**建議：exclude-standalone／low。**

搜尋意圖：設定檔搬移，需具體輸出。

本輪實際 queries：
- `yaml to env converter online flatten conflicts`
- `YAML 轉 env 工具`

**已觀察：** 核心搜尋找到多個直接轉換產品及開源 repo；沒有取得獨立使用者頻率或搜尋量。

**未證實差異：** 來源路徑對照、alias 拒絕與碰撞阻擋仍需實測；JsonKit 碰撞宣告只從搜尋擷取。

**判斷：** 排除獨立開發排程；可能併入 STW-1 的設定前處理，但不擴充其 AC。不是判定無需求，也不是泛稱 AI 全面替代。

**重啟／升級門檻：** 至少 3 個真實部署轉換案例，證明免費基準發生可重現資料遺失／碰撞且願重複使用；再補對應 query 需求證據。

來源：
- [yaml-repo](https://github.com/shirocola/yaml-to-env-converter) — 作者官方 GitHub README；日期：未標示；本輪查證 2026-10-14。web open 成功；README 宣告雙向、巢狀扁平化、引號、預覽及 Web／CLI。
- [yaml-jsonkit](https://jsonkit.com/yaml-to-env) — 產品第一手頁面搜尋擷取；日期：未標示；本輪查證 2026-10-14。搜尋擷取宣告雙底線、正規化與碰撞檢查；直接 open Internal Error，未核實實際行為。

## STW-4 Markdown 表格整理與 JSON／試算表文字互轉

**建議：exclude-standalone／low。**

搜尋意圖：表格資料在文件與試算表之間互轉。

本輪實際 queries：
- `markdown table JSON TSV converter online`
- `Markdown 表格 轉 JSON 線上`

**已觀察：** 英文與繁中均有直接工具結果，說明產品供給與意圖匹配，不能推出流量大小。

**未證實差異：** 重複欄名阻擋、前導零保留可能有差異，未操作比較。

**判斷：** 排除獨立排程，將來作 CSV 資料驗收的輸入／匯出附屬能力；競品已有預覽、編輯及多格式。

**重啟／升級門檻：** 以 3 組含前導零／重複欄名／特殊符號資料驗證基準不足，且能證明該缺口帶來增量流量或留存。

來源：
- [tableconvert](https://tableconvert.com/markdown-to-json) — 產品第一手頁面；日期：未標示；本輪查證 2026-10-14。web open 成功；提供 Markdown／JSON 與線上表格編輯。
- [table-zh](https://mdtoword.org/zh-TW/markdown-to-json) — 產品第一手頁面搜尋擷取；日期：未標示；本輪查證 2026-10-14。有繁中介面；宣告預覽與重複／空白表頭正規化，與本卡阻擋處理不完全相同。

## STW-9 CSS 轉 Tailwind v4：支援範圍內轉換與未轉換項目清單

**建議：exclude-standalone／low。**

搜尋意圖：將小段 CSS 搬至指定 Tailwind 版本。

本輪實際 queries：
- `CSS to Tailwind v4 converter online`
- `CSS 轉 Tailwind 線上 工具`

**已觀察：** 多個現成工具明確針對 v4 與逐項映射；未取得可靠使用頻率。

**未證實差異：** 預覽視覺等價未測；不能將競品文案當完整 AC PASS。

**判斷：** 排除獨立排程，因 v4、arbitrary 與未轉換清單已是現成工具宣告能力，已缺乏可辨認差異。

**重啟／升級門檻：** 找到現有免費工具對本卡支援子集持續失敗的實例，並有可驗證的遷移需求／省時幅度。

來源：
- [tailwind-dozenkit](https://dozenkit.com/tools/css-to-tailwind) — 產品第一手頁面；日期：未標示；本輪查證 2026-10-14。web open 成功；宣告 v3/v4、逐 selector、arbitrary value、unrecognized／not converted 清單。
- [tailwind-ready](https://www.tailwindready.com/tools/css-to-tailwind-converter) — 產品第一手頁面搜尋擷取；日期：未標示；本輪查證 2026-10-14。搜尋擷取有 v4 與逐宣告映射，直接 open Internal Error；只列為補充線索。

## STW-10 Git diff 檢視與可分享的確定性變更摘要

**建議：retain-narrow-validation／low。**

搜尋意圖：無相同 checkout 的 patch 審查交接。

本輪實際 queries：
- `git diff viewer online diff2html`
- `site.github.com "diff2html" "file" "summary"`

**已觀察：** 成熟開源工具提供 unified diff、導航相關顯示與 HTML 匯出；本輪沒有取得遮蔽交接的獨立用戶需求證據。

**未證實差異：** 互動排除 hunk 與避免敏感資料外洩的交接仍未證實被覆蓋。

**判斷：** 撤回先前把本卡當 AI 摘要的理由；本卡是確定性檢視，Low 保留窄驗證。

**重啟／升級門檻：** 3 個真實跨團隊 patch 交接，與 diff2html 匯出比較，量測排除敏感 hunk 的操作量與審查成本；若無額外收益就排除。

來源：
- [diff-lib](https://github.com/rtfpessoa/diff2html/blob/master/README.md) — 官方 GitHub README；日期：未標示；本輪查證 2026-10-14。git/unified diff、兩種顯示、行號、增刪行與 browser bundle。
- [diff-cli](https://github.com/rtfpessoa/diff2html-cli/blob/master/README.md) — 官方 GitHub README；日期：未標示；本輪查證 2026-10-14。file summary、HTML/JSON、檔案匯出、ignore files；未證實互動 hunk 遮蔽。

## STW-21 驗證 TypeScript 型別展開與錯誤解釋工具的價值

**建議：defer-research-spike／low。**

搜尋意圖：理解複雜型別／hover，主要在 IDE。

本輪實際 queries：
- `TypeScript type explorer expand complex types ts-ast-viewer`
- `site:github.com/microsoft/TypeScript "expand" "hover" "type"`

**已觀察：** VS Code 舊使用者 issue 有明確需求；TypeScript 5.9 已預覽 expandable hovers；2026 Zed issue 指向特定 IDE 差異。

**未證實差異：** 診斷解釋、compiler 版本與 tsconfig 差異仍需真實樣本。

**判斷：** Low 延後研究 spike，不把研究驗收當功能完成，也不因生成式 AI 而刪除。原生能力削弱泛用展開器差異，IDE 開發成本對流量站較高。

**重啟／升級門檻：** 原卡至少 5 個真實複雜型別案例；比較指定版本 VS Code/TS 原生展開與候選流程，能證明理解時間改善且有可取得的流量入口。

來源：
- [ts-59](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html) — TypeScript 官方文件；日期：版本 5.9；頁面未標示發布日；本輪查證 2026-10-14。expandable hovers 標 Preview，另有最大 hover 長度設定。不能推論所有 IDE 皆已支援。
- [ts-issue](https://github.com/microsoft/vscode/issues/94679) — 使用者第一手 GitHub issue；日期：2020-04-08；本輪查證 2026-10-14。computed type 展開需求；頁面 Closed，不把舊 issue 當現存缺陷。
- [zed-issue](https://github.com/zed-industries/zed/issues/47360) — 使用者第一手 GitHub issue；日期：2026-01-22；本輪查證 2026-10-14。interface hover 與 type alias 呈現不一致；擷取狀態 Open，只證明特定 IDE 場景。

## STW-29 API 範例推導 TypeScript／Zod：呈現型別依據與不確定性

**建議：exclude-standalone／low。**

搜尋意圖：API 範例轉型別／驗證器。

本輪實際 queries：
- `JSON to TypeScript Zod multiple samples quicktype`
- `site:github.com/quicktype/quicktype "sample" "optional"`

**已觀察：** quicktype 官方直接涵蓋多樣本、missing/null、union、Zod；Schemato 亦宣告多樣本瀏覽器輸出。

**未證實差異：** 逐欄樣本追溯與使用者確認可能有差異，但沒有第一手痛點或完成時間證據。

**判斷：** 排除獨立生成器排程；保留樣本追溯研究線索，可未來與 STW-3 schema drift 評估整合。

**重啟／升級門檻：** 至少 3 組真實 API 樣本能展示基準誤推造成實際返工，且來源追溯比現成工具可量測改善；不能只重述多樣本。

來源：
- [quicktype](https://quicktype.io/) — 產品官方頁面；日期：未標示；本輪查證 2026-10-14。open 成功；多樣本 missing／null、union、足夠樣本才 enum，提供 TypeScript、Zod；未操作。
- [schema-multi](https://github.com/weitaishan/schemato) — 作者官方 GitHub README；日期：未標示；本輪查證 2026-10-14。宣告瀏覽器端多樣本 NDJSON 推導與 Zod 等輸出，補充競品線索。

## STW-31 Git 變更紀錄整理與可審查的 Release Notes 草稿

**建議：exclude-standalone／low。**

搜尋意圖：從 repo 版本範圍產生可審查公告。

本輪實際 queries：
- `git release notes generator git cliff github automated release notes`

**已觀察：** GitHub 原生與 git-cliff 已提供來源連結、分組／設定／草稿等流程；沒有本專案額外取得使用者證據。

**未證實差異：** merge/revert 與不合規訊息的完整處理沒有實測，不能說所有 AC 被覆蓋。

**判斷：** 排除獨立流量工具投資；本卡為確定性 CLI/CI 工作，不能用純 AI 摘要理由排除。

**重啟／升級門檻：** 至少 3 個真實 release 範圍能證明 git-cliff／原生流程造成可重現錯漏，且專用審查能省下顯著維護成本。

來源：
- [git-cliff](https://github.com/orhun/git-cliff) — 官方 GitHub README；日期：未標示；本輪查證 2026-10-14。Git history、Conventional Commits、regex parsers、可設定模板。
- [github-release](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes) — GitHub 官方文件；日期：未標示；本輪查證 2026-10-14。原生 PR、contributor、changelog；標籤分類／排除並可儲存草稿。不等於完整處理所有 revert。

## STW-33 驗證截圖轉元件草稿與視覺差異檢查的可行性

**建議：defer-research-spike／low。**

搜尋意圖：截圖產生可修正元件草稿並評估品質。

本輪實際 queries：
- `screenshot to code v0 image screenshots`

**已觀察：** v0 官方文件已有截圖生成，專業服務供給存在；這不是本卡評估矩陣已被實現的證據。

**未證實差異：** 視覺、語意、互動、人工修正時間的獨立驗收有研究價值，但沒有引流證據。

**判斷：** Low 延後研究 spike；不投入泛截圖生成器，不刪除既有評估義務，也不宣稱視覺差異等於功能正確。

**重啟／升級門檻：** 合法固定樣本實測 v0 等基準，分別量測四種結果及成本；只有在特定缺口有可重現改善及需求證據時再開發。

來源：
- [v0](https://v0.app/docs/screenshots) — 產品官方文件；日期：未標示；本輪查證 2026-10-14。截圖輸入生成介面程式碼、推測互動；不是視覺／互動正確性驗收。
- [screenshot](https://screenshottocode.com/) — 產品官方首頁搜尋擷取；日期：未標示；本輪查證 2026-10-14。專門 screenshot/video to code 服務；品質宣告未實測。

## STW-12 PostgreSQL EXPLAIN 計畫檢視：估計與實際執行差距

**建議：retain-differentiation-gate／low。**

搜尋意圖：理解真實 EXPLAIN 計畫。

本輪實際 queries：
- `PostgreSQL EXPLAIN JSON visualize estimated actual rows pev2`
- `site:github.com/dalibo/pev2 "estimate" "rows"`

**已觀察：** PEV2 官方持續提供計畫視覺化與單 HTML 完全離線模式；免費／本機本身不是差異。

**未證實差異：** 沒有逐項驗證 rows/loops 與計算規則，也沒證實特定新手任務比 PEV2 更快。

**判斷：** Low 保留比較門檻；不能將此卡稱為 AI SQL optimizer，它實際解析計畫。若只複製 viewer 則停止。

**重啟／升級門檻：** 以至少 3 個真實計畫比較 PEV2，證明某種診斷理解任務的時間／正確率改善；補對應特定 query 的需求。

來源：
- [pev2](https://github.com/dalibo/pev2) — 官方 GitHub README；日期：未標示；本輪查證 2026-10-14。open 成功；Postgres plan 視覺化，提供下載單一 HTML 離線無網路使用與可嵌入 Vue 元件。
- [pev-local](https://pev2.pages.dev/) — fork 作者產品頁面；日期：未標示；本輪查證 2026-10-14。宣告 text/JSON、瀏覽器 local storage、ANALYZE/BUFFERS 建議輸入，補充替代方案。

## STW-13 SQL DDL 轉 ER 關聯圖與可匯出的資料表文件

**建議：retain-differentiation-gate／low。**

搜尋意圖：離線 schema 理解與文件交付。

本輪實際 queries：
- `SQL DDL to ER diagram online dbdiagram import PostgreSQL`

**已觀察：** dbdiagram 官方提供 DDL 流程，DBC 有免費瀏覽器端 PostgreSQL DDL 圖與匯出；大量供給只是競爭訊號。

**未證實差異：** 複合鍵、schema qualified、未支援項定位與文件可讀性未比較。

**判斷：** Low 保留窄比較；免 DB、免費與 SVG 不是足夠差異，不能宣稱競品都不能呈現來源。

**重啟／升級門檻：** 3 組真實 DDL（複合鍵／自我引用／schema）比較現成基準，找到可重現且有使用者需要的匯入／文件缺口。

來源：
- [dbml](https://docs.dbdiagram.io/dbdocs/features/generate-dbml-from-db/) — dbdiagram 官方文件；日期：未標示；本輪查證 2026-10-14。SQL DDL 可透過 sql2dbml 轉換，不需連 DB；只是流程基準。
- [sql-erd](https://dbms.co.jp/sql-to-erd) — 資料庫顧問公司官方產品頁面；日期：未標示；本輪查證 2026-10-14。宣告 PostgreSQL DDL、免費免登入、瀏覽器端、SVG/PNG；需實測方言邊界。

## STW-15 Markdown 轉 HTML Email：表格、程式碼與複製預覽

**建議：retain-narrow-validation／low。**

搜尋意圖：把技術公告貼進實際信箱。

本輪實際 queries：
- `markdown email Gmail Outlook table code converter`

**已觀察：** 現成 Web converter 已有 inline style、表格與 Outlook 限制；Markdown Here 也提供直接信箱渲染流程。

**未證實差異：** 指定 Gmail／Outlook 版本的實際可貼上效果才是關鍵，未實測。

**判斷：** Low 保留「相容性可覆核」窄場景；普通 Markdown→HTML 不值得單獨建。

**重啟／升級門檻：** 原卡要求的兩平台實測，加上至少 3 個真實技術公告與基準對照，證明表格／程式碼修復省時。

來源：
- [markdown-email](https://www.markdowntools.com/tools/markdown-to-email-html) — 產品第一手頁面；日期：未標示；本輪查證 2026-10-14。inline-style/table-based HTML、瀏覽器端；明示 classic Outlook 不保證相容。
- [markdown-here](https://github.com/adam-p/markdown-here) — 作者官方 GitHub README；日期：未標示；本輪查證 2026-10-14。open 成功；電子郵件內 Markdown render 的既有外掛流程，沒有核實目前瀏覽器版本相容性。

## STW-27 Markdown 到 Confluence 的格式損失預檢與匯入輔助

**建議：retain-preflight-validation／medium。**

搜尋意圖：跨平台文件移轉與損失盤點。

本輪實際 queries：
- `markdown Confluence import relative links loss`
- `site:community.atlassian.com markdown import confluence tables`

**已觀察：** 官方社群有批次千頁移轉／Markdown 匯入的第一手問題；現在有付費 importer 宣告相對連結、附件及命名衝突處理。

**未證實差異：** 舊 Server 問題不能直接推論 Cloud 現況；尚無新產品未解的損失清單價值證據。

**判斷：** Medium 條件式保留預檢驗證，先選定 Cloud 或 Data Center；不是重新做通用轉換器。

**重啟／升級門檻：** 至少 3 組真實文件在指定平台與現成 importer 比較，量測預檢發現的遺漏和人工修復時間；若無增量價值停止。

來源：
- [confluence-user](https://community.atlassian.com/forums/discussion/1886974/how-to-import-pages-with-markdown-format-into-confluence) — 官方社群中的使用者第一手問題；日期：頁面擷取未標示；本輪查證 2026-10-14。使用者提出 1000+ Markdown 頁移轉，回覆只教單頁而被原作者指出不符合；舊 Server 情境，不外推為當前 Cloud 缺陷。
- [confluence-2024](https://community.atlassian.com/forums/discussion/2799601/how-do-i-enable-the-options-to-import-word-and-markdown-to-a-page) — 官方社群中的使用者第一手問題；日期：2024-08-30（文中截圖日期）；本輪查證 2026-10-14。詢問 Markdown 匯入，回覆推薦免費 Marketplace app；為需求線索，不證明現行缺口。
- [confluence-market](https://marketplace.atlassian.com/apps/1221333/markdown-importer-for-confluence) — 作者在 Atlassian Marketplace 的產品說明；日期：2026-10-13 版本 2.3.0；本輪查證 2026-10-14。付費 Cloud app 宣告資料夾、zip、相對連結、anchors、附件、命名衝突處理；沒有使用者實測。

## STW-28 Markdown 到 Notion 的批次結構與連結保留檢查

**建議：retain-preflight-validation／medium。**

搜尋意圖：批次筆記移轉後的結構與連結驗收。

本輪實際 queries：
- `Notion Markdown import relative links broken github issues`
- `site:github.com notion markdown import relative links issue`

**已觀察：** 官方確認多檔與 ZIP 原生匯入，同頁明示 anchors／非標準 Markdown 限制及部分匯入可能。限制是直接需求機制，但不是搜尋量。

**未證實差異：** 尚未實跑相對連結、圖片、巢狀文件；不能用舊社群抱怨斷言現在所有圖片都壞。

**判斷：** Medium 條件式保留來源對照與損失檢查；排除普通 Markdown uploader 定位。

**重啟／升級門檻：** 原卡至少 3 個樣本比較原生匯入，找到可重現損失與省時；若原生足夠，就交付停止結論。

來源：
- [notion](https://www.notion.com/help/import-data-into-notion) — Notion 官方文件；日期：未標示；本輪查證 2026-10-14。open 成功；原生多檔／zip 可保存資料夾結構，Markdown anchors／非標準擴充有限制；大型 zip 可能部分匯入。

## 完整性與下一步

核心 query 全部 13 項已執行；STW-2／4／9 另加繁中查詢。查詢文字、來源類型與未知值保存於 `demand-pruning.json`。TypeScript 的猜測 repo 路徑開啟失敗及無效補充搜尋亦有記錄；不採為證據。

本輪可直接支持「不把泛轉換器優先列入開發」與「平台移轉先查原生限制」的排序，不足以支持任何流量數字、排名保證或未實測功能的優劣宣告。所有重新升級都需先補真實樣本、現成流程對照與需求分母。
