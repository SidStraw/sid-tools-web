---
id: STW-22
title: 元件 Props 文件與使用範例的同步檢查
status: Done
assignee:
  - '@codex'
created_date: '2026-10-04 15:33'
updated_date: '2026-10-22 21:17'
labels:
  - keyword-research
  - monorepo-expansion
  - delivery-cli-ci
  - later-delivery
  - demand-reviewed-2026-10-14
  - implemented
  - local-verified
  - market-validation-pending
dependencies: []
references:
  - >-
    https://github.com/SidStraw/keyword-pipeline-auto/blob/2fe7b09f59f721a02c558cbd6f73cc8f218ce007/logs/2026_02/11_041145.md
  - 'https://storybook.js.org/docs/writing-docs/autodocs'
documentation:
  - docs/product-direction.md
  - research/keyword-review-2026-10-04/README.md
  - research/keyword-review-2026-10-04/keyword-decisions.json
  - research/tool-portfolio-review-2026-10-14/demand-review.md
  - research/tool-portfolio-review-2026-10-14/demand-other-cards.md
priority: low
type: feature
ordinal: 122
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## 使用情境與發展空間

Props 型別更新後文件與範例容易落後；此題適合讀取專案，原先純瀏覽器限制不應阻擋。

## 交付形式與首版邊界

主要形式：cli-ci。順序：後續交付／較高成本探索。

先選一種元件框架與明示語法子集，提取 Props 並比對既有文件，Web 提供唯讀預覽。

## 延伸方向與相鄰題目

可延伸設計系統文件、Story 範例與 IDE 導覽；框架選擇留待首個實際專案決定。

## 關鍵字來源與合併

代表原始詞：`react extract component props`; `props-extract`。

本題合併 2 個相關唯一詞，來自 1 份報告、2 筆紀錄。完整對照：research/keyword-review-2026-10-04/keyword-decisions.json（topic: component-docs）。平台／套件詞是相鄰需求線索，不表示首版支援每一種平台，也不依變體另開卡。

來源固定 commit：2fe7b09f59f721a02c558cbd6f73cc8f218ce007。來源 competition 可能把 API 錯誤記為 0，詞頻只是同一 pipeline 的取樣；不推論搜尋量、收入或實際使用者數。

## 細化時需確認

依 docs/product-direction.md 保留有發展空間的題目。先確認真實案例、既有替代方案與增量價值、首版格式／平台、交付成本；成熟工具可整合，不要求重造底層引擎。Medium／Low 表示目前的開發順序，Low 不代表低價值。需求、技術及付費意願尚未驗證。

目前只建立候選卡，不因 monorepo 預設框架、provider、workspace 切法或基礎設施；完成必要細化後再決定是否轉 To Do。
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Props 名稱、型別、必填與可靜態確認的預設值能回連原始定義。
- [x] #2 動態或無法解析的值顯示未知，不能捏造預設值。
- [x] #3 新增、刪除與變更 Props 的文件差異可檢視，使用者決定是否套用。
- [x] #4 提供固定案例驗證輸出；首版不載入或執行未受信任的元件程式碼。
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. 使用 Storybook 官方 React Button／Header 範例，固定 commit 40d47bf739fc8d97fdddaa2d22d8dc79fb2f0bd6、來源 URL、license 與 SHA256；另保留超出語法範圍的真實元件作為不完整結果案例。
2. 首版為 React TSX，整合 repo-local @babel/parser 8.0.7（已查發布時間與 Node 相容性）只解析 AST，不載入 Babel config、不 import 或執行元件。支援具名匯出的 function／arrow、同檔 interface／type literal Props 與解構參數；外部型別、繼承、泛型、動態運算及未涵蓋的 wrapper 必須明示未知或不完整。
3. CLI 輸出含 parser 版本、來源 hash、Props 宣告型別、必填與可確認的字面預設值，並保留定義／預設位置。宣告語法不冒稱 TypeScript compiler 的完整解析；未知預設不得推算。
4. 文件輸入採版本化 Props JSON schema，包含人工描述與具名 props 範例。比對新增／刪除／型別／必填／預設值差異，檢查範例缺必填或未知欄位；不支援的型別檢查顯示未知。只輸出建議文件，由使用者決定是否套用，不自動覆寫。
5. 在同一 SSG SPA 新增 lazy 唯讀報告／文件比較頁，使用 Worker、有限輸入及分頁，保留取消／清除／history／下載資源生命週期；Node parser 不進首頁載入。
6. 以固定公開來源、可追溯的受控文件漂移、動態預設、未支援語法及惡意程式碼不執行案例驗證 CLI／核心／瀏覽器。完整 pnpm verify 通過後逐項 AC 結案、本機 commit；不 push／部署。
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## 2026-10-14 搜尋需求與競爭複查

決策：Low / defer。優先序代表下一輪驗證資源，不是流量預測或實作承諾。

Storybook Autodocs 已從 metadata 產生 props/controls/stories；同步需求屬專案工作流，尚無獨立站入口證據。

