---
id: STW-15
title: Markdown 轉 HTML Email：表格、程式碼與複製預覽
status: Needs Refinement
assignee: []
created_date: '2026-10-04 14:23'
updated_date: '2026-10-22 19:25'
labels:
  - keyword-research
  - proposal
  - content
  - delivery-web
  - web-first
  - extension-cli
  - demand-reviewed-2026-10-14
  - deferred-evidence
  - user-input-needed
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_09/06_032904.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_08/05_042144.md
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_01/29_035902.md
  - 'https://www.markdowntools.com/tools/markdown-to-email-html'
  - 'https://github.com/adam-p/markdown-here'
documentation:
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - docs/product-direction.md
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-pruning.md
priority: low
type: feature
ordinal: 115
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與保留理由

技術公告常先寫 Markdown，再貼到郵件時丟失表格或程式碼排版；需求與一般網頁 Markdown renderer 的輸出不同。

## 首版邊界

將有限 Markdown 子集轉為適合郵件貼上的 HTML 與純文字，提供預覽；不寄信、不整合信箱、不承諾所有郵件客戶端一致。

## 差異與待驗證假設

以技術公告的表格與程式碼為核心，列出 Gmail／Outlook 實測結果及不支援項目。

## 關鍵字證據與合併

- `markdown to email html`：8 份報告出現。
- `markdown to email converter`：7 份報告出現。
- `markdown email template`：3 份報告出現。

本卡合併 12 個唯一關鍵字，來自 13 份報告、50 筆紀錄；完整對照見 research/keyword-review-2026-10-04/keyword-decisions.json（topic: markdown-email）。`online`、`free`、`tool` 及同一操作的措辭變體不另開卡，未支援的語言／平台需求不算首版承諾。

來源固定於 `2fe7b09f59f721a02c558cbd6f73cc8f218ce007`；範圍為 logs/2026_01/29_035902.md 至 logs/2026_09/06_032904.md。以上次數只代表 pipeline 重複取樣，不是搜尋量或獨立使用者數。

## 啟動前的決策

目前為 Needs Refinement，表示值得保留的產品候選。先以實際工作範例比較既有工具、確認差異價值與可接受的首版範圍，再轉 To Do；不要因建立卡片就開始實作或新增框架。High／Medium 表示本專案建議驗證順序，不是 SEO 收益預測。

來源的 competition 是搜尋結果筆數估算，API 錯誤也可能回傳 0，且 AI 摘要只看到前 10 筆。搜尋量、排名難度與付費意願均未獲驗證；不採信「零競爭、保證排名」敘述。

## 交付形式與 monorepo 發展

主要交付：Web 優先，保留本卡既有的瀏覽器首版範圍與驗收條件。

延伸方向：CLI 技術公告內容產生。同一工作成果的其他介面先記在本卡，不按平台複製卡片。使用者已確認 monorepo 不限 Web；上述延伸是產品候選，尚未選定共用套件、workspace 或實作框架。

參見 docs/product-direction.md；交付形式與開發順序可以細化，已有來源限制仍適用。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 標題、段落、清單、連結、表格與程式碼區塊能輸出 HTML 與純文字。
- [ ] #2 外部 script、危險連結與原始 HTML 有明確清理規則；預覽不執行使用者內容。
- [ ] #3 提供複製 HTML 與下載結果，保留表格文字與程式碼空白。
- [ ] #4 完成前在選定 Gmail／Outlook 版本驗證代表性範例，記錄差異及限制；未驗證平台不得宣稱相容。
- [ ] #5 首版免登入，使用者輸入只在瀏覽器處理；不自動上傳、永久保存或放入分享 URL，提供清除內容功能。
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

Low 保留「相容性可覆核」窄場景；普通 Markdown→HTML 不值得單獨建。 現成 Web converter 已有 inline style、表格與 Outlook 限制；Markdown Here 也提供直接信箱渲染流程。

提升／重新納入條件：原卡要求的兩平台實測，加上至少 3 個真實技術公告與基準對照，證明表格／程式碼修復省時。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-pruning.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

## 2026-10-15 實作阻礙與本輪略過

最新要求已取代先前因市場需求而暫緩的決定；本輪略過僅因下列輸入／證據尚未建立或確認，不代表完成。

- 待補項目：尚未確認 Gmail／Outlook 的測試版本、可用的授權測試環境，以及代表性範例的實測紀錄。
- 驗收影響：AC4 要求兩平台的實際驗證；僅在瀏覽器預覽產生的 HTML，不能據此宣稱郵件相容性。
- 解除方式：確認兩平台版本與授權測試方式，執行表格及程式碼等範例並保存差異與限制；無須提供信箱密碼給專案。

維持原狀態、描述與既有紀錄，所有 AC 維持未勾選；本輪不宣告完成。

## 2026-10-23 介入需求盤點

需要使用者介入的最小項目：指定或允許使用 Gmail／Outlook 測試環境，或協助回傳選定版本的實際貼上／顯示結果；不需交付密碼。代理可先準備代表性 Markdown、轉換器、清理規則與測試步驟。AC4 的郵件客戶端實測完成前不能結案。

本次只分類責任與下一步，不代表驗收完成、流量需求已證實或已授權遠端發佈；保留既有 AC 與狀態。
<!-- SECTION:NOTES:END -->