提升／重新納入條件：取得特定框架文件漂移與現成工具無法處理案例，保留原同步 AC。

查詢與證據：research/tool-portfolio-review-2026-10-14/demand-other-cards.md；總排序見 research/tool-portfolio-review-2026-10-14/demand-review.md。

限制：未取得可信月搜尋量、固定地區 SERP 或競品／AI 操作實測。產品自述不等同 AC 驗收；未找到需求不等同無需求。保留原始功能邊界與 AC，不實作、不勾選完成；archive 僅表示排除目前獨立投資。

## 2026-10-15 實作阻礙與本輪略過

最新要求已取代先前因市場需求而暫緩的決定；本輪略過僅因下列輸入／證據尚未建立或確認，不代表完成。

- 待補項目：尚未確認首個實際專案、元件框架／語法子集，以及供比對的既有文件格式。
- 驗收影響：不同框架與文件格式決定 Props／預設值的解析及文件差異語意；目前無法如實界定 AC1、AC3 與 AC4 的輸入及驗證案例。
- 解除方式：選定實際專案與一種框架，確認支援語法、文件輸入格式及固定案例；再以不執行元件程式碼的方式規劃唯讀提取與差異檢視。

維持原狀態、描述與既有紀錄，所有 AC 維持未勾選；本輪不宣告完成。

## 2026-10-23 介入需求盤點

可直接推進：代理先以可追溯公開專案選定一種框架及明示語法子集、文件格式，完成靜態解析與差異預覽。首版不依賴使用者私人元件，也不執行輸入程式碼；此補充取代先前把樣本未選定當成使用者阻礙的解讀。

本次只分類責任與下一步，不代表驗收完成、流量需求已證實或已授權遠端發佈；保留既有 AC 與狀態。

2026-10-23 選型證據：官方 Babel parser 支援 TypeScript／JSX 並提供 AST 位置（https://babeljs.io/docs/babel-parser）。npm registry 查得 @babel/parser 8.0.7，2026-10-07 發布，Node ^22.18.0 || >=24.11.0，符合目前 Node 24.21.0 與三天等待期。react-docgen 8.0.4 為另一候選，但首版需要逐欄位定義與預設來源位置及明確未知邊界，採 Babel AST 的受限靜態提取；不宣稱完整框架／compiler 語意。已讀取固定 commit 的 Storybook Button.tsx（5 Props、false／medium 兩個解構預設）與 Header.tsx（4 Props、含同檔 User alias）；尚未安裝解析器、實作或驗收。

2026-10-23 實作進度：repo-local @babel/parser 8.0.7／types 8.0.6、React TSX 唯讀 CLI、公開核心格式／文件比較、同一 SPA 第 20 個工具頁已完成。固定 Storybook Button／Header／wrapped Button 與 MIT license、SHA256 保存在 tests/fixtures/component-docs/storybook；真實報告及明示受控的文件漂移／建議文件在 docs/validation/stw-22。5 個整合測試驗證來源位置、未知／不完整、未執行注入程式、文件與範例差異及工作量限制；專用瀏覽器已驗證來源導覽、分頁、下載、320px、清除與 SPA history。上一輪完整 verify 為 955 單元／整合、144 E2E PASS；另補下載失敗 Blob 清理及第 4 個 E2E，最終完整驗證正在執行。所有 AC 尚待最終結案核對，未 push／部署。

2026-10-23 最終驗收完成：pnpm verify exit 0，955 單元／整合、145 E2E、格式／lint／型別／build／production audit 通過（task cache 停用）。專用測試為 5 CLI／核心整合及 4 瀏覽器測試；含已下載 URL 清除與瀏覽器拒絕下載時的資源回收。已檢視 320px 截圖。四項 AC 的真實來源、實際輸出、程式未執行、文件差異與人工套用界線均有對應證據，見 docs/validation/stw-22/README.md。僅支援明示 React 靜態語法子集；未知值、函式／物件／引用型別範例不升格為驗證成功。未 push／部署，搜尋需求仍待驗證。

2026-10-23 本批遠端發佈完成：使用者授權結案後推送部署，main 84ec9af 已推送；GitHub Verify 39855305476 的 Linux／macOS 均 PASS。Cloudflare 原生 Git deployment 592ee99d 成功，tools.sid.tw 的 22 路由、canonical／sitemap、SPA、320px、真實 Dockerfile 報告與未知路徑 404 通過；GitHub Pages 仍關閉。STW-21 僅研究成果，未新增頁面。集中證據：docs/validation/release-2026-10-23。
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
完成固定 Babel parser 的 React Props 唯讀 CLI、來源定義／參數預設位置、版本化文件與範例差異，以及同一 SPA 第 20 個工具頁。固定 Storybook 真實樣本與受控漂移證明 added／removed／changed、未知與不完整邊界；保留人工說明和範例，不自動覆寫文件。5 專用整合、4 瀏覽器及完整 pnpm verify 通過（955 單元／整合、145 E2E），本機交付完成，未部署。
<!-- SECTION:FINAL_SUMMARY:END -->
